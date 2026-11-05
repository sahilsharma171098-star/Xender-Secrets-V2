import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { pbkdf2Sync } from 'node:crypto';
const script=buildSync({entryPoints:['src/index.js'],bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']}).outputFiles[0].text;
// Test-only subclass seeds local SQLite fixtures. Never shipped or bound remotely.
const harness=script+`
let enforceHistoricalLimit=false;
const nativeDerive=crypto.subtle.deriveBits.bind(crypto.subtle);
crypto.subtle.deriveBits=(params,...args)=>{if(enforceHistoricalLimit&&params.name==='PBKDF2'&&params.iterations>100000)throw new Error('Pbkdf2 failed: iteration counts above 100000 are not supported (requested 180000).');return nativeDerive(params,...args)};
export class AuthFixture extends AppState {
 async fetch(request) {
  const u=new URL(request.url);
  if(u.pathname==='/limit'){enforceHistoricalLimit=true;return new Response('ok')}
  if(u.pathname==='/fixture') {const b=await request.json();this.sql.exec('INSERT INTO users(id,name,email,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',b.id,'Fixture',b.email,b.hash,b.salt,new Date().toISOString(),new Date().toISOString());return new Response('ok');}
  if(u.pathname==='/snapshot')return Response.json({users:this.sql.exec('SELECT id,email,password_hash FROM users').toArray(),sessions:this.sql.exec('SELECT token_hash FROM sessions').toArray()});
  return super.fetch(request);
 }
}`;
let mf,stub,verified=true,subject='google-new',email='new@example.test';
test.before(async()=>{
 mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:harness,compatibilityDate:'2026-10-03',durableObjects:{APP_STATE:{className:'AuthFixture',useSQLite:true}},bindings:{GOOGLE_CLIENT_ID:'fixture',GOOGLE_CLIENT_SECRET:'fixture'},outboundService:async request=>{
  const u=new URL(request.url);
  if(u.hostname==='oauth2.googleapis.com')return Response.json({access_token:'test-only'});
  if(u.hostname==='openidconnect.googleapis.com')return Response.json({sub:subject,name:'Fixture',email,email_verified:verified});
  throw new Error('Unexpected outbound request');
 }}));
 const ns=await mf.getDurableObjectNamespace('APP_STATE');stub=ns.get(ns.idFromName('isolated-auth'));
});
test.after(async()=>{await mf?.dispose()});
const call=(path,body,cookie)=>stub.fetch('https://local.test'+path,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'});
async function google(){const start=await call('/api/auth/oauth/google/start');const state=new URL(start.headers.get('location')).searchParams.get('state');return {state,response:await call('/api/auth/oauth/google/callback?code=fixture&state='+state)}}
test('real workerd: Google new user creates hashed session; state replay fails',async()=>{
 const {state,response:r}=await google();assert.equal(r.status,302);assert.match(r.headers.get('location'),/auth=google/);
 const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly; Secure; SameSite=Lax/);
 const me=await call('/api/auth/me',null,cookie);assert.equal(me.status,200);assert.equal((await me.json()).user.email,email);
 const snap=await (await call('/snapshot')).json();assert.match(snap.users[0].password_hash,/^pbkdf2-sha256\$100000\$/);assert.equal(snap.sessions.length,1);assert.ok(!cookie.includes(snap.sessions[0].token_hash));
 assert.match((await call('/api/auth/oauth/google/callback?code=fixture&state='+state)).headers.get('location'),/auth=expired/);
 assert.equal((await call('/api/auth/me')).status,401);
});
test('real workerd: password register/login and legacy recovery preserve credentials',async()=>{
 const registration=await call('/api/auth/register',{name:'Password User',email:'password@example.test',password:'new-password-123'});assert.equal(registration.status,201);
 assert.equal((await call('/api/auth/login',{email:'password@example.test',password:'wrong'})).status,401);
 const login=await call('/api/auth/login',{email:'password@example.test',password:'new-password-123'});assert.equal(login.status,200);assert.equal((await call('/api/auth/me',null,login.headers.get('set-cookie'))).status,200);
 const salt=Buffer.from('legacy-test-salt').toString('base64'),hash=pbkdf2Sync('legacy-password',Buffer.from(salt,'base64'),180000,32,'sha256').toString('base64');
 await call('/fixture',{id:'legacy-id',email:'legacy@example.test',salt,hash});
 const historical=await call('/api/auth/login',{email:'legacy@example.test',password:'legacy-password'});assert.equal(historical.status,200);
 await call('/limit');
 const failed=await call('/api/auth/login',{email:'legacy@example.test',password:'legacy-password'});assert.equal(failed.status,409);assert.equal((await failed.json()).code,'PASSWORD_RECOVERY_REQUIRED');assert.equal(failed.headers.get('set-cookie'),null);
 // Verified Google identity recovers the SAME account without overwriting its password.
 subject='legacy-google';email='legacy@example.test';const {response:r}=await google();assert.match(r.headers.get('location'),/auth=google/);assert.equal((await (await call('/api/auth/me',null,r.headers.get('set-cookie'))).json()).user.id,'legacy-id');
 const snap=await (await call('/snapshot')).json();assert.equal(snap.users.find(x=>x.id==='legacy-id').password_hash,hash);
 // An unverified matching address must not link to the password account.
 subject='unverified-google';verified=false;const {response:unverified}=await google();const user=(await (await call('/api/auth/me',null,unverified.headers.get('set-cookie'))).json()).user;assert.notEqual(user.id,'legacy-id');assert.match(user.email,/@social.xendersecrets.local$/);
});

