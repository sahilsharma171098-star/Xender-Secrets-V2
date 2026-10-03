# Xender Secrets authentication & Telegram setup

The website code already supports password login, email OTP, Google (Gmail), GitHub, Facebook and X/Twitter sign-in. Provider secrets are intentionally not committed to GitHub.

## Email OTP

Create a Resend account, verify a sending domain/address, then set Worker secrets:

```
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put AUTH_FROM_EMAIL
```

Example AUTH_FROM_EMAIL:
`Xender Secrets <login@xendersecrets.com>`

## Google / Gmail sign-in

Create a Google OAuth web client and add this redirect URI:

`https://www.xendersecrets.com/api/auth/oauth/google/callback`

Set:
```
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

## GitHub sign-in

Create a GitHub OAuth App with callback:

`https://www.xendersecrets.com/api/auth/oauth/github/callback`

Set:
```
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

## Facebook sign-in

Create a Meta/Facebook Login app and add:

`https://www.xendersecrets.com/api/auth/oauth/facebook/callback`

Set:
```
npx wrangler secret put FACEBOOK_CLIENT_ID
npx wrangler secret put FACEBOOK_CLIENT_SECRET
```

## X / Twitter sign-in

Create an X OAuth 2.0 app and add:

`https://www.xendersecrets.com/api/auth/oauth/x/callback`

Set:
```
npx wrangler secret put X_CLIENT_ID
npx wrangler secret put X_CLIENT_SECRET
```

## Telegram channel

Create the Telegram channel in Telegram and copy its public link, for example `https://t.me/yourchannel`.

Then set:
```
npx wrangler secret put TELEGRAM_CHANNEL_URL
```

Once configured, Telegram buttons already present in the site automatically become visible.

## Security notes

- OAuth client secrets and the Resend API key must stay in Worker secrets, never in the repository.
- OAuth state is stored server-side and expires after 10 minutes.
- X uses PKCE.
- Email OTP codes expire after 10 minutes and are stored only as salted hashes.
- OTP requests are throttled and verification attempts are capped.
- Login sessions use Secure, HttpOnly, SameSite=Lax cookies.
