/* Demo ribbon (XEND-PORTFOLIO-002): labels every demo honestly and links back to a quote.
 * Usage: <script src="/demo-ribbon.js" data-slug="slotly-booking" data-kind="Working demo" defer></script>
 * Inside the /portfolio live previews (iframes) it stays hidden so the preview shows the design itself. */
(() => {
  const me = document.currentScript;
  let framed = false;
  try { framed = window.self !== window.top; } catch { framed = true; }
  if (framed) { document.documentElement.classList.add("xs-embedded"); return; }
  const slug = (me && me.dataset.slug) || "";
  const kind = (me && me.dataset.kind) || "Concept demo";
  const css = ".xs-ribbon{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:12px;max-width:calc(100% - 24px);padding:8px 8px 8px 14px;border-radius:999px;background:#0b1220f2;color:#e8eef8;font:600 13px/1.3 ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;box-shadow:0 12px 30px #0006;backdrop-filter:blur(8px)}" +
    ".xs-ribbon b{color:#fff}.xs-ribbon span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xs-ribbon a{flex:none;color:#0b1220;background:#ffd166;border-radius:999px;padding:7px 12px;font-weight:800;text-decoration:none}.xs-ribbon a.alt{background:transparent;color:#cfe0ff;padding:7px 6px}" +
    ".xs-ribbon button{flex:none;all:unset;cursor:pointer;color:#9fb0c8;padding:0 6px;font-size:16px}@media(max-width:560px){.xs-ribbon .alt{display:none}.xs-ribbon{font-size:12px}}body{padding-bottom:72px}";
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  const bar = document.createElement("div");
  bar.className = "xs-ribbon";
  bar.setAttribute("role", "note");
  bar.innerHTML = '<span><b></b> by Xender Secrets</span><a class="alt" href="/portfolio">Portfolio</a><a data-cta="demo-ribbon-quote">Build something like this →</a><button type="button" aria-label="Hide demo notice">×</button>';
  bar.querySelector("b").textContent = kind;
  const quote = bar.querySelector("[data-cta]");
  quote.href = "/portfolio" + (slug ? "#p-" + slug : "#start");
  if (slug) quote.dataset.cta = "demo-ribbon-" + slug;
  bar.querySelector("button").addEventListener("click", () => { bar.remove(); document.body.style.paddingBottom = ""; });
  const mount = () => document.body.appendChild(bar);
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
