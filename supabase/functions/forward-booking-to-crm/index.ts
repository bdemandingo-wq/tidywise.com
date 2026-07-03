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

// Best-effort parse of a single free-text US address string into
// { street, city, state, zip }. The CRM's ingest endpoint reads city / state /
// zip_code as SEPARATE fields — if we only send the combined `address` string,
// those columns land blank in the scheduler. Google-autocompleted addresses
// look like "65 SW 12th Ave, Deerfield Beach, FL 33441, USA".
function parseAddress(raw: unknown): { street: string | null; city: string | null; state: string | null; zip: string | null } {
  const full = String(raw ?? "").trim();
  if (!full) return { street: null, city: null, state: null, zip: null };

  // Drop a trailing country token like "USA" / "United States".
  const parts = full
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^(usa|united states)$/i.test(p));

  let street: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let zip: string | null = null;

  // Pull a "FL 33441" or "FL" or "33441" out of the last segment.
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

  // Map trusted TidyWise booking row -> CRM ingest payload
  const payload = {
    // Hardcoded TIDYWISE org ID so the CRM attributes bookings to this site.
    organization_id: "e95b92d0-7099-408e-a773-e4407b34f8b4",
    name: booking.customer_name,
    email: booking.customer_email,
    phone: booking.customer_phone ?? null,
    address: booking.address ?? null,
    scheduled_at: scheduledAt,
    service: booking.service_type ?? null,
    total_amount: Number.isFinite(+booking.total_price) ? +booking.total_price : 0,
    frequency: normalizeFrequency(booking.frequency),
    bathrooms: booking.baths ?? null,
    square_footage: booking.sqft != null ? String(booking.sqft) : null,
    extras: Array.isArray(booking.add_ons) ? booking.add_ons : [],
    notes: booking.special_instructions ?? null,
  };

  try {
    const res = await fetch(CRM_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, crm: data }), {
      status: res.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to reach CRM", details: String(err) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
