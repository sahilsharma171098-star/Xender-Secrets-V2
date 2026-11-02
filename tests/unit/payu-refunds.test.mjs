import test from "node:test";
import assert from "node:assert/strict";
import {queryPayuRefunds} from "../../src/payu-gateway.mjs";

const id="XS20261102PRO123456",paymentId="123456789012",key="merchant-test",salt="merchant-salt";
const call=async(payload,status=200)=>{
 let checked=false;
 const request=async(url,opts)=>{
   assert.match(url,/test\.payu\.in/);
   assert.equal(opts.method,"POST");
   const form=new URLSearchParams(opts.body);
   assert.equal(form.get("command"),"getAllRefundsFromTxnIds");
   assert.equal(form.get("var1"),id);
   assert.equal(form.get("key"),key);
   assert.match(form.get("hash"),/^[a-f0-9]{128}$/);
   checked=true;
   return new Response(JSON.stringify(payload),{status,headers:{"content-type":"application/json"}});
 };
 const result=await queryPayuRefunds(id,paymentId,{key,salt,testMode:true},request);
 assert.equal(checked,true);
 return result;
};
test("PayU full successful refund is counted only for matching original PayU ID",async()=>{
 const data={status:1,"Refund Details":{[paymentId]:[
  {PayuID:paymentId,RequestID:"r1",Amount:"300.00",Status:"SUCCESS"},
  {PayuID:paymentId,RequestID:"r2",Amount:"199.00",Status:"success"},
  {PayuID:paymentId,RequestID:"r2",Amount:"199.00",Status:"success"},
  {PayuID:paymentId,RequestID:"r3",Amount:"10.00",Status:"FAILURE"},
  {PayuID:"someone-else",RequestID:"r4",Amount:"1000.00",Status:"success"}
 ]}};
 assert.deepEqual(await call(data),{ok:true,totalPaise:49900});
});
test("No refunds and in-progress refunds do not revoke",async()=>{
 assert.equal((await call({status:1,msg:"No Refunds Found for the transaction."})).totalPaise,0);
 assert.equal((await call({status:1,"Refund Details":{[paymentId]:[{PayuID:paymentId,RequestID:"r5",Amount:"499.00",Status:"QUEUED"}]}})).totalPaise,0);
});
test("Unverified API status and invalid amounts fail closed",async()=>{
 await assert.rejects(()=>call({status:0,msg:"failed"}));
 await assert.rejects(()=>call({status:1,"Refund Details":{[paymentId]:[{PayuID:paymentId,RequestID:"r5",Amount:"nonsense",Status:"success"}]}}));
});
