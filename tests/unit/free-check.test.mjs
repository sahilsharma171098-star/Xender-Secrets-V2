// Free website check message (scripts/lib/free-check-message.mjs) built from the site reviewer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewHtml } from '../../scripts/lib/site-quality.mjs';
import { freeCheckMessage, greetingName } from '../../scripts/lib/free-check-message.mjs';

const weak = '<html><head><title>Home</title></head><body><h1>IMG_20230101</h1><p>Lorem ipsum. Coming soon.</p></body></html>';
const good = '<html><head><meta name="viewport" content="width=device-width"><title>Mehta Dental Clinic | Gurugram</title><meta name="description" content="Dentist in Gurugram"><script type="application/ld+json">{}</script></head><body><h1>Mehta Dental</h1><a href="tel:+919800000000">Call</a><a href="https://wa.me/919800000000">Book an appointment</a></body></html>';

test('greeting handles honorifics', () => {
  assert.equal(greetingName('Dr Asha Mehta'), 'Dr Mehta');
  assert.equal(greetingName('CA. Rohit Jain'), 'CA Jain');
  assert.equal(greetingName('Asha Mehta'), 'Asha');
  assert.equal(greetingName('Dr'), '');
  assert.equal(greetingName(''), '');
});

test('weak site: owner-visible problems first, redesign + preview offer, honest wording', () => {
  const out = freeCheckMessage(reviewHtml(weak), { name: 'Dr Asha Mehta', site: 'mehtadental.in' });
  assert.equal(out.recommendation, 'redesign');
  assert.equal(out.points.length, 4);
  assert.match(out.points[0], /phones/);
  assert.match(out.points[1], /phone number, email or WhatsApp/);
  assert.match(out.message, /^Hi Dr Mehta, I had a look at mehtadental\.in/);
  assert.match(out.message, /free draft/);
  assert.match(out.message, /₹999/);
  assert.doesNotMatch(out.message, /\d+\/100|score|guarantee|rank #?1/i, 'no scores or promises shown to prospects');
  assert.deepEqual(out.unknownCodes, []);
});

test('good site: no invented problems', () => {
  const out = freeCheckMessage(reviewHtml(good), { site: 'mehtadental.in' });
  assert.equal(out.recommendation, 'none');
  assert.deepEqual(out.points, []);
  assert.match(out.message, /basics are in good shape/);
});

test('minor issues only: fixed-price fixes, not a redesign pitch', () => {
  const out = freeCheckMessage({ issues: [{ code: 'missing-description', points: 8 }, { code: 'missing-schema', points: 4 }] }, { preview: false });
  assert.equal(out.recommendation, 'fixes');
  assert.match(out.message, /fixed price/);
  assert.doesNotMatch(out.message, /free draft/);
});

test('every reviewer issue code has a client-facing explanation', () => {
  const codes = new Set();
  for (const html of [weak, '<form action="http://x"></form>', '<h1>a</h1><h1>b</h1><h1>c</h1>', '']) reviewHtml(html).issues.forEach((i) => codes.add(i.code));
  const out = freeCheckMessage({ issues: [...codes].map((code) => ({ code, points: 1 })) }, { max: 99 });
  assert.deepEqual(out.unknownCodes, []);
});
