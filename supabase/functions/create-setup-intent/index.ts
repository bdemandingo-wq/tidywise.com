// Creates a Stripe SetupIntent so the customer can enter a card INLINE in the
// booking form (Stripe Elements) before "Confirm My Booking".
//
// Nothing is charged: the card is saved off_session and charged after the
// cleaning is complete. Returns the publishable key too, so the frontend does
// not need a separate build-time env var.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "npm:stripe@14.25.0";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
  if (!stripeKey || !publishableKey) {
    return json({ error: "Stripe is not configured" }, 500);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Per-IP rate limit: 20/hour (allows retries after a declined card).
  const ip = getClientIp(req);
  const { data: allowed, error: rlErr } = await supabase.rpc("check_rate_limit", {
    _bucket: "create-setup-intent",
    _identifier: ip,
    _max: 20,
    _window: "01:00:00",
  });
  if (rlErr) console.error("Rate limit check failed:", rlErr);
  else if (allowed === false) return json({ error: "Too many requests. Please try again later." }, 429);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = String(body?.email ?? "").trim().slice(0, 255);
  const name = String(body?.name ?? "").trim().slice(0, 200);
  const phone = String(body?.phone ?? "").trim().slice(0, 40);
  if (!EMAIL_RE.test(email)) return json({ error: "A valid email is required" }, 400);

  // The CRM's get-customer-card only recognises a saved card when the Stripe
  // customer carries this metadata field. Stored as a secret so it can change
  // without a code edit.
  const orgId = Deno.env.get("CRM_ORGANIZATION_ID") ?? "";

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Match on email; backfill organization_id on every matching customer so
    // pre-existing records start being recognised by the CRM.
    const existing = await stripe.customers.list({ email, limit: 10 });
    if (orgId) {
      for (const c of existing.data) {
        if (c.metadata?.organization_id !== orgId) {
          try {
            await stripe.customers.update(c.id, {
              metadata: { ...(c.metadata ?? {}), organization_id: orgId },
            });
          } catch (err) {
            console.error("Customer metadata backfill failed:", c.id, err);
          }
        }
      }
    }

    const customer = existing.data[0] ??
      (await stripe.customers.create({
        email,
        name: name || undefined,
        phone: phone || undefined,
        metadata: orgId ? { organization_id: orgId } : undefined,
      }));

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
      payment_method_types: ["card"],
      metadata: orgId
        ? { source: "booking_form_inline", organization_id: orgId }
        : { source: "booking_form_inline" },
    });

    return json({
      clientSecret: setupIntent.client_secret,
      publishableKey,
      customerId: customer.id,
      setupIntentId: setupIntent.id,
    });
  } catch (err) {
    console.error("create-setup-intent failed:", err);
    return json({ error: "Could not start secure card entry" }, 502);
  }
});
