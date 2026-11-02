import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {ensurePayuSchema,handlePayuLedger,handlePayu} from "../../src/payu-routes.mjs";

const jsonRequest=(path,data)=>new Request("https://internal.invalid"+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
const send=async(db,path,data)=>{
  const response=await handlePayuLedger(jsonRequest(path,data),db);
  return {status:response.status,body:await response.json()};
};
test("SQLite ledger enforces unique transaction and idempotent capture",async()=>{
  const db=new DatabaseSync(":memory:");
  ensurePayuSchema(db);
  const order={txnid:"XS20261102ABC123456",offerId:"founding-website-999",amountPaise:117882,name:"Example",email:"example@test.com",phone:"9876543210",reference:"",createdAt:new Date().toISOString()};
  assert.equal((await send(db,"/api/payu-ledger/create",{order})).status,200);
  await assert.rejects(async()=>send(db,"/api/payu-ledger/create",{order}));
  const wrong={...order,txnid:"XS20261102ABC123457",amountPaise:100};
  assert.equal((await send(db,"/api/payu-ledger/create",{order:wrong})).status,400);
  assert.equal((await send(db,"/api/payu-ledger/settle",{txnid:order.txnid,paymentId:"pay_123",verifiedStatus:"authorized"})).status,400);
  const captured=await send(db,"/api/payu-ledger/settle",{txnid:order.txnid,paymentId:"pay_123",verifiedStatus:"captured"});
  assert.equal(captured.body.status,"captured");
  const repeated=await send(db,"/api/payu-ledger/settle",{txnid:order.txnid,paymentId:"pay_123",verifiedStatus:"captured"});
  assert.equal(repeated.body.duplicate,true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM payu_events WHERE txnid=?").get(order.txnid).n,1);
  const revoked=await send(db,"/api/payu-ledger/revoke",{txnid:order.txnid,reason:"refunded"});
  assert.equal(revoked.body.status,"refunded");
  const twice=await send(db,"/api/payu-ledger/revoke",{txnid:order.txnid,reason:"refunded"});
  assert.equal(twice.body.duplicate,true);
  assert.equal((await send(db,"/api/payu-ledger/settle",{txnid:order.txnid,paymentId:"pay_123",verifiedStatus:"captured"})).status,409);
  db.close();
});
test("Admin refund reconciliation rejects missing credentials and invalid reasons",async()=>{
  const base="https://www.xendersecrets.com/api/payu/admin/reconcile";
  const env={PAYU_KEY:"key",PAYU_SALT:"salt",ADMIN_TOKEN:"admin-secret"};
  const request=(headers,reason)=>new Request(base,{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify({txnid:"XS20261102ABC123456",reason})});
  assert.equal((await handlePayu(request({},"refunded"),env)).status,401);
  assert.equal((await handlePayu(request({authorization:"Bearer admin-secret"},"not-a-reason"),env)).status,400);
  assert.equal((await handlePayu(request({authorization:"Bearer admin-secret",Origin:"https://evil.test"},"refunded"),env)).status,403);
});
