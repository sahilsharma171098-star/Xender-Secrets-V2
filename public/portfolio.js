/* Portfolio enhancements (XEND-PORTFOLIO-002). Without JS every project is visible, every demo and
 * "Build something like this" link works, and the quote form falls back to the WhatsApp link. */
(() => {
  const SITE = "https://www.xendersecrets.com/portfolio";
  const cards = [...document.querySelectorAll(".pf-card[data-cats]")];
  const filters = [...document.querySelectorAll(".pf-filter[data-filter]")];
  const status = document.getElementById("pfStatus");
  const frames = [...document.querySelectorAll("[data-live-frame]")];
  const names = Object.fromEntries(filters.map((b) => [b.dataset.filter, b.firstChild.textContent.trim()]));

  // ---- category filter, mirrored in ?type= so a filtered view can be shared
  const setFilter = (value, { push = false } = {}) => {
    if (!names[value]) value = "all";
    let shown = 0;
    for (const card of cards) {
      const match = value === "all" || card.dataset.cats.split(" ").includes(value);
      card.hidden = !match;
      if (match) shown++;
    }
    for (const b of filters) b.setAttribute("aria-pressed", String(b.dataset.filter === value));
    if (status) status.textContent = "Showing " + shown + " " + (shown === 1 ? "project" : "projects") + (value === "all" ? "." : " in " + names[value] + ".");
    if (push) {
      const url = new URL(location.href);
      if (value === "all") url.searchParams.delete("type"); else url.searchParams.set("type", value);
      url.hash = "projects";
      history.replaceState(null, "", url);
    }
    sizeFrames();
  };
  filters.forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.filter, { push: true })));
  const initial = new URLSearchParams(location.search).get("type");
  if (initial) setFilter(initial);

  // ---- deep links: /portfolio#p-slug opens with that project visible and highlighted
  const focusTarget = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id.startsWith("p-")) return;
    const card = document.getElementById(id);
    if (!card) return;
    if (card.hidden) setFilter("all");
    cards.forEach((c) => c.classList.toggle("is-target", c === card));
    card.scrollIntoView({ block: "start" });
  };
  addEventListener("hashchange", focusTarget);
  focusTarget();

  // ---- live previews: render each demo at desktop width, scaled to the card
  function sizeFrames() {
    for (const f of frames) if (f.offsetWidth) f.style.setProperty("--s", (f.offsetWidth / 1280).toFixed(4));
  }
  if (frames.length) {
    document.documentElement.classList.add("pf-scaled");
    for (const f of frames) {
      const iframe = f.querySelector("iframe");
      f.classList.add("is-loading");
      iframe.addEventListener("load", () => f.classList.remove("is-loading"), { once: true });
    }
    if ("ResizeObserver" in window) new ResizeObserver(sizeFrames).observe(document.querySelector(".pf-grid"));
    addEventListener("resize", sizeFrames, { passive: true });
    sizeFrames();
  }

  // ---- copy helpers
  const copy = async (text, input) => {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch { /* fall through to the selection fallback */ }
    try {
      const el = input || Object.assign(document.createElement("textarea"), { value: text });
      if (!input) { el.setAttribute("readonly", ""); el.style.position = "fixed"; el.style.opacity = "0"; document.body.appendChild(el); }
      el.focus({ preventScroll: true });
      el.select();
      const ok = document.execCommand && document.execCommand("copy");
      if (!input) el.remove();
      return Boolean(ok);
    } catch { return false; }
  };
  const track = (name, label) => window.XS && window.XS.track && window.XS.track(name, { label });

  // ---- per-project share: native share sheet on phones, copy link elsewhere
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest && e.target.closest("[data-share]");
    if (!btn) return;
    const url = SITE + "#p-" + btn.dataset.share;
    const title = btn.dataset.shareTitle + " — Xender Secrets";
    track("cta_click", "portfolio-share-" + btn.dataset.share);
    if (navigator.share && matchMedia("(pointer:coarse)").matches) {
      try { await navigator.share({ title, url }); return; } catch (err) { if (err && err.name === "AbortError") return; }
    }
    const ok = await copy(url);
    const label = btn.textContent;
    btn.textContent = ok ? "Link copied" : "Copy failed";
    btn.classList.toggle("done", ok);
    setTimeout(() => { btn.textContent = label; btn.classList.remove("done"); }, 2200);
  });

  // ---- whole-portfolio share box
  const pfCopy = document.getElementById("pfCopy");
  const msg = document.getElementById("pfCopyMsg");
  pfCopy?.addEventListener("click", async () => {
    const ok = await copy(SITE, document.getElementById("pfShareUrl"));
    if (msg) msg.textContent = ok ? "Link copied — paste it into an email, DM or proposal." : "Select the link above and copy it.";
    track("cta_click", "portfolio-copy-link");
  });
  const native = document.getElementById("pfNativeShare");
  if (native && navigator.share) {
    native.hidden = false;
    native.addEventListener("click", async () => {
      try { await navigator.share({ title: "Xender Secrets portfolio", text: "Live websites, apps and tools by Xender Secrets.", url: SITE }); } catch { /* cancelled */ }
    });
  }

  // ---- "Build something like this" pre-fills the quote form
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("[data-like]");
    if (!a) return;
    const form = document.querySelector("form[data-lead-form]");
    const message = form && form.querySelector('[name="message"]');
    if (message && (!message.value.trim() || message.dataset.prefilled === "1")) {
      message.value = a.dataset.likeText + " ";
      message.dataset.prefilled = "1";
    }
    setTimeout(() => form?.querySelector('[name="name"]')?.focus({ preventScroll: true }), 450);
  });
})();
