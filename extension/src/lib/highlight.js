// "Show on page" outlines for SiteCheck issues (v2.1).
//
// Both functions are passed to scripting.executeScript({ func, args }) and run in the
// extension's isolated world inside the audited tab, only after the user clicks a button
// in the popup (activeTab + scripting — no new permissions). Because the browser
// serialises them, they must stay self-contained: no imports, no outer variables.
//
// They draw outlines over the elements an issue refers to, scroll the first one into view,
// and remove everything on Esc, on the next "Show on page", on "Clear outlines" or when the
// check runs again. They never change page content or page styles, never read text or
// form values and never send anything anywhere.
export function highlightOnPage(selectors, label) {
  const HOST = "xender-sitecheck-outline";
  const previous = document.querySelector(HOST);
  if (previous && typeof previous.xsCleanup === "function") previous.xsCleanup();
  else if (previous) previous.remove();

  const list = Array.isArray(selectors)
    ? selectors.filter((s) => typeof s === "string" && s.length > 0 && s.length <= 600).slice(0, 20)
    : [];
  const found = [];
  for (const sel of list) {
    let el = null;
    try { el = document.querySelector(sel); } catch (e) { el = null; }
    if (el && el.getClientRects().length > 0 && !found.includes(el)) found.push(el);
  }
  const outcome = { requested: list.length, shown: found.length };
  if (!found.length) return outcome;

  const set = (el, props) => { for (const [k, v] of Object.entries(props)) el.style.setProperty(k, v, "important"); };
  const host = document.createElement(HOST);
  set(host, { all: "initial", display: "block", position: "absolute", top: "0px", left: "0px", width: "0px", height: "0px", overflow: "visible", "z-index": "2147483647", "pointer-events": "none" });
  const root = host.attachShadow({ mode: "closed" });

  const boxes = found.map((el, i) => {
    const box = document.createElement("div");
    set(box, { position: "absolute", "box-sizing": "border-box", border: "2px solid #e5484d", background: "rgba(229, 72, 77, 0.12)", "border-radius": "4px", "box-shadow": "0 0 0 2px rgba(255, 255, 255, 0.9)" });
    const num = document.createElement("span");
    num.textContent = String(i + 1);
    set(num, { position: "absolute", top: "-11px", left: "-11px", "min-width": "20px", height: "20px", padding: "0 5px", "box-sizing": "border-box", "border-radius": "10px", background: "#e5484d", color: "#ffffff", font: "700 11px/20px system-ui, -apple-system, Segoe UI, sans-serif", "text-align": "center" });
    box.append(num);
    root.append(box);
    return [el, box];
  });

  const caption = document.createElement("div");
  const title = String(label || "SiteCheck issue").replace(/\s+/g, " ").trim();
  caption.textContent = "SiteCheck · " + (title.length > 80 ? title.slice(0, 79) + "…" : title) + " · " + found.length + " outlined · Esc to clear";
  set(caption, { position: "fixed", left: "12px", bottom: "12px", "max-width": "calc(100vw - 24px)", padding: "7px 11px", "border-radius": "9px", background: "#0b1220", color: "#ffffff", font: "600 12px/1.4 system-ui, -apple-system, Segoe UI, sans-serif", "box-shadow": "0 6px 20px rgba(0, 0, 0, 0.25)" });
  root.append(caption);

  function place() {
    const sx = window.scrollX, sy = window.scrollY, pad = 3;
    for (const [el, box] of boxes) {
      const r = el.getBoundingClientRect();
      set(box, { left: (r.left + sx - pad) + "px", top: (r.top + sy - pad) + "px", width: Math.max(r.width + pad * 2, 10) + "px", height: Math.max(r.height + pad * 2, 10) + "px" });
    }
  }
  let frame = 0;
  const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; place(); }); };
  const onKey = (e) => { if (e.key === "Escape") cleanup(); };
  function cleanup() {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("scroll", schedule, true);
    window.removeEventListener("resize", schedule);
    if (frame) cancelAnimationFrame(frame);
    host.remove();
  }
  host.xsCleanup = cleanup;

  place();
  // Appended to <html>, not <body>, so a positioned or transformed body cannot offset it.
  document.documentElement.append(host);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule);
  found[0].scrollIntoView({ block: "center", inline: "nearest" });
  return outcome;
}

export function clearPageHighlights() {
  const host = document.querySelector("xender-sitecheck-outline");
  if (!host) return { cleared: false };
  if (typeof host.xsCleanup === "function") host.xsCleanup();
  else host.remove();
  return { cleared: true };
}
