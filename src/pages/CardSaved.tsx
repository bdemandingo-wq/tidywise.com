import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/seo/SEOHead";

/**
 * Landing page after the Stripe setup-mode Checkout Session.
 * No charge happens here — the card is simply saved for after the cleaning.
 */
const CardSaved = () => {
  const [params] = useSearchParams();
  const canceled = params.get("canceled") === "1";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <SEOHead
        pageTitle="Card on File | TIDYWISE"
        pageDescription="Your TIDYWISE cleaning is confirmed. We don't charge your card until after your cleaning is complete."
        noIndex
      />
      <main className="w-full max-w-lg text-center space-y-6">
        {canceled ? (
          <>
            <CreditCard className="h-14 w-14 mx-auto text-muted-foreground" aria-hidden />
            <h1 className="text-3xl font-bold">No card added yet</h1>
            <p className="text-muted-foreground">
              Your cleaning is still booked. You can add your card any time using
              the link we texted and emailed you, or we'll collect payment after
              the cleaning.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-14 w-14 mx-auto text-accent" aria-hidden />
            <h1 className="text-3xl font-bold">Your card is on file</h1>
            <p className="text-xl font-bold text-primary">
              We don't charge your card until after your cleaning is complete.
            </p>
            <p className="text-muted-foreground">
              Nothing was charged today. Your card details are stored securely by
              Stripe — TIDYWISE never sees your card number.
            </p>
          </>
        )}
        <Button asChild size="lg">
          <Link to="/">Back to TIDYWISE</Link>
        </Button>
      </main>
    </div>
  );
};

export default CardSaved;
