// Select an intact OAuth credential pair. Never mix ID and secret across clients.
// Google Cloud must authorize /api/auth/oauth/google/callback for the chosen web client.
export function resolveGoogleOAuth(env) {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
  }
  if (env.WORKSPACE_GOOGLE_CLIENT_ID && env.WORKSPACE_GOOGLE_CLIENT_SECRET) {
    return { clientId: env.WORKSPACE_GOOGLE_CLIENT_ID, clientSecret: env.WORKSPACE_GOOGLE_CLIENT_SECRET };
  }
  return null;
}
