import { adminAuth } from './growth.mjs';
import { createPaymentOrder, attachProviderOrder, findPaymentOrder, recordVerifiedPayment,
  applyPaymentWebhook, listPaymentOrders, PaymentError } from './payment-store.mjs';
const enc = new TextEncoder();

export const PAYMENT_OFFERS = Object.freeze({
  "founding-website-999": { id: "founding-website-999", name: "Founding Website", basePaise: 99900, gstPaise: 17982, amountPaise: 117882 },
  "business-starter-1999": { id: "business-starter-1999", name: "Business Starter", basePaise: 199900, gstPaise: 35982, amountPaise: 235882 },
  "business-pro-3499": { id: "business-pro-3499", name: "Business Pro", basePaise: 349900, gstPaise: 62982, amountPaise: 412882 }
});

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max);
const validEmail = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))));
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

function publicOffers() {
  return Object.values(PAYMENT_OFFERS).map((o) => ({
    id: o.id,
    name: o.name,
    currency: "INR",
    basePaise: o.basePaise,
    gstPaise: o.gstPaise,
    amountPaise: o.amountPaise
  }));
}

export async function handlePayments(request, env, { sql, transaction = fn => fn(), fetchImpl = fetch } = {}) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (!path.startsWith("/api/payments/") && path !== '/api/admin/payments') return null;
  const now = () => new Date().toISOString();
  const stored = (fn) => {
    try { return transaction(fn); }
    catch (e) { return json({ ok: false, error: e instanceof PaymentError ? e.message : 'Payment storage is temporarily unavailable. Please retry.' }, e instanceof PaymentError ? e.status : 503); }
  };
  if (path === '/api/admin/payments') {
    const auth = adminAuth(request, env);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
    if (method !== 'GET') return json({ok:false,error:'Method not allowed.'},405);
    if (!sql) return json({ok:false,error:'Payment storage is not configured.'},503);
    const limit = Math.max(1, Math.min(100, Math.floor(Number(url.searchParams.get('limit')) || 50)));
    const result = stored(() => listPaymentOrders(sql, limit));
    return result instanceof Response ? result : json({ok:true,orders:result});
  }

  if (path === "/api/payments/config" && method === "GET") {
    const available = Boolean(sql && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
    return json({
      ok: true,
      provider: "razorpay",
      available,
      keyId: available ? env.RAZORPAY_KEY_ID : null,
      currency: "INR",
      offers: publicOffers()
    });
  }

  if (!sql) return json({ok:false,error:'Payment storage is not configured.'},503);

  if (path === "/api/payments/order" && method === "POST") {
    if (!sameOrigin(request)) return json({ ok: false, error: "Invalid request origin." }, 403);
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      return json({ ok: false, error: "Online payments are being activated. Please contact Xender Secrets for a payment link." }, 503);
    }

    const body = (await request.json().catch(() => ({}))) || {};
    const offerKey = clean(body?.offer, 80);
    const offer = Object.hasOwn(PAYMENT_OFFERS, offerKey) ? PAYMENT_OFFERS[offerKey] : null;
    if (!offer) return json({ ok: false, error: "Choose a valid package." }, 400);

    const name = clean(body.name, 80);
    const email = clean(body.email, 254).toLowerCase();
    const phone = clean(body.phone, 24);
    const reference = clean(body.reference, 80);

    if (name.length < 2) return json({ ok: false, error: "Enter your name." }, 400);
    if (!email && !phone) return json({ ok: false, error: "Enter an email or phone number." }, 400);
    if (!validEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);

    const localId = 'xs-' + crypto.randomUUID();
    const receipt = localId;
    const saved = stored(() => createPaymentOrder(sql, {id:localId,receipt,offer:offer.id,name,email,phone,reference,amount:offer.amountPaise}, now()));
    if (saved instanceof Response) return saved;
    const payload = {
      amount: offer.amountPaise,
      currency: "INR",
      receipt,
      notes: {
        xs_order_id: localId,
        offer: offer.id,
        package: offer.name,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        quote_reference: reference
      }
    };

    const auth = btoa(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET);
    let upstream;
    try {
      upstream = await fetchImpl("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          authorization: "Basic " + auth,
          "content-type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      stored(() => sql.exec("UPDATE payment_orders SET status='creation_unknown',updated_at=? WHERE id=? AND status='creating'",now(),localId));
      return json({ ok: false, error: "Payment provider is temporarily unavailable. Please try again." }, 502);
    }

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !/^order_[A-Za-z0-9]+$/.test(data.id || '') || data.amount !== offer.amountPaise || data.currency !== 'INR') {
      stored(() => sql.exec("UPDATE payment_orders SET status=?,updated_at=? WHERE id=? AND status='creating'",upstream.ok?'creation_unknown':'creation_failed',now(),localId));
      return json({ ok: false, error: "Could not start payment. Please try again or contact us.", providerStatus: upstream.status }, 502);
    }

    const attached = stored(() => attachProviderOrder(sql,localId,data.id,now()));
    if (attached instanceof Response) return attached;

    return json({
      ok: true,
      provider: "razorpay",
      keyId: env.RAZORPAY_KEY_ID,
      orderId: data.id,
      amount: offer.amountPaise,
      currency: "INR",
      offer: { id: offer.id, name: offer.name },
      receipt
    }, 201);
  }

  if (path === "/api/payments/verify" && method === "POST") {
    if (!sameOrigin(request)) return json({ ok: false, error: "Invalid request origin." }, 403);
    if (!env.RAZORPAY_KEY_SECRET) return json({ ok: false, error: "Payment verification is not configured." }, 503);

    const body = (await request.json().catch(() => ({}))) || {};
    const orderId = clean(body.razorpay_order_id, 120);
    const paymentId = clean(body.razorpay_payment_id, 120);
    const signature = clean(body.razorpay_signature, 256).toLowerCase();
    if (!/^order_[A-Za-z0-9]+$/.test(orderId) || !/^pay_[A-Za-z0-9]+$/.test(paymentId) || !/^[a-f0-9]{64}$/.test(signature)) return json({ ok: false, error: "Missing or invalid payment verification fields." }, 400);

    const known = stored(() => findPaymentOrder(sql,orderId));
    if (known instanceof Response) return known;
    if (!known) return json({ok:false,error:'Payment order was not created by Xender Secrets.'},404);

    const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, orderId + "|" + paymentId);
    if (!timingSafeEqual(expected, signature)) return json({ ok: false, error: "Payment signature verification failed." }, 400);

    const status = stored(() => recordVerifiedPayment(sql,orderId,paymentId,now()));
    if (status instanceof Response) return status;
    return json({ ok: true, verified: true, orderId, paymentId, status });
  }

  if (path === "/api/payments/webhook" && method === "POST") {
    if (!env.RAZORPAY_WEBHOOK_SECRET) return json({ ok: false, error: "Webhook is not configured." }, 503);
    const signature = clean(request.headers.get("X-Razorpay-Signature"), 256).toLowerCase();
    const raw = await request.text();
    const expected = await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, raw);
    if (!signature || !timingSafeEqual(expected, signature)) return json({ ok: false, error: "Invalid webhook signature." }, 400);
    let event;
    try { event = JSON.parse(raw); } catch { return json({ok:false,error:'Invalid webhook JSON.'},400); }
    if (!event || typeof event.event !== 'string') return json({ok:false,error:'Invalid webhook event.'},400);
    const digest = toHex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(raw))));
    const eventId = clean(request.headers.get('X-Razorpay-Event-Id'),200) || digest;
    const result = stored(() => applyPaymentWebhook(sql,event,eventId,now(),digest));
    return result instanceof Response ? result : json({ok:true,...result});
  }

  return json({ ok: false, error: "Payment route not found." }, 404);
}
