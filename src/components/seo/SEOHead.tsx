import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  noIndex?: boolean;
  schemaJson?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const WEBSITE = "https://www.tidywisecleaning.com";
const BUSINESS_NAME = "TIDYWISE Cleaning Services";
const DEFAULT_OG_IMAGE = `${WEBSITE}/og-image.webp`;

/**
 * Force every canonical URL to the www apex (https://www.tidywisecleaning.com).
 * Accepts absolute URLs (www or non-www, http or https) and relative paths.
 * This guarantees Google never sees a non-www canonical, even if a caller
 * passes a stale value or a relative path.
 */
const normalizeCanonical = (input: string): string => {
  if (!input) return WEBSITE;
  // Strip protocol + any host variant (www / non-www, http / https) to get the path
  const path = input
    .replace(/^https?:\/\/(www\.)?tidywisecleaning\.com/i, "")
    .replace(/^https?:\/\/[^/]+/i, ""); // any other accidental host
  const cleanPath = path.startsWith("/") || path === "" ? path : `/${path}`;
  return `${WEBSITE}${cleanPath}`;
};

const SEOHead = ({
  title,
  description,
  canonical,
  ogImage,
  noIndex = false,
  schemaJson,
}: SEOHeadProps) => {
  const image = ogImage || DEFAULT_OG_IMAGE;
  const canonicalUrl = normalizeCanonical(canonical);
  const robotsContent = noIndex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  const schemas = schemaJson
    ? Array.isArray(schemaJson)
      ? schemaJson
      : [schemaJson]
    : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={robotsContent} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="TIDYWISE professional cleaning service in South Florida" />
      <meta property="og:site_name" content={BUSINESS_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Hreflang */}
      <link rel="alternate" hrefLang="en-us" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {/* Schema JSON-LD */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOHead;
