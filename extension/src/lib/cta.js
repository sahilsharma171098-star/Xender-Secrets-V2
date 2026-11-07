// When the popup shows the "free human review" suggestion.
// Rules (kept pure so they are unit-tested):
// - only under a finished report, never on loading/blocked screens;
// - never for Pro users — they already bought the tool and want a clean utility;
// - "Not now" hides it for 30 days. Only that timestamp is stored, in local extension
//   storage (never sync). A missing, malformed or future timestamp counts as not dismissed.
export const CTA_DISMISS_KEY = "sitecheckCtaDismissedAt";
export const CTA_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

export function ctaVisible({ reportShown, proActive, dismissedAt, now = Date.now() }) {
  if (!reportShown || proActive) return false;
  const t = Number(dismissedAt);
  if (Number.isFinite(t) && t > 0 && t <= now && now - t < CTA_SNOOZE_MS) return false;
  return true;
}
