# CRM booking payload: square footage label + real bedroom count

## 1. Square footage as a tier label
The CRM's square footage field expects label strings, not numbers. Today we send the raw number ("1250").

- In `forward-booking-to-crm`, bucket the booking's `sqft` up to the first tier whose max is >= the value and send that tier's label, formatted exactly as the CRM expects: `Up to 750 sf`, `Up to 1000 sf`, `Up to 1250 sf`, ... `Up to 6000 sf`.
- Tier ladder (matches the pricing tiers already in the database): 750, 1000, 1250, 1500, 1800, 2100, 2400, 2700, 3000, 3300, 3600, 4000, 4400, 4800, 5200, 5600, 6000.
- Below 750 -> `Up to 750 sf`. Above 6000 -> `Up to 6000 sf` (largest tier), since there is no larger CRM option.
- 1,250 sq ft sends `Up to 1250 sf`.
- The ladder is hardcoded in the edge function rather than read from the pricing table, because the CRM's option list is fixed on its side and the stored labels are lowercase ("up to 1250 sf").

## 2. Bedrooms
- Add a required **Bedrooms** Select to the booking form, next to Bathrooms: Studio, 1, 2, 3, 4, 5, 6+.
- Stop writing `"2,000 sq ft"` into the `beds` column. `beds` will hold the chosen bedroom value (Studio -> `0`, `6+` -> `6`).
- The CRM forwarder keeps its guard: only a genuine positive number is sent as `bedrooms`, otherwise null. Old rows that still contain "sq ft" text continue to send null.

## 3. Bathrooms
- `4+` currently renders blank in the CRM. Map `4+` to `4` in the forwarder's payload (form keeps showing "4+").

## 4. Pricing check
Pricing is driven only by service type, square footage, frequency and add-ons (`computePrice` in `src/lib/pricing.ts` takes `sqft`, never `beds`). Adding a bedrooms field and removing the sqft string from `beds` changes no price anywhere: hero estimator, pricing calculator and booking total all stay identical. I'll confirm the calculator renders and totals unchanged after the edit.

## Files touched
- `supabase/functions/forward-booking-to-crm/index.ts` — sqft label bucketing, baths `4+` -> `4`.
- `src/pages/BookingForm.tsx` — bedrooms Select, validation, and both insert paths write the real bedroom count to `beds`.
