// Single source of truth for cross-linking city service pages, city blog
// posts, and nearby cities. Consumed by the SEO RelatedLinks component
// to render contextual "Cleaning Guides for {City}" sections on city
// pages and "Service Areas We Cover" sections on city blog posts.
//
// Adding a new city: append an entry below. Adding a new city blog post:
// append it to the city's `blogPosts` array. The link UI updates
// automatically; no per-page edits required.

export type County = "broward" | "palm-beach" | "miami-dade";

export interface CityBlogPost {
  /** Full path including the leading "/blog/" prefix. */
  path: string;
  /** Anchor text used when linking from a city page to this guide. */
  anchor: string;
}

export interface CityInfo {
  /** Lowercase, hyphenated slug. Used to derive the /[slug]-cleaning route. */
  slug: string;
  /** Display name. */
  name: string;
  county: County;
  /** Slugs of 4-5 nearby cities, ordered by adjacency. */
  neighbors: string[];
  /** Blog posts about this city, in editorial priority order. */
  blogPosts: CityBlogPost[];
}

const broward: CityInfo[] = [
  {
    slug: "fort-lauderdale",
    name: "Fort Lauderdale",
    county: "broward",
    neighbors: ["oakland-park", "wilton-manors", "pompano-beach", "hollywood", "plantation"],
    blogPosts: [
      { path: "/blog/house-cleaning-fort-lauderdale", anchor: "House Cleaning Guide for Fort Lauderdale" },
      { path: "/blog/airbnb-cleaning-fort-lauderdale", anchor: "Airbnb Turnover Cleaning in Fort Lauderdale" },
    ],
  },
  {
    slug: "hollywood",
    name: "Hollywood",
    county: "broward",
    neighbors: ["fort-lauderdale", "hallandale-beach", "pembroke-pines", "miramar", "dania-beach"],
    blogPosts: [
      { path: "/blog/house-cleaning-hollywood-florida", anchor: "House Cleaning Guide for Hollywood, FL" },
    ],
  },
  {
    slug: "pompano-beach",
    name: "Pompano Beach",
    county: "broward",
    neighbors: ["fort-lauderdale", "deerfield-beach", "lighthouse-point", "oakland-park", "coconut-creek"],
    blogPosts: [{ path: "/blog/house-cleaning-pompano-beach", anchor: "House Cleaning Guide for Pompano Beach" }],
  },
  {
    slug: "plantation",
    name: "Plantation",
    county: "broward",
    neighbors: ["fort-lauderdale", "sunrise", "davie", "lauderhill", "tamarac"],
    blogPosts: [{ path: "/blog/house-cleaning-plantation", anchor: "House Cleaning Guide for Plantation" }],
  },
  {
    slug: "sunrise",
    name: "Sunrise",
    county: "broward",
    neighbors: ["plantation", "tamarac", "lauderhill", "weston", "davie"],
    blogPosts: [{ path: "/blog/house-cleaning-sunrise", anchor: "House Cleaning Guide for Sunrise" }],
  },
  {
    slug: "davie",
    name: "Davie",
    county: "broward",
    neighbors: ["plantation", "cooper-city", "weston", "fort-lauderdale", "pembroke-pines"],
    blogPosts: [{ path: "/blog/house-cleaning-davie", anchor: "House Cleaning Guide for Davie" }],
  },
  {
    slug: "pembroke-pines",
    name: "Pembroke Pines",
    county: "broward",
    neighbors: ["miramar", "cooper-city", "davie", "hollywood", "weston"],
    blogPosts: [{ path: "/blog/house-cleaning-pembroke-pines", anchor: "House Cleaning Guide for Pembroke Pines" }],
  },
  {
    slug: "weston",
    name: "Weston",
    county: "broward",
    neighbors: ["davie", "sunrise", "pembroke-pines", "cooper-city", "plantation"],
    blogPosts: [{ path: "/blog/house-cleaning-weston", anchor: "House Cleaning Guide for Weston" }],
  },
  {
    slug: "deerfield-beach",
    name: "Deerfield Beach",
    county: "broward",
    neighbors: ["pompano-beach", "boca-raton", "coconut-creek", "coral-springs", "lighthouse-point"],
    blogPosts: [{ path: "/blog/house-cleaning-deerfield-beach", anchor: "House Cleaning Guide for Deerfield Beach" }],
  },
  {
    slug: "miramar",
    name: "Miramar",
    county: "broward",
    neighbors: ["pembroke-pines", "hollywood", "miami-gardens", "hialeah", "cooper-city"],
    blogPosts: [{ path: "/blog/house-cleaning-miramar", anchor: "House Cleaning Guide for Miramar" }],
  },
  {
    slug: "lauderhill",
    name: "Lauderhill",
    county: "broward",
    neighbors: ["plantation", "sunrise", "tamarac", "fort-lauderdale", "lauderdale-lakes"],
    blogPosts: [],
  },
  {
    slug: "tamarac",
    name: "Tamarac",
    county: "broward",
    neighbors: ["sunrise", "lauderhill", "coral-springs", "margate", "north-lauderdale"],
    blogPosts: [{ path: "/blog/house-cleaning-tamarac", anchor: "House Cleaning Guide for Tamarac" }],
  },
  {
    slug: "coral-springs",
    name: "Coral Springs",
    county: "broward",
    neighbors: ["parkland", "coconut-creek", "tamarac", "margate", "deerfield-beach"],
    blogPosts: [{ path: "/blog/house-cleaning-coral-springs", anchor: "House Cleaning Guide for Coral Springs" }],
  },
  {
    slug: "coconut-creek",
    name: "Coconut Creek",
    county: "broward",
    neighbors: ["coral-springs", "margate", "pompano-beach", "deerfield-beach", "parkland"],
    blogPosts: [{ path: "/blog/house-cleaning-coconut-creek", anchor: "House Cleaning Guide for Coconut Creek" }],
  },
  {
    slug: "margate",
    name: "Margate",
    county: "broward",
    neighbors: ["coconut-creek", "coral-springs", "tamarac", "pompano-beach", "north-lauderdale"],
    blogPosts: [],
  },
  {
    slug: "parkland",
    name: "Parkland",
    county: "broward",
    neighbors: ["coral-springs", "coconut-creek", "boca-raton", "deerfield-beach", "margate"],
    blogPosts: [{ path: "/blog/house-cleaning-parkland", anchor: "House Cleaning Guide for Parkland" }],
  },
  {
    slug: "hallandale-beach",
    name: "Hallandale Beach",
    county: "broward",
    neighbors: ["hollywood", "aventura", "sunny-isles-beach", "north-miami-beach", "dania-beach"],
    blogPosts: [{ path: "/blog/house-cleaning-hallandale-beach", anchor: "House Cleaning Guide for Hallandale Beach" }],
  },
  {
    slug: "cooper-city",
    name: "Cooper City",
    county: "broward",
    neighbors: ["davie", "pembroke-pines", "weston", "miramar", "plantation"],
    blogPosts: [],
  },
  {
    slug: "oakland-park",
    name: "Oakland Park",
    county: "broward",
    neighbors: ["fort-lauderdale", "wilton-manors", "pompano-beach", "lauderdale-lakes", "lauderhill"],
    blogPosts: [],
  },
  {
    slug: "wilton-manors",
    name: "Wilton Manors",
    county: "broward",
    neighbors: ["fort-lauderdale", "oakland-park", "lauderdale-lakes", "lauderhill", "pompano-beach"],
    blogPosts: [],
  },
];

const palmBeach: CityInfo[] = [
  {
    slug: "boca-raton",
    name: "Boca Raton",
    county: "palm-beach",
    neighbors: ["delray-beach", "deerfield-beach", "parkland", "boynton-beach", "highland-beach"],
    blogPosts: [
      { path: "/blog/house-cleaning-boca-raton", anchor: "House Cleaning Guide for Boca Raton" },
      { path: "/blog/deep-cleaning-service-boca-raton", anchor: "Deep Cleaning Guide for Boca Raton" },
      { path: "/blog/move-out-cleaning-boca-raton", anchor: "Move-Out Cleaning Guide for Boca Raton" },
    ],
  },
  {
    slug: "west-palm-beach",
    name: "West Palm Beach",
    county: "palm-beach",
    neighbors: ["palm-beach-gardens", "lake-worth", "royal-palm-beach", "wellington", "boynton-beach"],
    blogPosts: [
      { path: "/blog/house-cleaning-west-palm-beach", anchor: "House Cleaning Guide for West Palm Beach" },
      { path: "/blog/move-out-cleaning-west-palm-beach", anchor: "Move-Out Cleaning Guide for West Palm Beach" },
    ],
  },
  {
    slug: "delray-beach",
    name: "Delray Beach",
    county: "palm-beach",
    neighbors: ["boca-raton", "boynton-beach", "highland-beach", "lake-worth", "wellington"],
    blogPosts: [{ path: "/blog/house-cleaning-delray-beach", anchor: "House Cleaning Guide for Delray Beach" }],
  },
  {
    slug: "boynton-beach",
    name: "Boynton Beach",
    county: "palm-beach",
    neighbors: ["delray-beach", "lake-worth", "lantana", "boca-raton", "wellington"],
    blogPosts: [{ path: "/blog/house-cleaning-boynton-beach", anchor: "House Cleaning Guide for Boynton Beach" }],
  },
  {
    slug: "lake-worth",
    name: "Lake Worth",
    county: "palm-beach",
    neighbors: ["west-palm-beach", "boynton-beach", "wellington", "palm-springs", "lantana"],
    blogPosts: [{ path: "/blog/house-cleaning-lake-worth", anchor: "House Cleaning Guide for Lake Worth" }],
  },
  {
    slug: "jupiter",
    name: "Jupiter",
    county: "palm-beach",
    neighbors: ["palm-beach-gardens", "tequesta", "north-palm-beach", "juno-beach", "west-palm-beach"],
    blogPosts: [{ path: "/blog/house-cleaning-jupiter", anchor: "House Cleaning Guide for Jupiter" }],
  },
  {
    slug: "palm-beach-gardens",
    name: "Palm Beach Gardens",
    county: "palm-beach",
    neighbors: ["jupiter", "north-palm-beach", "west-palm-beach", "riviera-beach", "juno-beach"],
    blogPosts: [{ path: "/blog/house-cleaning-palm-beach-gardens", anchor: "House Cleaning Guide for Palm Beach Gardens" }],
  },
  {
    slug: "wellington",
    name: "Wellington",
    county: "palm-beach",
    neighbors: ["royal-palm-beach", "west-palm-beach", "lake-worth", "boynton-beach", "loxahatchee"],
    blogPosts: [{ path: "/blog/house-cleaning-wellington", anchor: "House Cleaning Guide for Wellington" }],
  },
  {
    slug: "royal-palm-beach",
    name: "Royal Palm Beach",
    county: "palm-beach",
    neighbors: ["wellington", "west-palm-beach", "lake-worth", "loxahatchee", "palm-beach-gardens"],
    blogPosts: [{ path: "/blog/house-cleaning-royal-palm-beach", anchor: "House Cleaning Guide for Royal Palm Beach" }],
  },
];

const miamiDade: CityInfo[] = [
  {
    slug: "miami",
    name: "Miami",
    county: "miami-dade",
    neighbors: ["miami-beach", "coral-gables", "doral", "north-miami", "hialeah"],
    blogPosts: [
      { path: "/blog/house-cleaning-miami", anchor: "House Cleaning Guide for Miami" },
      { path: "/blog/deep-cleaning-service-miami", anchor: "Deep Cleaning Guide for Miami" },
      { path: "/blog/move-in-cleaning-miami", anchor: "Move-In Cleaning Guide for Miami" },
    ],
  },
  {
    slug: "miami-beach",
    name: "Miami Beach",
    county: "miami-dade",
    neighbors: ["miami", "north-miami-beach", "sunny-isles-beach", "aventura", "bay-harbor-islands"],
    blogPosts: [{ path: "/blog/house-cleaning-miami-beach", anchor: "House Cleaning Guide for Miami Beach" }],
  },
  {
    slug: "hialeah",
    name: "Hialeah",
    county: "miami-dade",
    neighbors: ["miami", "miami-gardens", "miami-lakes", "doral", "north-miami"],
    blogPosts: [{ path: "/blog/house-cleaning-hialeah", anchor: "House Cleaning Guide for Hialeah" }],
  },
  {
    slug: "coral-gables",
    name: "Coral Gables",
    county: "miami-dade",
    neighbors: ["miami", "south-miami", "coconut-grove", "pinecrest", "doral"],
    blogPosts: [{ path: "/blog/house-cleaning-coral-gables", anchor: "House Cleaning Guide for Coral Gables" }],
  },
  {
    slug: "north-miami",
    name: "North Miami",
    county: "miami-dade",
    neighbors: ["north-miami-beach", "miami-shores", "aventura", "miami-gardens", "miami"],
    blogPosts: [{ path: "/blog/house-cleaning-north-miami", anchor: "House Cleaning Guide for North Miami" }],
  },
  {
    slug: "north-miami-beach",
    name: "North Miami Beach",
    county: "miami-dade",
    neighbors: ["north-miami", "aventura", "sunny-isles-beach", "miami-beach", "hallandale-beach"],
    blogPosts: [{ path: "/blog/house-cleaning-north-miami-beach", anchor: "House Cleaning Guide for North Miami Beach" }],
  },
  {
    slug: "aventura",
    name: "Aventura",
    county: "miami-dade",
    neighbors: ["sunny-isles-beach", "north-miami-beach", "hallandale-beach", "north-miami", "miami-beach"],
    blogPosts: [{ path: "/blog/house-cleaning-aventura", anchor: "House Cleaning Guide for Aventura" }],
  },
  {
    slug: "sunny-isles-beach",
    name: "Sunny Isles Beach",
    county: "miami-dade",
    neighbors: ["aventura", "miami-beach", "north-miami-beach", "hallandale-beach", "bal-harbour"],
    blogPosts: [{ path: "/blog/house-cleaning-sunny-isles-beach", anchor: "House Cleaning Guide for Sunny Isles Beach" }],
  },
  {
    slug: "doral",
    name: "Doral",
    county: "miami-dade",
    neighbors: ["miami", "hialeah", "miami-springs", "miami-lakes", "coral-gables"],
    blogPosts: [{ path: "/blog/house-cleaning-doral", anchor: "House Cleaning Guide for Doral" }],
  },
  {
    slug: "homestead",
    name: "Homestead",
    county: "miami-dade",
    neighbors: ["florida-city", "cutler-bay", "kendall", "palmetto-bay", "miami"],
    blogPosts: [],
  },
  {
    slug: "miami-gardens",
    name: "Miami Gardens",
    county: "miami-dade",
    neighbors: ["north-miami", "hialeah", "north-miami-beach", "miami", "miramar"],
    blogPosts: [{ path: "/blog/house-cleaning-miami-gardens", anchor: "House Cleaning Guide for Miami Gardens" }],
  },
];

export const cityList: CityInfo[] = [...broward, ...palmBeach, ...miamiDade];

export const citiesBySlug: Record<string, CityInfo> = Object.fromEntries(
  cityList.map((c) => [c.slug, c])
);

/** Path → city slug map, built from each city's blogPosts.path entries. */
export const blogPathToCitySlug: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const city of cityList) {
    for (const post of city.blogPosts) {
      out[post.path] = city.slug;
    }
  }
  return out;
})();

/** Convert "Boca Raton" → "boca-raton". */
export const cityNameToSlug = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, "-");

/** Convert a city slug to its `/[slug]-cleaning` route. */
export const cityRoute = (slug: string): string => `/${slug}-cleaning`;
