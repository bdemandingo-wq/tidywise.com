-- work-photos is a PUBLIC marketing/display bucket (our-work gallery).
-- Individual files are served via the public CDN endpoint, which bypasses RLS,
-- so we can remove the broad anon/authenticated SELECT policy that enabled
-- listing/enumeration of every file. Direct-URL reads continue to work.
DROP POLICY IF EXISTS "Public read individual work-photos files" ON storage.objects;

-- Admin management policies remain untouched (upload/update/delete).
