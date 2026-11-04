// Use a dedicated Google OAuth Web Application client for Xender website login.
// Google Workspace integration credentials may have a different redirect URI.
export function resolveGoogleOAuth(env) {
  if (typeof env?.GOOGLE_CLIENT_ID !== "string" || typeof env?.GOOGLE_CLIENT_SECRET !== "string") return null;
  if (!env.GOOGLE_CLIENT_ID.trim() || !env.GOOGLE_CLIENT_SECRET.trim()) return null;
  return {clientId: env.GOOGLE_CLIENT_ID.trim(),clientSecret: env.GOOGLE_CLIENT_SECRET.trim()};
}
