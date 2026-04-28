import { useEffect, useMemo, useRef, useState } from "react";
import SEOHead from "@/components/seo/SEOHead";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, User, Mail, Phone, Home, MapPin, MessageSquare, CalendarIcon, AlertTriangle, Shield, Star, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  ADD_ONS,
  FREQUENCIES,
  SERVICES,
  SERVICE_INCLUSIONS,
  AUTO_INCLUDED_ADDONS,
  SQFT_MIN,
  SQFT_MAX,
  SQFT_STEP,
  SQFT_DEFAULT,
  computePrice,
  getServiceMeta,
  loadPricingTiers,
  type ServiceKey,
} from "@/lib/pricing";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface IncomingState {
  service?: ServiceKey;
  sqft?: number;
  frequency?: string;
  addOnIds?: string[];
}

// Zod schema mirroring DB constraints
const bookingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  phone: z
    .string()
    .trim()
    .min(10, "Phone must be at least 10 digits")
    .max(20, "Phone too long")
    .regex(/^[\d\s()+\-.]+$/, "Phone contains invalid characters"),
  address: z.string().trim().min(5, "Address required").max(300, "Address too long"),
  baths: z.string().min(1, "Select bathroom count"),
  specialInstructions: z.string().trim().max(2000, "Instructions too long").optional(),
  hasPets: z.boolean(),
  petInfo: z.string().trim().max(500, "Pet info too long").optional(),
  smsConsent: z.literal(true, {
    errorMap: () => ({ message: "SMS consent is required to receive booking updates" }),
  }),
});

type BookingErrors = Partial<Record<keyof z.infer<typeof bookingSchema>, string>>;

const BookingForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const incoming = (location.state as IncomingState | null) ?? null;

  // Defaults if user lands without state — sensible fallbacks rather than redirect
  const [service, setService] = useState<ServiceKey>(incoming?.service ?? "standard");
  const [sizeIndex, setSizeIndex] = useState<number>(incoming?.sizeIndex ?? 2);
  const [frequency, setFrequency] = useState<string>(incoming?.frequency ?? "onetime");
  const [addOnIds, setAddOnIds] = useState<string[]>(incoming?.addOnIds ?? []);
  const [tiers, setTiers] = useState<Awaited<ReturnType<typeof loadPricingTiers>>>([]);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: "",
    email: user?.email ?? "",
    phone: "",
    address: "",
    baths: "",
    specialInstructions: "",
    hasPets: false,
    petInfo: "",
    smsConsent: false,
  });
  const [preferredDate, setPreferredDate] = useState<Date | undefined>();
  const [errors, setErrors] = useState<BookingErrors>({});
  const [dateError, setDateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Idempotency key generated once per mount; ensures retries don't double-book.
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  // Load pricing tiers + blocked dates on mount
  useEffect(() => {
    loadPricingTiers().then(setTiers);
    supabase
      .from("booking_blocked_dates")
      .select("blocked_date")
      .then(({ data }) => {
        if (data) setBlockedDates(new Set(data.map((d) => d.blocked_date)));
      });
  }, []);

  // Sync email if user signs in mid-flow
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData((prev) => ({ ...prev, email: user.email! }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Date constraints — Eastern time aware (server enforces too)
  const { minDate, maxDate } = useMemo(() => {
    const now = new Date();
    const min = new Date(now);
    min.setDate(min.getDate() + 2);
    min.setHours(0, 0, 0, 0);
    const max = new Date(now);
    max.setDate(max.getDate() + 90);
    max.setHours(23, 59, 59, 999);
    return { minDate: min, maxDate: max };
  }, []);

  const currentTier = SIZE_TIERS[sizeIndex];
  const breakdown = useMemo(
    () =>
      computePrice(tiers, {
        service,
        sqft: currentTier.sqft,
        frequency,
        addOnIds,
      }),
    [tiers, service, currentTier.sqft, frequency, addOnIds],
  );

  const meta = getServiceMeta(service);
  const isCustomQuote = breakdown.isCustom;

  const handleField = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof BookingErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleAddOn = (id: string) => {
    setAddOnIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isDateDisabled = (date: Date) => {
    if (date < minDate || date > maxDate) return true;
    const iso = format(date, "yyyy-MM-dd");
    return blockedDates.has(iso);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // hard guard against double-tap

    // Validate date
    if (!preferredDate) {
      setDateError("Please select a preferred date");
      return;
    }
    setDateError(null);

    // Validate form
    const parsed = bookingSchema.safeParse(formData);
    if (!parsed.success) {
      const next: BookingErrors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof BookingErrors;
        if (k && !next[k]) next[k] = issue.message;
      }
      setErrors(next);
      toast({
        title: "Please fix the highlighted fields",
        description: "Some required information is missing or invalid.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const serviceLabel = meta?.label ?? service;
      const freqLabel = FREQUENCIES.find((f) => f.key === frequency)?.label ?? frequency;
      const addOnLabels = addOnIds
        .map((id) => ADD_ONS.find((a) => a.id === id)?.label)
        .filter(Boolean) as string[];

      // Generate ID client-side so we don't need a post-insert SELECT
      // (anonymous users have no SELECT policy on bookings — by design)
      const bookingId = crypto.randomUUID();

      const bookingData = {
        id: bookingId,
        customer_name: parsed.data.name,
        customer_email: parsed.data.email,
        customer_phone: parsed.data.phone,
        address: parsed.data.address,
        beds: currentTier.bedsLabel,
        baths: parsed.data.baths,
        sqft: currentTier.sqft,
        service_type: serviceLabel,
        frequency: freqLabel,
        add_ons: addOnLabels,
        total_price: isCustomQuote ? 0 : breakdown.total,
        preferred_date: format(preferredDate, "yyyy-MM-dd"),
        special_instructions: parsed.data.specialInstructions || null,
        pet_info: parsed.data.hasPets
          ? parsed.data.petInfo || "Yes"
          : null,
        status: "pending" as const,
        idempotency_key: idempotencyKey.current,
      };

      const { error: dbError } = await supabase
        .from("bookings")
        .insert(bookingData);

      if (dbError) {
        // Unique violation on idempotency_key = duplicate submit; recover via RPC
        if (dbError.code === "23505") {
          navigate(`/confirmation/${bookingId}?k=${encodeURIComponent(idempotencyKey.current)}`, { replace: true });
          return;
        }
        console.error("Database error:", dbError);
        toast({
          title: "Couldn't save your booking",
          description: dbError.message.includes("Bookings must be") || dbError.message.includes("unavailable")
            ? dbError.message
            : "Please try again or call us at (561) 571-8725.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // GA4 conversion
      if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", {
          event_category: "booking",
          event_label: serviceLabel,
          value: breakdown.total || 0,
          currency: "USD",
        });
      }

      // SMS notification (admin + personal + customer if consent)
      try {
        await supabase.functions.invoke("send-sms-notification", {
          body: {
            type: "booking",
            // Top-level fields drive routing & consent gating in the edge function
            bookingId,
            customerPhone: parsed.data.phone,
            smsConsent: parsed.data.smsConsent === true,
            data: {
              bookingId,
              customerName: parsed.data.name,
              customerEmail: parsed.data.email,
              customerPhone: parsed.data.phone,
              address: parsed.data.address,
              serviceType: serviceLabel,
              frequency: freqLabel,
              beds: currentTier.bedsLabel,
              baths: parsed.data.baths,
              sqft: currentTier.sqft,
              totalPrice: isCustomQuote ? "Custom Quote" : breakdown.total.toString(),
              preferredDate: format(preferredDate, "EEEE, MMMM d, yyyy"),
              smsConsent: parsed.data.smsConsent === true,
            },
          },
        });
      } catch (smsError) {
        console.error("SMS notification error:", smsError);
        // Non-fatal — booking still succeeded
      }

      // Replace history so back button doesn't return to the form
      navigate(`/confirmation/${bookingId}?k=${encodeURIComponent(idempotencyKey.current)}`, { replace: true });
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or call us at (561) 571-8725.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Book Cleaning Online | TIDYWISE South Florida"
        description="Book your professional house cleaning in 60 seconds. Instant quote, flexible scheduling, vetted cleaners. Serving Deerfield Beach, Boca Raton & all South Florida."
        canonical="/booking"
        noIndex={true}
      />
      <main id="main-content" className="min-h-screen bg-muted pb-32 md:pb-12">
        <section className="bg-gradient-to-b from-primary/10 to-background py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Book Your South Florida Cleaning in 60 Seconds
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
              Instant pricing. Flexible scheduling. Vetted, insured cleaners.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent" /> Easy online booking</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent" /> Transparent pricing</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent" /> 4.9★ rated by 127+ customers</div>
            </div>
          </div>
        </section>

        <div className="max-w-2xl mx-auto py-12 px-4">
          <button
            onClick={() => navigate("/#booking")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to pricing
          </button>

          {user && (
            <div className="mb-4 text-sm text-muted-foreground">
              Booking as <span className="font-medium text-foreground">{user.email}</span>
            </div>
          )}

          <Card className="shadow-elevated animate-scale-in">
            <CardContent className="p-6 md:p-8">
              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">Almost Done!</h2>
                <p className="text-muted-foreground">Lock in your price — takes under 2 minutes.</p>
              </div>

              {/* Live Booking Summary */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Service</p>
                    <p className="font-semibold text-foreground">{meta?.label} • {FREQUENCIES.find((f) => f.key === frequency)?.label}</p>
                    <p className="text-sm text-muted-foreground">{currentTier.bedsLabel} (~{currentTier.sqft.toLocaleString()} sq ft)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Estimated Total</p>
                    {isCustomQuote ? (
                      <p className="text-xl font-bold text-primary">Custom Quote</p>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-primary">${breakdown.total}</p>
                        <p className="text-xs text-muted-foreground">{breakdown.range}</p>
                      </>
                    )}
                  </div>
                </div>
                {addOnIds.length > 0 && (
                  <div className="text-sm text-muted-foreground border-t border-primary/10 pt-2">
                    <span className="font-medium text-foreground">Add-ons:</span> {addOnIds.map((id) => ADD_ONS.find((a) => a.id === id)?.label).filter(Boolean).join(", ")}
                  </div>
                )}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-display font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">Need Same / Next Day?</p>
                  <p className="text-sm text-amber-700 dark:text-amber-500">
                    Call us directly at <a href="tel:+15615718725" className="font-semibold underline">(561) 571-8725</a> — we'll fit you in.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* Service editor (let users tweak from the form) */}
                <fieldset className="space-y-4">
                  <legend className="font-semibold text-foreground flex items-center gap-2">
                    <Home className="w-4 h-4 text-primary" /> Service Details
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bf-service">Service Type</Label>
                      <Select value={service} onValueChange={(v) => setService(v as ServiceKey)}>
                        <SelectTrigger id="bf-service"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SERVICES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bf-freq">Frequency</Label>
                      <Select value={frequency} onValueChange={setFrequency}>
                        <SelectTrigger id="bf-freq"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bf-size">Home Size: <span className="text-primary font-bold">{currentTier.bedsLabel}</span></Label>
                    <Select value={String(sizeIndex)} onValueChange={(v) => setSizeIndex(parseInt(v, 10))}>
                      <SelectTrigger id="bf-size"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SIZE_TIERS.map((t) => (
                          <SelectItem key={t.index} value={String(t.index)}>
                            {t.bedsLabel} (~{t.sqft.toLocaleString()} sq ft)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </fieldset>

                {/* Add-ons editable */}
                <fieldset className="space-y-3">
                  <legend className="font-semibold text-foreground">Add-Ons (optional)</legend>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ADD_ONS.map((a) => {
                      const checked = addOnIds.includes(a.id);
                      return (
                        <label
                          key={a.id}
                          htmlFor={`bf-addon-${a.id}`}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm ${checked ? "border-primary bg-primary/5" : "border-border"}`}
                        >
                          <Checkbox
                            id={`bf-addon-${a.id}`}
                            checked={checked}
                            onCheckedChange={() => toggleAddOn(a.id)}
                          />
                          <span>{a.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Preferred Date */}
                <fieldset className="space-y-4">
                  <legend className="font-semibold text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" /> Preferred Cleaning Date
                  </legend>
                  <div className="space-y-2">
                    <Label htmlFor="bf-date">Select Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="bf-date"
                          type="button"
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !preferredDate && "text-muted-foreground")}
                          aria-invalid={!!dateError}
                          aria-describedby={dateError ? "bf-date-error" : undefined}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {preferredDate ? format(preferredDate, "EEEE, MMMM d, yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={preferredDate}
                          onSelect={(d) => { setPreferredDate(d); if (d) setDateError(null); }}
                          disabled={isDateDisabled}
                          initialFocus
                          fromDate={minDate}
                          toDate={maxDate}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {dateError && <p id="bf-date-error" className="text-sm text-destructive">{dateError}</p>}
                    <p className="text-xs text-muted-foreground">Bookings open 2–90 days out. Some dates may be unavailable.</p>
                  </div>
                </fieldset>

                {/* Contact */}
                <fieldset className="space-y-4">
                  <legend className="font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Contact Information
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bf-name">Full Name *</Label>
                      <Input
                        id="bf-name"
                        autoComplete="name"
                        value={formData.name}
                        onChange={(e) => handleField("name", e.target.value)}
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? "bf-name-error" : undefined}
                      />
                      {errors.name && <p id="bf-name-error" className="text-sm text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bf-phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="bf-phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="(561) 555-0123"
                          className="pl-10"
                          value={formData.phone}
                          onChange={(e) => handleField("phone", e.target.value)}
                          aria-invalid={!!errors.phone}
                          aria-describedby={errors.phone ? "bf-phone-error" : undefined}
                        />
                      </div>
                      {errors.phone && <p id="bf-phone-error" className="text-sm text-destructive">{errors.phone}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bf-email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="bf-email"
                        type="email"
                        autoComplete="email"
                        placeholder="john@example.com"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => handleField("email", e.target.value)}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "bf-email-error" : undefined}
                      />
                    </div>
                    {errors.email && <p id="bf-email-error" className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                </fieldset>

                {/* Property */}
                <fieldset className="space-y-4">
                  <legend className="font-semibold text-foreground flex items-center gap-2">
                    <Home className="w-4 h-4 text-primary" /> Property
                  </legend>
                  <div className="space-y-2">
                    <Label htmlFor="bf-address">Property Address *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="bf-address"
                        autoComplete="street-address"
                        placeholder="123 Main St, West Palm Beach, FL 33401"
                        className="pl-10"
                        value={formData.address}
                        onChange={(e) => handleField("address", e.target.value)}
                        aria-invalid={!!errors.address}
                        aria-describedby={errors.address ? "bf-address-error" : undefined}
                      />
                    </div>
                    {errors.address && <p id="bf-address-error" className="text-sm text-destructive">{errors.address}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bf-baths">Bathrooms *</Label>
                    <Select value={formData.baths} onValueChange={(v) => handleField("baths", v)}>
                      <SelectTrigger id="bf-baths" aria-invalid={!!errors.baths}>
                        <SelectValue placeholder="Select number of bathrooms" />
                      </SelectTrigger>
                      <SelectContent>
                        {["1", "1.5", "2", "2.5", "3", "3.5", "4+"].map((v) => (
                          <SelectItem key={v} value={v}>{v} {v === "1" ? "Bathroom" : "Bathrooms"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.baths && <p className="text-sm text-destructive">{errors.baths}</p>}
                  </div>
                </fieldset>

                {/* Notes & Pets */}
                <fieldset className="space-y-4">
                  <legend className="font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" /> Anything we should know?
                  </legend>
                  <div className="space-y-2">
                    <Label htmlFor="bf-notes">Special Instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea
                      id="bf-notes"
                      placeholder="Access instructions (gate code, lockbox), areas to focus on, etc."
                      rows={3}
                      maxLength={2000}
                      value={formData.specialInstructions}
                      onChange={(e) => handleField("specialInstructions", e.target.value)}
                    />
                    {errors.specialInstructions && <p className="text-sm text-destructive">{errors.specialInstructions}</p>}
                  </div>

                  <label htmlFor="bf-haspets" className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                    <Checkbox
                      id="bf-haspets"
                      checked={formData.hasPets}
                      onCheckedChange={(c) => handleField("hasPets", c === true)}
                    />
                    <span className="flex-1 text-sm">We have pets at home</span>
                  </label>
                  {formData.hasPets && (
                    <div className="space-y-2">
                      <Label htmlFor="bf-petinfo">Pet details <span className="text-muted-foreground font-normal">(breed, temperament — optional)</span></Label>
                      <Input
                        id="bf-petinfo"
                        placeholder="e.g. friendly golden retriever, will be in crate"
                        maxLength={500}
                        value={formData.petInfo}
                        onChange={(e) => handleField("petInfo", e.target.value)}
                      />
                    </div>
                  )}
                </fieldset>

                {/* SMS consent — REQUIRED */}
                <label htmlFor="bf-sms" className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer">
                  <Checkbox
                    id="bf-sms"
                    checked={formData.smsConsent}
                    onCheckedChange={(c) => handleField("smsConsent", c === true)}
                    aria-invalid={!!errors.smsConsent}
                  />
                  <span className="flex-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Text me booking updates *</span> — I agree to receive SMS confirmations and reminders from TIDYWISE at the phone number above. Reply STOP to opt out at any time. Message &amp; data rates may apply.
                  </span>
                </label>
                {errors.smsConsent && <p className="text-sm text-destructive">{errors.smsConsent}</p>}

                <div className="space-y-3 pt-2">
                  <Button type="submit" size="lg" className="w-full text-lg font-semibold" disabled={isSubmitting}>
                    {isSubmitting ? "Sending your booking..." : "Confirm My Booking"}
                  </Button>
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> No credit card now</span>
                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-primary" /> Confirmed in 15 min</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-secondary text-secondary" /> Free re-clean guarantee</span>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default BookingForm;
