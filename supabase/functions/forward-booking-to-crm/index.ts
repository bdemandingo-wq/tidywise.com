// Forwards a newly-created TidyWise booking to the external CRM ingest endpoint.
// The shared secret (EXTERNAL_BOOKING_INGEST_KEY) stays server-side and is never
// exposed to the browser. Failures are non-fatal to the booking flow.
//
// Hardening:
//   - Per-IP rate limit (10/hour) via public.check_rate_limit.
//   - Instead of trusting raw request-body fields, we look up the just-inserted
//     booking row by id server-side (service role) and forward THOSE values.
//     Junk can only reach the CRM if it first passed the real booking flow's
//     validation and landed a row in public.bookings.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CRM_INGEST_URL =
  "https://slwfkaqczvwvvvavkgpr.supabase.co/functions/v1/ingest-external-booking";

// Map TidyWise labels/keys -> CRM's accepted frequency enum
// (recurring_bookings_frequency_check). Anything unrecognized => one_time.
function normalizeFrequency(input: unknown): string {
  const v = String(input ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (v.includes("week") && (v.includes("bi") || v.includes("2"))) return "biweekly";
  if (v.includes("week")) return "weekly";
  if (v.includes("month")) return "monthly";
  return "one_time";
}

// Map any TidyWise service label/variant -> the canonical service name the CRM
// expects. The CRM matches `service` against its own services list, so legacy or
// reworded labels ("Deep Clean (First Cleaning)", "Move In/Move Out Clean") must
// be normalized. Unknown labels are forwarded as-is so the CRM can still try.
function normalizeService(input: unknown): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("post") && v.includes("construction")) return "Post-Construction";
  if (v.includes("move")) return "Move In/Out";
  if (v.includes("carpet")) return "Carpet Cleaning";
  if (v.includes("upholstery")) return "Upholstery Cleaning";
  if (v.includes("deep")) return "Deep Cleaning";
  if (v.includes("standard")) return "Standard Cleaning";
  return raw;
}

// Best-effort parse of a free-text US address into street/city/state/zip. The
// CRM reads city / state / zip_code as SEPARATE fields — sending only the
// combined `address` string leaves those columns blank in its scheduler, which
// is exactly the regression this restores. Google-autocompleted addresses look
// like "65 SW 12th Ave, Deerfield Beach, FL 33441, USA".
function parseAddress(raw: unknown): { street: string | null; city: string | null; state: string | null; zip: string | null } {
  const full = String(raw ?? "").trim();
  if (!full) return { street: null, city: null, state: null, zip: null };

  const parts = full
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^(usa|united states)$/i.test(p));

  let street: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let zip: string | null = null;

  const last = parts[parts.length - 1] ?? "";
  const stateZip = last.match(/^([A-Za-z]{2})?\s*(\d{5}(?:-\d{4})?)?$/);
  const hasStateZip = !!last && !!stateZip && (!!stateZip[1] || !!stateZip[2]);

  if (parts.length >= 3 && hasStateZip) {
    state = stateZip![1]?.toUpperCase() ?? null;
    zip = stateZip![2] ?? null;
    city = parts[parts.length - 2] ?? null;
    street = parts.slice(0, parts.length - 2).join(", ") || null;
  } else if (parts.length === 2) {
    street = parts[0] ?? null;
    city = parts[1] ?? null;
  } else {
    street = full || null;
  }

  return { street, city, state, zip };
}

// Google Maps geocoding via the Lovable connector gateway. Handles addresses
// typed without commas ("65 sw 12th ave deerfield beach"), which the string
// parser above cannot. Returns null on any failure so the caller falls back.
const MAPS_GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

async function geocodeAddress(
  raw: unknown,
): Promise<{ street: string | null; city: string | null; state: string | null; zip: string | null } | null> {
  const full = String(raw ?? "").trim();
  if (!full) return null;

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!lovableKey || !mapsKey) return null;

  try {
    const res = await fetch(
      `${MAPS_GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(full)}&region=us`,
      { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsKey } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.results?.[0];
    if (!result) return null;

    const comps: Array<{ long_name: string; short_name: string; types: string[] }> =
      result.address_components ?? [];
    const get = (type: string, short = false) => {
      const c = comps.find((x) => x.types.includes(type));
      return c ? (short ? c.short_name : c.long_name) : null;
    };

    const street = [get("street_number"), get("route")].filter(Boolean).join(" ") || null;
    const city =
      get("locality") || get("postal_town") || get("sublocality") ||
      get("administrative_area_level_3") || null;
    const state = get("administrative_area_level_1", true);
    const zip = get("postal_code");

    if (!city && !state && !zip) return null;
    return { street, city, state, zip };
  } catch (_e) {
    return null;
  }
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ingestKey = Deno.env.get("EXTERNAL_BOOKING_INGEST_KEY");
  if (!ingestKey) {
    return new Response(
      JSON.stringify({ error: "EXTERNAL_BOOKING_INGEST_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ---- Per-IP rate limit: 10/hour ----
  const ip = getClientIp(req);
  const { data: allowed, error: rlErr } = await supabase.rpc("check_rate_limit", {
    _bucket: "forward-booking-to-crm",
    _identifier: ip,
    _max: 10,
    _window: "01:00:00",
  });
  if (rlErr) {
    console.error("Rate limit check failed:", rlErr);
  } else if (allowed === false) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require a booking id and load the real row server-side. Only values that
  // already passed the booking flow's validation get forwarded to the CRM.
  const bookingId = String(body?.bookingId ?? body?.id ?? "").trim();
  if (!bookingId) {
    return new Response(
      JSON.stringify({ error: "bookingId is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr) {
    console.error("Booking lookup failed:", fetchErr);
    return new Response(
      JSON.stringify({ error: "Booking lookup failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (!booking) {
    return new Response(
      JSON.stringify({ error: "Booking not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Build scheduled_at from the stored preferred_date + time_slot.
  let scheduledAt: string | null = null;
  try {
    const time = booking.time_slot ? `${booking.time_slot}:00` : "00:00:00";
    const d = new Date(`${booking.preferred_date}T${time}`);
    scheduledAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    scheduledAt = null;
  }

  // Split the single stored address into the discrete fields the CRM reads.
  // Geocoding first (handles comma-less free text), naive parser as fallback.
  const loc = (await geocodeAddress(booking.address)) ?? parseAddress(booking.address);

  // The CRM accepts name OR first_name/last_name. Send both: it uses `name` for
  // display and the split parts for its own first/last columns.
  const fullName = String(booking.customer_name ?? "").trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  // Map trusted TidyWise booking row -> CRM ingest payload
  const payload = {
    name: booking.customer_name,
    first_name: firstName,
    last_name: lastName,
    email: booking.customer_email,
    phone: booking.customer_phone ?? null,
    // Street only — city/state/zip go in their own fields below, or the CRM's
    // columns stay blank.
    address: loc.street ?? booking.address ?? null,
    city: loc.city,
    state: loc.state,
    zip_code: loc.zip,
    scheduled_at: scheduledAt,
    service: normalizeService(booking.service_type),
    total_amount: Number.isFinite(+booking.total_price) ? +booking.total_price : 0,
    frequency: normalizeFrequency(booking.frequency),
    bedrooms: booking.beds ?? null,
    bathrooms: booking.baths ?? null,
    square_footage: booking.sqft != null ? String(booking.sqft) : null,
    extras: Array.isArray(booking.add_ons) ? booking.add_ons : [],
    notes: booking.special_instructions ?? null,
    // The whole point of this integration: the card travels with the booking so
    // the CRM can charge without asking the customer again. Both columns already
    // exist on public.bookings; they are null until the card is saved.
    stripe_customer_id: booking.stripe_customer_id ?? null,
    stripe_payment_method_id: booking.stripe_payment_method_id ?? null,
  };

  // Record the outcome on our own booking row. This is the ONLY place a failed
  // forward becomes visible — the HTTP status is always 200 by design, so
  // without this a booking that never reached the CRM looks identical to one
  // that did.
  const recordOutcome = async (
    status: "synced" | "failed" | "unreachable",
    error: string | null,
  ) => {
    const { error: updErr } = await supabase
      .from("bookings")
      .update({
        crm_sync_status: status,
        crm_synced_at: status === "synced" ? new Date().toISOString() : null,
        // Truncated: this column is for triage, not for storing a CRM stack trace.
        crm_error: error ? error.slice(0, 500) : null,
      })
      .eq("id", bookingId);
    if (updErr) {
      // Deliberately only logged. Failing to record the outcome must not itself
      // break the booking flow — that would be the same mistake one level up.
      console.error("Failed to record CRM sync status:", updErr);
    }
  };

  try {
    const res = await fetch(CRM_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // x-api-key is the ONLY header the CRM reads. The previous version also
        // sent x-ingest-key, apikey and Authorization: Bearer <secret>; all three
        // were ignored, and the last one put the shared secret in an Authorization
        // header for no benefit. A live probe sending x-api-key alone returned 200.
        "x-api-key": ingestKey,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (res.ok) {
      await recordOutcome("synced", null);
    } else {
      await recordOutcome("failed", `HTTP ${res.status}: ${text}`);
    }

    return new Response(JSON.stringify({ ok: res.ok, status: res.status, crm: data }), {
      // Always 200: CRM forwarding is non-fatal to the booking flow.
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Network-level failure — the CRM was never reached at all. Distinct from
    // "failed", which means it answered and refused.
    await recordOutcome("unreachable", String(err));
    return new Response(
      JSON.stringify({ ok: false, error: "Failed to reach CRM", details: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
