// Writes posts.json (id, date, caption, image URLs) for Metricool/Windsor scheduling.
import { writeFileSync } from "node:fs";
import { POSTS } from "./slides.mjs";
const base = process.argv[2] || "https://raw.githubusercontent.com/sahilsharma171098-star/Xender-Secrets-V2/main/marketing/instagram/2026-10-week1/img/";
const rows = POSTS.map((p) => ({ id: p.id, date: p.date, caption: p.caption, images: p.slides.map((_, i) => `${base}${p.id}-${i + 1}.jpg`) }));
writeFileSync(new URL("./posts.json", import.meta.url), JSON.stringify(rows, null, 2) + "\n");
console.log(rows.map((r) => `${r.date} ${r.id} ${r.images.length} img, ${r.caption.length} chars`).join("\n"));
