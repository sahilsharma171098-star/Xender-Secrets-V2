/**
 * Google login prefers dedicated account OAuth credentials.
 * Older Xender deployments use WORKSPACE_* for the same Google OAuth web client.
 * Never expose either secret to the browser: this helper is used server-side only.
 *
 * The Google Cloud OAuth client's Authorized redirect URIs must contain:
 * https://www.xendersecrets.com/api/auth/oauth/google/callback
 */
export function googleOAuthCredentials(env = {}) {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
    return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
  if (env.WORKSPACE_GOOGLE_CLIENT_ID && env.WORKSPACE_GOOGLE_CLIENT_SECRET)
    return { clientId: env.WORKSPACE_GOOGLE_CLIENT_ID, clientSecret: env.WORKSPACE_GOOGLE_CLIENT_SECRET };
  return null;
}
