// Preflight only. Deliberately contains no provider call or send implementation.
// Limits come from src/outreach-policy.mjs (XEND-HQ-01) so the Worker and the Command Center agree.
import {OUTREACH_POLICY, checkPacing} from '../src/outreach-policy.mjs';

export function checkOutreach({lead, approval, suppression = [], touch, pacing, now = Date.now()}) {
  const reject = reason => ({ok:false,reason});
  if (!lead?.id || !lead.suppression_key) return reject('Missing verified identity');
  if (lead.is_fixture || lead.contact_status !== 'VERIFIED') return reject('Contact not verified');
  if (lead.opt_out_at || suppression.some(s => s.lead_id === lead.id || s.contact_key === lead.suppression_key)) return reject('Suppressed');
  if (!['OPTED_IN','REVIEWED_BASIS'].includes(lead.permission_status) || !lead.permission_evidence) return reject('Permission evidence required');
  if (!touch?.target || !touch.content_hash || !touch.channel) return reject('Exact touch required');
  if (lead.target !== touch.target) return reject('Recipient does not match verified lead');
  // Prevent a caller from attaching an unrelated, unsuppressed key to an email recipient.
  // Approval matching below deliberately remains exact, including original recipient casing.
  if (touch.channel === 'Email' && lead.suppression_key !== 'email:' + String(lead.target).trim().toLowerCase()) return reject('Suppression identity mismatch');
  if (touch.channel === 'WhatsApp' && lead.permission_status !== 'OPTED_IN') return reject('WhatsApp opt-in required');
  if (lead.preferred_channel && lead.preferred_channel !== touch.channel) return reject('Channel preference mismatch');
  if (!approval || approval.status !== 'APPROVED' || !approval.approved_by || !approval.evidence_url) return reject('Human approval required');
  if (approval.action !== 'send' || approval.target !== touch.target || approval.channel !== touch.channel || approval.content_hash !== touch.content_hash) return reject('Approval scope mismatch');
  if (!(Date.parse(approval.expires_at) > now) || !(Date.parse(approval.approved_at) <= now)) return reject('Approval expired or invalid');
  // One approval = one message. The caller must pass the approval ids already used for sends
  // (OS Touches.approval_id); without that list the send cannot be verified as the first use.
  if (approval.used_at) return reject('Approval already used');
  if (!Array.isArray(pacing?.used_approval_ids)) return reject('Send history not verified');
  if (pacing.used_approval_ids.includes(approval.approval_id)) return reject('Approval already used');
  if (touch.previous_result === 'unknown') return reject('Reconcile ambiguous provider result');
  if (lead.reply_pending) return reject('Review reply before follow-up');
  if (lead.last_sent_at && (!Number.isFinite(Date.parse(lead.last_sent_at)) || now-Date.parse(lead.last_sent_at) < OUTREACH_POLICY.contactCooldownHours*3600000)) return reject('One contact per 24 hours or invalid history');
  if (touch.is_followup && (lead.unanswered_followups || 0) >= OUTREACH_POLICY.maxUnansweredFollowUps) return reject('Follow-up cap');
  // LEAD-02: every email counts toward the sender's daily cap and minimum gap; no verified history, no send.
  if (touch.channel === 'Email') { const p = checkPacing('Email', pacing, now); if (!p.ok) return reject(p.reason); }
  return {ok:true,approval_id:approval.approval_id};
}
