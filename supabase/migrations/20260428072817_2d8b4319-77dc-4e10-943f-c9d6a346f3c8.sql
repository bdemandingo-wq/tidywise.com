
-- 1. REVIEWS: Add expiration to tokens, secure default, index
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Default new tokens to expire in 30 days; use gen_random_uuid for entropy
ALTER TABLE public.reviews
  ALTER COLUMN review_token SET DEFAULT gen_random_uuid()::text;

CREATE INDEX IF NOT EXISTS idx_reviews_review_token ON public.reviews(review_token) WHERE review_token IS NOT NULL;

-- Backfill expirations for existing tokens (30 days from now for any without one)
UPDATE public.reviews
SET token_expires_at = now() + INTERVAL '30 days'
WHERE review_token IS NOT NULL AND token_expires_at IS NULL;

-- Update the public_reviews view to include the new column without exposing the token
CREATE OR REPLACE VIEW public.public_reviews
WITH (security_invoker = on) AS
SELECT id, booking_id, customer_name, location, rating, review_text, status, created_at, updated_at
FROM public.reviews
WHERE status = 'approved';

GRANT SELECT ON public.public_reviews TO anon, authenticated;

-- 2. REVIEW SUBMISSION RATE LIMITING (per session/conversation, since IP isn't reliably available in RLS)
-- Use a lightweight tracking table keyed on customer_name + created_at
CREATE TABLE IF NOT EXISTS public.review_submission_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- hash of customer info
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_submission_log_identifier_time
  ON public.review_submission_log(identifier, created_at DESC);

ALTER TABLE public.review_submission_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all public access to review_submission_log"
  ON public.review_submission_log FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.enforce_review_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INT;
  ident TEXT;
BEGIN
  -- Identifier: customer_name + booking_id (best proxy without request IP)
  ident := encode(digest(COALESCE(NEW.customer_name, '') || COALESCE(NEW.booking_id::text, ''), 'sha256'), 'hex');

  SELECT COUNT(*) INTO recent_count
  FROM public.review_submission_log
  WHERE identifier = ident
    AND created_at > now() - INTERVAL '1 hour';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many review submissions in the last hour';
  END IF;

  INSERT INTO public.review_submission_log (identifier) VALUES (ident);

  -- Auto-set token expiration if a token is provided without one
  IF NEW.review_token IS NOT NULL AND NEW.token_expires_at IS NULL THEN
    NEW.token_expires_at := now() + INTERVAL '30 days';
  END IF;

  RETURN NEW;
END;
$$;

-- Need pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS reviews_rate_limit_trigger ON public.reviews;
CREATE TRIGGER reviews_rate_limit_trigger
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_review_rate_limit();

REVOKE EXECUTE ON FUNCTION public.enforce_review_rate_limit() FROM anon, authenticated;

-- 3. CHATBOT_CONVERSATIONS: Normalize all DML policies to {public} for consistency
DROP POLICY IF EXISTS "Admins can update chatbot conversations" ON public.chatbot_conversations;
CREATE POLICY "Admins update chatbot_conversations"
  ON public.chatbot_conversations FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. REPLACE "always true" WITH CHECK insert policies with field-validation checks
-- These remain effectively public (anonymous lead capture is required) but enforce minimum data quality.

-- abandoned_leads
DROP POLICY IF EXISTS "Anyone can create abandoned_leads" ON public.abandoned_leads;
CREATE POLICY "Anyone can create abandoned_leads"
  ON public.abandoned_leads FOR INSERT TO public
  WITH CHECK (
    customer_email IS NOT NULL
    AND length(customer_email) BETWEEN 3 AND 255
    AND customer_email LIKE '%_@_%.__%'
    AND length(COALESCE(customer_name, '')) <= 200
    AND length(COALESCE(customer_phone, '')) <= 50
  );

-- bookings: keep current policy (already has ownership check), but tighten data
-- (Already tightened in prior migration, leave as-is.)

-- chatbot_conversations
DROP POLICY IF EXISTS "Anyone can create chatbot conversations" ON public.chatbot_conversations;
CREATE POLICY "Anyone can create chatbot conversations"
  ON public.chatbot_conversations FOR INSERT TO public
  WITH CHECK (
    flow_type IS NOT NULL
    AND length(flow_type) BETWEEN 1 AND 100
    AND length(COALESCE(customer_name, '')) <= 200
    AND length(COALESCE(customer_email, '')) <= 255
    AND length(COALESCE(customer_phone, '')) <= 50
  );

-- cleaner_applications
DROP POLICY IF EXISTS "Anyone can submit an application" ON public.cleaner_applications;
CREATE POLICY "Anyone can submit an application"
  ON public.cleaner_applications FOR INSERT TO public
  WITH CHECK (
    name IS NOT NULL AND length(name) BETWEEN 1 AND 200
    AND email IS NOT NULL AND length(email) BETWEEN 3 AND 255 AND email LIKE '%_@_%.__%'
    AND length(COALESCE(phone, '')) <= 50
    AND years_experience >= 0 AND years_experience <= 80
  );

-- commercial_requests
DROP POLICY IF EXISTS "Anyone can submit commercial requests" ON public.commercial_requests;
CREATE POLICY "Anyone can submit commercial requests"
  ON public.commercial_requests FOR INSERT TO public
  WITH CHECK (
    company_name IS NOT NULL AND length(company_name) BETWEEN 1 AND 200
    AND contact_name IS NOT NULL AND length(contact_name) BETWEEN 1 AND 200
    AND email IS NOT NULL AND length(email) BETWEEN 3 AND 255 AND email LIKE '%_@_%.__%'
    AND phone IS NOT NULL AND length(phone) BETWEEN 5 AND 50
    AND length(COALESCE(message, '')) <= 5000
  );

-- quote_requests
DROP POLICY IF EXISTS "Anyone can submit quote requests" ON public.quote_requests;
CREATE POLICY "Anyone can submit quote requests"
  ON public.quote_requests FOR INSERT TO public
  WITH CHECK (
    first_name IS NOT NULL AND length(first_name) BETWEEN 1 AND 100
    AND last_name IS NOT NULL AND length(last_name) BETWEEN 1 AND 100
    AND email IS NOT NULL AND length(email) BETWEEN 3 AND 255 AND email LIKE '%_@_%.__%'
    AND phone IS NOT NULL AND length(phone) BETWEEN 5 AND 50
    AND zip IS NOT NULL AND length(zip) BETWEEN 3 AND 20
  );

-- reviews
DROP POLICY IF EXISTS "Anyone can submit review" ON public.reviews;
CREATE POLICY "Anyone can submit review"
  ON public.reviews FOR INSERT TO public
  WITH CHECK (
    customer_name IS NOT NULL AND length(customer_name) BETWEEN 1 AND 200
    AND rating BETWEEN 1 AND 5
    AND review_text IS NOT NULL AND length(review_text) BETWEEN 1 AND 5000
    AND length(COALESCE(location, '')) <= 200
  );
