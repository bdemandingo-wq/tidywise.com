-- ============================================================
-- 1. Bookings: idempotency + safe lookup by key
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_idempotency_key_uniq
  ON public.bookings (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Security-definer function: callers pass the booking id + idempotency key.
-- Returns the row only when both match. Lets the confirmation page work
-- for unauthenticated customers without exposing other bookings.
CREATE OR REPLACE FUNCTION public.get_booking_by_idempotency_key(
  _booking_id UUID,
  _idempotency_key TEXT
)
RETURNS SETOF public.bookings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.bookings
  WHERE id = _booking_id
    AND idempotency_key IS NOT NULL
    AND idempotency_key = _idempotency_key
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_by_idempotency_key(UUID, TEXT)
  TO anon, authenticated;

-- ============================================================
-- 2. Booking date validation trigger (Eastern Time aware)
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_booking_date_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parsed_date DATE;
  today_et DATE;
  min_date DATE;
  max_date DATE;
BEGIN
  -- Try to parse common formats; ignore validation if unparseable
  -- (frontend sends "Tuesday, April 28, 2026" or "YYYY-MM-DD")
  BEGIN
    parsed_date := NEW.preferred_date::date;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      parsed_date := to_date(NEW.preferred_date, 'FMDay, FMMonth FMDD, YYYY');
    EXCEPTION WHEN OTHERS THEN
      RETURN NEW; -- skip validation; better to allow than break booking
    END;
  END;

  today_et := (now() AT TIME ZONE 'America/New_York')::date;
  min_date := today_et + INTERVAL '2 days';
  max_date := today_et + INTERVAL '90 days';

  IF parsed_date < min_date THEN
    RAISE EXCEPTION 'Bookings must be at least 2 days in advance (Eastern Time). Earliest available: %', min_date;
  END IF;

  IF parsed_date > max_date THEN
    RAISE EXCEPTION 'Bookings cannot be more than 90 days in advance.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.booking_blocked_dates
    WHERE blocked_date = parsed_date
  ) THEN
    RAISE EXCEPTION 'Selected date is unavailable. Please choose another date.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_date_window_check ON public.bookings;
CREATE TRIGGER booking_date_window_check
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_date_window();

-- ============================================================
-- 3. Add post-construction pricing (mirrors moveinout)
-- ============================================================
INSERT INTO public.service_pricing (service_type, tier_index, label, max_sqft, base_price, is_active)
VALUES
  ('postconstruction', 0, 'Up to 750 sf', 750, 350, true),
  ('postconstruction', 1, 'Up to 1000 sf', 1000, 395, true),
  ('postconstruction', 2, 'Up to 1250 sf', 1250, 440, true),
  ('postconstruction', 3, 'Up to 1500 sf', 1500, 485, true),
  ('postconstruction', 4, 'Up to 1800 sf', 1800, 530, true),
  ('postconstruction', 5, 'Up to 2100 sf', 2100, 575, true),
  ('postconstruction', 6, 'Up to 2400 sf', 2400, 640, true),
  ('postconstruction', 7, 'Up to 2700 sf', 2700, 705, true),
  ('postconstruction', 8, 'Up to 3000 sf', 3000, 770, true),
  ('postconstruction', 9, 'Up to 3300 sf', 3300, 845, true),
  ('postconstruction', 10, 'Up to 3600 sf', 3600, 920, true),
  ('postconstruction', 11, 'Up to 4000 sf', 4000, 985, true),
  ('postconstruction', 12, 'Up to 4400 sf', 4400, 1050, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. SMS send log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  recipient_type TEXT NOT NULL, -- 'admin' | 'personal' | 'customer'
  message_type TEXT NOT NULL,   -- 'booking' | 'cleaner_application' | 'contact'
  success BOOLEAN NOT NULL,
  error_message TEXT,
  provider_message_id TEXT,
  related_booking_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_send_log_created_idx ON public.sms_send_log (created_at DESC);
CREATE INDEX IF NOT EXISTS sms_send_log_failures_idx
  ON public.sms_send_log (created_at DESC) WHERE success = false;

ALTER TABLE public.sms_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sms_send_log"
  ON public.sms_send_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block public writes on sms_send_log"
  ON public.sms_send_log FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
