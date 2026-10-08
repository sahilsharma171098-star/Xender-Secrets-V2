/* Xender Builder project dashboard (XEND-BUILDER-001): open, rename, duplicate, export, delete. */
(() => {
  const { api, toast, status, track, timeAgo, $ } = window.XB;
  const grid = $("#grid"), empty = $("#empty");
  const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const node = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const btn = (label, fn, cls = "btn sm") => { const b = node("button", cls, label); b.type = "button"; b.onclick = fn; return b; };

  async function load() {
    const [s, r] = await Promise.all([status().catch(() => null), api("/api/builder/projects")]);
    if (s) {
      $("#quota").textContent = `${s.quota.remaining}/${s.quota.limit} AI generations left today`;
      $("#guestNote").hidden = s.signedIn;
      $("#who").textContent = s.signedIn ? `Saved to your account (${r.projects.length}/${s.limits.userProjects}).` : `Saved on this browser (${r.projects.length}/${s.limits.guestProjects}).`;
    }
    grid.replaceChildren();
    empty.hidden = r.projects.length > 0;
    for (const p of r.projects) {
      const card = node("article", "card proj-card");
      const thumb = node("a", "thumb");
      thumb.href = "/builder/studio?project=" + p.id;
      thumb.setAttribute("aria-label", "Open " + p.name);
      const h = hue(p.id);
      thumb.style.background = `linear-gradient(135deg,hsl(${h} 70% 55%),hsl(${(h + 60) % 360} 70% 45%))`;
      const initials = node("span", "", p.name.split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase());
      initials.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;font-size:2.4rem;font-weight:850;color:rgba(255,255,255,.92);letter-spacing:.05em";
      thumb.append(initials);
      const body = node("div", "body");
      const title = node("h3"); const link = node("a", "", p.name); link.href = thumb.href; link.style.color = "inherit"; title.append(link);
      body.append(title, node("p", "", `v${p.version} · ${p.files.length} file${p.files.length === 1 ? "" : "s"} · ${(p.bytes / 1024).toFixed(1)} KB · edited ${timeAgo(p.updated_at)}`));
      body.lastChild.style.cssText = "margin:0;font-size:.85rem;color:var(--muted)";
      const acts = node("div", "acts");
      const open = node("a", "btn sm primary", "Open"); open.href = thumb.href;
      const exp = node("a", "btn sm", "⤓ ZIP"); exp.href = `/api/builder/projects/${p.id}/export`; exp.dataset.cta = "builder-export-dashboard";
      acts.append(open, exp,
        btn("Rename", async () => {
          const name = prompt("New name", p.name); if (!name) return;
          try { await api("/api/builder/projects/" + p.id, { method: "PATCH", body: { name } }); load(); } catch (e) { toast(e.message, "bad"); }
        }),
        btn("Duplicate", async () => {
          try { await api(`/api/builder/projects/${p.id}/duplicate`, { method: "POST", body: {} }); toast("Duplicated"); track("cta_click", "builder-duplicate"); load(); } catch (e) { toast(e.message, "bad"); }
        }),
        btn("Delete", async () => {
          if (!confirm(`Delete “${p.name}” and all its versions? This can't be undone.`)) return;
          try { await api("/api/builder/projects/" + p.id, { method: "DELETE" }); toast("Deleted"); load(); } catch (e) { toast(e.message, "bad"); }
        }, "btn sm ghost"));
      card.append(thumb, body, acts);
      grid.append(card);
    }
  }
  addEventListener("xb-auth", load);
  load().catch((e) => toast(e.message, "bad"));
})();
