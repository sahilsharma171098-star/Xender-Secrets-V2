import test from "node:test";
import assert from "node:assert/strict";
import {resolveGoogleOAuth} from "../../src/auth-google-config.mjs";

test("Google sign-in requires dedicated credentials, never unrelated Workspace secrets",()=>{
  assert.equal(resolveGoogleOAuth({}),null);
  assert.equal(resolveGoogleOAuth({GOOGLE_CLIENT_ID:"only-id"}),null);
  assert.equal(resolveGoogleOAuth({GOOGLE_CLIENT_SECRET:"only-secret"}),null);
  assert.equal(resolveGoogleOAuth({WORKSPACE_GOOGLE_CLIENT_ID:"workspace-id",WORKSPACE_GOOGLE_CLIENT_SECRET:"workspace-secret"}),null);
  assert.equal(resolveGoogleOAuth({GOOGLE_CLIENT_ID:"id",WORKSPACE_GOOGLE_CLIENT_SECRET:"workspace-secret"}),null);
});
test("Dedicated Google web client credentials use same complete pair",()=>{
  const env={GOOGLE_CLIENT_ID:" new-id ",GOOGLE_CLIENT_SECRET:" new-secret ",WORKSPACE_GOOGLE_CLIENT_ID:"workspace-id",WORKSPACE_GOOGLE_CLIENT_SECRET:"workspace-secret"};
  assert.deepEqual(resolveGoogleOAuth(env),{clientId:"new-id",clientSecret:"new-secret"});
});
