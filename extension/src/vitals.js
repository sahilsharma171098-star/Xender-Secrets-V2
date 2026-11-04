// Xender SiteCheck — page-load metrics measured on this device (v2.1).
//
// Injected next to audit.js only after the user opens the popup (activeTab + scripting).
// It reads performance entries the browser already buffered for THIS page load in THIS
// browser and returns plain numbers. No network requests, no storage, no globals; every
// observer is disconnected before the promise resolves.
//
// What this is NOT: Google field data (CrUX) or a Lighthouse lab run. The numbers depend
// on this device, network, cache state and how long the page has been open.
//
// Coverage: Chromium supports every entry type used here. Firefox has paint, navigation,
// LCP and event timing but no layout-shift, so CLS comes back as unsupported there.
// INP: browsers only keep interactions of 104 ms or longer in the buffer this script can
// read, plus the very first input. So with no buffered slow interaction but a recorded
// first input, the honest answer is "under 104 ms", not an exact number.
(() => new Promise((resolve) => {
  "use strict";
  const perf = window.performance;
  const types = window.PerformanceObserver && Array.isArray(PerformanceObserver.supportedEntryTypes)
    ? PerformanceObserver.supportedEntryTypes : [];
  const sinks = { "largest-contentful-paint": [], "layout-shift": [], event: [], "first-input": [], paint: [] };
  const observers = [];
  for (const type of Object.keys(sinks)) {
    if (!types.includes(type)) continue;
    try {
      const po = new PerformanceObserver((list) => { for (const e of list.getEntries()) sinks[type].push(e); });
      po.observe(type === "event" ? { type, buffered: true, durationThreshold: 16 } : { type, buffered: true });
      observers.push([po, type]);
    } catch (e) { /* not observable in this browser */ }
  }

  // Buffered entries are delivered in a later task; a short wait collects them.
  setTimeout(() => {
    for (const [po, type] of observers) {
      try { for (const e of po.takeRecords()) sinks[type].push(e); } catch (e) { /* ignore */ }
      try { po.disconnect(); } catch (e) { /* ignore */ }
    }
    let out;
    try { out = summarize(); } catch (e) { out = { engine: "xender-sitecheck-vitals", version: 1, error: true }; }
    resolve(out);
  }, 50);

  function summarize() {
    const nav = perf && perf.getEntriesByType ? perf.getEntriesByType("navigation")[0] : null;
    // Prerendered pages count from activation, not from the hidden prerender start.
    const activation = nav && nav.activationStart > 0 ? nav.activationStart : 0;
    const ms = (t) => (Number.isFinite(t) ? Math.max(0, Math.round(t - activation)) : null);

    const ttfb = nav && nav.responseStart > 0 ? ms(nav.responseStart) : null;
    const fcpEntry = sinks.paint.find((e) => e.name === "first-contentful-paint")
      || (perf && perf.getEntriesByName ? perf.getEntriesByName("first-contentful-paint")[0] : null);
    const fcp = fcpEntry ? ms(fcpEntry.startTime) : null;
    const lcpEntry = sinks["largest-contentful-paint"][sinks["largest-contentful-paint"].length - 1];
    const lcp = lcpEntry ? ms(lcpEntry.startTime) : null;

    // CLS: largest session window (gaps under 1 s, window at most 5 s), ignoring shifts
    // right after user input — the same definition Chrome uses.
    let cls = null;
    if (types.includes("layout-shift")) {
      let max = 0, cur = 0, first = 0, last = 0;
      for (const { value: shift, startTime, hadRecentInput } of sinks["layout-shift"]) { // LayoutShift score, not a form field
        if (hadRecentInput) continue;
        if (cur && startTime - last < 1000 && startTime - first < 5000) cur += shift;
        else { cur = shift; first = startTime; }
        last = startTime;
        if (cur > max) max = cur;
      }
      cls = Math.round(max * 1000) / 1000;
    }

    // INP: worst interaction, skipping one outlier per 50 interactions (web-vitals method).
    const worst = new Map();
    for (const e of sinks.event) {
      if (!e.interactionId) continue;
      worst.set(e.interactionId, Math.max(worst.get(e.interactionId) || 0, e.duration));
    }
    const durations = [...worst.values()].sort((a, b) => b - a);
    const firstInput = sinks["first-input"].length > 0;
    const inp = durations.length ? Math.round(durations[Math.min(durations.length - 1, Math.floor(durations.length / 50))]) : null;
    const inpBelowMs = inp === null && firstInput ? 104 : null;

    // A tab that loaded in the background paints late, so its times are not meaningful.
    let loadedInBackground = null;
    if (types.includes("visibility-state") && perf.getEntriesByType) {
      const hidden = perf.getEntriesByType("visibility-state").find((e) => e.name === "hidden");
      loadedInBackground = Boolean(hidden && (lcpEntry ? hidden.startTime < lcpEntry.startTime : true));
    }

    return {
      engine: "xender-sitecheck-vitals",
      version: 1,
      metrics: { lcp, inp, cls, fcp, ttfb },
      inpBelowMs,
      interacted: firstInput || durations.length > 0,
      supported: {
        lcp: types.includes("largest-contentful-paint"),
        inp: types.includes("event"),
        cls: types.includes("layout-shift"),
        fcp: Boolean(fcpEntry) || types.includes("paint"),
        ttfb: Boolean(nav),
      },
      loadedInBackground,
      stillLoading: !nav || !(nav.loadEventEnd > 0),
    };
  }
}))();
