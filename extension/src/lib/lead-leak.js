// These functions are passed directly to chrome.scripting.executeScript. Keep
// their dependencies inside each function so Chromium can serialize them.
export function detectLeadIssues() {
  const issues = [];
  const ctaText = /\b(?:book(?:\s+(?:now|a|an))?|call(?:\s+us)?|contact(?:\s+us)?|consult(?:ation)?|enquir(?:e|y)|get\s+(?:a\s+)?(?:quote|started|in\s+touch)|inquir(?:e|y)|order(?:\s+now)?|request(?:\s+(?:a\s+)?quote)?|schedule|sign\s*up|start\s+(?:a\s+)?(?:free\s+)?trial|subscribe|talk\s+to\s+us)\b/i;
  const highlightMarker = "data-xs-lead-leak-highlight";
  const originalOutline = "data-xs-lead-leak-original-outline";
  const originalOutlinePriority = "data-xs-lead-leak-original-outline-priority";

  // A rerun must remove stale findings after the page or its links change.
  // Keep this inline: executeScript serializes this function without imports.
  for (const element of document.querySelectorAll(`[${highlightMarker}]`)) {
    const value = element.getAttribute(originalOutline) || "";
    if (value) element.style.setProperty("outline", value, element.getAttribute(originalOutlinePriority) || "");
    else element.style.removeProperty("outline");
    element.removeAttribute(highlightMarker);
    element.removeAttribute(originalOutline);
    element.removeAttribute(originalOutlinePriority);
  }

  function selectorFor(element) {
    const parts = [];
    for (let current = element; current; current = current.parentElement) {
      const tag = current.tagName.toLowerCase();
      const siblings = current.parentElement
        ? Array.from(current.parentElement.children).filter((child) => child.tagName === current.tagName)
        : [current];
      parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(current) + 1})`);
    }
    return parts.join(" > ");
  }

  function looksLikeCta(anchor) {
    const label = [
      anchor.getAttribute("aria-label"),
      anchor.getAttribute("title"),
      anchor.textContent,
    ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    return ctaText.test(label);
  }

  function isScriptControl(anchor) {
    return anchor.hasAttribute("onclick")
      || anchor.getAttribute("role") === "button"
      || anchor.hasAttribute("aria-controls")
      || anchor.hasAttribute("data-bs-toggle")
      || anchor.hasAttribute("data-toggle");
  }

  for (const anchor of document.querySelectorAll("a")) {
    const href = (anchor.getAttribute("href") || "").trim();
    if ((!anchor.hasAttribute("href") || href === "") && looksLikeCta(anchor) && !isScriptControl(anchor)) {
      issues.push({
        type: "broken-cta",
        selector: selectorFor(anchor),
        reason: "Call-to-action link has no destination",
      });
      continue;
    }

    if (!href.startsWith("#") || href === "#" || href.startsWith("#/") || isScriptControl(anchor)) continue;
    let targetId;
    try {
      targetId = decodeURIComponent(href.slice(1));
    } catch {
      continue;
    }
    const namedTarget = Array.from(document.getElementsByName(targetId)).some((element) => element.tagName === "A");
    if (targetId && !document.getElementById(targetId) && !namedTarget) {
      issues.push({
        type: "broken-anchor",
        selector: selectorFor(anchor),
        reason: "Link points to a missing section",
      });
    }
  }

  for (const issue of issues) {
    const element = document.querySelector(issue.selector);
    if (!element || element.hasAttribute(highlightMarker)) continue;
    element.setAttribute(highlightMarker, "");
    element.setAttribute(originalOutline, element.style.getPropertyValue("outline"));
    element.setAttribute(originalOutlinePriority, element.style.getPropertyPriority("outline"));
    element.style.setProperty("outline", "2px solid #e11d48", "important");
  }

  return issues;
}

export function clearHighlights() {
  const highlightMarker = "data-xs-lead-leak-highlight";
  const originalOutline = "data-xs-lead-leak-original-outline";
  const originalOutlinePriority = "data-xs-lead-leak-original-outline-priority";

  for (const element of document.querySelectorAll(`[${highlightMarker}]`)) {
    const value = element.getAttribute(originalOutline) || "";
    const priority = element.getAttribute(originalOutlinePriority) || "";
    if (value) element.style.setProperty("outline", value, priority);
    else element.style.removeProperty("outline");
    element.removeAttribute(highlightMarker);
    element.removeAttribute(originalOutline);
    element.removeAttribute(originalOutlinePriority);
  }
}

export function focusLeadIssue(selector) {
  const element = document.querySelector(selector);
  if (!element) return false;
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}
