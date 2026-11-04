// Offline end-to-end PayU callback flow: no merchant keys, card network or real money.
import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {createHash} from "node:crypto";
import {handlePayu,handlePayuLedger,ensurePayuSchema} from "../../src/payu-routes.mjs";
import {handleSitecheckLicenseInternal,ensureSitecheckLicenseSchema} from "../../src/sitecheck-license.mjs";

const origin="https://www.xendersecrets.com";
const salt="offline-test-salt",key="offline-test-key";
const user={id:"11111111-1111-4111-8111-111111111111",name:"Buyer",email:"buyer@example.com"};
const sha512=str=>createHash("sha512").update(str).digest("hex");
const sqlAdapter=db=>({exec(stmt,...args){
  if(!args.length&&/^\s*CREATE\s/i.test(stmt)){db.exec(stmt);return {toArray:()=>[]};}
  const p=db.prepare(stmt);
  if(/^\s*SELECT\s/i.test(stmt))return {toArray:()=>p.all(...args)};
  p.run(...args);return {toArray:()=>[]};
}});
function newHarness(){
  const db=new DatabaseSync(":memory:");
  ensurePayuSchema(db);
  ensureSitecheckLicenseSchema(db);
  const sql=sqlAdapter(db);
  const stub={fetch:async request=>{
    const path=new URL(request.url).pathname;
    if(path==="/api/auth/me")return new Response(JSON.stringify({ok:true,user}),{headers:{"content-type":"application/json"}});
    if(path.startsWith("/api/payu-ledger/"))return handlePayuLedger(request,sql);
    if(path.startsWith("/internal/sitecheck-license/"))return handleSitecheckLicenseInternal(request,sql,async()=>user);
    return new Response("not found",{status:404});
  }};
  const env={PAYU_KEY:key,PAYU_SALT:salt,SITECHECK_PRO_CHECKOUT_ENABLED:"true",
    APP_STATE:{idFromName:()=>({}),get:()=>stub}};
  return {db,sql,env};
}
async function initiate(env){
  const body={offer:"sitecheck-pro-onetime",name:user.name,email:user.email,phone:"9876543210"};
  const request=new Request(origin+"/api/payu/initiate",{method:"POST",headers:{"content-type":"application/json",Origin:origin,Cookie:"xs_session=offline"},body:JSON.stringify(body)});
  const response=await handlePayu(request,env);
  assert.equal(response.status,201);
  const data=await response.json();
  assert.equal(data.fields.amount,"499.00");
  assert.equal(data.fields.udf1,"sitecheck-pro-onetime");
  assert.equal(data.url,"https://secure.payu.in/_payment");
  return data.fields;
}
function validPayuCallback(fields,override={}){
  const values={...fields,status:"success",...override};
  const hashParts=[salt,values.status,"","","","","",
    values.udf5||"",values.udf4||"",values.udf3||"",values.udf2||"",values.udf1||"",
    values.email,values.firstname,values.productinfo,values.amount,values.txnid,values.key];
  values.hash=sha512(hashParts.join("|"));
  return new Request(origin+"/api/payu/webhook",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams(values)});
}
test("signed ₹499 PayU webhook is independently verified, fulfills SiteCheck once, and refund revokes it",async()=>{
  const {db,env,sql}=newHarness();
  const priorFetch=globalThis.fetch;
  try{
    const f=await initiate(env);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM extension_entitlements").get().n,0);
    const wrongAmount=validPayuCallback(f,{amount:"1.00"});
    assert.equal((await handlePayu(wrongAmount,env)).status,400,"server rejects spoofed amount even with valid reverse hash");
    const pending=await handlePayu(new Request(origin+"/api/payu/webhook",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:"key="+key+"&hash=bad"}),env);
    assert.equal(pending.status,400,"forged hash never settles");
    const payuCalls=[];
    globalThis.fetch=async (url,options)=>{
      assert.equal(String(url),"https://info.payu.in/merchant/postservice.php?form=2");
      assert.equal(options.body.get("command"),"verify_payment");
      assert.equal(options.body.get("var1"),f.txnid);
      payuCalls.push(1);
      return new Response(JSON.stringify({transaction_details:{[f.txnid]:{
        mihpayid:"12345678901",status:"success",unmappedstatus:"captured",amt:"499.00"
      }}}),{headers:{"content-type":"application/json"}});
    };
    const response=await handlePayu(validPayuCallback(f),env);
    assert.equal(response.status,200);
    assert.equal((await response.json()).fulfilled,true);
    assert.equal(payuCalls.length,1);
    const entitlement=db.prepare("SELECT product_id,status FROM extension_entitlements WHERE txnid=?").get(f.txnid);
    assert.equal(entitlement.product_id,"sitecheck");
    assert.equal(entitlement.status,"active");
    const replay=await handlePayu(validPayuCallback(f),env);
    assert.equal((await replay.json()).fulfilled,true);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM extension_entitlements WHERE txnid=?").get(f.txnid).n,1);
    const issueRequest=new Request(origin+"/internal/sitecheck-license/issue",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
    const issued=await handleSitecheckLicenseInternal(issueRequest,sql,async()=>user);
    assert.equal(issued.status,200);
    const license=(await issued.json()).licenseKey;
    const verifyRequest=()=>new Request(origin+"/internal/sitecheck-license/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({licenseKey:license})});
    assert.equal((await (await handleSitecheckLicenseInternal(verifyRequest(),sql,async()=>null)).json()).pro,true);
    const reversed=await handlePayuLedger(new Request("https://internal.invalid/api/payu-ledger/revoke",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({txnid:f.txnid,reason:"refunded"})}),sql);
    assert.equal(reversed.status,200);
    assert.equal((await (await handleSitecheckLicenseInternal(verifyRequest(),sql,async()=>null)).json()).pro,false);
  }finally{globalThis.fetch=priorFetch;db.close();}
});
test("PayU does not fulfill if authoritative verify_payment reports pending",async()=>{
  const {db,env}=newHarness();
  const priorFetch=globalThis.fetch;
  try{
    const f=await initiate(env);
    globalThis.fetch=async()=>new Response(JSON.stringify({transaction_details:{[f.txnid]:{
      mihpayid:"12345678901",status:"success",unmappedstatus:"auth",amt:"499.00"
    }}}),{headers:{"content-type":"application/json"}});
    const response=await handlePayu(validPayuCallback(f),env);
    assert.equal(response.status,409);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM extension_entitlements").get().n,0);
  }finally{globalThis.fetch=priorFetch;db.close();}
});
test("admin recovery settles a captured payment whose callback and webhook were lost, once, only after PayU confirms",async()=>{
  const {db,env}=newHarness();
  env.ADMIN_TOKEN="offline-admin-token-0123456789";
  const priorFetch=globalThis.fetch;
  const verify=(txnid,headers={})=>handlePayu(new Request(origin+"/api/payu/admin/verify",{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify({txnid})}),env);
  const admin={authorization:"Bearer "+env.ADMIN_TOKEN};
  const entitlements=()=>db.prepare("SELECT COUNT(*) AS n FROM extension_entitlements").get().n;
  let payu={status:"success",unmappedstatus:"auth",amt:"499.00"};
  try{
    const f=await initiate(env);
    globalThis.fetch=async(url,options)=>{
      assert.equal(options.body.get("command"),"verify_payment");
      return new Response(JSON.stringify({transaction_details:{[f.txnid]:{mihpayid:"98765432101",...payu}}}),{headers:{"content-type":"application/json"}});
    };
    assert.equal((await verify(f.txnid)).status,401,"no admin token");
    assert.equal((await verify(f.txnid,{authorization:"Bearer wrong"})).status,401);
    assert.equal((await verify(f.txnid,{...admin,Origin:"https://attacker.invalid"})).status,403);
    assert.equal((await verify("bad id",admin)).status,400);
    assert.equal((await verify("XSUNKNOWN0000000000",admin)).status,404);
    const authorized=await(await verify(f.txnid,admin)).json();
    assert.equal(authorized.status,"pending","authorized-but-not-captured is not paid");
    assert.equal(authorized.changed,false);
    assert.equal(entitlements(),0);
    payu={status:"success",unmappedstatus:"captured",amt:"1.00"};
    assert.equal((await(await verify(f.txnid,admin)).json()).status,"pending","amount mismatch never settles");
    assert.equal(entitlements(),0);
    payu={status:"success",unmappedstatus:"captured",amt:"499.00"};
    const settled=await(await verify(f.txnid,admin)).json();
    assert.deepEqual([settled.status,settled.changed],["captured",true]);
    assert.equal(entitlements(),1);
    const again=await(await verify(f.txnid,admin)).json();
    assert.deepEqual([again.status,again.changed],["captured",false]);
    assert.equal(entitlements(),1,"repeat recovery never duplicates the license");
    assert.equal(JSON.stringify(again).includes(user.email),false,"no customer PII in admin response");
  }finally{globalThis.fetch=priorFetch;db.close();}
});
