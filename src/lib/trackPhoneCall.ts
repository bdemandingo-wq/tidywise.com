// Shared helper to fire a Google Ads / GA4 conversion event for phone clicks.
// All tel: links across Hero, Navbar, Footer, and StickyCallButton route through this
// so phone-call conversion data is consistent regardless of where the user clicks.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPhoneCall(label: string) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "contact", {
        event_category: "phone_call",
        event_label: label,
      });
    }
  } catch {
    /* swallow — tracking must never break a tel: link */
  }
}
