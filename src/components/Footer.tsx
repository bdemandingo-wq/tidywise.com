import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Shield, Leaf } from "lucide-react";
import { trackPhoneCall } from "@/lib/trackPhoneCall";
import { CITY_CLEANING_GUIDES } from "@/data/cityCleaningGuides";
import {
  CITY_SERVICE_AREAS,
  CLEANING_TIPS_AND_GUIDES,
  COMPARE_CLEANING_SERVICES,
} from "@/data/siteIndex";

// Sections inside <Footer> are arranged with a single `flex flex-col
// gap-y-12` parent so every direct child gets a uniform 48px gap below it
// — no compounding mb/mt margins to debug, no overlap between dense city
// grids and trust badges, mobile and desktop alike. Each section is its
// own <section> for semantics and adds `border-t pt-8` (or pt-6 for the
// utility rows) so the dividing line is consistent throughout.
const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-y-12">
          {/* ── 1. Brand + primary 5-col grid ─────────────────────────── */}
          <section>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Brand */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-display text-xl font-bold">TIDYWISE</span>
                </div>
                <p className="text-background/70 text-sm mb-2">
                  A Clean Home. A Clear Mind.
                </p>
                <p className="text-background/60 text-xs mb-4">
                  Professional cleaning services for South Florida homes. Licensed, bonded, and insured.
                </p>
                <div className="space-y-2 text-sm">
                  <a href="tel:+15615718725" onClick={() => trackPhoneCall("footer")} className="flex items-center gap-2 text-background/70 hover:text-background transition-colors">
                    <Phone className="w-4 h-4" />
                    (561) 571-8725
                  </a>
                  <a href="mailto:support@tidywisecleaning.com" className="flex items-center gap-2 text-background/70 hover:text-background transition-colors">
                    <Mail className="w-4 h-4" />
                    support@tidywisecleaning.com
                  </a>
                  <p className="flex items-center gap-2 text-background/70">
                    <MapPin className="w-4 h-4" />
                    Deerfield Beach, FL
                  </p>
                </div>
              </div>

              {/* Services */}
              <div>
                <h3 className="font-display font-semibold mb-4">Our Services</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/standard-cleaning" className="text-background/70 hover:text-background transition-colors">Standard Cleaning</Link></li>
                  <li><Link to="/deep-cleaning" className="text-background/70 hover:text-background transition-colors">Deep Cleaning</Link></li>
                  <li><Link to="/move-in-out-cleaning" className="text-background/70 hover:text-background transition-colors">Move In/Out Cleaning</Link></li>
                  <li><Link to="/carpet-cleaning" className="text-background/70 hover:text-background transition-colors">Carpet Cleaning</Link></li>
                  <li><Link to="/upholstery-cleaning" className="text-background/70 hover:text-background transition-colors">Upholstery Cleaning</Link></li>
                  <li><Link to="/post-construction-cleaning" className="text-background/70 hover:text-background transition-colors">Post-Construction Cleaning</Link></li>
                  <li><Link to="/office-cleaning" className="text-background/70 hover:text-background transition-colors">Office Cleaning</Link></li>
                  <li><Link to={{ pathname: "/", hash: "#booking" }} className="text-background/70 hover:text-background transition-colors">Get a Quote</Link></li>
                </ul>
              </div>

              {/* Broward County Cities */}
              <div>
                <h3 className="font-display font-semibold mb-4">Broward County</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/fort-lauderdale-cleaning" className="text-background/70 hover:text-background transition-colors">Fort Lauderdale</Link></li>
                  <li><Link to="/hollywood-cleaning" className="text-background/70 hover:text-background transition-colors">Hollywood</Link></li>
                  <li><Link to="/pompano-beach-cleaning" className="text-background/70 hover:text-background transition-colors">Pompano Beach</Link></li>
                  <li><Link to="/coral-springs-cleaning" className="text-background/70 hover:text-background transition-colors">Coral Springs</Link></li>
                  <li><Link to="/pembroke-pines-cleaning" className="text-background/70 hover:text-background transition-colors">Pembroke Pines</Link></li>
                  <li><Link to="/broward-county-cleaning" className="text-background/70 hover:text-background transition-colors">View All Broward →</Link></li>
                </ul>
              </div>

              {/* Palm Beach & Miami-Dade */}
              <div>
                <h3 className="font-display font-semibold mb-4">More Cities</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/boca-raton-cleaning" className="text-background/70 hover:text-background transition-colors">Boca Raton</Link></li>
                  <li><Link to="/west-palm-beach-cleaning" className="text-background/70 hover:text-background transition-colors">West Palm Beach</Link></li>
                  <li><Link to="/miami-cleaning" className="text-background/70 hover:text-background transition-colors">Miami</Link></li>
                  <li><Link to="/miami-beach-cleaning" className="text-background/70 hover:text-background transition-colors">Miami Beach</Link></li>
                  <li><Link to="/delray-beach-cleaning" className="text-background/70 hover:text-background transition-colors">Delray Beach</Link></li>
                  <li><Link to="/service-areas" className="text-background/70 hover:text-background transition-colors">View All Cities →</Link></li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h3 className="font-display font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/service-areas" className="text-background/70 hover:text-background transition-colors">Service Areas</Link></li>
                  <li><Link to="/faq" className="text-background/70 hover:text-background transition-colors">FAQ</Link></li>
                  <li><Link to="/reviews" className="text-background/70 hover:text-background transition-colors">Customer Reviews</Link></li>
                  <li><Link to="/blog" className="text-background/70 hover:text-background transition-colors">Blog & Tips</Link></li>
                  <li><Link to="/house-cleaning-cost-south-florida" className="text-background/70 hover:text-background transition-colors">Pricing Guide</Link></li>
                  <li><Link to="/cleaning-service-alternatives" className="text-background/70 hover:text-background transition-colors">Compare Services</Link></li>
                  <li><Link to="/referral-program" className="text-background/70 hover:text-background transition-colors">Referral Program</Link></li>
                  <li><Link to="/contractor-rate-sheet" className="text-background/70 hover:text-background transition-colors">Contractor Rates</Link></li>
                  <li><Link to="/apply" className="text-background/70 hover:text-background transition-colors">Join Our Team</Link></li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── 2. Compare Services + Cleaning Tips ───────────────────── */}
          <section
            aria-labelledby="footer-compare-heading"
            className="border-t border-background/20 pt-8"
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div>
                <h3
                  id="footer-compare-heading"
                  className="font-display font-semibold mb-4"
                >
                  Compare Cleaning Services
                </h3>
                <ul className="space-y-2 text-sm">
                  {COMPARE_CLEANING_SERVICES.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className="text-background/70 hover:text-background transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="md:col-span-2">
                <h3 className="font-display font-semibold mb-4">
                  Cleaning Tips &amp; Guides
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {CLEANING_TIPS_AND_GUIDES.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className="text-background/70 hover:text-background transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── 3. All Service Areas (city /[city]-cleaning pages) ────── */}
          <section
            aria-labelledby="footer-service-areas-heading"
            className="border-t border-background/20 pt-8"
          >
            <h3
              id="footer-service-areas-heading"
              className="font-display font-semibold mb-4"
            >
              All Service Areas We Cover
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2 text-sm">
              {CITY_SERVICE_AREAS.map((city) => (
                <li key={city.path} className="break-words">
                  <Link
                    to={city.path}
                    className="text-background/70 hover:text-background transition-colors"
                  >
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ── 4. Cleaning Guides by City (blog posts) ───────────────── */}
          <section
            aria-labelledby="footer-city-guides-heading"
            className="border-t border-background/20 pt-8"
          >
            <h3
              id="footer-city-guides-heading"
              className="text-background/80 text-xs font-semibold uppercase tracking-wider mb-3"
            >
              Cleaning Guides by City
            </h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {CITY_CLEANING_GUIDES.map((city) => (
                <li key={city.path}>
                  <Link
                    to={city.path}
                    className="text-background/70 hover:text-background hover:underline transition-colors"
                  >
                    House Cleaning {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ── 5. Trust signals — own row, bottom of content area ────── */}
          <section
            aria-label="Trust signals"
            className="border-t border-background/20 pt-8"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-background/70">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Licensed &amp; Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4" />
                <span>Eco-Friendly</span>
              </div>
              <Link to="/broward-county-cleaning" className="hover:text-background transition-colors">
                Broward County
              </Link>
              <span aria-hidden="true" className="hidden sm:inline text-background/30">|</span>
              <Link to="/palm-beach-county-cleaning" className="hover:text-background transition-colors">
                Palm Beach County
              </Link>
              <span aria-hidden="true" className="hidden sm:inline text-background/30">|</span>
              <Link to="/miami-dade-cleaning" className="hover:text-background transition-colors">
                Miami-Dade County
              </Link>
            </div>
          </section>

          {/* ── 6. Disclaimer ─────────────────────────────────────────── */}
          <section className="border-t border-background/20 pt-6">
            <p className="text-background/50 text-xs text-center max-w-3xl mx-auto">
              TIDYWISE is a licensed and insured cleaning service operating in
              Broward, Miami-Dade, and Palm Beach County, Florida. All cleaners
              are background-checked and professionally trained.
            </p>
          </section>

          {/* ── 7. Bottom bar — copyright + utility links ─────────────── */}
          <div className="border-t border-background/20 pt-6 pb-20 md:pb-16 flex flex-col md:flex-row justify-center md:justify-between items-center gap-4 relative z-50">
            <p className="text-background/70 text-sm">
              © {new Date().getFullYear()} TIDYWISE Cleaning Services. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/sitemap" className="text-background/70 hover:text-background transition-colors">
                Sitemap
              </Link>
              <Link to="/auth" className="text-background/70 hover:text-background transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
