/* Xender Builder pricing (XEND-BUILDER-001). Edit THIS file to change prices; no code changes needed.
 * - `launch` is the done-for-you "launch my AI draft" service. India mirrors the approved Founding
 *   Website package (₹999 + 18% GST); other regions follow the US$299 international positioning.
 * - `pro` is a planned subscription. price:null shows "Join the waitlist" — nothing is billable yet.
 * - Payments are NOT taken on these pages: every paid option goes to a quote request first. */
window.XB_PRICING = {
  defaultRegion: "INTL",
  regions: {
    US: { label: "USA", currency: "USD", fmt: (n) => "$" + n, launch: 299, launchNote: "one-time", tax: "" },
    GB: { label: "UK", currency: "GBP", fmt: (n) => "£" + n, launch: 239, launchNote: "one-time", tax: "" },
    CA: { label: "Canada", currency: "CAD", fmt: (n) => "C$" + n, launch: 399, launchNote: "one-time", tax: "" },
    AU: { label: "Australia", currency: "AUD", fmt: (n) => "A$" + n, launch: 449, launchNote: "one-time", tax: "" },
    IN: { label: "India", currency: "INR", fmt: (n) => "₹" + n.toLocaleString("en-IN"), launch: 999, launchNote: "one-time + 18% GST", tax: "GST" },
    INTL: { label: "International", currency: "USD", fmt: (n) => "$" + n, launch: 299, launchNote: "one-time", tax: "" },
  },
  countryToRegion: { US: "US", GB: "GB", UK: "GB", CA: "CA", AU: "AU", IN: "IN" },
  pro: { price: null, period: "/month" },
};
