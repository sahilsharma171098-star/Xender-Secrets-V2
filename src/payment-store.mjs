// XEND-PAYMENTS-001: additive SQLite ledger in the existing AppState Durable Object.
// No raw webhooks, signatures, credentials or card details are retained.
export function ensurePaymentSchema(sql) {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY, provider_order_id TEXT UNIQUE, receipt TEXT NOT NULL UNIQUE,
      offer TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
      quote_reference TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'creating', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payment_attempts (
      payment_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, status TEXT NOT NULL,
      amount INTEGER NOT NULL, currency TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS payment_attempts_order ON payment_attempts(order_id);
    CREATE TABLE IF NOT EXISTS payment_events (
      event_id TEXT PRIMARY KEY, event TEXT NOT NULL, order_id TEXT NOT NULL,
      payment_id TEXT NOT NULL, payload_hash TEXT NOT NULL, received_at TEXT NOT NULL
    );
  `);
}

const one = (sql, query, ...args) => sql.exec(query, ...args).toArray()[0];
export class PaymentError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function createPaymentOrder(sql, order, now) {
  sql.exec(`INSERT INTO payment_orders
    (id,receipt,offer,name,email,phone,quote_reference,amount,currency,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`, order.id, order.receipt, order.offer, order.name,
    order.email, order.phone, order.reference, order.amount, 'INR', now, now);
}

export function attachProviderOrder(sql, id, providerId, now) {
  const row = one(sql, 'SELECT * FROM payment_orders WHERE id=?', id);
  if (!row || (row.provider_order_id && row.provider_order_id !== providerId)) {
    throw new PaymentError('Payment order does not match the saved record.', 409);
  }
  sql.exec(`UPDATE payment_orders SET provider_order_id=?,
    status=CASE WHEN status IN ('creating','creation_unknown') THEN 'created' ELSE status END,
    updated_at=? WHERE id=?`, providerId, now, id);
}

export function findPaymentOrder(sql, providerId) {
  return one(sql, 'SELECT * FROM payment_orders WHERE provider_order_id=?', providerId);
}

function recordAttempt(sql, order, paymentId, status, now) {
  const old = one(sql, 'SELECT * FROM payment_attempts WHERE payment_id=?', paymentId);
  if (old && old.order_id !== order.id) throw new PaymentError('Payment belongs to a different order.', 409);
  const rank = { verified: 0, authorized: 1, failed: 2, captured: 3 };
  const next = old && rank[old.status] > rank[status] ? old.status : status;
  sql.exec(`INSERT INTO payment_attempts (payment_id,order_id,status,amount,currency,updated_at)
    VALUES (?,?,?,?,?,?) ON CONFLICT(payment_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at`,
    paymentId, order.id, next, order.amount, order.currency, now);
  // Derive the order state from ALL attempts: a failed retry cannot undo a captured payment.
  const rows = sql.exec('SELECT status FROM payment_attempts WHERE order_id=?', order.id).toArray();
  const statuses = new Set(rows.map(r => r.status));
  const aggregate = statuses.has('captured') ? 'paid' : statuses.has('authorized') ? 'authorized'
    : statuses.has('verified') ? 'verified' : 'failed';
  sql.exec('UPDATE payment_orders SET status=?,updated_at=? WHERE id=?', aggregate, now, order.id);
  return aggregate;
}

export function recordVerifiedPayment(sql, providerId, paymentId, now) {
  const order = findPaymentOrder(sql, providerId);
  if (!order) throw new PaymentError('Payment order was not created by Xender Secrets.', 404);
  return recordAttempt(sql, order, paymentId, 'verified', now);
}

export function applyPaymentWebhook(sql, event, eventId, now, payloadHash) {
  const types = { 'payment.authorized': 'authorized', 'payment.captured': 'captured',
    'payment.failed': 'failed', 'order.paid': 'captured' };
  const status = Object.hasOwn(types, event.event) ? types[event.event] : null;
  if (!status) return { ignored: true };
  const previous = one(sql, 'SELECT payload_hash FROM payment_events WHERE event_id=?', eventId);
  if (previous) {
    if (previous.payload_hash !== payloadHash) throw new PaymentError('Webhook event id was reused for a different payload.',409);
    return { duplicate: true };
  }
  const payment = event.payload?.payment?.entity;
  const providerId = payment?.order_id;
  if (!payment || !/^pay_[A-Za-z0-9]+$/.test(payment.id || '') || !/^order_[A-Za-z0-9]+$/.test(providerId || '')) {
    throw new PaymentError('Invalid payment webhook payload.');
  }
  let order = findPaymentOrder(sql, providerId);
  if (!order && typeof payment.notes?.xs_order_id === 'string') {
    order = one(sql, 'SELECT * FROM payment_orders WHERE id=?', payment.notes.xs_order_id);
    if (order?.provider_order_id && order.provider_order_id !== providerId) {
      throw new PaymentError('Webhook order does not match the saved record.', 409);
    }
  }
  // Retry if provider creation has completed but our response has not yet been persisted.
  if (!order) throw new PaymentError('Payment order is not available yet. Retry this webhook.', 503);
  if (!Number.isSafeInteger(payment.amount) || payment.amount !== order.amount || payment.currency !== order.currency) {
    throw new PaymentError('Payment amount or currency does not match the saved order.');
  }
  if (payment.status !== status || (status === 'captured' && payment.captured !== true)) {
    throw new PaymentError('Payment status does not match the webhook event.');
  }
  if (event.event === 'order.paid') {
    const paidOrder = event.payload?.order?.entity;
    if (!paidOrder || paidOrder.id !== providerId || paidOrder.status !== 'paid'
      || paidOrder.amount !== order.amount || paidOrder.amount_paid !== order.amount
      || paidOrder.amount_due !== 0 || paidOrder.currency !== order.currency) {
      throw new PaymentError('Paid order does not match the saved order.');
    }
  }
  attachProviderOrder(sql, order.id, providerId, now);
  const aggregate = recordAttempt(sql, order, payment.id, status, now);
  sql.exec('INSERT INTO payment_events (event_id,event,order_id,payment_id,payload_hash,received_at) VALUES (?,?,?,?,?,?)',
    eventId, event.event, order.id, payment.id, payloadHash, now);
  return { status: aggregate };
}

export function listPaymentOrders(sql, limit = 50) {
  const orders = sql.exec('SELECT * FROM payment_orders ORDER BY created_at DESC,id DESC LIMIT ?', limit).toArray();
  return orders.map(order => ({ ...order, attempts: sql.exec(
    'SELECT payment_id,status,amount,currency,updated_at FROM payment_attempts WHERE order_id=? ORDER BY updated_at DESC', order.id).toArray() }));
}
