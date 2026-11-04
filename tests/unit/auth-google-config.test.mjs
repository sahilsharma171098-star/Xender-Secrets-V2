import test from "node:test";
import assert from "node:assert/strict";
import { resolveGoogleOAuth } from "../../src/auth-google-config.mjs";

test("Google OAuth sign-in remains disabled when no complete credential pair exists",()=>{
  assert.equal(resolveGoogleOAuth({}),null);
  assert.equal(resolveGoogleOAuth({GOOGLE_CLIENT_ID:"partial"}),null);
  assert.equal(resolveGoogleOAuth({WORKSPACE_GOOGLE_CLIENT_SECRET:"partial"}),null);
  assert.equal(resolveGoogleOAuth({GOOGLE_CLIENT_ID:"a",WORKSPACE_GOOGLE_CLIENT_SECRET:"b"}),null);
});
test("Google OAuth can use existing Workspace client pair",()=>{
  const env={WORKSPACE_GOOGLE_CLIENT_ID:"workspace-id",WORKSPACE_GOOGLE_CLIENT_SECRET:"workspace-secret"};
  assert.deepEqual(resolveGoogleOAuth(env),{clientId:"workspace-id",clientSecret:"workspace-secret"});
});
test("Dedicated Google sign-in credentials take priority, without mixing pairs",()=>{
  const env={GOOGLE_CLIENT_ID:"sign-in-id",GOOGLE_CLIENT_SECRET:"sign-in-secret",WORKSPACE_GOOGLE_CLIENT_ID:"workspace-id",WORKSPACE_GOOGLE_CLIENT_SECRET:"workspace-secret"};
  assert.deepEqual(resolveGoogleOAuth(env),{clientId:"sign-in-id",clientSecret:"sign-in-secret"});
  assert.deepEqual(resolveGoogleOAuth({...env,GOOGLE_CLIENT_SECRET:""}),{clientId:"workspace-id",clientSecret:"workspace-secret"});
});
