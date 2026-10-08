/* Xender Builder pricing page (XEND-BUILDER-001): region-aware prices from pricing-config.js. */
(() => {
  const P = window.XB_PRICING, { $, reveal, status } = window.XB;
  const wrap = $("#regions");
  let current = P.defaultRegion;
  function show(code) {
    const r = P.regions[code] || P.regions[P.defaultRegion];
    current = code;
    $("#launchPrice").textContent = r.fmt(r.launch);
    $("#freePrice").textContent = r.fmt(0);
    $("#launchNote").textContent = r.launchNote;
    $("#proPrice").textContent = P.pro.price ? r.fmt(P.pro.price) + P.pro.period : "Waitlist";
    $("#q-interest").value = "AI Builder pricing page · region " + r.label;
    wrap.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.region === code)));
  }
  for (const [code, r] of Object.entries(P.regions)) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.dataset.region = code; b.textContent = r.label;
    b.onclick = () => show(code);
    wrap.append(b);
  }
  show(current);
  fetch("/api/locale").then((r) => r.json()).then((j) => { const reg = P.countryToRegion[j.country]; if (reg && current === P.defaultRegion) show(reg); }).catch(() => {});
  status().then((s) => { $("#limitGuest").textContent = s.limits.guestDaily; $("#limitUser").textContent = s.limits.userDaily; }).catch(() => {});
  // Offer buttons preselect the quote form (xs-growth.js handles data-offer as well).
  document.querySelectorAll("[data-offer]").forEach((a) => a.addEventListener("click", () => { const s = $("#q-offer"); if (s) s.value = a.dataset.offer; }));
  reveal();
})();
