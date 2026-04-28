
-- Create safe public view excluding review_token
CREATE OR REPLACE VIEW public.public_reviews
WITH (security_invoker = on) AS
SELECT
  id,
  booking_id,
  customer_name,
  location,
  rating,
  review_text,
  status,
  created_at,
  updated_at
FROM public.reviews
WHERE status = 'approved';

GRANT SELECT ON public.public_reviews TO anon, authenticated;

-- Lock down the base table: revoke all column-level SELECT access from anon/authenticated
REVOKE SELECT ON public.reviews FROM anon, authenticated;

-- Drop the public-facing SELECT policy on the base table; clients must use the view
DROP POLICY IF EXISTS "Public view approved reviews safe" ON public.reviews;

-- Admins keep full access via existing "Admins view all reviews" policy.
-- service_role bypasses RLS by default and retains full access including review_token.
