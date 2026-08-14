import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { CreditCard, Lock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type CardConfirmResult =
  | { ok: true; customerId: string; paymentMethodId: string }
  | { ok: false; message: string };

export interface CardOnFileApi {
  /** Confirms the SetupIntent. Never charges — saves the card for later. */
  confirm: () => Promise<CardConfirmResult>;
}

interface Props {
  /** Customer details used to create/match the Stripe customer. */
  email: string;
  name: string;
  phone: string;
  /** Parent-owned ref: filled with the imperative confirm() API. */
  apiRef: React.MutableRefObject<CardOnFileApi | null>;
  /**
   * Reports whether inline card entry is usable. When false the booking form
   * falls back to the emailed/SMS card-setup link instead of blocking.
   */
  onAvailabilityChange?: (available: boolean) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CardFields({
  apiRef,
  customerId,
}: {
  apiRef: React.MutableRefObject<CardOnFileApi | null>;
  customerId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    apiRef.current = {
      confirm: async (): Promise<CardConfirmResult> => {
        if (!stripe || !elements) {
          return { ok: false, message: "Card form is still loading. Please try again in a moment." };
        }
        const submitRes = await elements.submit();
        if (submitRes.error) {
          return { ok: false, message: submitRes.error.message ?? "Please check your card details." };
        }
        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          redirect: "if_required",
          confirmParams: {
            return_url: `${window.location.origin}/card-saved`,
          },
        });
        if (error) {
          return {
            ok: false,
            message: error.message ?? "Your card could not be saved. Please try another card.",
          };
        }
        const pm = setupIntent?.payment_method;
        const paymentMethodId = typeof pm === "string" ? pm : pm?.id ?? "";
        if (!setupIntent || setupIntent.status !== "succeeded" || !paymentMethodId) {
          return { ok: false, message: "Your card could not be verified. Please try another card." };
        }
        return { ok: true, customerId, paymentMethodId };
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [stripe, elements, apiRef, customerId]);

  return <PaymentElement options={{ layout: "tabs" }} />;
}

const CardOnFileSection = ({ email, name, phone, apiRef, onAvailabilityChange }: Props) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [pk, setPk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestedFor = useRef<string>("");

  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    if (!EMAIL_RE.test(normalizedEmail)) return;
    if (requestedFor.current === normalizedEmail) return;

    const timer = window.setTimeout(async () => {
      requestedFor.current = normalizedEmail;
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("create-setup-intent", {
          body: { email: normalizedEmail, name, phone },
        });
        if (fnErr || !data?.clientSecret || !data?.publishableKey) {
          throw new Error(fnErr?.message ?? "Card setup unavailable");
        }
        setClientSecret(data.clientSecret);
        setCustomerId(data.customerId);
        setPk(data.publishableKey);
        onAvailabilityChange?.(true);
      } catch (err) {
        console.error("[CardOnFileSection] setup intent failed:", err);
        requestedFor.current = ""; // allow a retry on the next edit
        setError("Secure card entry is temporarily unavailable. You can still book — we'll text and email you a secure link to add your card.");
        onAvailabilityChange?.(false);
      }
    }, 600);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedEmail]);

  const stripePromise = useMemo<Promise<Stripe | null> | null>(
    () => (pk ? loadStripe(pk) : null),
    [pk],
  );

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Card on file <span className="text-destructive">*</span></h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Required to hold your appointment. Your card is saved securely by Stripe and is
        <strong className="text-foreground"> not charged today</strong> — we charge only after your cleaning is complete.
      </p>

      {!EMAIL_RE.test(normalizedEmail) && !error && (
        <p className="text-sm text-muted-foreground">Enter your email above to load secure card entry.</p>
      )}

      {error && (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {EMAIL_RE.test(normalizedEmail) && !error && !clientSecret && (
        <p className="text-sm text-muted-foreground">Loading secure card form…</p>
      )}

      {stripePromise && clientSecret && (
        <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
          <CardFields apiRef={apiRef} customerId={customerId} />
        </Elements>
      )}

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" /> Encrypted by Stripe. TIDYWISE never sees your card number.
      </p>
    </div>
  );
};

export default CardOnFileSection;
