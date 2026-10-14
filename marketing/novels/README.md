# Facebook novel reading series

This campaign drives readers directly to Xender Secrets' own reader. It is **not live** until the PR is merged and the repository secrets FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN are set for a Facebook **Page** the user manages.

## Rights
- The CC BY 4.0 works in public/licensed-novels.js allow redistribution with appropriate attribution and license; the post includes author, source and license URL. Currently 9 chapters of **Empress of Blue Flower Mountain** and 10 chapters of **The Good End for the Villainess** are eligible for serialized chapter posts.
- XperimentalHamid's documented permission applies to re-publication **on xendersecrets.com**, not to Facebook. Only our original summary, genre and a direct Chapter 1 link go into Facebook posts; no full XH chapter text.
- Public-domain source editions from Project Gutenberg get English **metadata teasers** and reader links; do not assume that an English translation has the same rights.
- Never infer that any arbitrary novel in the catalog has Facebook redistribution rights.

## Execution
- Check node scripts/facebook-novel-campaign.mjs --dry-run locally. It never publishes.
- Configure FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN as repository **Actions secrets**. Keep tokens out of commits and chat. The Page access token needs pages_manage_posts, pages_read_engagement and appropriate Page task access.
- Once live, Actions publishes one item at 06:00 UTC and another at 14:00 UTC each day. Current queue: 32 distinct posts (3 XH teasers, 19 CC BY chapters and 10 Chinese classic teasers), stopping after completion.
- The reader link includes UTM tags. The log marketing/novels/facebook-publish-log.json is committed back after success; it stores post IDs, titles, times and reader URLs, not credentials.
- Before publishing each post, the script checks recent Page posts for its stable marker to recover after post-success/log-failure cases. Missing read permission stops it instead of risking duplicate broadcasts.
- This is only for the Page explicitly owned by the user. Never auto-post to personal profiles or groups.
- A manual workflow dispatch **publishes** when credentials exist; only running --dry-run is nonpublishing.
- Platform permissions may change; inspect the Actions log and current Meta documentation, never bypass restrictions.

## Checks
- node --test tests/marketing/facebook-novels.test.mjs
- node scripts/facebook-novel-campaign.mjs --dry-run
- node scripts/facebook-novel-campaign.mjs --publish (one Page post when credentials exist)
