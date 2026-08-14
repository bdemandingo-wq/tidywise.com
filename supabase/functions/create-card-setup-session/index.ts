// Creates a Stripe Checkout Session in `mode: 'setup'` for a booking:
// the customer saves a card, nothing is charged. TidyWise charges after
// the cleaning is complete.
//
// Hardening mirrors forward-booking-to-crm:
//   - Per-IP rate limit (10/hour) via public.check_rate_limit.
//   - Never trusts request-body fields: the booking row is loaded
//     server-side by id (service role) and all customer data comes from
//     that row.
//
// Side effects: writes stripe_customer_id / stripe_setup_session_id /
// card_on_file_status / card_setup_link_sent_at on the booking, then sends
// the link by SMS (OpenPhone, consent-gated) and email (Resend).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "npm:stripe@14.25.0";

const SITE_URL = "https://www.tidywisecleaning.com";
const OPENPHONE_PHONE_NUMBER_ID = "PNr7XukuaV";

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    // Non-fatal by design: the booking flow ignores this failure.
    return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ---- Per-IP rate limit: 10/hour ----
  const ip = getClientIp(req);
  const { data: allowed, error: rlErr } = await supabase.rpc("check_rate_limit", {
    _bucket: "create-card-setup-session",
    _identifier: ip,
    _max: 10,
    _window: "01:00:00",
  });
  if (rlErr) {
    console.error("Rate limit check failed:", rlErr);
  } else if (allowed === false) {
    return json({ error: "Too many requests. Please try again later." }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const bookingId = String(body?.bookingId ?? "").trim();
  if (!bookingId) return json({ error: "bookingId is required" }, 400);

  // The row is inserted by the anonymous client moments earlier; retry the
  // read the same way send-sms-notification does so we don't race the write.
  let booking: Record<string, any> | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, customer_name, customer_email, customer_phone, sms_consent, service_type, preferred_date, total_price, stripe_customer_id, stripe_setup_session_id, card_on_file_status",
      )
      .eq("id", bookingId)
      .maybeSingle();
    if (data) {
      booking = data;
      break;
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  if (!booking) return json({ error: "Booking not found" }, 404);

  // Already saved? Nothing to do.
  if (booking.card_on_file_status === "saved") {
    return json({ ok: true, alreadySaved: true });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  try {
    // ---- Find or create the Stripe customer for this email ----
    let customerId: string | null = booking.stripe_customer_id ?? null;
    if (!customerId && booking.customer_email) {
      const existing = await stripe.customers.list({
        email: booking.customer_email,
        limit: 1,
      });
      customerId = existing.data[0]?.id ?? null;
    }
    if (!customerId) {
      const created = await stripe.customers.create({
        email: booking.customer_email ?? undefined,
        name: booking.customer_name ?? undefined,
        phone: booking.customer_phone ?? undefined,
        metadata: { booking_id: booking.id },
      });
      customerId = created.id;
    }

    // ---- Setup-mode Checkout Session: saves the card, charges nothing ----
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      success_url: `${SITE_URL}/card-saved?booking=${booking.id}`,
      cancel_url: `${SITE_URL}/card-saved?booking=${booking.id}&canceled=1`,
      metadata: { booking_id: booking.id },
      setup_intent_data: {
        metadata: { booking_id: booking.id },
      },
      custom_text: {
        submit: {
          message:
            "We don't charge your card until after your cleaning is complete.",
        },
      },
    });

    await supabase
      .from("bookings")
      .update({
        stripe_customer_id: customerId,
        stripe_setup_session_id: session.id,
        card_on_file_status: "sent",
        card_setup_link_sent_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    const link = session.url!;
    const firstName = String(booking.customer_name ?? "").split(" ")[0];

    // ---- SMS (consent-gated, verified phone from the row) ----
    let smsSent = false;
    const openPhoneKey = Deno.env.get("OPENPHONE_API_KEY");
    if (openPhoneKey && booking.sms_consent === true && booking.customer_phone) {
      const message =
        `TIDYWISE: Hi ${firstName}! Please add a card to hold your cleaning on ` +
        `${booking.preferred_date}. You are NOT charged now — we only charge after ` +
        `your cleaning is complete. ${link} Reply STOP to opt out.`;
      let success = false;
      let providerMessageId: string | null = null;
      let errorMessage: string | null = null;
      try {
        const res = await fetch("https://api.openphone.com/v1/messages", {
          method: "POST",
          headers: { Authorization: openPhoneKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            content: message,
            from: OPENPHONE_PHONE_NUMBER_ID,
            to: [booking.customer_phone],
          }),
        });
        const raw = await res.text().catch(() => "");
        if (res.ok) {
          success = true;
          try {
            providerMessageId = JSON.parse(raw)?.data?.id ?? null;
          } catch { /* ignore */ }
        } else {
          errorMessage = `HTTP ${res.status}: ${raw.slice(0, 500)}`;
        }
      } catch (err) {
        errorMessage = String(err);
      }
      smsSent = success;
      try {
        await supabase.from("sms_send_log").insert({
          recipient: booking.customer_phone,
          recipient_type: "customer",
          message_type: "card_setup_link",
          success,
          provider_message_id: providerMessageId,
          error_message: errorMessage,
          related_booking_id: booking.id,
        });
      } catch (logErr) {
        console.error("sms_send_log insert failed:", logErr);
      }
    }

    // ---- Email ----
    let emailSent = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && booking.customer_email) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "TIDYWISE <support@tidywisecleaning.com>",
            to: [booking.customer_email],
            subject: "Add your card to hold your TIDYWISE cleaning (no charge today)",
            html: `
              <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
                <img src="${SITE_URL}/logo-email.png" alt="TIDYWISE" style="height: 48px; width: auto;" />
                <h1 style="font-size: 22px; color: #1A56DB;">Hi ${firstName}, one quick step</h1>
                <p>Your ${booking.service_type ?? "cleaning"} on <strong>${booking.preferred_date}</strong> is booked.
                Please add a card to keep it on the schedule.</p>
                <p style="font-size: 18px; font-weight: bold; color: #1A56DB;">
                  We don't charge your card until after your cleaning is complete.
                </p>
                <p style="margin: 28px 0;">
                  <a href="${link}" style="background:#1A56DB;color:#ffffff;padding:14px 26px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
                    Add my card securely
                  </a>
                </p>
                <p style="font-size: 13px; color: #6b7280;">Card details are handled by Stripe. TIDYWISE never sees or stores your card number.</p>
                <p style="font-size: 13px; color: #6b7280;">Questions? Call or text (561) 571-8725.</p>
              </div>
            `,
          }),
        });
        emailSent = res.ok;
        if (!res.ok) console.error("Resend error:", await res.text());
      } catch (err) {
        console.error("Resend exception:", err);
      }
    }

    return json({ ok: true, url: link, smsSent, emailSent });
  } catch (err) {
    console.error("Stripe setup session failed:", err);
    await supabase
      .from("bookings")
      .update({ card_on_file_status: "failed" })
      .eq("id", bookingId);
    return json({ error: "Failed to create card setup session", details: String(err) }, 502);
  }
});
