import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Clock, Phone } from "lucide-react";
import {
  SERVICES,
  SQFT_MIN,
  SQFT_MAX,
  SQFT_STEP,
  SQFT_DEFAULT,
  loadPricingTiers,
  computePrice,
  estimateHours,
  formatHours,
  type ServiceKey,
} from "@/lib/pricing";

const HeroEstimator = () => {
  const navigate = useNavigate();
  const [service, setService] = useState<ServiceKey>("standard");
  const [sqft, setSqft] = useState<number>(SQFT_DEFAULT);
  const [tiers, setTiers] = useState<Awaited<ReturnType<typeof loadPricingTiers>>>([]);

  useEffect(() => {
    loadPricingTiers().then(setTiers);
  }, []);

  const breakdown = useMemo(
    () =>
      computePrice(tiers, {
        service,
        sqft,
        frequency: "onetime",
        addOnIds: [],
      }),
    [tiers, service, sqft],
  );

  const hours = useMemo(() => estimateHours(service, sqft), [service, sqft]);

  const handleProceed = () => {
    navigate("/booking", {
      state: {
        service,
        sqft,
        frequency: "onetime",
        addOnIds: [],
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
              Property Size: <span className="text-primary font-bold">{sqft.toLocaleString()} sq ft</span>
            </label>
            <Slider
              id="hero-size"
              value={[sqft]}
              onValueChange={(val) => setSqft(val[0])}
              min={SQFT_MIN}
              max={SQFT_MAX}
              step={SQFT_STEP}
              className="py-2"
              aria-label="Property size in square feet"
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              <span>{SQFT_MIN.toLocaleString()} sq ft</span>
              <span>{SQFT_MAX.toLocaleString()} sq ft</span>
            </div>
            {hours !== null && (
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" aria-hidden="true" />
                Estimated time: <span className="font-medium text-foreground">{formatHours(hours)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-primary/5 rounded-lg p-2.5 sm:p-4 text-center" aria-live="polite">
          <p className="text-xs sm:text-sm text-muted-foreground mb-0.5">Estimated Price</p>
          {breakdown.isCustom ? (
            <p className="text-xl sm:text-2xl font-bold text-primary">Request Quote</p>
          ) : (
            <>
              <p className="text-xl sm:text-2xl font-bold text-primary">${breakdown.total}</p>
              {breakdown.needsConfirmation && (
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Phone className="w-3 h-3" aria-hidden="true" />
                  Custom quote — call to confirm
                </p>
              )}
            </>
          )}
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
