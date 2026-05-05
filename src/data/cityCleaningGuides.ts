// Canonical list of city blog guides surfaced for SEO crawlability.
// Linked from the homepage (CityCleaningGuides section) and the footer
// (compact list on every page) so Google can crawl into them — they were
// previously orphaned and being skipped despite being in the sitemap.
//
// Hardcoded vs. derived from cityLinkMap on purpose: that map carries
// non-cleaning blog variants (airbnb-cleaning-*, etc.) we don't want here.

export interface CityCleaningGuide {
  /** Display name, e.g. "Fort Lauderdale". */
  name: string;
  /** Full path to the blog post, e.g. "/blog/house-cleaning-fort-lauderdale". */
  path: string;
}

export const CITY_CLEANING_GUIDES: ReadonlyArray<CityCleaningGuide> = [
  { name: "Fort Lauderdale",  path: "/blog/house-cleaning-fort-lauderdale" },
  { name: "Boca Raton",       path: "/blog/house-cleaning-boca-raton" },
  { name: "Miami",            path: "/blog/house-cleaning-miami" },
  { name: "Miami Beach",      path: "/blog/house-cleaning-miami-beach" },
  { name: "Coral Gables",     path: "/blog/house-cleaning-coral-gables" },
  { name: "Coral Springs",    path: "/blog/house-cleaning-coral-springs" },
  { name: "Deerfield Beach",  path: "/blog/house-cleaning-deerfield-beach" },
  { name: "Delray Beach",     path: "/blog/house-cleaning-delray-beach" },
  { name: "Boynton Beach",    path: "/blog/house-cleaning-boynton-beach" },
  { name: "Coconut Creek",    path: "/blog/house-cleaning-coconut-creek" },
  { name: "Davie",            path: "/blog/house-cleaning-davie" },
  { name: "Doral",            path: "/blog/house-cleaning-doral" },
  { name: "Hallandale Beach", path: "/blog/house-cleaning-hallandale-beach" },
  { name: "Hialeah",          path: "/blog/house-cleaning-hialeah" },
  { name: "Jupiter",          path: "/blog/house-cleaning-jupiter" },
  { name: "Lake Worth",       path: "/blog/house-cleaning-lake-worth" },
  { name: "Miami Gardens",    path: "/blog/house-cleaning-miami-gardens" },
  { name: "Miramar",          path: "/blog/house-cleaning-miramar" },
  { name: "Aventura",         path: "/blog/house-cleaning-aventura" },
];
