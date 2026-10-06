// Turns a reviewHtml() result into a short, honest, client-ready "free website check" message.
// Plain language for business owners; no scores, no fear-mongering, no promised outcomes.

const FIXES = {
  "missing-viewport": {
    line: "The site isn't set up for phones, so it opens zoomed-out and hard to read on mobile — which is where most of your customers will see it.",
    quick: false,
  },
  "weak-contact": {
    line: "I couldn't find a phone number, email or WhatsApp link on the page, so an interested visitor has no easy way to reach you.",
    quick: true,
  },
  "weak-cta": {
    line: "There's no clear button like \"Book an appointment\", \"Get a quote\" or \"WhatsApp us\", so visitors read and leave instead of contacting you.",
    quick: true,
  },
  "placeholder-copy": {
    line: "Some unfinished placeholder text (like \"lorem ipsum\" or \"coming soon\") is still visible, which makes the business look inactive.",
    quick: true,
  },
  "raw-filename-heading": {
    line: "An image file name (something like IMG_1234) is showing up as a heading on the page.",
    quick: true,
  },
  "insecure-form": {
    line: "Your enquiry form sends details over an insecure (http) connection, and browsers may warn visitors about it.",
    quick: false,
  },
  "missing-title": {
    line: "The page has no title, so Google results and browser tabs don't show your business name and service clearly.",
    quick: true,
  },
  "missing-description": {
    line: "There's no search description, so Google picks random text from the page for your listing. A clear one-line summary gets more clicks.",
    quick: true,
  },
  "missing-h1": {
    line: "There's no main headline that says what you do and where — the first thing a visitor should read.",
    quick: true,
  },
  "missing-schema": {
    line: "Google isn't given your business details (address, hours, phone) in the structured format it uses for rich results.",
    quick: false,
  },
  "title-length": {
    line: "The page title is too short or too long to show well in Google — ideally your business name plus your main service and city.",
    quick: true,
  },
  "multiple-h1": {
    line: "The page has several competing main headlines, which makes it less clear to visitors and Google what you offer.",
    quick: true,
  },
};

const SERIOUS = new Set(["missing-viewport", "weak-contact", "weak-cta", "placeholder-copy", "insecure-form"]);
// What a business owner feels first: can customers read it on a phone and reach me? SEO details come after.
const ORDER = ["missing-viewport", "weak-contact", "weak-cta", "placeholder-copy", "insecure-form", "raw-filename-heading", "missing-title", "missing-h1", "missing-description", "title-length", "multiple-h1", "missing-schema"];
const HONORIFICS = /^(dr|mr|mrs|ms|miss|ca|adv|prof|shri|smt|sri)\.?$/i;

/** "Dr Asha Mehta" → "Dr Mehta"; "Asha Mehta" → "Asha". */
export function greetingName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (HONORIFICS.test(parts[0])) return parts.length > 1 ? `${parts[0].replace(/\.$/, "")} ${parts[parts.length - 1]}` : "";
  return parts[0];
}

/**
 * @param {object} review  result of reviewHtml()
 * @param {object} opts    { name, site, max = 4, preview = true }
 * @returns {{ message: string, points: string[], recommendation: "redesign"|"fixes"|"none", unknownCodes: string[] }}
 */
export function freeCheckMessage(review, { name = "", site = "", max = 4, preview = true } = {}) {
  const issues = Array.isArray(review?.issues) ? review.issues : [];
  const known = issues.filter((i) => FIXES[i.code]).sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code)).slice(0, Math.max(1, max));
  const unknownCodes = issues.filter((i) => !FIXES[i.code]).map((i) => i.code);
  const serious = known.filter((i) => SERIOUS.has(i.code)).length;
  const recommendation = !known.length ? "none" : serious >= 2 || known.some((i) => i.code === "missing-viewport") ? "redesign" : "fixes";
  const hi = greetingName(name) ? `Hi ${greetingName(name)},` : "Hi,";
  const where = site ? ` ${site}` : " your website";
  const points = known.map((i) => FIXES[i.code].line);
  const quickCount = known.filter((i) => FIXES[i.code].quick).length;

  let body;
  if (!known.length) {
    body = `${hi} I had a look at${where}. The basics are in good shape — mobile setup, contact options and a clear call to action are all there, which is more than most sites I check.\n\nIf you'd ever like a second opinion on getting more enquiries from it (speed, wording, Google listing), I'm happy to share ideas — no cost.`;
  } else {
    const list = points.map((p, n) => `${n + 1}. ${p}`).join("\n");
    const quickLine = quickCount
      ? `${quickCount === known.length ? "All of these are" : quickCount === 1 ? "One of these is" : `${quickCount} of these are`} quick fixes your current developer can make.`
      : "These need some development work, but none of them is a big job.";
    const offer = recommendation === "redesign"
      ? (preview
        ? "If it helps, I can make a free draft of a mobile-friendly version so you can compare side by side — no obligation. A complete one-page site starts at ₹999."
        : "If you'd like, we can rebuild it as a fast, mobile-friendly site — a complete one-page site starts at ₹999.")
      : "If you'd rather not deal with it, we can fix these for you at a fixed price — happy to quote.";
    body = `${hi} I had a look at${where} — here's a quick free check:\n\n${list}\n\n${quickLine} ${offer}`;
  }
  const message = `${body}\n\n— Sahil, Xender Secrets\nwww.xendersecrets.com · WhatsApp +91 98219 41814`;
  return { message, points, recommendation, unknownCodes };
}
