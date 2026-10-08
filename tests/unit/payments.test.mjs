import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHmac } from 'node:crypto';
import { ensurePaymentSchema } from '../../src/payment-store.mjs';
import { handlePayments } from '../../src/payments.mjs';

const env = {RAZORPAY_KEY_ID:'test-key',RAZORPAY_KEY_SECRET:'test-secret',RAZORPAY_WEBHOOK_SECRET:'webhook-test-secret',ADMIN_TOKEN:'a'.repeat(32)};
const hmac = (key, value) => createHmac('sha256',key).update(value).digest('hex');
function setup() {
  const db=new DatabaseSync(':memory:');
  const sql={exec(q,...a){let rows=[]; if(!a.length && q.trim().replace(/;\s*$/,'').includes(';')) db.exec(q); else {const s=db.prepare(q);rows=s.columns().length?s.all(...a):(s.run(...a),[]);}return {toArray:()=>rows.map(r=>({...r}))};}};
  ensurePaymentSchema(sql); ensurePaymentSchema(sql);
  const transaction=fn=>{db.exec('SAVEPOINT payment');try{const r=fn();db.exec('RELEASE payment');return r;}catch(e){db.exec('ROLLBACK TO payment; RELEASE payment');throw e;}};
  let count=0, lastPayload;
  const deps={sql,transaction,fetchImpl:async(url,opts)=>{assert.equal(url,'https://api.razorpay.com/v1/orders');lastPayload=JSON.parse(opts.body);return Response.json({id:'order_test'+(++count),amount:lastPayload.amount,currency:lastPayload.currency});}};
  const request=(path,body,headers={})=>new Request('https://www.xendersecrets.com'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const call=(path,body,headers)=>handlePayments(request(path,body,headers),env,deps);
  const create=()=>call('/api/payments/order',{offer:'founding-website-999',name:'Test Buyer',email:'buyer@example.test',reference:'QUOTE-TEST'});
  const verify=(orderId,paymentId='pay_test1')=>call('/api/payments/verify',{razorpay_order_id:orderId,razorpay_payment_id:paymentId,razorpay_signature:hmac(env.RAZORPAY_KEY_SECRET,orderId+'|'+paymentId)});
  const entity=(orderId,status='captured',id='pay_test1')=>({id,order_id:orderId,amount:117882,currency:'INR',status,captured:status==='captured'});
  const event=(orderId,type='payment.captured',id='pay_test1')=>({event:type,payload:{payment:{entity:entity(orderId,type==='payment.failed'?'failed':type==='payment.authorized'?'authorized':'captured',id)}}});
  const webhook=async(event,eventId)=>{const raw=JSON.stringify(event);return handlePayments(new Request('https://www.xendersecrets.com/api/payments/webhook',{method:'POST',headers:{'X-Razorpay-Signature':hmac(env.RAZORPAY_WEBHOOK_SECRET,raw),...(eventId?{'X-Razorpay-Event-Id':eventId}:{})},body:raw}),env,deps);};
  const orders=()=>sql.exec('SELECT * FROM payment_orders').toArray();
  return {db,sql,deps,call,create,verify,event,webhook,orders,request,payload:()=>lastPayload};
}

test('payment order stores server-priced GST amount, contact and quote before returning checkout',async()=>{
  const s=setup(),r=await s.create(),j=await r.json();assert.equal(r.status,201);assert.equal(j.amount,117882);
  const row=s.orders()[0];assert.equal(row.provider_order_id,j.orderId);assert.equal(row.amount,117882);assert.equal(row.quote_reference,'QUOTE-TEST');assert.equal(row.status,'created');assert.equal(s.payload().notes.xs_order_id,row.id);assert.equal(row.receipt,j.receipt);
});
test('payment config and writes fail closed without storage or credentials',async()=>{
  const s=setup();let r=await handlePayments(s.request('/api/payments/config'),env);assert.equal((await r.json()).available,false);
  r=await handlePayments(s.request('/api/payments/order',{}),env);assert.equal(r.status,503);
  r=await handlePayments(s.request('/api/payments/order',{}),{},s.deps);assert.equal(r.status,503);assert.equal(s.orders().length,0);
});
test('invalid offers, contacts, null JSON and foreign origin never reach the provider',async()=>{
  const s=setup();for(const body of [null,{offer:'toString'},{offer:'__proto__'},{offer:'founding-website-999',name:'Buyer',email:'bad'}])assert.equal((await s.call('/api/payments/order',body)).status,400);
  assert.equal((await s.call('/api/payments/order',{}, {Origin:'https://evil.example'})).status,403);assert.equal(s.orders().length,0);
});
test('provider failure and mismatched amount do not yield usable checkout orders',async()=>{
  for(const response of [()=>Response.json({error:'failed'},{status:500}),()=>Response.json({id:'order_bad',amount:1,currency:'INR'})]){const s=setup();s.deps.fetchImpl=response;assert.equal((await s.create()).status,502);assert.equal(s.orders()[0].provider_order_id,null);}
  const s=setup();s.deps.fetchImpl=()=>{throw new Error('network');};assert.equal((await s.create()).status,502);assert.equal(s.orders()[0].status,'creation_unknown');
});
test('checkout verification is persisted and idempotent but does not claim capture',async()=>{
  const s=setup(),{orderId}=await(await s.create()).json();for(let i=0;i<2;i++){const r=await s.verify(orderId);assert.equal(r.status,200);assert.equal((await r.json()).status,'verified');}assert.equal(s.orders()[0].status,'verified');assert.equal(s.sql.exec('SELECT * FROM payment_attempts').toArray().length,1);
});
test('unknown orders and bad checkout signatures never create payment records',async()=>{
  const s=setup();assert.equal((await s.verify('order_unknown')).status,404);const {orderId}=await(await s.create()).json();
  assert.equal((await s.call('/api/payments/verify',{razorpay_order_id:orderId,razorpay_payment_id:'pay_bad',razorpay_signature:'0'.repeat(64)})).status,400);assert.equal(s.orders()[0].status,'created');
});
test('captured webhook is durable, duplicate-safe, and late failure/verification cannot undo payment',async()=>{
  const s=setup(),{orderId}=await(await s.create()).json(),e=s.event(orderId);
  assert.equal((await s.webhook(e,'evt_1')).status,200);assert.equal((await(await s.webhook(e,'evt_1')).json()).duplicate,true);
  await s.webhook(s.event(orderId,'payment.failed'),'evt_2');await s.webhook(s.event(orderId,'payment.authorized'),'evt_3');await s.verify(orderId);await s.webhook(s.event(orderId,'payment.failed','pay_retry'),'evt_4');
  assert.equal(s.orders()[0].status,'paid');assert.equal(s.sql.exec("SELECT status FROM payment_attempts WHERE payment_id='pay_test1'").toArray()[0].status,'captured');
});
test('webhook payload hash deduplicates retries without an event id',async()=>{
  const s=setup(),{orderId}=await(await s.create()).json(),e=s.event(orderId);await s.webhook(e);assert.equal((await(await s.webhook(e)).json()).duplicate,true);assert.equal(s.sql.exec('SELECT * FROM payment_events').toArray().length,1);
});
test('a reused event id with a different signed payload is rejected',async()=>{
  const s=setup(),{orderId}=await(await s.create()).json();await s.webhook(s.event(orderId),'evt_reused');assert.equal((await s.webhook(s.event(orderId,'payment.failed'),'evt_reused')).status,409);assert.equal(s.orders()[0].status,'paid');
});
test('failed attempt followed by a successful retry marks the order paid',async()=>{
  const s=setup(),{orderId}=await(await s.create()).json();await s.webhook(s.event(orderId,'payment.failed'),'evt_f');assert.equal(s.orders()[0].status,'failed');await s.webhook(s.event(orderId,'payment.captured','pay_retry'),'evt_c');assert.equal(s.orders()[0].status,'paid');
});
test('signed webhook checks amount, currency, capture and provider status against the stored order',async()=>{
  for(const patch of [{amount:1},{currency:'USD'},{captured:false},{status:'authorized'}]){const s=setup(),{orderId}=await(await s.create()).json(),e=s.event(orderId);Object.assign(e.payload.payment.entity,patch);assert.equal((await s.webhook(e)).status,400);assert.equal(s.orders()[0].status,'created');assert.equal(s.sql.exec('SELECT * FROM payment_events').toArray().length,0);}
});
test('order.paid validates the order and payment entities together',async()=>{
  const s=setup(),{orderId}=await(await s.create()).json(),e=s.event(orderId,'order.paid');assert.equal((await s.webhook(e)).status,400);
  e.payload.order={entity:{id:orderId,status:'paid',amount:117882,amount_paid:117882,amount_due:0,currency:'INR'}};assert.equal((await s.webhook(e)).status,200);assert.equal(s.orders()[0].status,'paid');
});
test('a webhook can win the provider-response race using the saved correlation id',async()=>{
  const s=setup();s.deps.fetchImpl=async(url,opts)=>{const p=JSON.parse(opts.body),e=s.event('order_race');e.payload.payment.entity.notes={xs_order_id:p.notes.xs_order_id};assert.equal((await s.webhook(e)).status,200);return Response.json({id:'order_race',amount:p.amount,currency:p.currency});};assert.equal((await s.create()).status,201);assert.equal(s.orders()[0].status,'paid');
});
test('unknown relevant orders retry and unsupported events are ignored',async()=>{
  const s=setup();assert.equal((await s.webhook(s.event('order_unknown'))).status,503);assert.equal((await(await s.webhook({event:'refund.created'})).json()).ignored,true);assert.equal((await(await s.webhook({event:'toString'})).json()).ignored,true);
});
test('invalid webhook signature/JSON cannot mutate payment state',async()=>{
  const s=setup();await s.create();const raw='{';for(const sig of ['0'.repeat(64),hmac(env.RAZORPAY_WEBHOOK_SECRET,raw)]){const r=await handlePayments(new Request('https://www.xendersecrets.com/api/payments/webhook',{method:'POST',headers:{'X-Razorpay-Signature':sig},body:raw}),env,s.deps);assert.equal(r.status,400);}assert.equal(s.orders()[0].status,'created');
});
test('one provider payment id cannot be assigned to two local orders',async()=>{
  const s=setup(),a=await(await s.create()).json(),b=await(await s.create()).json();await s.verify(a.orderId);assert.equal((await s.verify(b.orderId)).status,409);assert.equal(s.orders()[1].status,'created');
});
test('webhook mutation and acknowledgement are atomic when the event write fails',async()=>{
  const s=setup(),{orderId}=await(await s.create()).json(),exec=s.sql.exec;s.sql.exec=(q,...a)=>{if(q.startsWith('INSERT INTO payment_events'))throw new Error('disk unavailable');return exec(q,...a);};assert.equal((await s.webhook(s.event(orderId))).status,503);assert.equal(s.orders()[0].status,'created');assert.equal(s.sql.exec('SELECT * FROM payment_attempts').toArray().length,0);
});
test('admin payment history requires the existing token and never returns signatures or credentials',async()=>{
  const s=setup(),{orderId}=await(await s.create()).json();await s.verify(orderId);assert.equal((await s.call('/api/admin/payments')).status,401);const r=await s.call('/api/admin/payments',undefined,{Authorization:'Bearer '+env.ADMIN_TOKEN});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const j=await r.json();assert.equal(j.orders.length,1);assert.equal(j.orders[0].attempts[0].status,'verified');assert.ok(!JSON.stringify(j).includes(env.RAZORPAY_KEY_SECRET));assert.ok(!JSON.stringify(j).includes('signature'));
});
