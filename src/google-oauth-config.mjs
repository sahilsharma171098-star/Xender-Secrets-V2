/**
 * Xender website sign-in uses ONLY a dedicated Google OAuth Web application client.
 * Workspace integration OAuth credentials are unrelated, even if both use Google.
 *
 * Keep client ID and secret in Cloudflare encrypted Worker Secrets. Never log or
 * expose their values in public provider discovery responses.
 */
export function googleOAuthCredentials(env = {}) {
  const clientId = typeof env.GOOGLE_CLIENT_ID === "string" ? env.GOOGLE_CLIENT_ID.trim() : "";
  const clientSecret = typeof env.GOOGLE_CLIENT_SECRET === "string" ? env.GOOGLE_CLIENT_SECRET.trim() : "";
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
