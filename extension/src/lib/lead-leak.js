// Lead Leak Detector core logic
// Runs in the context of the inspected page (content script).
// Detects common broken CTA / form patterns and adds a visual highlight.

export function detectLeadIssues() {
  const issues = [];
  // 1. Anchor tags with empty href, "#" or javascript:
  document.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') ?? '';
    if (!href.trim() || href.trim() === '#' || href.trim().toLowerCase().startsWith('javascript:')) {
      issues.push({type: 'broken-cta', selector: getUniqueSelector(a), reason: 'Empty or non‑navigable href'});
    }
  });

  // 2. Buttons that look like CTA but disabled:
  document.querySelectorAll('button').forEach(btn => {
    if (btn.disabled) {
      issues.push({type: 'disabled-button', selector: getUniqueSelector(btn), reason: 'Button disabled'});
    }
  });

  // 3. Forms without action or with action pointing to "#" or javascript:
  document.querySelectorAll('form').forEach(form => {
    const act = form.getAttribute('action') ?? '';
    if (!act.trim() || act.trim() === '#' || act.trim().toLowerCase().startsWith('javascript:')) {
      issues.push({type: 'form-no-action', selector: getUniqueSelector(form), reason: 'Form action missing or non‑navigable'});
    }
    // 3b. Submit inputs/buttons that are disabled
    form.querySelectorAll('[type="submit"]').forEach(sub => {
      if (sub.disabled) {
        issues.push({type: 'disabled-submit', selector: getUniqueSelector(sub), reason: 'Submit disabled'});
      }
    });
  });

  // 4. Links/buttons that lead to same‑page anchor that does not exist:
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    const targetId = a.getAttribute('href').slice(1);
    if (targetId && !document.getElementById(targetId)) {
      issues.push({type: 'broken-anchor', selector: getUniqueSelector(a), reason: 'Anchor target missing'});
    }
  });

  // Highlight all found elements
  issues.forEach(issue => {
    try {
      const el = document.querySelector(issue.selector);
      if (el) {
        el.style.outline = '2px solid #ff5555';
        el.dataset.leakHighlight = 'true';
        // add tooltip
        el.title = `[Lead Leak] ${issue.reason}`;
      }
    } catch {}
  });

  return issues;
}

// Helper: generate a reasonably unique CSS selector for an element.
function getUniqueSelector(el) {
  if (el.id) return `#${el.id}`;
  const parts = [];
  while (el && el.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    let part = el.tagName.toLowerCase();
    if (el.className) {
      const firstClass = el.className.split(/\s+/)[0];
      part += `.${firstClass}`;
    }
    parts.unshift(part);
    el = el.parentElement;
  }
  return parts.join(' > ');
}

export function clearHighlights() {
  document.querySelectorAll('[data-leakHighlight]').forEach(el => {
    el.style.outline = '';
    el.title = '';
    delete el.dataset.leakHighlight;
  });
}
