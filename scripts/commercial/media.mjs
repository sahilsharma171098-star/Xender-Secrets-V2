// XEND-HUD-001 — Xender's own videos, Shorts and Reels (business case studies in Hindi).
// Snapshot data in media.json (titles and dates as published; `updated` is the snapshot date).
// Cards link out to YouTube / Instagram. Only the /media page loads YouTube thumbnails (lazy,
// from i.ytimg.com, like /faceless-youtube-course); everything else is text, so no third-party
// requests on the other pages.
import fs from "node:fs";
import { esc } from "./layout.mjs";
import { SOCIAL } from "./hud.mjs";

export const MEDIA = JSON.parse(fs.readFileSync(new URL("./media.json", import.meta.url), "utf8"));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDate = (d, year = false) => { const [y, m, day] = d.split("-").map(Number); return `${day} ${MONTHS[m - 1]}${year ? " " + y : ""}`; };
export const MEDIA_ASOF = fmtDate(MEDIA.updated, true);
const isHindi = (t) => /[ऀ-ॿ]/.test(t);
const urlFor = (kind, m) => (kind === "r" ? `https://www.instagram.com/reel/${m.code}/` : kind === "s" ? `https://www.youtube.com/shorts/${m.id}` : `https://www.youtube.com/watch?v=${m.id}`);
const LABEL = { v: "YouTube video", s: "YouTube Short", r: "Instagram Reel" };
const lang = (t) => (isHindi(t) ? ' lang="hi"' : "");
export const MEDIA_COUNTS = `<b>${MEDIA.videos.length}</b> videos · <b>${MEDIA.shorts.length}</b> Shorts · <b>${MEDIA.reels.length}</b> Reels · as of ${MEDIA_ASOF}`;

/** Text-only reel cards for the homepage "In motion" chapter (no images, no prices in titles). */
export function mediaStrip(limit = 10) {
  const pick = [];
  const pools = [["v", MEDIA.videos], ["s", MEDIA.shorts], ["r", MEDIA.reels]];
  for (let i = 0; pick.length < limit && i < 40; i++) {
    const [kind, list] = pools[i % 3];
    const m = list[Math.floor(i / 3)];
    if (m && !/₹|US\$/.test(m.title) && !pick.some(([, x]) => x.title.split(" | ")[0] === m.title.split(" | ")[0])) pick.push([kind, m]);
  }
  return `<div class="strip" aria-label="Latest videos, Shorts and Reels"><div class="strip__track" data-drift>${pick.map(([kind, m]) => {
    const t = m.title.split(" | ")[0];
    const [src, ...rest] = LABEL[kind].split(" ");
    return `<a class="reel" href="${urlFor(kind, m)}" target="_blank" rel="noopener" data-cta="home-media-${kind}" aria-label="${esc(LABEL[kind] + ": " + t)}"><span class="k"><b>${src}</b> ${rest.join(" ")}</span><span class="tt"${lang(t)}>${esc(t)}</span><span class="ft"><span>${fmtDate(m.published)}${m.part ? " · Part " + m.part : ""}</span><span class="pl" aria-hidden="true"></span></span></a>`;
  }).join("")}</div></div>`;
}

const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
function card(kind, m) {
  const cover = kind === "r" ? (m.ytCover ? thumb(m.ytCover) : null) : thumb(m.id);
  return `<a class="mcard" href="${urlFor(kind, m)}" target="_blank" rel="noopener" data-cta="media-${kind}-${esc(m.id || m.code)}"><span class="th${cover ? "" : " nothumb"}">${cover ? `<img src="${cover}" alt="" width="480" height="360" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-fallback>` : ""}<span class="cover"${lang(m.title)}>${esc(m.title.split(" | ")[0])}</span><span class="pl" aria-hidden="true"></span></span><span class="meta"><span>${LABEL[kind]}${m.part ? " · Part " + m.part : ""}</span><span>${fmtDate(m.published)}</span></span><span class="tt"${lang(m.title)}>${esc(m.title)}</span></a>`;
}

/** The /media library: tabs for videos, Shorts and Reels (all cards are in the HTML; tabs only hide). */
export function mediaBody() {
  const tabs = [["v", "Videos", MEDIA.videos, "v"], ["s", "Shorts", MEDIA.shorts, "s"], ["r", "Reels", MEDIA.reels, "s"]];
  return `<section class="section" id="library" aria-labelledby="lib-h">
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">Library</p>
          <h2 id="lib-h">Every video, Short <span>and Reel.</span></h2>
          <p>Tap any card to watch it on YouTube or Instagram. Snapshot as of ${MEDIA_ASOF}; the channels always have the newest.</p>
        </div>
        <div class="tabs" role="tablist" aria-label="Media type">${tabs.map(([k, label, list], i) => `<button type="button" role="tab" id="tab-${k}" aria-controls="pan-${k}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ""}>${label} · ${list.length}</button>`).join("")}</div>
        ${tabs.map(([k, label, list, shape], i) => `<div role="tabpanel" id="pan-${k}" aria-labelledby="tab-${k}"${i ? " hidden" : ""}><div class="mgrid ${shape}">${list.map((m) => card(k, m)).join("")}</div></div>`).join("\n        ")}
        <p class="actions"><a class="btn primary" href="${SOCIAL.YT}" target="_blank" rel="noopener" data-cta="media-youtube">All videos on YouTube ↗</a><a class="btn ghost" href="${SOCIAL.IG}" target="_blank" rel="noopener" data-cta="media-instagram">All Reels on Instagram ↗</a></p>
      </div>
    </section>`;
}
