import test from "node:test";
import assert from "node:assert/strict";
import { googleOAuthCredentials } from "../../src/google-oauth-config.mjs";

test("Website Google OAuth fails closed without a full dedicated pair", () => {
  assert.equal(googleOAuthCredentials({}), null);
  assert.equal(googleOAuthCredentials({ GOOGLE_CLIENT_ID: "id-only" }), null);
  assert.equal(googleOAuthCredentials({ GOOGLE_CLIENT_SECRET: "secret-only" }), null);
  assert.equal(googleOAuthCredentials({ GOOGLE_CLIENT_ID: " ", GOOGLE_CLIENT_SECRET: "secret" }), null);
  assert.equal(googleOAuthCredentials({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "\t" }), null);
});

test("Workspace Google credentials alone cannot enable website sign-in", () => {
  assert.equal(googleOAuthCredentials({
    WORKSPACE_GOOGLE_CLIENT_ID: "workspace-id",
    WORKSPACE_GOOGLE_CLIENT_SECRET: "workspace-secret",
  }), null);
  assert.equal(googleOAuthCredentials({
    GOOGLE_CLIENT_ID: "website-id",
    WORKSPACE_GOOGLE_CLIENT_SECRET: "workspace-secret",
  }), null);
});

test("Dedicated Google credential pair is trimmed and preferred", () => {
  assert.deepEqual(googleOAuthCredentials({
    GOOGLE_CLIENT_ID: " dedicated-id ",
    GOOGLE_CLIENT_SECRET: " dedicated-secret ",
    WORKSPACE_GOOGLE_CLIENT_ID: "workspace-id",
    WORKSPACE_GOOGLE_CLIENT_SECRET: "workspace-secret",
  }), { clientId: "dedicated-id", clientSecret: "dedicated-secret" });
});
