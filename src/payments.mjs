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

export async function handlePayments(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (!path.startsWith("/api/payments/")) return null;

  if (path === "/api/payments/config" && method === "GET") {
    const available = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
    return json({
      ok: true,
      provider: "razorpay",
      available,
      keyId: available ? env.RAZORPAY_KEY_ID : null,
      currency: "INR",
      offers: publicOffers()
    });
  }

  if (path === "/api/payments/order" && method === "POST") {
    if (!sameOrigin(request)) return json({ ok: false, error: "Invalid request origin." }, 403);
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      return json({ ok: false, error: "Online payments are being activated. Please contact Xender Secrets for a payment link." }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const offer = PAYMENT_OFFERS[clean(body.offer, 80)];
    if (!offer) return json({ ok: false, error: "Choose a valid package." }, 400);

    const name = clean(body.name, 80);
    const email = clean(body.email, 254).toLowerCase();
    const phone = clean(body.phone, 24);
    const reference = clean(body.reference, 80);

    if (name.length < 2) return json({ ok: false, error: "Enter your name." }, 400);
    if (!email && !phone) return json({ ok: false, error: "Enter an email or phone number." }, 400);
    if (!validEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);

    const receipt = ("xs-" + Date.now().toString(36) + "-" + offer.id.split("-")[0]).slice(0, 40);
    const payload = {
      amount: offer.amountPaise,
      currency: "INR",
      receipt,
      notes: {
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
      upstream = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          authorization: "Basic " + auth,
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch {
      return json({ ok: false, error: "Payment provider is temporarily unavailable. Please try again." }, 502);
    }

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.id) {
      return json({ ok: false, error: "Could not start payment. Please try again or contact us.", providerStatus: upstream.status }, 502);
    }

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

    const body = await request.json().catch(() => ({}));
    const orderId = clean(body.razorpay_order_id, 120);
    const paymentId = clean(body.razorpay_payment_id, 120);
    const signature = clean(body.razorpay_signature, 256).toLowerCase();
    if (!orderId || !paymentId || !signature) return json({ ok: false, error: "Missing payment verification fields." }, 400);

    const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, orderId + "|" + paymentId);
    if (!timingSafeEqual(expected, signature)) return json({ ok: false, error: "Payment signature verification failed." }, 400);

    return json({ ok: true, verified: true, orderId, paymentId });
  }

  if (path === "/api/payments/webhook" && method === "POST") {
    if (!env.RAZORPAY_WEBHOOK_SECRET) return json({ ok: false, error: "Webhook is not configured." }, 503);
    const signature = clean(request.headers.get("X-Razorpay-Signature"), 256).toLowerCase();
    const raw = await request.text();
    const expected = await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, raw);
    if (!signature || !timingSafeEqual(expected, signature)) return json({ ok: false, error: "Invalid webhook signature." }, 400);
    return json({ ok: true });
  }

  return json({ ok: false, error: "Payment route not found." }, 404);
}
