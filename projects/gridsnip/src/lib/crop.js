// GridSnip — selection geometry (pure, unit-tested).

/** Two pointer positions → a rectangle with positive width/height. */
export function normalizeRect(x1, y1, x2, y2) {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}

/**
 * Maps a selection drawn on the displayed screenshot to the screenshot's own pixels
 * (screenshots are taken at the device pixel ratio, so they are usually larger than shown).
 * Returns null when the area is too small to hold a table.
 */
export function toSourceRect(sel, displayed, natural, minSize = 12) {
  if (!sel || !displayed.w || !displayed.h || !natural.w || !natural.h) return null;
  const sx = natural.w / displayed.w, sy = natural.h / displayed.h;
  const x = Math.max(0, Math.floor(sel.x * sx));
  const y = Math.max(0, Math.floor(sel.y * sy));
  const right = Math.min(natural.w, Math.ceil((sel.x + sel.w) * sx));
  const bottom = Math.min(natural.h, Math.ceil((sel.y + sel.h) * sy));
  const w = right - x, h = bottom - y;
  if (w < minSize || h < minSize) return null;
  return { x, y, w, h };
}

/** Output size that keeps the crop within Gemini-friendly limits without upscaling. */
export function fitWithin(w, h, max = 3072) {
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}
