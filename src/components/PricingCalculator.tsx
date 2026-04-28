import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Phone } from "lucide-react";
import {
  SERVICES,
  FREQUENCIES,
  ADD_ONS,
  SQFT_MIN,
  SQFT_MAX,
  SQFT_STEP,
  SQFT_DEFAULT,
  SERVICE_INCLUSIONS,
  AUTO_INCLUDED_ADDONS,
  loadPricingTiers,
  computePrice,
  type ServiceKey,
} from "@/lib/pricing";

const PricingCalculator = () => {
  const navigate = useNavigate();
  const [sqft, setSqft] = useState<number>(SQFT_DEFAULT);
  const [serviceType, setServiceType] = useState<ServiceKey>("standard");
  const [frequency, setFrequency] = useState("onetime");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [tiers, setTiers] = useState<Awaited<ReturnType<typeof loadPricingTiers>>>([]);

  useEffect(() => {
    loadPricingTiers().then(setTiers);
  }, []);

  const autoIncluded = AUTO_INCLUDED_ADDONS[serviceType] ?? [];
  const inclusions = SERVICE_INCLUSIONS[serviceType] ?? [];
  const isCustomService = serviceType === "carpets" || serviceType === "upholstery";

  // Combine selected + auto-included for pricing & booking
  const effectiveAddOns = useMemo(() => {
    const set = new Set([...selectedAddOns, ...autoIncluded]);
    return Array.from(set);
  }, [selectedAddOns, autoIncluded]);

  const breakdown = useMemo(
    () =>
      computePrice(tiers, {
        service: serviceType,
        sqft,
        frequency,
        addOnIds: effectiveAddOns,
      }),
    [tiers, serviceType, sqft, frequency, effectiveAddOns],
  );

  const toggleAddOn = (id: string) => {
    if (autoIncluded.includes(id)) return; // can't toggle auto-included
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleBooking = () => {
    navigate("/booking", {
      state: {
        service: serviceType,
        sqft,
        frequency,
        addOnIds: effectiveAddOns,
        estimatedTotal: breakdown.total,
        estimatedRange: breakdown.range,
        isCustom: breakdown.isCustom,
      },
    });
  };

  return (
    <section id="booking" className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Transparent Pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Simple, upfront pricing with no hidden fees. Final price confirmed after we verify bedroom and bathroom count.
          </p>
        </div>

        <Card className="max-w-2xl mx-auto shadow-elevated">
          <CardHeader>
            <CardTitle className="text-xl font-display">Select Your Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Property Size — raw sqft */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="calc-size" className="text-base font-medium">Property Size</Label>
                <span className="text-lg font-bold text-primary">{sqft.toLocaleString()} sq ft</span>
              </div>
              <Slider
                id="calc-size"
                value={[sqft]}
                onValueChange={(v) => setSqft(v[0])}
                min={SQFT_MIN}
                max={SQFT_MAX}
                step={SQFT_STEP}
                className="w-full py-3"
                aria-label="Property size in square feet"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{SQFT_MIN.toLocaleString()} sq ft</span>
                <span>{SQFT_MAX.toLocaleString()}+ sq ft</span>
              </div>
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <Label htmlFor="calc-service" className="text-base font-medium">Service Type</Label>
              <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceKey)}>
                <SelectTrigger id="calc-service">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map((service) => (
                    <SelectItem key={service.key} value={service.key}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* What's Included */}
            <div className="bg-background border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-3 text-sm">What's Included</h3>
              {isCustomService ? (
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  Custom quote — call us at{" "}
                  <a href="tel:+15615718725" className="text-primary font-medium underline">
                    (561) 571-8725
                  </a>{" "}
                  for a personalized estimate.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {inclusions.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="calc-freq" className="text-base font-medium">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="calc-freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.key} value={freq.key}>
                      {freq.label}{freq.baseDiscount > 0 ? ` (${Math.round(freq.baseDiscount * 100)}% off base)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Recurring discounts apply to the base service only — add-ons are charged at full price.</p>
            </div>

            {/* Price Display */}
            <div className="bg-primary/5 rounded-lg p-6 text-center" aria-live="polite">
              <p className="text-muted-foreground mb-2">Estimated Price</p>
              {breakdown.isCustom ? (
                <p className="text-3xl font-bold text-primary">Custom Quote</p>
              ) : (
                <>
                  <p className="text-4xl font-bold text-primary">${breakdown.total}</p>
                  <p className="text-sm text-muted-foreground mt-1">Range: {breakdown.range}</p>
                </>
              )}
            </div>

            {/* Add-ons (hidden for custom services) */}
            {!isCustomService && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Add-On Services</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ADD_ONS.map((addOn) => {
                    const isAuto = autoIncluded.includes(addOn.id);
                    const checked = isAuto || selectedAddOns.includes(addOn.id);
                    const scaledPrice = addOn.sqftScaling > 0
                      ? Math.round(addOn.basePrice + addOn.basePrice * addOn.sqftScaling * (sqft / 1000))
                      : addOn.basePrice;
                    return (
                      <div
                        key={addOn.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          isAuto
                            ? "bg-muted border-border opacity-60 cursor-not-allowed"
                            : checked
                              ? "bg-primary/10 border-primary cursor-pointer"
                              : "bg-background border-border hover:border-primary/50 cursor-pointer"
                        }`}
                        onClick={() => toggleAddOn(addOn.id)}
                      >
                        <Checkbox
                          id={`addon-${addOn.id}`}
                          checked={checked}
                          disabled={isAuto}
                          onCheckedChange={() => toggleAddOn(addOn.id)}
                        />
                        <label
                          htmlFor={`addon-${addOn.id}`}
                          className={`text-sm flex-1 ${isAuto ? "cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{addOn.label}</span>
                            {isAuto ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Included</Badge>
                            ) : (
                              <span className="text-muted-foreground">(${scaledPrice})</span>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Book Button */}
            <Button
              size="lg"
              className="w-full text-lg font-semibold"
              onClick={handleBooking}
            >
              {breakdown.isCustom ? "Request Custom Quote" : "Book This Service"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default PricingCalculator;
