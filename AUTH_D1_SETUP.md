# Xender Secrets production account setup

The codebase is D1-ready. The live site keeps its browser-local fallback until a D1 database is bound.

## One-time Cloudflare setup

1. In Cloudflare Dashboard, open **D1 SQL Database** and create a database named `xender-secrets-users`.
2. Copy its database ID.
3. Add this block to `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "xender-secrets-users",
    "database_id": "<DATABASE_ID>",
    "migrations_dir": "migrations"
  }
]
```

4. Apply the schema once:

```bash
npx wrangler d1 migrations apply xender-secrets-users --remote
```

5. Deploy:

```bash
npx wrangler deploy
```

After the binding exists, `/api/auth/status` returns `available: true` and the Account page automatically switches from browser-local demo mode to server-backed accounts.

## Security implemented

- PBKDF2-SHA-256 password derivation with a unique random salt per user.
- Passwords are never stored in plaintext.
- Server sessions use random opaque tokens.
- Only SHA-256 hashes of session tokens are stored in D1.
- Session cookie is HttpOnly, Secure, SameSite=Lax.
- 30-day session expiry.
- Auth responses are no-store.
