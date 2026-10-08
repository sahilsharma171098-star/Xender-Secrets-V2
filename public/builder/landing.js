/* Xender Builder landing (XEND-BUILDER-001): prompt → studio, example chips, capacity line, scroll motion. */
(() => {
  const { $, status, reveal, track } = window.XB;
  const form = $("#promptForm"), box = $("#prompt");
  document.querySelectorAll("[data-example]").forEach((b) => b.addEventListener("click", () => {
    box.value = b.dataset.example; box.focus(); track("cta_click", "builder-example");
  }));
  box.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) form.requestSubmit(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const prompt = box.value.trim();
    if (prompt.length < 8) { box.focus(); window.XB.toast("Describe the website in a few more words."); return; }
    try { sessionStorage.setItem("xb-pending", prompt); } catch {}
    track("cta_click", "builder-generate");
    location.href = "/builder/studio?new=1";
  });
  status().then((s) => {
    const cap = $("#capacity");
    if (!s.enabled) cap.textContent = "AI generation is paused right now";
    else if (!s.quota.capacity.available) cap.textContent = "Today's free AI capacity is used up · resets 00:00 UTC";
    else cap.textContent = `Free to try · ${s.quota.remaining} of ${s.quota.limit} generations left today`;
  }).catch(() => {});
  reveal();
  // Scroll-linked tilt on the studio mock (one rAF per scroll, transform only).
  const show = $("#showcase");
  if (show && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = show.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - r.top / innerHeight));
      show.style.setProperty("--tilt", (8 - p * 8).toFixed(2) + "deg");
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
})();
