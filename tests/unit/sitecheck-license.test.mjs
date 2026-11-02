import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {ensurePayuSchema,handlePayuLedger} from "../../src/payu-routes.mjs";
import {ensureSitecheckLicenseSchema,handleSitecheckLicenseInternal} from "../../src/sitecheck-license.mjs";

const dbSql=db=>({
 exec(statement,...bindings){
   if(!bindings.length && /^\s*CREATE\s/i.test(statement)){db.exec(statement);return {toArray:()=>[]};}
   const stmt=db.prepare(statement);
   if(/^\s*SELECT\s/i.test(statement))return {toArray:()=>stmt.all(...bindings)};
   stmt.run(...bindings);
   return {toArray:()=>[]};
 }
});
const invoke=async(sql,path,data,user=null)=>{
 const request=new Request("https://www.xendersecrets.com/internal/sitecheck-license/"+path,{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify(data)
 });
 const response=await handleSitecheckLicenseInternal(request,sql,async()=>user);
 return {status:response.status,data:await response.json()};
};
test("unpaid and anonymous customers cannot issue SiteCheck Pro keys",async()=>{
 const db=new DatabaseSync(":memory:");ensurePayuSchema(db);ensureSitecheckLicenseSchema(db);
 const sql=dbSql(db);
 assert.equal((await invoke(sql,"issue",{},null)).status,401);
 assert.equal((await invoke(sql,"issue",{}, {email:"buyer@example.com"})).status,403);
 assert.equal((await invoke(sql,"verify",{licenseKey:"sc1_"+ "a".repeat(64)})).data.pro,false);
 db.close();
});
test("Pro purchase issues hash-only key; rotation, refund and invalid key fail closed",async()=>{
 const db=new DatabaseSync(":memory:");ensurePayuSchema(db);ensureSitecheckLicenseSchema(db);
 const sql=dbSql(db);
 const email="buyer@example.com",now=new Date().toISOString(),txnid="XS20261102PRO123456";
 const order={txnid,offerId:"sitecheck-pro-onetime",amountPaise:49900,name:"Buyer",email,phone:"9876543210",reference:"",createdAt:now};
 const ledger=async(path,body)=>{
   const response=await handlePayuLedger(new Request("https://internal.invalid/api/payu-ledger/"+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}),sql);
   return response;
 };
 assert.equal((await ledger("create",{order})).status,200);
 assert.equal((await ledger("settle",{txnid,paymentId:"valid-pay-123",verifiedStatus:"captured"})).status,200);
 const issued=await invoke(sql,"issue",{}, {email});
 assert.equal(issued.status,200);
 const key=issued.data.licenseKey;
 assert.match(key,/^sc1_[a-f0-9]{64}$/);
 assert.equal(db.prepare("SELECT token_hash FROM sitecheck_license_keys WHERE email=?").get(email).token_hash===key,false);
 assert.equal((await invoke(sql,"verify",{licenseKey:key})).data.pro,true);
 assert.equal((await invoke(sql,"verify",{licenseKey:key.slice(0,-1)+"0"})).data.pro,false);
 const next=(await invoke(sql,"issue",{}, {email})).data.licenseKey;
 assert.notEqual(next,key);
 assert.equal((await invoke(sql,"verify",{licenseKey:key})).data.pro,false);
 assert.equal((await invoke(sql,"verify",{licenseKey:next})).data.pro,true);
 assert.equal((await ledger("revoke",{txnid,reason:"refunded"})).status,200);
 assert.equal((await invoke(sql,"verify",{licenseKey:next})).data.pro,false);
 assert.equal((await invoke(sql,"issue",{}, {email})).status,403);
 db.close();
});
