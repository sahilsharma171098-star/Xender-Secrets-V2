/* Xender Builder shared helpers (XEND-BUILDER-001): theme toggle, API, toasts, sign-in dialog. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const root = document.documentElement;

  function syncTheme() {
    const dark = root.dataset.theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => { b.textContent = dark ? "☀" : "☾"; b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode"); });
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-theme-toggle]");
    if (!t) return;
    const dark = root.dataset.theme === "dark";
    if (dark) delete root.dataset.theme; else root.dataset.theme = "dark";
    try { localStorage.setItem("xs-theme", dark ? "light" : "dark"); } catch {}
    syncTheme();
  });

  async function api(path, opts = {}) {
    const init = { credentials: "same-origin", ...opts, headers: { ...(opts.body ? { "content-type": "application/json" } : {}), ...(opts.headers || {}) } };
    if (init.body && typeof init.body !== "string") init.body = JSON.stringify(init.body);
    const r = await fetch(path, init);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw Object.assign(new Error(j.error || "Something went wrong (" + r.status + ")."), { status: r.status, data: j });
    return j;
  }

  function toast(text, kind = "") {
    let box = $(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("aria-live", "polite"); document.body.append(box); }
    const t = document.createElement("div");
    t.className = "toast " + kind;
    t.textContent = text;
    box.append(t);
    setTimeout(() => t.remove(), 4200);
  }

  const track = (name, label = "") => { try { window.XS && window.XS.track(name, { label }); } catch {} };

  // ---- sign-in dialog (uses the site's existing email + password accounts) ----
  let dlg = null;
  function authDialog() {
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.id = "authDialog";
    dlg.innerHTML = `<div class="dlg">
      <button class="icon-btn dlg-x" type="button" data-close aria-label="Close">✕</button>
      <h2>Save your projects</h2>
      <p>A free Xender account keeps your sites across devices and raises your daily AI limit.</p>
      <div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-tab="login">Sign in</button><button type="button" role="tab" aria-selected="false" data-tab="register">Create account</button></div>
      <form data-form="login">
        <div class="field"><label for="au-email">Email</label><input id="au-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="au-pass">Password</label><input id="au-pass" name="password" type="password" autocomplete="current-password" minlength="8" required></div>
        <button class="btn primary" style="width:100%">Sign in</button>
      </form>
      <form data-form="register" hidden>
        <div class="field"><label for="au-name">Name</label><input id="au-name" name="name" autocomplete="name" minlength="2" required></div>
        <div class="field"><label for="au-remail">Email</label><input id="au-remail" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="au-rpass">Password (8+ characters)</label><input id="au-rpass" name="password" type="password" autocomplete="new-password" minlength="8" required></div>
        <button class="btn primary" style="width:100%">Create free account</button>
      </form>
      <p class="msg" data-msg role="status"></p>
      <p style="font-size:.82rem;color:var(--muted);margin:0">Google / other sign-in options: <a href="/account">account page</a>. Guest projects made on this device move into your account automatically.</p>
    </div>`;
    document.body.append(dlg);
    const msg = $("[data-msg]", dlg);
    dlg.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) dlg.close();
      const tab = e.target.closest("[data-tab]");
      if (tab) {
        dlg.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b === tab)));
        dlg.querySelectorAll("[data-form]").forEach((f) => { f.hidden = f.dataset.form !== tab.dataset.tab; });
        msg.textContent = "";
      }
    });
    dlg.querySelectorAll("form").forEach((form) => form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button");
      btn.disabled = true; msg.className = "msg"; msg.textContent = "";
      try {
        const data = Object.fromEntries(new FormData(form));
        const r = await api(form.dataset.form === "login" ? "/api/auth/login" : "/api/auth/register", { method: "POST", body: data });
        let claimed = 0;
        try { claimed = (await api("/api/builder/claim", { method: "POST", body: {} })).claimed || 0; } catch {}
        msg.className = "msg ok"; msg.textContent = "Signed in as " + r.user.name + (claimed ? " · " + claimed + " project(s) saved to your account" : "");
        track("cta_click", "builder-signin-" + form.dataset.form);
        setTimeout(() => { dlg.close(); window.dispatchEvent(new CustomEvent("xb-auth", { detail: r.user })); }, 600);
      } catch (err) { msg.className = "msg bad"; msg.textContent = err.message; }
      finally { btn.disabled = false; }
    }));
    return dlg;
  }
  const openAuth = (tab = "register") => { const d = authDialog(); d.querySelector(`[data-tab="${tab}"]`).click(); d.showModal(); };
  document.addEventListener("click", (e) => { const t = e.target.closest && e.target.closest("[data-open-auth]"); if (t) { e.preventDefault(); openAuth(t.dataset.openAuth || "register"); } });

  async function signOut() { try { await api("/api/auth/logout", { method: "POST", body: {} }); } catch {} location.reload(); }

  // Account chip in the top bar: [data-account] gets "Sign in" or the user's name.
  async function status() {
    const s = await api("/api/builder/status");
    document.querySelectorAll("[data-account]").forEach((el) => {
      el.replaceChildren();
      if (s.signedIn) {
        const b = document.createElement("button"); b.className = "btn sm ghost"; b.type = "button"; b.title = "Sign out";
        b.textContent = "👤 " + (s.user?.name || "Account"); b.onclick = () => { if (confirm("Sign out?")) signOut(); };
        el.append(b);
      } else {
        const b = document.createElement("button"); b.className = "btn sm"; b.type = "button"; b.dataset.openAuth = "login"; b.textContent = "Sign in";
        el.append(b);
      }
    });
    return s;
  }

  function reveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
  }

  const timeAgo = (iso) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    return new Date(iso).toLocaleDateString();
  };

  syncTheme();
  window.XB = { api, toast, track, openAuth, status, reveal, timeAgo, $ };
})();
