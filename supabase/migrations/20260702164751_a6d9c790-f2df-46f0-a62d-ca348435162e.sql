-- Harden supply-pictures uploads.
-- The only legitimate uploader is the public /apply cleaner-application form
-- (anonymous applicants), so we keep anon INSERT but add a 10 MB size cap and
-- retain the existing image extension allow-list.
DROP POLICY IF EXISTS "Anyone can upload supply pictures" ON storage.objects;

CREATE POLICY "Applicants can upload supply pictures"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'supply-pictures'
  AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','webp','gif','heic'])
  AND coalesce((metadata ->> 'size')::bigint, 0) <= 10485760
);