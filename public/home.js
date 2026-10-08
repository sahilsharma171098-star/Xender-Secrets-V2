/* Xender homepage: theme toggle (light default, dark optional) and mobile menu. */
(() => {
  const root = document.documentElement;
  const btn = document.getElementById("themeToggle");
  const paint = () => {
    const dark = root.dataset.theme === "dark";
    if (btn) { btn.textContent = dark ? "☀" : "◐"; btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode"); }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0a0f1a" : "#ffffff");
  };
  btn?.addEventListener("click", () => {
    const dark = root.dataset.theme === "dark";
    if (dark) root.removeAttribute("data-theme"); else root.dataset.theme = "dark";
    try { localStorage.setItem("xs-theme", dark ? "light" : "dark"); } catch {}
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


/* XEND-MOTION-001 — low-cost scroll motion, no trackers or animation dependencies.
 * Animation is progressive, pauses for reduced motion, and never blocks navigation or forms. */
(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (prefersReduced.matches) return;
  const reveal = document.querySelectorAll(".motion-reveal, .section-head, .offers .offer, .grid3 .work, .steps > li");
  if ("IntersectionObserver" in window && reveal.length) {
    // Mark only observed content; rendering without JavaScript remains fully visible.
    document.documentElement.classList.add("motion-enabled");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -30px 0px", threshold: 0.06 });
    reveal.forEach((el) => { el.classList.add("motion-reveal"); observer.observe(el); });
  }
  const scenes = [...document.querySelectorAll("[data-motion-scene]")];
  const story = document.querySelector(".journey-visual");
  const steps = [...document.querySelectorAll("[data-motion-step]")];
  const progress = document.createElement("div");
  progress.className = "xs-scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);

  let raf = 0;
  const update = () => {
    raf = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.transform = "scaleX(" + Math.max(0, Math.min(1, window.scrollY / max)).toFixed(4) + ")";
    for (const scene of scenes) {
      const rect = scene.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > window.innerHeight + 100) continue;
      const centre = (rect.top + rect.height / 2) / window.innerHeight;
      const offset = Math.max(-1, Math.min(1, 0.5 - centre));
      scene.style.setProperty("--motion-y", Math.round(offset * 33) + "px");
      scene.style.setProperty("--float-y", Math.round(offset * -48) + "px");
    }
    if (story && steps.length) {
      const midpoint = window.innerHeight * 0.52;
      let phase = "design";
      for (const step of steps) {
        if (step.getBoundingClientRect().top <= midpoint) phase = step.dataset.motionStep;
      }
      if (story.dataset.phase !== phase) story.dataset.phase = phase;
    }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  prefersReduced.addEventListener?.("change", () => window.location.reload(), { once: true });
  schedule();
})();
