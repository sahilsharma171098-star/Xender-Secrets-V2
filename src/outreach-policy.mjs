// XEND-HQ-01 — one place for Xender's outreach limits, shared by the Worker queue
// (src/pipeline.mjs, /admin) and the Command Center send preflight (operations/outreach-gate.mjs).
//
// Cold email (Lead Hunt): LEAD-02, approved by Sahil on 2026-10-22 after a "550 high probability of
// spam" rejection — max 5 approved first-touch emails a day, at least 15 minutes apart, each with
// its own recorded approval.
// WhatsApp: Sahil sends every message by hand from /admin; the existing cap of 25 first messages a
// day is kept unchanged here. Note: operations/outreach-gate.mjs only lets *automated* WhatsApp
// sends through with recorded opt-in, so manual cold WhatsApp stays a human decision.

export const OUTREACH_POLICY = Object.freeze({
  Email: Object.freeze({ firstTouchDailyCap: 5, minGapMinutes: 15 }),
  WhatsApp: Object.freeze({ firstTouchDailyCap: 25, minGapMinutes: 0 }),
  maxUnansweredFollowUps: 2,
  contactCooldownHours: 24,
});

/**
 * Sender-level pacing, separate from the per-lead checks. `history` is what the sender has
 * actually recorded today: { sent_today, last_sent_at }. Missing or unreadable history blocks the
 * send — "if send history cannot be verified, draft only".
 */
export function checkPacing(channel, history, now = Date.now()) {
  const rule = OUTREACH_POLICY[channel];
  if (!rule) return { ok: false, reason: "Unknown channel" };
  if (!history || !Number.isSafeInteger(history.sent_today) || history.sent_today < 0) return { ok: false, reason: "Send history not verified" };
  if (history.sent_today >= rule.firstTouchDailyCap) return { ok: false, reason: "Daily cap reached" };
  // Audit 2026-10-22: a sender that already sent today must also say when, or the gap can't be checked.
  if (rule.minGapMinutes && history.sent_today > 0 && !history.last_sent_at) return { ok: false, reason: "Send history not verified" };
  if (rule.minGapMinutes && history.last_sent_at) {
    const last = Date.parse(history.last_sent_at);
    if (!Number.isFinite(last)) return { ok: false, reason: "Send history not verified" };
    if (now - last < rule.minGapMinutes * 60000) return { ok: false, reason: "Minimum gap between sends" };
  }
  return { ok: true };
}
