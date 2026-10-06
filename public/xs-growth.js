/* Xender Secrets — first-party measurement + lead forms (XEND-WARROOM-001).
 * - Aggregate, first-party events only: no cookies, no visitor IDs, no third-party scripts.
 * - Honors Global Privacy Control / Do Not Track for events (lead forms still work).
 * - Any <form data-lead-form> becomes a lead form posting to /api/lead.
 * Docs: docs/DATA_MEASUREMENT_PLAN.md
 */
(() => {
  if (window.XS && window.XS.version) return;
  const WA = "919821941814";
  const ATTR_KEY = "xs-attr";
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const optedOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1";

  // Attribution: keep the most recent non-direct touch for 30 days; direct visits never overwrite it.
  const attribution = (() => {
    const q = new URLSearchParams(location.search);
    const ref = document.referrer && !/(^|\.)xendersecrets\.com$/i.test(safeHost(document.referrer)) ? document.referrer : "";
    const touch = {
      utm_source: q.get("utm_source") || q.get("src") || "",
      utm_medium: q.get("utm_medium") || "",
      utm_campaign: q.get("utm_campaign") || "",
      referrer: ref ? "https://" + safeHost(ref) + "/" : "",
      landing_page: location.pathname,
      at: Date.now(),
    };
    const prev = store.get(ATTR_KEY);
    const fresh = prev && Date.now() - (prev.at || 0) < 30 * 864e5;
    if (touch.utm_source || touch.referrer || !fresh) { store.set(ATTR_KEY, touch); return touch; }
    return prev;
  })();
  function safeHost(u) { try { return new URL(u).hostname; } catch { return ""; } }

  // Event queue, flushed in small batches with sendBeacon so it never blocks navigation.
  let queue = [];
  let timer = 0;
  const flush = () => {
    clearTimeout(timer); timer = 0;
    if (!queue.length) return;
    const body = JSON.stringify({ events: queue.splice(0, 20) });
    const blob = new Blob([body], { type: "text/plain" });
    if (!(navigator.sendBeacon && navigator.sendBeacon("/api/event", blob))) {
      fetch("/api/event", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    }
  };
  const track = (name, data = {}) => {
    if (optedOut) return;
    queue.push({ name, path: location.pathname, label: data.label || "", attribution: { utm_source: attribution.utm_source, referrer: attribution.referrer } });
    if (queue.length >= 10) flush(); else if (!timer) timer = setTimeout(flush, 1500);
  };
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  track("page_view");

  let errors = 0;
  addEventListener("error", (e) => { if (errors++ < 2) track("js_error", { label: String(e.message || "error").slice(0, 60) }); });

  const ctaLabel = (el) => el.dataset.cta || (el.textContent || "").trim().slice(0, 50);
  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest("a,button");
    if (!el) return;
    const href = el.getAttribute("href") || "";
    if (/wa\.me|api\.whatsapp\.com/.test(href)) track("whatsapp_click", { label: ctaLabel(el) });
    else if (href.startsWith("mailto:")) track("email_click", { label: ctaLabel(el) });
    else if (href.startsWith("tel:")) track("phone_click", { label: ctaLabel(el) });
    else if (el.dataset.cta) track("cta_click", { label: el.dataset.cta });
    // Offer buttons preselect the offer in the nearest lead form.
    const offer = el.dataset.offer;
    if (offer) {
      const form = document.querySelector("form[data-lead-form]");
      const select = form && form.querySelector('[name="offer"]');
      if (select) { select.value = offer; select.dispatchEvent(new Event("change", { bubbles: true })); }
    }
  }, { capture: true });

  const waLink = (text) => "https://wa.me/" + WA + "?text=" + encodeURIComponent(text);

  function initLeadForm(form) {
    const status = form.querySelector("[data-lead-status]");
    const say = (msg, kind) => { if (status) { status.textContent = msg; status.dataset.kind = kind || ""; } };
    let started = false;
    form.addEventListener("focusin", () => { if (!started) { started = true; track("lead_start", { label: form.dataset.cta || "" }); } });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      if (!String(data.phone || "").trim() && !String(data.email || "").trim()) {
        say("Add a WhatsApp number or an email so we can reply.", "error");
        (form.querySelector('[name="phone"]') || form.querySelector('[name="email"]'))?.focus();
        return;
      }
      const btn = form.querySelector('[type="submit"]');
      const label = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      say("", "");
      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...data, page: location.pathname, cta: form.dataset.cta || "", attribution }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) { track("lead_error", { label: "status-" + res.status }); throw new Error(json.error || "We couldn't send that. Please try WhatsApp instead."); }
        showSuccess(form, json.id, data);
      } catch (err) {
        say(err.message || "Network problem. Please try again or use WhatsApp.", "error");
        if (btn) { btn.disabled = false; btn.textContent = label; }
      }
    });
  }

  function showSuccess(form, id, data) {
    const offerText = form.querySelector('[name="offer"] option:checked')?.textContent?.trim() || "a website";
    const msg = `Hi Xender Secrets, I just sent enquiry ${id} for ${offerText}.` + (data.website ? ` My site: ${data.website}` : "");
    const box = document.createElement("div");
    box.className = "lead-success";
    box.setAttribute("role", "status");
    box.setAttribute("tabindex", "-1");
    box.innerHTML = '<p class="lead-success-kicker">Enquiry received</p>' +
      "<h3>Thanks, <span data-name></span>. We'll reply personally.</h3>" +
      '<p>Your reference is <strong data-ref></strong>. For the fastest reply, send it to us on WhatsApp now — it takes one tap.</p>' +
      '<p class="lead-success-actions"><a class="btn primary" data-cta="success-whatsapp" target="_blank" rel="noopener">Send on WhatsApp →</a></p>' +
      '<p class="lead-success-note">No WhatsApp? That\'s fine — we\'ll reply by email.</p>';
    box.querySelector("[data-name]").textContent = String(data.name || "").split(" ")[0] || "there";
    box.querySelector("[data-ref]").textContent = id;
    box.querySelector("a").href = waLink(msg);
    form.replaceWith(box);
    box.focus();
  }

  const boot = () => document.querySelectorAll("form[data-lead-form]").forEach(initLeadForm);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  window.XS = { version: 1, track, attribution, waLink };
})();
