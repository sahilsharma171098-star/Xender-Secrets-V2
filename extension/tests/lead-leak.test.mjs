// lead-leak.test.mjs
import { strict as assert } from 'assert';
import { JSDOM } from 'jsdom';
import { detectLeadIssues, clearHighlights } from '../src/lib/lead-leak.js';

// Helper to create a DOM with some elements
function makeDom(html) {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  global.window = dom.window;
  global.document = dom.window.document;
  return dom;
}

// Test false positive: a form with JavaScript submit handler should not be flagged
const dom1 = makeDom(`
  <form id="jsForm" onsubmit="return false;"><input type="text" name="x"><button type="submit">Send</button></form>
`);
let issues = detectLeadIssues();
assert.ok(!issues.some(i => i.type === 'form-no-action'), 'Form with onsubmit should not be flagged');
clearHighlights();

// Test disabled button flagged only when not allowed
const dom2 = makeDom(`<button id="bad" disabled>Click</button>`);
issues = detectLeadIssues();
assert.ok(issues.some(i => i.type === 'disabled-button'), 'Disabled button without allow flag should be flagged');
clearHighlights();

// Test allowed disabled button (data-allow-disabled attribute)
const dom3 = makeDom(`<button id="good" disabled data-allow-disabled>Ok</button>`);
issues = detectLeadIssues();
assert.ok(!issues.some(i => i.type === 'disabled-button'), 'Button with allow flag should not be flagged');
clearHighlights();

console.log('Lead Leak Detector tests passed');
