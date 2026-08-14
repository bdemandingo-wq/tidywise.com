# Card-on-file for bookings (Stripe setup mode)

Report first — nothing implemented yet.

## 1. Stripe keys

Not present. Project secrets today: CRON_SECRET, EXTERNAL_BOOKING_INGEST_KEY, Google Maps/GSC keys, LOVABLE_API_KEY, OPENPHONE_API_KEY, RESEND_API_KEY, plus the managed backend keys. There is **no** `STRIPE_SECRET_KEY` and no Stripe code anywhere in the repo.

Needed:
- `STRIPE_SECRET_KEY` — from the Stripe dashboard (Developers > API keys). Live vs test decides whether real cards save.
- `STRIPE_WEBHOOK_SECRET` — created when the webhook endpoint is registered in Stripe, after the webhook function is deployed.

Alternative: Lovable's built-in payments integration provisions Stripe without you managing an account. Setup-mode (save card, charge later) is a custom flow either way, so a plain secret key is the simpler fit here.

## 2. Table changes

One table, `bookings`, five new nullable columns:

| Column | Type | Purpose |
|---|---|---|
| `stripe_customer_id` | text | Stripe customer matched/created by email |
| `stripe_payment_method_id` | text | Saved card, set by webhook on setup completion |
| `card_on_file_status` | text, default `'pending'` | `pending` / `sent` / `saved` / `failed` |
| `card_setup_link_sent_at` | timestamptz | For reminder logic and admin visibility |
| `card_saved_at` | timestamptz | When the card actually landed |

No new table needed. The Checkout Session id can be tracked in a sixth column (`stripe_setup_session_id`) if you want idempotent re-sends — recommended.

RLS: these columns must stay invisible to anonymous readers. Current booking policies already restrict row reads; the customer-facing link page will read the booking through an edge function using the session id, not via the Data API.

## 3. Where the link is sent from

Three functions, two new:

- **New: `create-card-setup-session`** — takes a bookingId, looks the row up server-side (same pattern as `forward-booking-to-crm`), finds-or-creates the Stripe customer by email, opens a Checkout Session in `mode: 'setup'`, writes `stripe_customer_id` + session id to the row, returns the URL.
- **Existing: `send-sms-notification`** — the SMS carrying the link goes here, as a new `message_type`. It already reads authoritative values from the booking row, already rate-limits by IP, and already logs to `sms_send_log`. Adding a case is cheaper and safer than a parallel sender.
- **Email**: `send-booking-confirmation` exists and RESEND_API_KEY is set, but project policy is SMS-only, emails disabled. If you want the link by email too, that function is where it goes and the SMS-only rule needs an explicit exception for this one transactional message.
- **New: `stripe-setup-webhook`** — `verify_jwt = false`, verifies the Stripe signature, handles `checkout.session.completed`, pulls the SetupIntent's payment method, writes `stripe_payment_method_id` + `card_saved_at` + status `saved`.

Trigger point: after the booking insert succeeds in `src/pages/BookingForm.tsx`, alongside the existing `forward-booking-to-crm` and `send-sms-notification` calls.

## 4. If the customer never clicks

The booking stands. Nothing about confirmation, scheduling, or the CRM forward depends on the card. `card_on_file_status` simply stays `pending`/`sent`, and that booking gets collected the way you collect today.

Suggested handling, all optional:
- Admin dashboard column showing card status so you can see who has no card before dispatch.
- One reminder SMS at ~24h if status is still `sent`.
- No auto-cancel. Hard-gating the booking on a card would cost conversions, which is the stated top priority.

## 5. Blast radius

Small but not zero.

- **`src/pages/BookingForm.tsx`** — one added function call in the existing post-insert block. The submit path already tolerates a failing side-effect call; the card session call must be wrapped the same way so a Stripe outage never blocks a booking.
- **`bookings` table** — additive columns only, all nullable. No existing insert breaks. The recently-fixed `time_slot` and `sms_consent` paths are untouched.
- **`send-sms-notification`** — a new branch. The existing `booking` branch, its retry loop, and its rate limit stay as-is. Risk is a second SMS arriving near the confirmation SMS; combining them into one message is an option.
- **`forward-booking-to-crm`** — unchanged unless you want the Stripe customer id forwarded too.
- **The reassurance line** — stays exactly where it is, above "Confirm My Booking". Once a real card page exists, that same sentence should also appear on the Stripe-hosted page (Checkout supports custom submit text) so the promise follows the customer.
- **Cost/compliance** — no PCI scope change; the card never touches this site. Stripe setup-mode sessions are free; charges later carry normal Stripe fees.

## Open questions before building

1. Live keys or test keys first?
2. SMS-only for the link, or make an email exception?
3. Separate SMS, or fold the link into the existing confirmation SMS?
4. Should the admin dashboard get the card-status column in the same pass?
