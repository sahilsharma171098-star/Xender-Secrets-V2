import { PAYMENT_OFFERS } from "./payments.mjs";
import { createPayuCheckoutFields, signedPayuCheckoutFields, verifyPayuCallbackHash, queryPayuTransaction, isCapturedMatchingOrder, PAYU_PRODUCTION_PAYMENT_URL } from "./payu-gateway.mjs";

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(x,n)=>String(x??"").trim().slice(0,n);
const validEmail=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
const state=env=>env.APP_STATE.get(env.APP_STATE.idFromName("xender-secrets"));
const ledger=async(env,action,body)=>{
  const r=await state(env).fetch(new Request("https://internal.invalid/api/payu-ledger/"+action,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
  if(!r.ok)throw new Error("Payment ledger unavailable");
  return r.json();
};
export function ensurePayuSchema(sql) {
  sql.exec("CREATE TABLE IF NOT EXISTS payu_orders (txnid TEXT PRIMARY KEY,offer_id TEXT NOT NULL,amount_paise INTEGER NOT NULL,customer_name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT NOT NULL,quote_reference TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',payu_payment_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)");
  sql.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_payu_payment_id ON payu_orders(payu_payment_id) WHERE payu_payment_id IS NOT NULL");
  sql.exec("CREATE TABLE IF NOT EXISTS payu_events (id INTEGER PRIMARY KEY AUTOINCREMENT,txnid TEXT NOT NULL,event TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL)");
}
export async function handlePayuLedger(request,sql) {
  const path=new URL(request.url).pathname;
  if(!path.startsWith("/api/payu-ledger/"))return null;
  if(request.method!=="POST")return json({ok:false},405);
  const b=await request.json().catch(()=>({}));
  if(path.endsWith("/create")) {
    const o=b.order;
    if(!o||!PAYMENT_OFFERS[o.offerId]||o.amountPaise!==PAYMENT_OFFERS[o.offerId].amountPaise)return json({ok:false},400);
    sql.exec("INSERT INTO payu_orders (txnid,offer_id,amount_paise,customer_name,email,phone,quote_reference,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'pending',?,?)",o.txnid,o.offerId,o.amountPaise,o.name,o.email,o.phone,o.reference,o.createdAt,o.createdAt);
    return json({ok:true});
  }
  if(path.endsWith("/get"))return json({ok:true,order:sql.exec("SELECT * FROM payu_orders WHERE txnid=?",b.txnid).toArray()[0]||null});
  if(path.endsWith("/settle")) {
    const o=sql.exec("SELECT * FROM payu_orders WHERE txnid=?",b.txnid).toArray()[0];
    if(!o)return json({ok:false},404);
    if(o.status==="captured")return json({ok:true,status:"captured",duplicate:true});
    if(o.status==="refunded"||o.status==="chargeback")return json({ok:false},409);
    if(b.verifiedStatus!=="captured"||!b.paymentId)return json({ok:false},400);
    const now=new Date().toISOString();
    sql.exec("UPDATE payu_orders SET status='captured',payu_payment_id=?,updated_at=? WHERE txnid=? AND status='pending'",b.paymentId,now,b.txnid);
    sql.exec("INSERT INTO payu_events (txnid,event,status,created_at) VALUES (?,'verified','captured',?)",b.txnid,now);
    return json({ok:true,status:"captured"});
  }
  return json({ok:false},404);
}
export async function handlePayu(request,env) {
  const url=new URL(request.url),path=url.pathname,method=request.method.toUpperCase();
  if(!path.startsWith("/api/payu/"))return null;
  if(!env.PAYU_KEY||!env.PAYU_SALT)return json({ok:false,error:"PayU unavailable"},503);
  if(path==="/api/payu/config"&&method==="GET")return json({ok:true,available:true,provider:"payu",currency:"INR",offers:Object.values(PAYMENT_OFFERS)});
  if(path==="/api/payu/initiate"&&method==="POST") {
    if(request.headers.get("Origin")!==url.origin)return json({ok:false,error:"Origin mismatch"},403);
    if(!String(request.headers.get("content-type")||"").startsWith("application/json"))return json({ok:false,error:"JSON required"},415);
    const b=await request.json().catch(()=>({}));
    const offer=PAYMENT_OFFERS[clean(b.offer,80)],name=clean(b.name,60),email=clean(b.email,100).toLowerCase(),phone=clean(b.phone,25);
    if(!offer||name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[+0-9() -]{8,25}$/.test(phone))return json({ok:false,error:"Valid package, name, email and phone required"},400);
    const txnid="XS"+crypto.randomUUID().replace(/-/g,"").slice(0,20).toUpperCase();
    const fields=createPayuCheckoutFields({key:env.PAYU_KEY,txnid,offerId:offer.id,name,email,phone,siteOrigin:url.origin});
    const now=new Date().toISOString();
    await ledger(env,"create",{order:{txnid,offerId:offer.id,amountPaise:offer.amountPaise,name,email,phone,reference:clean(b.reference,80),createdAt:now}});
    return json({ok:true,provider:"payu",url:PAYU_PRODUCTION_PAYMENT_URL,fields:await signedPayuCheckoutFields(fields,env.PAYU_SALT)},201);
  }
  if(path==="/api/payu/callback"&&method==="POST") {
    if(!(request.headers.get("content-type")||"").includes("application/x-www-form-urlencoded"))return json({ok:false,error:"Invalid callback"},415);
    const raw=await request.text();
    if(raw.length>16000)return json({ok:false},413);
    const data=Object.fromEntries(new URLSearchParams(raw));
    if(data.key!==env.PAYU_KEY||!await verifyPayuCallbackHash(data,env.PAYU_SALT))return json({ok:false,error:"Invalid callback signature"},400);
    const txnid=clean(data.txnid,25),{order}=await ledger(env,"get",{txnid});
    if(!order||order.email!==data.email.toLowerCase()||order.offer_id!==data.udf1||order.amount_paise!==Math.round(Number(data.amount)*100)||PAYMENT_OFFERS[order.offer_id]?.name!==data.productinfo)return json({ok:false,error:"Order mismatch"},400);
    if(data.status!=="success")return Response.redirect(url.origin+"/payment-failed?txnid="+encodeURIComponent(txnid),303);
    let payment;
    try{payment=await queryPayuTransaction(txnid,{key:env.PAYU_KEY,salt:env.PAYU_SALT});}catch{return json({ok:false,error:"Payment verification pending"},503);}
    if(!isCapturedMatchingOrder({txnid,amountPaise:order.amount_paise},payment)||!payment.paymentId)return json({ok:false,error:"Not captured"},409);
    await ledger(env,"settle",{txnid,paymentId:payment.paymentId,verifiedStatus:"captured"});
    return Response.redirect(url.origin+"/payment-success?txnid="+encodeURIComponent(txnid),303);
  }
  if(path==="/api/payu/status"&&method==="GET")return json({ok:false,error:"Authentication required"},401);
  return json({ok:false,error:"Not found"},404);
}
