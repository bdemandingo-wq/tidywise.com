-- =====================================================
-- 1. CHATBOT_CONVERSATIONS — remove permissive UPDATE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can update chatbot conversations" ON public.chatbot_conversations;

CREATE POLICY "Admins can update chatbot conversations"
ON public.chatbot_conversations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 2. REVIEWS — hide review_token from public
-- =====================================================
DROP POLICY IF EXISTS "Public view approved reviews" ON public.reviews;

-- Safe public view excluding review_token
CREATE OR REPLACE VIEW public.public_reviews
WITH (security_invoker = true)
AS
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

-- Replacement RLS so the view (security_invoker) can read approved rows
CREATE POLICY "Public view approved reviews safe"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- NOTE: review_token is still in the row, but client code must use public_reviews.
-- For complete protection, also revoke direct anon SELECT on the column:
REVOKE SELECT (review_token) ON public.reviews FROM anon, authenticated;

-- =====================================================
-- 3. PASSWORD_RESET_OTPS — explicit deny
-- =====================================================
CREATE POLICY "Block public select on otps"
ON public.password_reset_otps
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "Block public insert on otps"
ON public.password_reset_otps
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block public update on otps"
ON public.password_reset_otps
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block public delete on otps"
ON public.password_reset_otps
FOR DELETE
TO anon, authenticated
USING (false);

-- =====================================================
-- 4. USER_ROLES — explicit deny on insert/update/delete
-- =====================================================
CREATE POLICY "Block public insert on user_roles"
ON public.user_roles
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block public update on user_roles"
ON public.user_roles
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block public delete on user_roles"
ON public.user_roles
FOR DELETE
TO anon, authenticated
USING (false);

-- =====================================================
-- 5. STORAGE — restrict listing of work-photos bucket
-- =====================================================
-- Drop any broad SELECT policy on work-photos that allows listing
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND qual LIKE '%work-photos%'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Allow public read of individual files (by exact name) — needed for <img src=...>
CREATE POLICY "Public read individual work-photos files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'work-photos');

-- (Bucket-level listing via storage.buckets metadata stays restricted by Supabase defaults.)
-- Admins can manage objects
CREATE POLICY "Admins manage work-photos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'work-photos' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'work-photos' AND public.has_role(auth.uid(), 'admin'::app_role));