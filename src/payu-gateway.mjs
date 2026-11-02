// PayU India hosted-checkout primitives (not yet connected to public payment routes).
// This module deliberately never reads or publishes Merchant Salt in a browser.
import { PAYMENT_OFFERS } from "./payments.mjs";

const encoder = new TextEncoder();
const HEX = (buf) => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
export const PAYU_PRODUCTION_PAYMENT_URL = "https://secure.payu.in/_payment";
export const PAYU_TEST_PAYMENT_URL = "https://test.payu.in/_payment";
export const PAYU_PRODUCTION_VERIFY_URL = "https://info.payu.in/merchant/postservice.php?form=2";
export const PAYU_TEST_VERIFY_URL = "https://test.payu.in/merchant/postservice.php?form=2";

export async function sha512Hex(value) {
  return HEX(await crypto.subtle.digest("SHA-512", encoder.encode(value)));
}

export function safeEqualHex(a, b) {
  if (!/^[a-f0-9]{128}$/i.test(String(a)) || !/^[a-f0-9]{128}$/i.test(String(b))) return false;
  let difference = 0;
  const aa = String(a).toLowerCase(), bb = String(b).toLowerCase();
  for (let i = 0; i < 128; i++) difference |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return difference === 0;
}

const required = (value, max) => {
  const text = String(value ?? "").trim();
  if (!text || text.length > max) throw new Error("Invalid PayU checkout field");
  return text;
};

/** Accepts a server-selected SKU, never a browser-provided amount. */
export function createPayuCheckoutFields({ key, txnid, offerId, name, email, phone, siteOrigin = "https://www.xendersecrets.com" }) {
  const offer = PAYMENT_OFFERS[offerId];
  if (!offer) throw new Error("Unknown package");
  const origin = new URL(siteOrigin);
  if (origin.protocol !== "https:" || (origin.pathname !== "/" && origin.pathname !== "")) throw new Error("Invalid checkout origin");
  const cleanEmail = required(email, 100).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error("Invalid email");
  const cleanPhone = required(phone, 25);
  if (!/^[+0-9() -]{8,25}$/.test(cleanPhone)) throw new Error("Invalid phone");
  const cleanTxn = required(txnid, 25);
  if (!/^[a-zA-Z0-9_-]{8,25}$/.test(cleanTxn)) throw new Error("Invalid transaction ID");
  const merchantKey = required(key, 100);
  return {
    key: merchantKey,
    txnid: cleanTxn,
    amount: (offer.amountPaise / 100).toFixed(2),
    productinfo: offer.name,
    firstname: required(name, 60),
    email: cleanEmail,
    phone: cleanPhone,
    surl: origin.origin + "/api/payu/callback",
    furl: origin.origin + "/api/payu/callback",
    udf1: offer.id, udf2: "", udf3: "", udf4: "", udf5: ""
  };
}

export async function signedPayuCheckoutFields(fields, merchantSalt) {
  const salt = required(merchantSalt, 256);
  const sequence = [
    fields.key, fields.txnid, fields.amount, fields.productinfo,
    fields.firstname, fields.email,
    fields.udf1 || "", fields.udf2 || "", fields.udf3 || "", fields.udf4 || "", fields.udf5 || "",
    "", "", "", "", "", salt
  ];
  return { ...fields, hash: await sha512Hex(sequence.join("|")) };
}

function callbackHashSequence(response, salt) {
  const prefix = [];
  // PayU's extra-charge variant places the charge before SALT.
  if (response.additionalCharges || response.additional_charges) prefix.push(response.additionalCharges || response.additional_charges);
  const result = [...prefix, salt, response.status, "", "", "", "", "",
    response.udf5 || "", response.udf4 || "", response.udf3 || "", response.udf2 || "", response.udf1 || "",
    response.email, response.firstname, response.productinfo, response.amount,
    response.txnid, response.key];
  return result.join("|");
}

/** Reverse hash authenticates the callback; *never* use it alone to grant access. */
export async function verifyPayuCallbackHash(response, merchantSalt) {
  for (const field of ["status", "email", "firstname", "productinfo", "amount", "txnid", "key", "hash"]) {
    if (typeof response[field] !== "string" || !response[field]) return false;
  }
  const expected = await sha512Hex(callbackHashSequence(response, required(merchantSalt, 256)));
  return safeEqualHex(expected, response.hash);
}

/**
 * Confirm the authoritative transaction with PayU before fulfillment.
 * A successful callback is NOT sufficient. Caller must also compare
 * txnid, currency, amount, SKU, and captured status with persisted order.
 */
export async function queryPayuTransaction(txnid, { key, salt, testMode = false }, request = fetch) {
  const merchantKey = required(key, 100), merchantSalt = required(salt, 256);
  const id = required(txnid, 25);
  if (!/^[a-zA-Z0-9_-]{8,25}$/.test(id)) throw new Error("Invalid transaction ID");
  const command = "verify_payment";
  const hash = await sha512Hex([merchantKey, command, id, merchantSalt].join("|"));
  const body = new URLSearchParams({ key: merchantKey, command, var1: id, hash });
  const url = testMode ? PAYU_TEST_VERIFY_URL : PAYU_PRODUCTION_VERIFY_URL;
  const response = await request(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) throw new Error("PayU verification request failed");
  const data = await response.json();
  const payment = data?.transaction_details?.[id];
  if (!payment || typeof payment !== "object") return { found: false, status: "unverified" };
  return {
    found: true,
    txnid: id,
    paymentId: String(payment.mihpayid || ""),
    status: String(payment.status || "").toLowerCase(),
    settlementStatus: String(payment.unmappedstatus || "").toLowerCase(),
    amount: String(payment.amt || payment.amount || ""),
    currency: "INR"
  };
}

/** Only captured matching payments may be fulfilled; pending/authorized is not paid. */
export function isCapturedMatchingOrder(order, payment) {
  if (!order || !payment?.found) return false;
  if (payment.txnid !== order.txnid || payment.status !== "success" || payment.settlementStatus !== "captured") return false;
  const amountPaise = Math.round(Number(payment.amount) * 100);
  return Number.isSafeInteger(amountPaise) && amountPaise === order.amountPaise;
}
