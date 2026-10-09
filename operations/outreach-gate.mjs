// Preflight only. Deliberately contains no provider call or send implementation.
export function checkOutreach({lead, approval, suppression = [], touch, now = Date.now()}) {
  const reject = reason => ({ok:false,reason});
  if (!lead?.id || !lead.suppression_key) return reject('Missing verified identity');
  if (lead.is_fixture || lead.contact_status !== 'VERIFIED') return reject('Contact not verified');
  if (lead.opt_out_at || suppression.some(s => s.lead_id === lead.id || s.contact_key === lead.suppression_key)) return reject('Suppressed');
  if (!['OPTED_IN','REVIEWED_BASIS'].includes(lead.permission_status) || !lead.permission_evidence) return reject('Permission evidence required');
  if (!touch?.target || !touch.content_hash || !touch.channel) return reject('Exact touch required');
  if (lead.target !== touch.target) return reject('Recipient does not match verified lead');
  if (touch.channel === 'WhatsApp' && lead.permission_status !== 'OPTED_IN') return reject('WhatsApp opt-in required');
  if (lead.preferred_channel && lead.preferred_channel !== touch.channel) return reject('Channel preference mismatch');
  if (!approval || approval.status !== 'APPROVED' || !approval.approved_by || !approval.evidence_url) return reject('Human approval required');
  if (approval.action !== 'send' || approval.target !== touch.target || approval.channel !== touch.channel || approval.content_hash !== touch.content_hash) return reject('Approval scope mismatch');
  if (!(Date.parse(approval.expires_at) > now) || !(Date.parse(approval.approved_at) <= now)) return reject('Approval expired or invalid');
  if (touch.previous_result === 'unknown') return reject('Reconcile ambiguous provider result');
  if (lead.reply_pending) return reject('Review reply before follow-up');
  if (lead.last_sent_at && (!Number.isFinite(Date.parse(lead.last_sent_at)) || now-Date.parse(lead.last_sent_at) < 86400000)) return reject('One contact per 24 hours or invalid history');
  if (touch.is_followup && (lead.unanswered_followups || 0) >= 2) return reject('Follow-up cap');
  return {ok:true,approval_id:approval.approval_id};
}
