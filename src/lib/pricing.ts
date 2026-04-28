// Single source of truth for pricing across HeroEstimator, PricingCalculator,
// and BookingForm. Tier data is loaded from the `service_pricing` table at
// runtime; this module only owns the catalog metadata and the math.

import { supabase } from "@/integrations/supabase/client";

export type ServiceKey =
  | "standard"
  | "deep"
  | "moveinout"
  | "postconstruction"
  | "carpets"
  | "upholstery";

export interface ServiceMeta {
  key: ServiceKey;
  label: string;
  /** If true, the service has tiered pricing in `service_pricing`. */
  tiered: boolean;
}

/** Canonical service catalog — used in Hero, Calculator, BookingForm, Services. */
export const SERVICES: ServiceMeta[] = [
  { key: "standard", label: "Standard Cleaning", tiered: true },
  { key: "deep", label: "Deep Cleaning", tiered: true },
  { key: "moveinout", label: "Move In/Out", tiered: true },
  { key: "postconstruction", label: "Post-Construction", tiered: true },
  { key: "carpets", label: "Carpet Cleaning", tiered: false },
  { key: "upholstery", label: "Upholstery Cleaning", tiered: false },
];

export const getServiceMeta = (key: string): ServiceMeta | undefined =>
  SERVICES.find((s) => s.key === key);

/** Bedroom-tier sliders (matches DB tier_index 0..6 buckets). */
export interface SizeTier {
  index: number;        // slider index 0..6
  bedsLabel: string;    // e.g. "2 BR"
  sqft: number;         // representative sqft
  dbTierIndex: number;  // index into service_pricing.tier_index for that sqft
}

export const SIZE_TIERS: SizeTier[] = [
  { index: 0, bedsLabel: "Studio",  sqft: 500,  dbTierIndex: 0 },
  { index: 1, bedsLabel: "1 BR",    sqft: 750,  dbTierIndex: 0 },
  { index: 2, bedsLabel: "2 BR",    sqft: 1250, dbTierIndex: 2 },
  { index: 3, bedsLabel: "3 BR",    sqft: 1800, dbTierIndex: 4 },
  { index: 4, bedsLabel: "4 BR",    sqft: 2400, dbTierIndex: 6 },
  { index: 5, bedsLabel: "5 BR",    sqft: 3000, dbTierIndex: 8 },
  { index: 6, bedsLabel: "5+ BR",   sqft: 3600, dbTierIndex: 10 },
];

export interface FrequencyOpt {
  key: string;
  label: string;
  /** Discount applied to the base service price ONLY (never to add-ons). */
  baseDiscount: number;
}

export const FREQUENCIES: FrequencyOpt[] = [
  { key: "onetime",  label: "One-Time",   baseDiscount: 0 },
  { key: "weekly",   label: "Weekly",     baseDiscount: 0.15 },
  { key: "biweekly", label: "Bi-Weekly",  baseDiscount: 0.10 },
  { key: "monthly",  label: "Monthly",    baseDiscount: 0.05 },
];

/**
 * Add-on definition. `sqftScaling` makes the price scale with home size for
 * size-sensitive services (carpets, walls, baseboards).
 */
export interface AddOnDef {
  id: string;
  label: string;
  basePrice: number;
  /** Multiplier per 1000 sqft (e.g. 1 = price * sqft/1000). 0 = flat. */
  sqftScaling: number;
}

export const ADD_ONS: AddOnDef[] = [
  { id: "windows",    label: "Interior Windows",  basePrice: 30, sqftScaling: 0 },
  { id: "appliances", label: "Inside Appliances", basePrice: 50, sqftScaling: 0 },
  { id: "baseboards", label: "Baseboards",        basePrice: 25, sqftScaling: 0.6 },
  { id: "walls",      label: "Wall Spot Cleaning",basePrice: 25, sqftScaling: 0.6 },
  { id: "carpets",    label: "Carpets",           basePrice: 75, sqftScaling: 1.0 },
  { id: "laundry",    label: "Laundry Load",      basePrice: 10, sqftScaling: 0 },
  { id: "dishes",     label: "Dishes",            basePrice: 15, sqftScaling: 0 },
];

export const PRICE_FLOOR = 99;
export const PRICE_CAP = 1500;

/** Raw sqft slider config — used by Hero & Calculator. */
export const SQFT_MIN = 500;
export const SQFT_MAX = 10000;
export const SQFT_STEP = 100;
export const SQFT_DEFAULT = 1250;

/**
 * What's included per service (verbatim copy — do not modify wording).
 * Each entry is a bullet shown in the calculator and booking summary.
 */
export const SERVICE_INCLUSIONS: Record<ServiceKey, string[]> = {
  standard: [
    "Dusting all reachable surfaces",
    "Vacuuming carpets and rugs",
    "Mopping all hard floors",
    "Cleaning kitchen counters, stovetop exterior, and sinks",
    "Cleaning bathrooms (toilets, tubs, showers, sinks, mirrors)",
    "Emptying trash bins",
    "Making beds (linens left by client)",
    "General tidying",
  ],
  deep: [
    "Everything in Standard, PLUS:",
    "Walls (spot cleaning)",
    "Baseboards",
    "Reachable ceiling fans",
    "Inside of all appliances (oven, microwave, fridge)",
    "Light fixtures",
    "Sliding door tracks",
    "Detailed bathroom scrubbing (grout, tile)",
    "Detailed kitchen degreasing",
  ],
  moveinout: [
    "Everything in Deep, PLUS:",
    "Inside of all cabinets and drawers",
    "Window sills",
    "Door frames",
    "Light switches and outlet covers",
  ],
  postconstruction: [
    "Everything in Move-In/Out, PLUS:",
    "Removing paint chippings",
    "Removing construction dust from all surfaces",
    "Vacuuming inside vents and registers",
    "Wiping down all newly installed fixtures",
  ],
  carpets: [],
  upholstery: [],
};

/**
 * Add-ons that are baked into the base price for each service.
 * These render as checked + disabled in the UI and contribute $0 to the total.
 */
export const AUTO_INCLUDED_ADDONS: Record<ServiceKey, string[]> = {
  standard: [],
  deep: ["appliances", "baseboards", "walls", "windows"],
  moveinout: ["appliances", "baseboards", "walls", "windows"],
  postconstruction: ["appliances", "baseboards", "walls", "windows"],
  carpets: [],
  upholstery: [],
};

// ----- DB tier loading + caching -----

interface PricingTier {
  service_type: string;
  tier_index: number;
  label: string;
  max_sqft: number;
  base_price: number;
}

let tierCache: PricingTier[] | null = null;
let tierCachePromise: Promise<PricingTier[]> | null = null;

export async function loadPricingTiers(): Promise<PricingTier[]> {
  if (tierCache) return tierCache;
  if (tierCachePromise) return tierCachePromise;
  tierCachePromise = (async () => {
    const { data, error } = await supabase
      .from("service_pricing")
      .select("service_type, tier_index, label, max_sqft, base_price")
      .eq("is_active", true)
      .order("service_type")
      .order("tier_index");
    if (error || !data) {
      tierCachePromise = null;
      return [];
    }
    tierCache = data as PricingTier[];
    return tierCache;
  })();
  return tierCachePromise;
}

/** Find the smallest tier whose max_sqft covers the requested sqft. */
export function resolveTierBasePrice(
  tiers: PricingTier[],
  service: ServiceKey,
  sqft: number,
): number | null {
  const meta = getServiceMeta(service);
  if (!meta || !meta.tiered) return null;
  const subset = tiers
    .filter((t) => t.service_type === service)
    .sort((a, b) => a.max_sqft - b.max_sqft);
  if (subset.length === 0) return null;
  const match = subset.find((t) => sqft <= t.max_sqft) ?? subset[subset.length - 1];
  return Number(match.base_price);
}

export interface PriceBreakdown {
  basePrice: number;
  baseAfterDiscount: number;
  addOnsTotal: number;
  total: number;
  /** True if this service requires a custom quote. */
  isCustom: boolean;
  /** Estimated range string (low–high) for display. */
  range: string;
}

export function computePrice(
  tiers: PricingTier[],
  opts: {
    service: ServiceKey;
    sqft: number;
    frequency: string;
    addOnIds: string[];
  },
): PriceBreakdown {
  const meta = getServiceMeta(opts.service);
  const isCustom = !meta?.tiered;

  if (isCustom) {
    return {
      basePrice: 0,
      baseAfterDiscount: 0,
      addOnsTotal: 0,
      total: 0,
      isCustom: true,
      range: "Custom",
    };
  }

  const basePrice = resolveTierBasePrice(tiers, opts.service, opts.sqft) ?? 0;
  const freq = FREQUENCIES.find((f) => f.key === opts.frequency) ?? FREQUENCIES[0];
  const baseAfterDiscount = basePrice * (1 - freq.baseDiscount);

  // Add-ons never receive frequency discount (per business rule).
  // Auto-included add-ons are baked into the base price → skip them in the sum.
  const autoIncluded = new Set(AUTO_INCLUDED_ADDONS[opts.service] ?? []);
  const addOnsTotal = opts.addOnIds.reduce((sum, id) => {
    if (autoIncluded.has(id)) return sum;
    const a = ADD_ONS.find((x) => x.id === id);
    if (!a) return sum;
    const scaled = a.sqftScaling > 0
      ? a.basePrice + a.basePrice * a.sqftScaling * (opts.sqft / 1000)
      : a.basePrice;
    return sum + scaled;
  }, 0);

  let total = baseAfterDiscount + addOnsTotal;
  total = Math.max(PRICE_FLOOR, Math.min(PRICE_CAP, total));

  // Display range: ±15% around total
  const low = Math.round(total * 0.93);
  const high = Math.round(total * 1.13);
  const range = `$${low}–$${high}`;

  return {
    basePrice,
    baseAfterDiscount,
    addOnsTotal,
    total: Math.round(total),
    isCustom: false,
    range,
  };
}
