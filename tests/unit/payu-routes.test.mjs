import test from "node:test";
import assert from "node:assert/strict";
import {handlePayu} from "../../src/payu-routes.mjs";

const env={PAYU_KEY:"test-key",PAYU_SALT:"test-salt"};
const request=(path,method="GET",body,headers={})=>new Request("https://www.xendersecrets.com"+path,{
  method,headers:{"content-type":"application/json",...headers},
  ...(body?{body:JSON.stringify(body)}:{})
});

test("PayU route ignores existing Razorpay paths",async()=>{
  assert.equal(await handlePayu(request("/api/payments/config"),env),null);
});
test("config advertises server-priced domestic packages only",async()=>{
  const r=await handlePayu(request("/api/payu/config"),env);
  const j=await r.json();
  assert.equal(j.available,true);
  assert.equal(j.provider,"payu");
  assert.equal(j.currency,"INR");
  assert.deepEqual(j.offers,[],"Unverified website PayU offers stay hidden; Razorpay remains on /pay");
  assert.equal(JSON.stringify(j).includes("test-salt"),false);
});
test("initiate rejects missing origin and forged cross-site origin",async()=>{
  const body={offer:"founding-website-999",name:"Example Buyer",email:"buyer@example.com",phone:"9876543210"};
  const a=await handlePayu(request("/api/payu/initiate","POST",body),env);
  const b=await handlePayu(request("/api/payu/initiate","POST",body,{Origin:"https://attacker.invalid"}),env);
  assert.equal(a.status,403);
  assert.equal(b.status,403);
});
test("PayU website packages cannot initiate transactions while Razorpay remains available",async()=>{
  const b={offer:"founding-website-999",name:"Example Buyer",email:"buyer@example.com",phone:"9876543210"};
  const r=await handlePayu(request("/api/payu/initiate","POST",b,{Origin:"https://www.xendersecrets.com"}),env);
  assert.equal(r.status,503);
  assert.match((await r.json()).error,/Razorpay/);
});
test("invalid offer and contact data never reaches payment ledger",async()=>{
  const body={offer:"not-real",name:"Example Buyer",email:"buyer@example.com",phone:"9876543210"};
  const r=await handlePayu(request("/api/payu/initiate","POST",body,{Origin:"https://www.xendersecrets.com"}),env);
  assert.equal(r.status,400);
});
test("callbacks reject missing form encoding or invalid hashes",async()=>{
  const r=await handlePayu(request("/api/payu/callback","POST",{status:"success"}),env);
  assert.equal(r.status,415);
  const form=new Request("https://www.xendersecrets.com/api/payu/callback",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:"status=success&key=test-key&hash=bogus"});
  const x=await handlePayu(form,env);
  assert.equal(x.status,400);
});
test("PayU missing credentials fail closed",async()=>{
  const r=await handlePayu(request("/api/payu/config"),{PAYU_KEY:"test-key"});
  assert.equal(r.status,503);
});

test("SiteCheck INR price is advertised separately, but not charged before release",async()=>{
  const config=await (await handlePayu(request("/api/payu/config"),env)).json();
  assert.equal(config.sitecheck.amountPaise,49900);
  assert.equal(config.sitecheck.currency,"INR");
  assert.equal(config.sitecheck.release,"sitecheck-pro-v2.0.0");
  assert.equal(config.sitecheck.checkoutEnabled,false);
  assert.ok(config.offers.every(o=>o.id!=="sitecheck-pro-onetime"));
  const body={offer:"sitecheck-pro-onetime",name:"SiteCheck Buyer",email:"buyer@example.com",phone:"9876543210"};
  const checkout=await handlePayu(request("/api/payu/initiate","POST",body,{Origin:"https://www.xendersecrets.com"}),env);
  assert.equal(checkout.status,503);
  const payload=await checkout.json();
  assert.ok(/awaiting/i.test(payload.error));
});

test("server-to-server PayU webhook fails closed on malformed or unauthenticated messages",async()=>{
 const absent=await handlePayu(request("/api/payu/webhook","POST",{status:"success"}),env);
 assert.equal(absent.status,415);
 const forged=new Request("https://www.xendersecrets.com/api/payu/webhook",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:"status=success&key=test-key&hash=notvalid"});
 assert.equal((await handlePayu(forged,env)).status,400);
});

test("isolated SiteCheck canary requires signed-in allowlisted account without opening public checkout",async()=>{
  const url="https://www.xendersecrets.com";
  const canaryEmail="owner@example.com";
  const appState={idFromName:()=>({}),get:()=>({fetch:async req=>{
    const path=new URL(req.url).pathname;
    if(path==="/api/auth/me"){
      const hasValidCookie=req.headers.get("Cookie")==="xs_session=valid";
      return new Response(JSON.stringify(hasValidCookie?{ok:true,user:{id:"11111111-1111-4111-8111-111111111111",email:canaryEmail}}:{ok:false}),{status:hasValidCookie?200:401,headers:{"content-type":"application/json"}});
    }
    if(path==="/api/payu-ledger/create")return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json"}});
    return new Response(JSON.stringify({ok:false}),{status:404});
  }})};
  const canaryEnv={...env,SITECHECK_PRO_CANARY_EMAIL:canaryEmail,APP_STATE:appState};
  const open=await(await handlePayu(request("/api/payu/config","GET",null,{Cookie:"xs_session=valid"}),canaryEnv)).json();
  const anonymous=await(await handlePayu(request("/api/payu/config"),canaryEnv)).json();
  const other=await(await handlePayu(request("/api/payu/config","GET",null,{Cookie:"xs_session=other"}),canaryEnv)).json();
  assert.equal(open.sitecheck.checkoutEnabled,true);
  assert.equal(anonymous.sitecheck.checkoutEnabled,false);
  assert.equal(other.sitecheck.checkoutEnabled,false);
  const order={offer:"sitecheck-pro-onetime",name:"Owner",email:canaryEmail,phone:"9876543210"};
  const req=(cookie)=>request("/api/payu/initiate","POST",order,{Origin:url,Cookie:cookie});
  assert.equal((await handlePayu(req("xs_session=other"),canaryEnv)).status,503);
  const signed=await handlePayu(req("xs_session=valid"),canaryEnv);
  assert.equal(signed.status,201);
  const response=await signed.json();
  assert.equal(response.fields.amount,"499.00");
  assert.equal(response.fields.email,canaryEmail);
  assert.equal(response.url,"https://secure.payu.in/_payment");
});

test("merchant-only pilot is isolated to the authenticated owner; public checkout stays off",async()=>{
  const origin="https://www.xendersecrets.com";
  const stub={fetch:async req=>{
    const path=new URL(req.url).pathname;
    if(path==="/api/auth/me"){
      const email=req.headers.get("Cookie")==="xs_session=owner"?"merchant@example.com":"someone@example.com";
      return new Response(JSON.stringify({user:{id:"11111111-1111-4111-8111-111111111111",email,name:"Pilot Buyer"}}),{headers:{"content-type":"application/json"}});
    }
    if(path==="/api/payu-ledger/create")return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json"}});
    return new Response("not found",{status:404});
  }};
  const pilotEnv={...env,SITECHECK_PRO_OWNER_PILOT:"true",WORKSPACE_OWNER_EMAIL:"merchant@example.com",APP_STATE:{idFromName:()=>({}),get:()=>stub}};
  const anonymous=await (await handlePayu(request("/api/payu/config"),pilotEnv)).json();
  assert.equal(anonymous.sitecheck.checkoutEnabled,false);
  const other=await (await handlePayu(request("/api/payu/config","GET",undefined,{Cookie:"xs_session=other"}),pilotEnv)).json();
  assert.equal(other.sitecheck.checkoutEnabled,false);
  const owner=await (await handlePayu(request("/api/payu/config","GET",undefined,{Cookie:"xs_session=owner"}),pilotEnv)).json();
  assert.equal(owner.sitecheck.checkoutEnabled,true);
  assert.deepEqual(owner.offers,[]);
  const body={offer:"sitecheck-pro-onetime",name:"Pilot Buyer",email:"merchant@example.com",phone:"9876543210"};
  const denied=await handlePayu(request("/api/payu/initiate","POST",body,{Origin:origin,Cookie:"xs_session=other"}),pilotEnv);
  assert.equal(denied.status,503);
  const allowed=await handlePayu(request("/api/payu/initiate","POST",body,{Origin:origin,Cookie:"xs_session=owner"}),pilotEnv);
  assert.equal(allowed.status,201);
  const checkout=await allowed.json();
  assert.equal(checkout.fields.amount,"499.00");
  assert.equal(checkout.fields.udf1,"sitecheck-pro-onetime");
});


test("private checkout fails closed for broken auth and mismatched purchase email",async()=>{
  const body={offer:"sitecheck-pro-onetime",name:"Test Owner",email:"owner@example.com",phone:"9876543210"};
  for(const mode of ["unavailable","malformed","missing-id","other-account","mismatched-purchase"]){
    let writes=0;
    const stub={fetch:async req=>{
      if(new URL(req.url).pathname!=="/api/auth/me"){writes++;throw new Error("Unexpected ledger write");}
      if(mode==="unavailable")throw new Error("Auth unavailable");
      if(mode==="malformed")return new Response("invalid JSON");
      return Response.json({user:{...(mode!=="missing-id"?{id:"11111111-1111-4111-8111-111111111111"}:{}),email:mode==="other-account"?"other@example.com":"owner@example.com"}});
    }};
    const privateEnv={...env,SITECHECK_PRO_CHECKOUT_ENABLED:"false",SITECHECK_PRO_CANARY_EMAIL:"owner@example.com",APP_STATE:{idFromName:()=>({}),get:()=>stub}};
    const config=await(await handlePayu(request("/api/payu/config","GET",null,{Cookie:"xs_session=test"}),privateEnv)).json();
    assert.equal(config.sitecheck.checkoutEnabled,mode==="mismatched-purchase",mode);
    const purchase=mode==="mismatched-purchase"?{...body,email:"different@example.com"}:body;
    const result=await handlePayu(request("/api/payu/initiate","POST",purchase,{Origin:"https://www.xendersecrets.com",Cookie:"xs_session=test"}),privateEnv);
    assert.equal(result.status,mode==="mismatched-purchase"?401:503,mode);
    assert.equal(writes,0,mode);
  }
});
