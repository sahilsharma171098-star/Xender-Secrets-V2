/* Portfolio enhancement: filters, accessible copy/share. Works without JS (all items shown). */
(() => {
  const filters = [...document.querySelectorAll("[data-filter]")];
  const cards = [...document.querySelectorAll(".project-card[data-category]")];
  const feedback = document.getElementById("projectFilterStatus");
  const labels = { all: "all", web: "websites & UI", app: "apps & workflows", product: "our products" };
  const setFilter = (value) => {
    if (!Object.prototype.hasOwnProperty.call(labels, value)) value = "all";
    let shown = 0;
    for (const card of cards) {
      const match = value === "all" || card.dataset.category === value;
      card.hidden = !match;
      if (match) shown += 1;
    }
    for (const button of filters) {
      const selected = button.dataset.filter === value;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    if (feedback) feedback.textContent = "Showing " + shown + " " + (shown === 1 ? "project" : "projects") + (value === "all" ? "." : " in " + labels[value] + ".");
  };
  filters.forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.filter)));

  const url = "https://www.xendersecrets.com/portfolio";
  const copy = document.getElementById("copyPortfolio");
  const message = document.getElementById("copyFeedback");
  copy?.addEventListener("click", async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.getElementById("portfolioShareUrl");
        if (!input) throw new Error("No share field");
        input.focus();
        input.select();
        if (!document.execCommand || !document.execCommand("copy")) throw new Error("Copy unavailable");
      }
      if (message) message.textContent = "Link copied. Paste it into your email, WhatsApp or client proposal.";
    } catch {
      if (message) message.textContent = "Select the link above and copy it to share.";
    }
  });

  const share = document.getElementById("sharePortfolio");
  if (share && navigator.share) {
    share.hidden = false;
    share.addEventListener("click", async () => {
      try { await navigator.share({ title: "Xender Secrets portfolio", text: "Explore our working concept demos and browser tool.", url }); }
      catch { /* share cancelled; no error needed */ }
    });
  }
})();
