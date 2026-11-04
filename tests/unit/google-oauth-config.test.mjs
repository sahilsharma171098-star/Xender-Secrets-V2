import test from "node:test";
import assert from "node:assert/strict";
import { googleOAuthCredentials } from "../../src/google-oauth-config.mjs";

test("Google OAuth stays disabled when no complete credential pair exists", () => {
  assert.equal(googleOAuthCredentials({}), null);
  assert.equal(googleOAuthCredentials({ GOOGLE_CLIENT_ID: "only-id" }), null);
  assert.equal(googleOAuthCredentials({ WORKSPACE_GOOGLE_CLIENT_SECRET: "only-secret" }), null);
  assert.equal(googleOAuthCredentials({ GOOGLE_CLIENT_ID: "wrong-id", WORKSPACE_GOOGLE_CLIENT_SECRET: "wrong-secret" }), null);
});

test("Google account OAuth accepts existing complete WORKSPACE_GOOGLE credentials", () => {
  assert.deepEqual(googleOAuthCredentials({
    WORKSPACE_GOOGLE_CLIENT_ID: "workspace-id",
    WORKSPACE_GOOGLE_CLIENT_SECRET: "workspace-secret",
  }), { clientId: "workspace-id", clientSecret: "workspace-secret" });
});

test("Google account OAuth prefers dedicated credentials to workspace fallback", () => {
  assert.deepEqual(googleOAuthCredentials({
    GOOGLE_CLIENT_ID: "account-id",
    GOOGLE_CLIENT_SECRET: "account-secret",
    WORKSPACE_GOOGLE_CLIENT_ID: "workspace-id",
    WORKSPACE_GOOGLE_CLIENT_SECRET: "workspace-secret",
  }), { clientId: "account-id", clientSecret: "account-secret" });
});

test("Google OAuth does not combine half-configured dedicated credentials with workspace pair", () => {
  assert.deepEqual(googleOAuthCredentials({
    GOOGLE_CLIENT_ID: "account-id-without-secret",
    WORKSPACE_GOOGLE_CLIENT_ID: "workspace-id",
    WORKSPACE_GOOGLE_CLIENT_SECRET: "workspace-secret",
  }), { clientId: "workspace-id", clientSecret: "workspace-secret" });
});
