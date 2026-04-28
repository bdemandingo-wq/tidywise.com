import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";
import {
  SERVICES,
  SIZE_TIERS,
  loadPricingTiers,
  computePrice,
  type ServiceKey,
} from "@/lib/pricing";

const HeroEstimator = () => {
  const navigate = useNavigate();
  const [service, setService] = useState<ServiceKey>("standard");
  const [sizeIndex, setSizeIndex] = useState(2);
  const [tiers, setTiers] = useState<Awaited<ReturnType<typeof loadPricingTiers>>>([]);

  useEffect(() => {
    loadPricingTiers().then(setTiers);
  }, []);

  const currentTier = SIZE_TIERS[sizeIndex];

  const breakdown = useMemo(
    () =>
      computePrice(tiers, {
        service,
        sqft: currentTier.sqft,
        frequency: "onetime",
        addOnIds: [],
      }),
    [tiers, service, currentTier.sqft],
  );

  const handleProceed = () => {
    navigate("/booking", {
      state: {
        service,
        sqft: currentTier.sqft,
        bedsLabel: currentTier.bedsLabel,
        sizeIndex,
        frequency: "onetime",
        addOnIds: [],
        // Frontend will recompute, but pass the estimate so the form shows
        // the same number the user just saw.
        estimatedTotal: breakdown.total,
        estimatedRange: breakdown.range,
        isCustom: breakdown.isCustom,
      },
    });
  };

  return (
    <Card className="shadow-elevated border-0 bg-card">
      <CardContent className="p-3 sm:p-6 space-y-2 sm:space-y-4">
        <div className="text-center mb-0 sm:mb-2">
          <h3 className="font-display text-base sm:text-lg font-bold text-foreground">Instant Price Estimator</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Get your estimate in seconds</p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <div>
            <label htmlFor="hero-service" className="text-xs sm:text-sm font-medium text-foreground mb-0.5 sm:mb-1 block">
              Service Type
            </label>
            <Select value={service} onValueChange={(v) => setService(v as ServiceKey)}>
              <SelectTrigger id="hero-service" className="bg-background h-9 sm:h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="hero-size" className="text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2 block">
              Home Size: <span className="text-primary font-bold">{currentTier.bedsLabel}</span>
              <span className="text-muted-foreground font-normal"> (~{currentTier.sqft.toLocaleString()} sq ft)</span>
            </label>
            <Slider
              id="hero-size"
              value={[sizeIndex]}
              onValueChange={(val) => setSizeIndex(val[0])}
              min={0}
              max={SIZE_TIERS.length - 1}
              step={1}
              className="py-2"
              aria-label="Home size in bedrooms"
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              <span>Studio</span>
              <span>5+ BR</span>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 rounded-lg p-2.5 sm:p-4 text-center" aria-live="polite">
          <p className="text-xs sm:text-sm text-muted-foreground mb-0.5">Estimated Price</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">
            {breakdown.isCustom ? "Request Quote" : `From ${breakdown.range}`}
          </p>
        </div>

        <Button
          size="default"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold group text-sm sm:text-base h-9 sm:h-11"
          onClick={handleProceed}
        >
          <span className="flex items-center justify-center gap-2">
            {breakdown.isCustom ? "Get Custom Quote" : "See My Price"}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Button>

        <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
          No credit card. No commitment. Instant estimate.
        </p>
      </CardContent>
    </Card>
  );
};

export default HeroEstimator;
