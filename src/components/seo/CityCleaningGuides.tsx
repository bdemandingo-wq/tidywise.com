import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { CITY_CLEANING_GUIDES } from "@/data/cityCleaningGuides";

// `Link` from react-router-dom renders a real <a href> in the DOM, so
// crawlers can follow these links — no JS-only navigation.

const CityCleaningGuides = () => {
  return (
    <section
      className="py-16 bg-muted/30"
      aria-labelledby="city-cleaning-guides-heading"
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <h2
            id="city-cleaning-guides-heading"
            className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3"
          >
            Cleaning Services Across South Florida
          </h2>
          <p className="text-muted-foreground mb-2">
            Professional cleaning in your neighborhood — Broward &amp; Palm Beach
            counties.
          </p>
          <p className="text-sm text-muted-foreground/80">
            Serving Broward, Palm Beach, and Miami-Dade counties with trusted
            residential and commercial cleaning.
          </p>
        </div>

        <ul
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-6xl mx-auto"
          role="list"
        >
          {CITY_CLEANING_GUIDES.map((city) => (
            <li key={city.path}>
              <Link
                to={city.path}
                className="
                  group flex items-center gap-3 px-4 py-3 rounded-xl
                  bg-card border border-border shadow-soft
                  hover:border-primary/40 hover:shadow-md
                  hover:-translate-y-0.5
                  transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                "
              >
                <span className="
                  w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center
                  group-hover:bg-primary/20 transition-colors shrink-0
                ">
                  <MapPin
                    className="w-4 h-4 text-primary"
                    aria-hidden="true"
                  />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    House Cleaning {city.name}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">
                    Read the local guide →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default CityCleaningGuides;
