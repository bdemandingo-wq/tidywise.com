// Stripe webhook: records the saved payment method once a customer
// completes the setup-mode Checkout Session. No charge is involved.
//
// verify_jwt = false (Stripe cannot send a Supabase JWT). Authenticity is
// enforced by verifying the Stripe signature against STRIPE_WEBHOOK_SECRET —
// unsigned or mis-signed requests are rejected with 400.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    console.error("Stripe env not configured");
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      signature ?? "",
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    console.error("Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "setup") {
        const bookingId = session.metadata?.booking_id;
        let paymentMethodId: string | null = null;

        if (session.setup_intent) {
          const setupIntent = await stripe.setupIntents.retrieve(
            typeof session.setup_intent === "string"
              ? session.setup_intent
              : session.setup_intent.id,
          );
          paymentMethodId =
            typeof setupIntent.payment_method === "string"
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id ?? null;
        }

        const update = {
          stripe_payment_method_id: paymentMethodId,
          card_on_file_status: paymentMethodId ? "saved" : "failed",
          card_saved_at: paymentMethodId ? new Date().toISOString() : null,
          stripe_customer_id:
            typeof session.customer === "string" ? session.customer : undefined,
        };

        const query = supabase.from("bookings").update(update);
        const { error } = bookingId
          ? await query.eq("id", bookingId)
          : await query.eq("stripe_setup_session_id", session.id);

        if (error) console.error("Booking update failed:", error);
        else console.log("Card saved for booking:", bookingId ?? session.id);

        // Make the saved card the customer's default for future charges.
        if (paymentMethodId && typeof session.customer === "string") {
          try {
            await stripe.customers.update(session.customer, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });
          } catch (err) {
            console.error("Default payment method update failed:", err);
          }
        }
      }
    } else if (event.type === "setup_intent.setup_failed") {
      const intent = event.data.object as Stripe.SetupIntent;
      const bookingId = intent.metadata?.booking_id;
      if (bookingId) {
        await supabase
          .from("bookings")
          .update({ card_on_file_status: "failed" })
          .eq("id", bookingId);
      }
    }
  } catch (err) {
    console.error("Webhook handling error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
