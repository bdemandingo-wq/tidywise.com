import { useLocation, useNavigate } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Home, Phone, Mail, Star, Gift, Clock, MessageSquare, Sparkles } from "lucide-react";

interface BookingState {
  sqft: number;
  beds: string;
  serviceType: string;
  frequency: string;
  addOns: string[];
  totalPrice: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  baths: string;
  hasPets?: boolean;
}

const Confirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state as BookingState | null;

  return (
    <>
      <SEOHead
        title="Booking Confirmed | TIDYWISE"
        description="Your cleaning service booking has been confirmed. TIDYWISE will contact you within 15 minutes."
        canonical="https://www.tidywisecleaning.com/confirmation"
        noIndex={true}
      />
      {!booking ? (
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <h1 className="text-xl font-bold mb-2">Booking Confirmation</h1>
              <p className="text-muted-foreground mb-4">No booking information found.</p>
              <Button onClick={() => navigate("/")}>Return to Home</Button>
            </CardContent>
          </Card>
        </div>
      ) : (
    <div className="min-h-screen bg-muted flex items-center justify-center py-12 px-4">
      <Card className="max-w-lg w-full shadow-elevated animate-scale-in">
        <CardContent className="p-8">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-muted-foreground">
              Thank you for choosing TIDYWISE. We'll contact you shortly.
            </p>
          </div>

          {/* Booking Summary */}
          <div className="bg-muted rounded-lg p-6 mb-6 space-y-3">
            <h2 className="font-semibold text-foreground mb-4">Booking Summary</h2>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{booking.name}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{booking.phone}</span>
            </div>

            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-right text-sm max-w-[200px]">{booking.address}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Home Size</span>
              <span className="font-medium">{booking.beds} / {booking.baths} bath</span>
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-muted rounded-lg p-6 mb-8 space-y-3">
            <h2 className="font-semibold text-foreground mb-4">Service Details</h2>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Home Size</span>
              <span className="font-medium">{booking.beds}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Type</span>
              <span className="font-medium">{booking.serviceType}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frequency</span>
              <span className="font-medium">{booking.frequency}</span>
            </div>

            {booking.addOns.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Add-Ons</span>
                <span className="font-medium text-right">{booking.addOns.join(", ")}</span>
              </div>
            )}

            {booking.hasPets && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pets</span>
                <span className="font-medium">Yes — we'll note it for our team</span>
              </div>
            )}
            
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Total Price</span>
                <span className="text-2xl font-bold text-primary">${booking.totalPrice}</span>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="mb-8">
            <h2 className="font-display font-bold text-foreground mb-4 text-lg">What happens next</h2>
            <ol className="space-y-4">
              {[
                { icon: Clock, title: "We'll confirm your cleaner within 15 min", desc: "During business hours (9 AM – 6 PM EST), expect a quick call or text to lock in your time." },
                { icon: MessageSquare, title: "You'll receive a text reminder 24 hours before", desc: "We'll send a friendly SMS so you're never caught off-guard on cleaning day." },
                { icon: Sparkles, title: "Your cleaner arrives ready to make your home spotless", desc: "Vetted, insured, and equipped with eco-friendly supplies — just unlock the door." },
              ].map((step, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm" aria-hidden="true">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <step.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                      {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Contact Info */}
          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-foreground mb-2">Questions? We're here.</p>
            <div className="flex flex-col sm:flex-row gap-3 text-sm">
              <a href="tel:+15615718725" className="flex items-center gap-2 text-primary hover:underline" aria-label="Call TIDYWISE at (561) 571-8725">
                <Phone className="w-4 h-4" aria-hidden="true" />
                (561) 571-8725
              </a>
              <a href="mailto:support@tidywisecleaning.com" className="flex items-center gap-2 text-primary hover:underline" aria-label="Email TIDYWISE support">
                <Mail className="w-4 h-4" aria-hidden="true" />
                support@tidywisecleaning.com
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button variant="outline" className="flex-1" asChild>
              <a href="tel:+15615718725" className="flex items-center justify-center gap-2" aria-label="Call us now">
                <Phone className="w-4 h-4" aria-hidden="true" />
                Call Us Now
              </a>
            </Button>
            <Button className="flex-1" onClick={() => navigate("/")} aria-label="Back to home">
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              Back to Home
            </Button>
          </div>


          {/* Recurring Upsell */}
          {booking.frequency === "One-Time" && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 text-center">
              <p className="text-sm font-semibold text-foreground mb-1">Save 10–15% every visit</p>
              <p className="text-xs text-muted-foreground">
                Ask us about bi-weekly or weekly plans when we call — regulars get priority scheduling too.
              </p>
            </div>
          )}

          {/* Referral CTA */}
          <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4 mb-4 flex gap-3 items-start">
            <Gift className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Know someone who needs a cleaner?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Refer a friend — when they book, you both get a discount on your next cleaning. Just mention your name.
              </p>
            </div>
          </div>

          {/* Google Review Ask */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Star className="w-3 h-3 fill-secondary text-secondary" />
              After your clean, we'd love a Google review — it helps us a lot.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
      )}
    </>
  );
};

export default Confirmation;
