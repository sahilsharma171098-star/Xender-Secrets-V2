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
