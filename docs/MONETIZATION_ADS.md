# Xender content ads / AdSense setup

## Strategy
External ads belong on traffic/content surfaces (Novels and Reader), not on the homepage, commercial landing pages, lead forms, client previews, admin, checkout, or SiteCheck product pages. One website client can be worth far more than many display-ad impressions, so commercial conversion pages stay ad-free.

## Current implementation
- `public/xs-ads-config.js`: one switch for AdSense client + unit IDs. It ships disabled.
- `public/xs-ads.js`: shows Xender house promos while AdSense is disabled, and converts configured placements to responsive AdSense units when enabled.
- `public/xs-ads.css`: responsive ad container styles.
- `public/novels.html`: top + sidebar placements.
- `public/reader.html`: one bottom placement, intentionally separated from Previous/Next controls to reduce accidental-click risk.

## Activation checklist
1. Add `xendersecrets.com` to the approved AdSense account and complete Google site review.
2. In AdSense Privacy & messaging, configure a Google-certified CMP / European regulations message before serving personalized ads to EEA, UK or Switzerland traffic.
3. Create responsive display ad units for the manual placements, or deliberately enable Auto ads after previewing placement behavior.
4. Put the real `ca-pub-...` client and ad-unit IDs into `public/xs-ads-config.js`, then set `enabled: true`.
5. If AdSense provides an `ads.txt` publisher line, add exactly that official line at `public/ads.txt`; never guess the publisher ID.
6. Test mobile and desktop. Ads must not look like navigation, chapter buttons, downloads or other content controls.

## Revenue guardrails
- Keep homepage/services/industry pages ad-free.
- Do not ask readers to click ads.
- Do not place ads immediately beside Previous/Next, translation, search, menu or download controls.
- Start with the three manual placements above; measure viewability/revenue before adding density.
- House promos remain a fallback whenever AdSense is disabled or a placement lacks a configured unit ID.
