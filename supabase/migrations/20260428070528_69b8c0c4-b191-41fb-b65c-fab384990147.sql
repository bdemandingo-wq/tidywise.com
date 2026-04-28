
-- 1. REVIEWS: hide review_token from anon/authenticated
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, booking_id, customer_name, location, rating, review_text, status, created_at, updated_at)
  ON public.reviews TO anon, authenticated;

-- 2. BOOKINGS: tighten INSERT policy
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NULL AND customer_id IS NULL)
    OR (auth.uid() IS NOT NULL AND customer_id = auth.uid())
  );

-- 3. BLOG_POSTS: restrict overly-permissive ALL policy to service_role
DROP POLICY IF EXISTS "Service role can manage blog posts" ON public.blog_posts;
CREATE POLICY "Service role can manage blog posts"
  ON public.blog_posts
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Also allow admins to manage blog posts (for the admin UI)
CREATE POLICY "Admins can manage blog posts"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. STORAGE: supply-pictures - restrict uploads to image MIME types
DROP POLICY IF EXISTS "Anyone can upload supply pictures" ON storage.objects;
CREATE POLICY "Anyone can upload supply pictures"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'supply-pictures'
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'heic')
  );

-- Add file size limit and MIME type restrictions on the bucket itself
UPDATE storage.buckets
SET file_size_limit = 10485760,  -- 10 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
WHERE id = 'supply-pictures';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
WHERE id = 'work-photos';

-- 5. SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated
-- These are used internally by triggers and RLS; revoking EXECUTE does not affect RLS evaluation
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_booking_customer_id() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
-- has_role must remain executable for RLS expressions to work for authenticated users
