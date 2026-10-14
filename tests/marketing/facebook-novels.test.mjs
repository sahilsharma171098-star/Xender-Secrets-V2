import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = execFileSync(process.execPath,
  [path.join(root, "scripts/facebook-novel-campaign.mjs"), "--dry-run"],
  { encoding: "utf8", cwd: root });
const { posts } = JSON.parse(output);

test("queues all current catalog titles without duplicated IDs", () => {
  assert.equal(posts.length, 32);
  assert.equal(new Set(posts.map(p => p.id)).size, posts.length);
  assert(posts.every(p => p.nextReaderUrl.startsWith("https://www.xendersecrets.com/reader?")));
  assert(posts.every(p => p.length < 63200));
});
test("full chapters only from verified CC BY works", () => {
  assert.equal(posts.filter(p => p.category === "cc_by_chapter").length, 19);
  assert(posts.filter(p => p.category === "cc_by_chapter").every(p => p.id.startsWith("licensed:")));
  assert(posts.filter(p => p.id.startsWith("xh:")).every(p => p.category === "original_teaser"));
  assert(posts.filter(p => p.id.startsWith("gutenberg:")).every(p => p.category === "original_teaser"));
});
