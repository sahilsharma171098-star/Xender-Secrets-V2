import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  createPayuCheckoutFields, signedPayuCheckoutFields, verifyPayuCallbackHash,
  queryPayuTransaction, isCapturedMatchingOrder, PAYU_PRODUCTION_VERIFY_URL
} from "../../src/payu-gateway.mjs";

const digest = (s) => createHash("sha512").update(s, "utf8").digest("hex");
const merchantKey = "test_key_12345", salt = "test_salt_not_real";
const order = {
  key: merchantKey, txnid: "XS20261102ABC123456",
  offerId: "founding-website-999",
  name: "Test Customer", email: "test@example.com", phone: "9876543210"
};

test("creates a server-priced checkout with the canonical HTTPS callback", () => {
  const fields = createPayuCheckoutFields(order);
  assert.equal(fields.amount, "1178.82");
  assert.equal(fields.productinfo, "Founding Website");
  assert.equal(fields.surl, "https://www.xendersecrets.com/api/payu/callback");
  assert.equal(fields.surl, fields.furl);
  assert.equal(fields.udf1, order.offerId);
  assert.throws(() => createPayuCheckoutFields({ ...order, offerId: "unlisted" }));
  assert.throws(() => createPayuCheckoutFields({ ...order, txnid: "bad" }));
  assert.throws(() => createPayuCheckoutFields({ ...order, siteOrigin: "http://example.com" }));
});

test("request hash is SHA-512 with the exact PayU field order and empty slots", async () => {
  const fields = createPayuCheckoutFields(order);
  const signed = await signedPayuCheckoutFields(fields, salt);
  const expected = digest([fields.key, fields.txnid, fields.amount, fields.productinfo,
    fields.firstname, fields.email, fields.udf1, "", "", "", "",
    "", "", "", "", "", salt].join("|"));
  assert.equal(signed.hash, expected);
  assert.equal(signed.hash.length, 128);
  assert.equal(Object.hasOwn(signed, "salt"), false);
});

test("reverse-hash validation detects tampering", async () => {
  const fields = createPayuCheckoutFields(order);
  const response = {
    ...fields, status: "success",
    hash: digest([salt, "success", "", "", "", "", "",
      fields.udf5, fields.udf4, fields.udf3, fields.udf2, fields.udf1,
      fields.email, fields.firstname, fields.productinfo, fields.amount,
      fields.txnid, fields.key].join("|"))
  };
  assert.equal(await verifyPayuCallbackHash(response, salt), true);
  assert.equal(await verifyPayuCallbackHash({ ...response, amount: "1178.83" }, salt), false);
  assert.equal(await verifyPayuCallbackHash({ ...response, hash: "fake" }, salt), false);
  const extra = { ...response, additionalCharges: "12.00" };
  extra.hash = digest(["12.00", salt, "success", "", "", "", "", "",
    fields.udf5, fields.udf4, fields.udf3, fields.udf2, fields.udf1,
    fields.email, fields.firstname, fields.productinfo, fields.amount,
    fields.txnid, fields.key].join("|"));
  assert.equal(await verifyPayuCallbackHash(extra, salt), true);
});

test("verification API request signs key|command|txnid|salt without exposing salt", async () => {
  const expected = digest([merchantKey, "verify_payment", order.txnid, salt].join("|"));
  let calls = 0;
  const mockFetch = async (url, options) => {
    calls++;
    assert.equal(url, PAYU_PRODUCTION_VERIFY_URL);
    assert.equal(options.method, "POST");
    assert.equal(options.body.get("hash"), expected);
    assert.equal(options.body.get("key"), merchantKey);
    assert.equal(options.body.toString().includes(salt), false);
    return {
      ok: true,
      json: async () => ({
        transaction_details: {
          [order.txnid]: {
            mihpayid: "12345678901", status: "success",
            unmappedstatus: "captured", amt: "1178.82"
          }
        }
      })
    };
  };
  const payment = await queryPayuTransaction(order.txnid, { key: merchantKey, salt }, mockFetch);
  assert.equal(calls, 1);
  assert.equal(payment.found, true);
  assert.equal(isCapturedMatchingOrder({ txnid: order.txnid, amountPaise: 117882 }, payment), true);
  assert.equal(isCapturedMatchingOrder({ txnid: order.txnid, amountPaise: 117883 }, payment), false);
  assert.equal(isCapturedMatchingOrder({ txnid: "different", amountPaise: 117882 }, payment), false);
  assert.equal(isCapturedMatchingOrder({ txnid: order.txnid, amountPaise: 117882 },
    { ...payment, settlementStatus: "auth" }), false);
});
