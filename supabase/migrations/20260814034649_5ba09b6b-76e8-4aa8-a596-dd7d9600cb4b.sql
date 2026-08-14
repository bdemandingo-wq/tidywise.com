ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS stripe_setup_session_id text,
  ADD COLUMN IF NOT EXISTS card_on_file_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS card_setup_link_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS card_saved_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_stripe_setup_session_id_idx
  ON public.bookings (stripe_setup_session_id);