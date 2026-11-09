# Xender Secrets — Shopify customer-acquisition execution pack
**Prepared:** 2026-10-31 | **Proposed campaign:** 2026-11-01 to 2026-11-07 | **Owner:** Xender Secrets

> **State:** CAMPAIGN ASSETS READY, PUBLIC PROMOTION ON HOLD until checkout/supplier/margin verification. This file is planning and reusable creative copy; it is not proof of publishing.

## Source-of-truth snapshot (checked 2026-10-31)
- Connected shop: Xender Secrets; `xendersecrets.myshopify.com`; Shopify Basic; India; base currency USD.
- Online store catalog: 18 products (13 active, 5 archived); 10 active gadgets and 3 active website-development packages.
- Last 30 days: 36 Shopify sessions, 34 visitors, 0 cart additions, 0 checkouts, 0 orders. Region: 31 US sessions, 5 India sessions; source: 36 direct. ShopifyQL shows `qanh50-gv.myshopify.com`, another domain identifier for the same shop.
- Shopify Markets: India and US active; **UK not active**.
- General-profile rates: India **$4.99**, US **$11.99**. A separate Dropshipper-AI profile displays $0 but has no products assigned. These rates are NOT suppliers' verified shipping costs.
- Checked Moon Lamp, Bluetooth Headband, Magnetic Stand: supplier-linked AutoDS inventory location has 10 units per listed variant, Gurugram location 0; inventory tracking disabled; `inventoryItem.unitCost` null. Supplier availability/landed cost not independently verified.
- PayU: Shopify settings-change email says 'Cards, UPI, NB by PayU India' changed on 2026-10-30; PayU agent provided a ₹10/₹20 payment-link test request on 2026-10-31. Actual Shopify checkout and PayU international payment activation **not proven**. PayU ticket SP5696637651 expected 2026-11-03. Inquiry emailed to integrations@payu.in (no secrets).
- AutoDS verification email sent to support@autods.com. Don't interpret email receipt as confirmed inventory/fulfillment.
- Current collection: `/collections/everyday-tech-video-picks`, three selected products, created and published on Shopify 2026-10-31.
- Product guides updated in Shopify 2026-10-31 while preserving previous text, prices, photos, SKUs and statuses.
- SocialClaw publishing connector reports `plan_required` (free plan); no publication from this connector.
- Public storefront fetch from separate retrieval tooling returned `login_required`; confirm customer-facing access from incognito/mobile before sending paid traffic.

## Go/no-go launch gates
1. **Public access**: unauthenticated mobile session can view products and add to cart, without unintended password gate.
2. **Payments**: Shopify checkout payment options and PayU status verified, INR experience for India clarified. No real funds spent without planned small test and reconciliation.
3. **Shipping**: at least India and US checkouts show rates matching supplier's real order economics. UK market must be enabled and valid UK delivery rates set before UK shopping promotions.
4. **Suppliers**: variant-level link, actual stock, landed price, dispatch, tracking, claims and permitted ad imagery confirmed in writing.
5. **Margin**: expected profit = customer item price + shipping paid - supplier unit cost - supplier freight - taxes/duties - payment/Shopify fees - returns provision - customer acquisition spend. Do not advertise products with unverified or negative economics.
6. **Measurement**: UTMs testable in Shopify sessions; if using paid Meta/Google, validate ViewContent, AddToCart, InitiateCheckout, Purchase, deduplication, consent and privacy disclosures.

## Product landing pages
1. **Moon Lamp** — `/products/d5-starry-moon-lamp-8cm-led-night-light-with-stand-perfect-for-bedroom-decor-and-gifts`; price starts at $7.99; variants Brown/RGB, Brown/Warm White, Brown/White; 8 cm as per listing.
2. **Bluetooth Headband** — `/products/bluetooth-sleep-headband-wireless-headphones-built-in-speakers-comfortable-fabric-10-hour-battery-life`; starts $8.99; Gray/Black; avoid medical/sleep outcome claims and unverified battery promises.
3. **Magnetic Phone Stand** — `/products/metal-expansion-phone-stand-for-laptop-and-tesla-vehicles-magnetic-folding-phone-holder-with-15w-fast-charger`; starts $13.99; Blue/Black/Silver plus separate Wireless Charger variant. Never imply charging on the other variants.

Collection: https://xendersecrets.myshopify.com/collections/everyday-tech-video-picks

## Campaign naming + UTM standard
- `utm_source`: instagram / youtube / facebook / creator / email
- `utm_medium`: organic_social / influencer / email
- `utm_campaign`: `xender_shopify_nov2026_week1`
- `utm_content`: country-product-creative ID, e.g. `in_moon_01`
- Destination is exact product URL, not generic homepage. Where product page is inaccessible, do not publish shopping CTA.

### Seven-day calendar
| Date (IST) | Action | Owner / publishing gate | Evidence to record |
|---|---|---|---|
| Sun Nov 1 | Verify public storefront, PayU Indian test plan, supplier link/cost, checkout countries; record screen evidence. | Store operator; no real charge until verified | Screenshot, ticket, costs, checkout notes |
| Mon Nov 2 | Review product pages, film/obtain authorized footage, create 12 vertical edits with clear disclosures, URLs and captions. | Content lead | File names + authorized media source |
| Tue Nov 3 | India: Moon Lamp (IN-MOON-01), Stand (IN-STAND-01). | Release only after India gates PASS | Impressions, profile visits, link clicks |
| Wed Nov 4 | US: Headband (US-HEAD-01), Moon Lamp (US-MOON-01). | Release only after US gates PASS | UTM sessions, add-to-cart |
| Thu Nov 5 | Send 10 personalized opt-in creator pitches (5 India, 5 US); research UK supplier eligibility/tax. | No mass unsolicited messaging | Replies and paid terms |
| Fri Nov 6 | Produce variants of the two highest-retention videos; confirm purchase pixel if using ads. | Don't buy ads on zero verified margins | Views 3s, watch%, clicks, ATCs |
| Sat Nov 7 | Analyze sessions, ATC, checkout starts, orders, contribution margin, creator responses. | Kill/iterate/scale only on evidence | Weekly scorecard, verified next actions |

## Twelve short-form creative briefs (10–20s, 9:16, no fake demos)
Each storyboard must be rendered with **owned/licensed product footage**. Stock lifestyle shots cannot be represented as actual product performance. Subtitle every meaningful action, show actual variant, no fake testimonials or urgency.

| ID | Market | Concept | Scene/voiceover sequence | Caption + CTA |
|---|---|---|---|---|
| IN-MOON-01 | India | Bedside glow | 0–2s room/table before; 2–7s actual lamp switched on; 7–12s 3 light-option labels only if footage genuinely shows each; 12–15s price and variation card | `Bedside setup mein ek chhota change ✨ 8 cm moon-style light, variant dekh kar choose karo. Product details bio/linked page par. Shipping checkout par.` |
| IN-MOON-02 | India | Gift idea | 0–3s gift/desk context; 3–11s closeups of actual lamp; 11–15s variant choice | `Gift ideas browse kar rahe ho? Is compact lamp ke options compare karo. Details aur shipping terms product page par.` |
| IN-STAND-01 | India | Desk setup | 0–3s clutter; 3–10s demonstration of actual holder with safe static phone; 10–15s three ordinary colors | `Desk setup ko simple rakho. Folding magnetic phone stand ke colors aur fit details check karo. Charging model alag variant hai.` |
| IN-STAND-02 | India | Variant choice | Show stand-only versus wireless-charger variant where supported, explain difference | `Stand ya charger? Variant select karte waqt exact option check karo. Har variant wireless charging offer nahi karta.` |
| IN-HEAD-01 | India | Podcast accessory | Podcast setting, actual headband, phone pairing if footage verified, relaxed non-medical use | `Podcast sunne ke liye headband-style speakers ka option. Fit, connectivity aur shipping details listing par.` |
| IN-MOON-03 | India | Colors | Side-by-side genuine RGB/Warm White/White demo, no invented light modes | `RGB, Warm White ya White? Apne room ke look ke hisaab se select karo.` |
| US-HEAD-01 | US | Audio comfort comparison | Show standard headphones on table then real headband and pairing. Avoid 'guaranteed better sleep'. | `Headband-style audio: would you try it for podcasts? Browse the colors and specs before ordering.` |
| US-HEAD-02 | US | Travel pack | Pack headband and phone; demonstrate actual controls only if known. | `One compact option for listening on the go. Check compatibility and delivery details on the product page.` |
| US-MOON-01 | US | Ambient room | Before/after only with real product footage; closeup lamp. | `A small lighting accent for a cozy desk setup. Explore the Moon Lamp variants.` |
| US-MOON-02 | US | Gifts under review | Product real view + size card + packaging only if verified | `Looking for a small desk-gift idea? Here's the 8 cm moon-style lamp — check options and delivery estimates.` |
| US-STAND-01 | US | Desk utility | Show phone mounted without unsafe driver use; variant label | `Keep your phone in view with a compact folding stand. Check mounting compatibility before buying.` |
| US-STAND-02 | US | Choose correct variant | Carousel/clip distinguishing color variants from charger variant | `Not every variant includes charging. Choose the feature you actually need.` |

**Caption hashtags**: use a limited, honest set specific to each creative, e.g. `#DeskSetup #RoomDecor #TechAccessories #XenderSecrets`. Don't claim a discount, free shipping, stock scarcity, guaranteed results, customer reviews or a delivery time without evidence.

## Creator collaboration outbound templates
**India (personalized, opt-in):**
> Hi {creator}, your {specific recent reel} gave me an idea for a practical desk/room gadget demo. We run Xender Secrets, a small Shopify tech store. Would you be open to reviewing one product with full creative independence and a transparent gifted/affiliate disclosure? Could you share your country, rates, and collaboration terms? No obligation.

**US (personalized, opt-in):**
> Hey {creator}, I liked your {specific post} on {specific topic}. Xender Secrets is testing a few small tech accessories. Are you open to a disclosed product demo or affiliate partnership with honest feedback? If yes, could you send your rates and preferred collaboration format?

**Rules**: no outreach until legitimate creator identity, channel fit, geography and sample availability are verified; comply with platform spam rules; don't imply free goods unless confirmed.

## Weekly scorecard (update only with real numbers)
| Metric | Baseline 31 Oct | Goal / decision rule |
|---|---:|---|
| Sessions, 30d | 36 | Report by source+market with UTM after posting |
| Visitors, 30d | 34 | Track quality, not vanity |
| Add-to-cart sessions | 0 | First real ATC is evidence of interest, not profitability |
| Orders | 0 | Verify successful fulfillment and true contribution margin |
| Payment readiness | Unverified | Must PASS before promotion |
| India shipping zone | $4.99 configured | Compare supplier cost |
| US shipping zone | $11.99 configured | Compare supplier cost |
| UK | Inactive market/no shipping zone | No shopping CTA until ready |
| Authorized supplier footage | Not verified | No fabricated demos |
| SocialClaw API access | Plan required | No publishing through this route |

### Preserve business systems
- No new recurring subscriptions, no unapproved refunds or test charges.
- Do not change Shopify base currency, inventory quantity, live prices, supplier links, tax configuration, or publish UK before evidence.
- No merge, deployment, re-enabling existing AutoTube/publishing workflows as part of this marketing pack.
- Existing Xender Secrets website-development marketing is separate: don't mix a website-service CTA into a gadget Reel.
