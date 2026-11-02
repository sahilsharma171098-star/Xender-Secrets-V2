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
  sql.exec("CREATE TABLE IF NOT EXISTS extension_entitlements (id TEXT PRIMARY KEY, email TEXT NOT NULL, product_id TEXT NOT NULL, txnid TEXT NOT NULL UNIQUE, status TEXT NOT NULL, issued_at TEXT NOT NULL, revoked_at TEXT)");
  sql.exec("CREATE TABLE IF NOT EXISTS sitecheck_order_accounts (txnid TEXT PRIMARY KEY,user_id TEXT NOT NULL)");
  sql.exec("CREATE INDEX IF NOT EXISTS idx_sitecheck_order_user ON sitecheck_order_accounts(user_id)");
  sql.exec("CREATE INDEX IF NOT EXISTS idx_entitlement_email ON extension_entitlements(email,product_id,status)");
}
export async function handlePayuLedger(request,sql) {
  const path=new URL(request.url).pathname;
  if(!path.startsWith("/api/payu-ledger/"))return null;
  if(request.method!=="POST")return json({ok:false},405);
  const b=await request.json().catch(()=>({}));
  if(path.endsWith("/create")) {
    const o=b.order;
    if(!o||!PAYMENT_OFFERS[o.offerId]||o.amountPaise!==PAYMENT_OFFERS[o.offerId].amountPaise)return json({ok:false},400);
    if(o.offerId==="sitecheck-pro-onetime"&&!/^[a-f0-9-]{36}$/i.test(String(o.accountId||"")))return json({ok:false,error:"Signed-in account required"},400);
    sql.exec("INSERT INTO payu_orders (txnid,offer_id,amount_paise,customer_name,email,phone,quote_reference,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'pending',?,?)",o.txnid,o.offerId,o.amountPaise,o.name,o.email,o.phone,o.reference,o.createdAt,o.createdAt);
    if(o.offerId==="sitecheck-pro-onetime") sql.exec("INSERT INTO sitecheck_order_accounts(txnid,user_id) VALUES (?,?)",o.txnid,o.accountId);
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
    if(o.offer_id==="sitecheck-pro-onetime") sql.exec("INSERT OR IGNORE INTO extension_entitlements (id,email,product_id,txnid,status,issued_at,revoked_at) VALUES (?,?,?,?,'active',?,NULL)",crypto.randomUUID(),o.email,"sitecheck",b.txnid,now);
    sql.exec("INSERT INTO payu_events (txnid,event,status,created_at) VALUES (?,'verified','captured',?)",b.txnid,now);
    return json({ok:true,status:"captured"});
  }
  if(path.endsWith("/entitlements-for-account")) {
    const userId=String(b.accountId||"");
    if(!/^[a-f0-9-]{36}$/i.test(userId))return json({ok:false,error:"Invalid account"},400);
    const rows=sql.exec("SELECT e.product_id,e.status,e.issued_at,e.revoked_at FROM extension_entitlements e JOIN sitecheck_order_accounts a ON a.txnid=e.txnid JOIN payu_orders p ON p.txnid=e.txnid WHERE a.user_id=? AND p.status='captured' ORDER BY e.issued_at DESC",userId).toArray();
    return json({ok:true,entitlements:rows});
  }
  if(path.endsWith("/entitlements")) {
    // Internal-only read: never expose this route directly on the public Worker.
    if(!validEmail(clean(b.email,100)))return json({ok:false},400);
    const rows=sql.exec("SELECT product_id,status,issued_at,revoked_at FROM extension_entitlements WHERE email=? ORDER BY issued_at DESC",clean(b.email,100).toLowerCase()).toArray();
    return json({ok:true,entitlements:rows});
  }
  if(path.endsWith("/revoke")) {
    // Only called from the authenticated admin API, never by PayU's untrusted callback.
    if(!/^[a-zA-Z0-9_-]{8,25}$/.test(String(b.txnid||"")))return json({ok:false},400);
    const order=sql.exec("SELECT * FROM payu_orders WHERE txnid=?",b.txnid).toArray()[0];
    if(!order)return json({ok:false},404);
    if(order.status==="refunded"||order.status==="chargeback")return json({ok:true,status:order.status,duplicate:true});
    if(order.status!=="captured")return json({ok:false},409);
    const next=b.reason==="chargeback"?"chargeback":"refunded",now=new Date().toISOString();
    sql.exec("UPDATE payu_orders SET status=?,updated_at=? WHERE txnid=? AND status='captured'",next,now,b.txnid);
    sql.exec("UPDATE extension_entitlements SET status='revoked',revoked_at=? WHERE txnid=? AND status='active'",now,b.txnid);
    sql.exec("INSERT INTO payu_events (txnid,event,status,created_at) VALUES (?,?,?,?)",b.txnid,"admin_reconciliation",next,now);
    return json({ok:true,status:next});
  }
  return json({ok:false},404);
}
export async function handlePayu(request,env) {
  const url=new URL(request.url),path=url.pathname,method=request.method.toUpperCase();
  if(!path.startsWith("/api/payu/"))return null;
  if(!env.PAYU_KEY||!env.PAYU_SALT)return json({ok:false,error:"PayU unavailable"},503);
  if(path==="/api/payu/config"&&method==="GET")return json({ok:true,available:true,provider:"payu",currency:"INR",offers:[],sitecheck:{offerId:"sitecheck-pro-onetime",currency:"INR",amountPaise:49900,release:"sitecheck-pro-v2.0.0",checkoutEnabled:env.SITECHECK_PRO_CHECKOUT_ENABLED==="true"}});
  if(path==="/api/payu/initiate"&&method==="POST") {
    if(request.headers.get("Origin")!==url.origin)return json({ok:false,error:"Origin mismatch"},403);
    if(!String(request.headers.get("content-type")||"").startsWith("application/json"))return json({ok:false,error:"JSON required"},415);
    const b=await request.json().catch(()=>({}));
    const offer=PAYMENT_OFFERS[clean(b.offer,80)],name=clean(b.name,60),email=clean(b.email,100).toLowerCase(),phone=clean(b.phone,25);
    if(!offer||name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[+0-9() -]{8,25}$/.test(phone))return json({ok:false,error:"Valid package, name, email and phone required"},400);
    if(offer.id!=="sitecheck-pro-onetime")return json({ok:false,error:"PayU website-package checkout is not enabled; use Razorpay."},503);
    if(offer.id==="sitecheck-pro-onetime"&&env.SITECHECK_PRO_CHECKOUT_ENABLED!=="true")return json({ok:false,error:"SiteCheck Pro checkout is awaiting payment and fulfillment verification."},503);
    let accountId=null;
    if(offer.id==="sitecheck-pro-onetime"){
      const sessionHeaders=new Headers();
      const cookie=request.headers.get("Cookie");
      if(cookie)sessionHeaders.set("Cookie",cookie);
      const who=await state(env).fetch(new Request(url.origin+"/api/auth/me",{method:"GET",headers:sessionHeaders}));
      const auth=await who.json().catch(()=>({}));
      if(!who.ok||!auth.user?.id||auth.user.email?.toLowerCase()!==email)return json({ok:false,error:"Sign in to your Xender account with the purchase email before paying"},401);
      accountId=auth.user.id;
    }
    const txnid="XS"+crypto.randomUUID().replace(/-/g,"").slice(0,20).toUpperCase();
    const fields=createPayuCheckoutFields({key:env.PAYU_KEY,txnid,offerId:offer.id,name,email,phone,siteOrigin:url.origin});
    const now=new Date().toISOString();
    await ledger(env,"create",{order:{txnid,offerId:offer.id,amountPaise:offer.amountPaise,name,email,phone,reference:clean(b.reference,80),createdAt:now,accountId}});
    return json({ok:true,provider:"payu",url:PAYU_PRODUCTION_PAYMENT_URL,fields:await signedPayuCheckoutFields(fields,env.PAYU_SALT)},201);
  }
  if((path==="/api/payu/callback"||path==="/api/payu/webhook")&&method==="POST") {
    const isWebhook=path==="/api/payu/webhook";
    if(!(request.headers.get("content-type")||"").includes("application/x-www-form-urlencoded"))return json({ok:false,error:"Invalid callback"},415);
    const raw=await request.text();
    if(raw.length>16000)return json({ok:false},413);
    const data=Object.fromEntries(new URLSearchParams(raw));
    if(data.key!==env.PAYU_KEY||!await verifyPayuCallbackHash(data,env.PAYU_SALT))return json({ok:false,error:"Invalid callback signature"},400);
    const txnid=clean(data.txnid,25),{order}=await ledger(env,"get",{txnid});
    if(!order||order.email!==data.email.toLowerCase()||order.offer_id!==data.udf1||order.amount_paise!==Math.round(Number(data.amount)*100)||PAYMENT_OFFERS[order.offer_id]?.name!==data.productinfo)return json({ok:false,error:"Order mismatch"},400);
    if(data.status!=="success")return isWebhook?json({ok:true,captured:false}):Response.redirect(url.origin+"/payment-failed?txnid="+encodeURIComponent(txnid),303);
    let payment;
    try{payment=await queryPayuTransaction(txnid,{key:env.PAYU_KEY,salt:env.PAYU_SALT});}catch{return json({ok:false,error:"Payment verification pending"},503);}
    if(!isCapturedMatchingOrder({txnid,amountPaise:order.amount_paise},payment)||!payment.paymentId)return json({ok:false,error:"Not captured"},409);
    await ledger(env,"settle",{txnid,paymentId:payment.paymentId,verifiedStatus:"captured"});
    return isWebhook?json({ok:true,captured:true,fulfilled:true}):Response.redirect(order.offer_id==="sitecheck-pro-onetime"?url.origin+"/sitecheck-pro?payment=verified":url.origin+"/payment-success?txnid="+encodeURIComponent(txnid),303);
  }
  if(path==="/api/payu/admin/reconcile"&&method==="POST") {
    const auth=request.headers.get("authorization")||"";
    if(!env.ADMIN_TOKEN||auth!=="Bearer "+env.ADMIN_TOKEN)return json({ok:false,error:"Unauthorized"},401);
    if(request.headers.get("Origin")&&request.headers.get("Origin")!==url.origin)return json({ok:false},403);
    const body=await request.json().catch(()=>({}));
    if(!["refunded","chargeback"].includes(body.reason))return json({ok:false,error:"Reason required"},400);
    // This endpoint records externally VERIFIED refund/chargeback only.
    // The operator must reconcile with PayU dashboard first; no refund is initiated here.
    try{return json(await ledger(env,"revoke",{txnid:body.txnid,reason:body.reason}));}
    catch{return json({ok:false,error:"Reconciliation unavailable"},503);}
  }
  if(path==="/api/payu/status"&&method==="GET")return json({ok:false,error:"Authentication required"},401);
  return json({ok:false,error:"Not found"},404);
}
