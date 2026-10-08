# CLAUDE-SOCIAL-001 — zero-spend first-party scaffold

The local integration has no paid dependency, scheduler or public Worker route. It
validates offline post plans, can verify an officially authorized account, and
implements image/carousel container creation, status checks and publication in a
library. The CLI deliberately cannot publish. No post was published during testing.

Use `node scripts/social/instagram.mjs plan post.json` with
`{"caption":"Approved draft","images":["https://your-public-assets.example/post.jpg"]}`.
This is offline and requires no token. Tests use fake credentials and mock responses.

For read-only `check`, set environment variables through an approved secret store:
`INSTAGRAM_LOGIN` (`instagram` or `facebook`), `INSTAGRAM_API_VERSION` (your Meta
app's supported version), `INSTAGRAM_USER_ID`, and `INSTAGRAM_ACCESS_TOKEN`.
Do not put credentials in CLI arguments, repository files, issues or chat. Tokens
go only in authorization headers to the selected official Graph host. API error
messages are redacted and authorization redirects are rejected.

Use Meta's official login and permission flows. Instagram Login needs a professional
Business/Creator account; Facebook Login uses the connected Page/account flow.
Account and publishing permissions must be granted for the selected login type.
App roles/review, access level, account restrictions and token expiry must be checked
in Meta before live operations. Existing Windsor/Meta connectivity does not prove
this independent app has a usable authorized token. Never copy connector credentials.

After the account is verified and an individual post is approved, a local operator
can explicitly enable library writes with `INSTAGRAM_ENABLE_WRITES=true`. Runtime
quota and container-status checks still apply. An uncertain publish response is
never retried automatically; inspect the account before retrying. Public images must
be approved JPEG assets reachable by Meta. This conservative scaffold allows 1–10
images and does not schedule uploads or host assets.

Read-only media/comments methods are available; reply/moderation writes and DMs
are intentionally absent until their permissions and current policy are verified.
No automatic account/token creation, token refresh, OAuth server, webhook receiver,
bulk commenting or unsolicited DMs are included. Token expiry, platform quotas,
app review and account restrictions remain external dependencies. There is no paid
social-tool requirement and no claim that third-party platform plans are free.

Primary reference: [Meta's official Instagram API collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-b9dac9f7-5415-4659-bcfd-795298a07e91).
Direct Meta documentation links for operator verification:
[Instagram Login publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing)
and [comment moderation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/comment-moderation).
Those direct documentation pages were inaccessible to the research tool in this
session; live account integration remains unverified.
