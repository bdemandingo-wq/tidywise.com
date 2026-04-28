import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  SERVICES,
  SIZE_TIERS,
  FREQUENCIES,
  ADD_ONS,
  loadPricingTiers,
  computePrice,
  type ServiceKey,
} from "@/lib/pricing";

const PricingCalculator = () => {
  const navigate = useNavigate();
  const [sizeIndex, setSizeIndex] = useState(2);
  const [serviceType, setServiceType] = useState<ServiceKey>("standard");
  const [frequency, setFrequency] = useState("onetime");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [tiers, setTiers] = useState<Awaited<ReturnType<typeof loadPricingTiers>>>([]);

  useEffect(() => {
    loadPricingTiers().then(setTiers);
  }, []);

  const currentTier = SIZE_TIERS[sizeIndex];

  const breakdown = useMemo(
    () =>
      computePrice(tiers, {
        service: serviceType,
        sqft: currentTier.sqft,
        frequency,
        addOnIds: selectedAddOns,
      }),
    [tiers, serviceType, currentTier.sqft, frequency, selectedAddOns],
  );

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleBooking = () => {
    navigate("/booking", {
      state: {
        service: serviceType,
        sqft: currentTier.sqft,
        bedsLabel: currentTier.bedsLabel,
        sizeIndex,
        frequency,
        addOnIds: selectedAddOns,
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
            {/* Property Size — bedroom tiers (matches Hero UX) */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="calc-size" className="text-base font-medium">Home Size</Label>
                <span className="text-lg font-bold text-primary">
                  {currentTier.bedsLabel} <span className="text-sm text-muted-foreground font-normal">(~{currentTier.sqft.toLocaleString()} sq ft)</span>
                </span>
              </div>
              <Slider
                id="calc-size"
                value={[sizeIndex]}
                onValueChange={(v) => setSizeIndex(v[0])}
                min={0}
                max={SIZE_TIERS.length - 1}
                step={1}
                className="w-full py-3"
                aria-label="Home size in bedrooms"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Studio</span>
                <span>5+ BR</span>
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

            {/* Add-ons */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Add-On Services</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ADD_ONS.map((addOn) => {
                  const scaledPrice = addOn.sqftScaling > 0
                    ? Math.round(addOn.basePrice + addOn.basePrice * addOn.sqftScaling * (currentTier.sqft / 1000))
                    : addOn.basePrice;
                  return (
                    <div
                      key={addOn.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedAddOns.includes(addOn.id)
                          ? "bg-primary/10 border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                      onClick={() => toggleAddOn(addOn.id)}
                    >
                      <Checkbox
                        id={`addon-${addOn.id}`}
                        checked={selectedAddOns.includes(addOn.id)}
                        onCheckedChange={() => toggleAddOn(addOn.id)}
                      />
                      <label htmlFor={`addon-${addOn.id}`} className="text-sm cursor-pointer flex-1">
                        {addOn.label} <span className="text-muted-foreground">(${scaledPrice})</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

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
