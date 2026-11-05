// MT-010 / gate G11 — the manual SiteCheck Pro chargeback path documented in docs/PAYU_CHARGEBACK.md.
// Every behaviour the runbook promises is asserted here against the real ledger and licence code.
import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {ensurePayuSchema,handlePayuLedger,handlePayu} from "../../src/payu-routes.mjs";
import {ensureSitecheckLicenseSchema,handleSitecheckLicenseInternal} from "../../src/sitecheck-license.mjs";

// Same adapter as the other ledger tests: Durable Object exec(sql, ...bindings) on node:sqlite.
const dbSql=db=>({
  exec(query,...args){
    if(!args.length&&/^\s*CREATE\s/i.test(query)){db.exec(query);return {toArray:()=>[]};}
    const statement=db.prepare(query);
    if(/^\s*SELECT\s/i.test(query))return {toArray:()=>statement.all(...args)};
    statement.run(...args);
    return {toArray:()=>[]};
  }
});
const post=(url,body)=>new Request(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});

function setup(){
  const db=new DatabaseSync(":memory:");
  ensurePayuSchema(db);
  ensureSitecheckLicenseSchema(db);
  const sql=dbSql(db);
  const ledger=async(action,body)=>{
    const r=await handlePayuLedger(post("https://internal.invalid/api/payu-ledger/"+action,body),sql);
    return {status:r.status,body:await r.json()};
  };
  const licence=async(action,body,user=null)=>{
    const r=await handleSitecheckLicenseInternal(post("https://www.xendersecrets.com/internal/sitecheck-license/"+action,body),sql,async()=>user);
    return {status:r.status,body:await r.json()};
  };
  return {db,ledger,licence};
}

const email="buyer@example.com";
const user={id:"11111111-1111-4111-8111-111111111111",email};
const txnid="XS20261105CB1234567";
const order={txnid,offerId:"sitecheck-pro-onetime",amountPaise:49900,name:"Buyer",email,phone:"9876543210",reference:"",createdAt:new Date().toISOString(),accountId:user.id};

async function paidWithKey(t){
  assert.equal((await t.ledger("create",{order})).status,200);
  assert.equal((await t.ledger("settle",{txnid,paymentId:"pay_cb_123",verifiedStatus:"captured"})).body.status,"captured");
  const issued=await t.licence("issue",{},user);
  assert.equal(issued.status,200);
  const key=issued.body.licenseKey;
  assert.equal((await t.licence("verify",{licenseKey:key})).body.pro,true);
  return key;
}

test("chargeback reconcile revokes Pro, records the event and blocks re-settlement",async()=>{
  const t=setup();
  const key=await paidWithKey(t);

  const r=await t.ledger("revoke",{txnid,reason:"chargeback"});
  assert.equal(r.status,200);
  assert.equal(r.body.status,"chargeback");
  assert.equal(t.db.prepare("SELECT status FROM payu_orders WHERE txnid=?").get(txnid).status,"chargeback");
  const ent=t.db.prepare("SELECT status,revoked_at FROM extension_entitlements WHERE txnid=?").get(txnid);
  assert.equal(ent.status,"revoked");
  assert.ok(ent.revoked_at);
  const ev=t.db.prepare("SELECT event,status FROM payu_events WHERE txnid=? AND event='admin_reconciliation'").all(txnid);
  assert.deepEqual(ev.map(e=>[e.event,e.status]),[["admin_reconciliation","chargeback"]]);

  // The extension's next verify (popup open) gets Pro = false; a new key cannot be issued.
  assert.equal((await t.licence("verify",{licenseKey:key})).body.pro,false);
  assert.equal((await t.licence("issue",{},user)).status,403);
  // Customer-facing entitlement list shows the revoked row.
  const list=await t.ledger("entitlements",{email});
  assert.equal(list.body.entitlements[0].status,"revoked");
  // A late recheck/verify cannot turn a charged-back order back into "captured".
  assert.equal((await t.ledger("settle",{txnid,paymentId:"pay_cb_123",verifiedStatus:"captured"})).status,409);
  t.db.close();
});

test("chargeback reconcile is idempotent and never flips to refunded",async()=>{
  const t=setup();
  await paidWithKey(t);
  assert.equal((await t.ledger("revoke",{txnid,reason:"chargeback"})).body.status,"chargeback");
  const again=await t.ledger("revoke",{txnid,reason:"chargeback"});
  assert.deepEqual([again.status,again.body.duplicate,again.body.status],[200,true,"chargeback"]);
  const asRefund=await t.ledger("revoke",{txnid,reason:"refunded"});
  assert.deepEqual([asRefund.body.duplicate,asRefund.body.status],[true,"chargeback"]);
  assert.equal(t.db.prepare("SELECT COUNT(*) AS n FROM payu_events WHERE txnid=? AND event='admin_reconciliation'").get(txnid).n,1);
  t.db.close();
});

test("chargeback reconcile refuses orders that were never captured, unknown or malformed txnids",async()=>{
  const t=setup();
  assert.equal((await t.ledger("create",{order})).status,200);
  assert.equal((await t.ledger("revoke",{txnid,reason:"chargeback"})).status,409, "pending order: nothing to revoke");
  assert.equal((await t.ledger("revoke",{txnid:"XS20261105UNKNOWN01",reason:"chargeback"})).status,404);
  assert.equal((await t.ledger("revoke",{txnid:"bad id!",reason:"chargeback"})).status,400);
  t.db.close();
});

test("admin reconcile endpoint: chargeback needs the admin bearer token and same origin",async()=>{
  const base="https://www.xendersecrets.com/api/payu/admin/reconcile";
  const env={PAYU_KEY:"key",PAYU_SALT:"salt",ADMIN_TOKEN:"test-admin-token"};
  const req=(headers)=>new Request(base,{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify({txnid,reason:"chargeback"})});
  assert.equal((await handlePayu(req({}),env)).status,401);
  assert.equal((await handlePayu(req({authorization:"Bearer wrong"}),env)).status,401);
  assert.equal((await handlePayu(req({authorization:"Bearer test-admin-token",Origin:"https://evil.test"}),env)).status,403);
  assert.equal((await handlePayu(req({authorization:"Bearer x"}),{...env,ADMIN_TOKEN:""})).status,401, "no ADMIN_TOKEN configured: always refused");
});
