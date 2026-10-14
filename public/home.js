/* Xender pages: theme toggle (dark default, light optional) and mobile menu. */
(() => {
  const root = document.documentElement;
  const btn = document.getElementById("themeToggle");
  const paint = () => {
    const light = root.dataset.theme === "light";
    if (btn) { btn.textContent = light ? "◑" : "◐"; btn.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode"); }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f6f2ea" : "#0f0f0e");
  };
  btn?.addEventListener("click", () => {
    const light = root.dataset.theme === "light";
    if (light) root.removeAttribute("data-theme"); else root.dataset.theme = "light";
    try { localStorage.setItem("xs-theme", light ? "dark" : "light"); } catch {}
    paint();
  });
  paint();

  const menu = document.getElementById("menu");
  const nav = document.getElementById("nav");
  const setOpen = (open) => { nav?.classList.toggle("open", open); menu?.setAttribute("aria-expanded", String(open)); };
  menu?.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

  // International visitors: the ₹ packages are India pricing, so show the US$299 anchor instead of
  // converting ₹999 into a misleadingly tiny foreign amount. Uses the existing /api/locale (CF country).
  const notes = document.querySelectorAll("[data-intl-note]");
  if (notes.length) {
    let saved = "";
    try { saved = localStorage.getItem("xs-country") || ""; } catch {}
    fetch("/api/locale" + (/^[A-Z]{2}$/.test(saved) ? "?country=" + saved : ""))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && j.ok && j.country && j.country !== "IN") notes.forEach((n) => { n.hidden = false; }); })
      .catch(() => {});
  }
})();


/* XEND-MOTION-002 — scroll-driven storytelling without animation libraries or trackers.
 * Every [data-scroll-scene] gets a continuous --p (0→1) from its scroll position, so motion scrubs
 * forwards and backwards with the reader. [data-steps="n"] scenes also get --k (0→n) and a
 * data-step index for captions. Content is complete without JS; html.scroll-fx (added only when
 * motion is allowed and the device is not low-powered) switches on pinned layouts and transforms. */
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const conn = navigator.connection || {};
  const lowPower = conn.saveData === true || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  if (reduced.matches) { reduced.addEventListener?.("change", () => location.reload(), { once: true }); return; }

  const reveal = document.querySelectorAll(".motion-reveal, .section-head, .offers .offer, .grid3 .work, .steps > li, .sx-tile, .sx-door, .sx-caps .card");
  if ("IntersectionObserver" in window && reveal.length) {
    root.classList.add("motion-enabled");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -30px 0px", threshold: 0.06 });
    reveal.forEach((el) => { el.classList.add("motion-reveal"); io.observe(el); });
  }

  const progress = document.createElement("div");
  progress.className = "xs-scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);

  const scenes = lowPower ? [] : [...document.querySelectorAll("[data-scroll-scene]")];
  if (scenes.length) root.classList.add("scroll-fx");
  const clamp = (v) => Math.max(0, Math.min(1, v));

  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = window.innerHeight;
    const max = Math.max(1, root.scrollHeight - vh);
    progress.style.transform = "scaleX(" + clamp(window.scrollY / max).toFixed(4) + ")";
    for (const el of scenes) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      // "pin": tall container with a sticky stage — 0 when it reaches the top, 1 when it leaves.
      // "pass": ordinary block — 0 as it enters at the bottom, 1 as it exits at the top.
      // "exit": a hero — 0 at rest, 1 once it has scrolled fully out of view.
      const mode = el.dataset.scrollScene;
      const p = mode === "pin" ? clamp(-r.top / Math.max(1, r.height - vh))
        : mode === "exit" ? clamp(-r.top / Math.max(1, r.height))
        : clamp((vh - r.top) / (vh + r.height));
      el.style.setProperty("--p", p.toFixed(4));
      const n = Number(el.dataset.steps || 0);
      if (n) {
        el.style.setProperty("--k", (p * n).toFixed(4));
        const step = String(Math.min(n - 1, Math.floor(p * n)));
        if (el.dataset.step !== step) {
          el.dataset.step = step;
          el.querySelectorAll("[data-i]").forEach((c) => c.classList.toggle("is-active", c.dataset.i === step));
        }
      }
    }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  reduced.addEventListener?.("change", () => location.reload(), { once: true });
  update();

  // Step buttons inside a pinned scene jump the page to that point of the story.
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-scene-go]");
    if (!b) return;
    const el = b.closest("[data-scroll-scene]");
    if (!el || !root.classList.contains("scroll-fx")) return;
    const n = Number(el.dataset.steps || 1), i = Number(b.dataset.sceneGo);
    const top = el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * ((i + 0.5) / n);
    e.preventDefault();
    scrollTo({ top, behavior: "smooth" });
  });
})();
