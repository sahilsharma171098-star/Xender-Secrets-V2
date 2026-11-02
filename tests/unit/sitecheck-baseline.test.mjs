import test from "node:test";
import assert from "node:assert/strict";
import {BASELINE_STORAGE_KEY,MAX_BASELINES,pageIdentity,snapshotOf,withSavedBaseline,findSavedBaseline,compareWithBaseline}
  from "../../extension/src/lib/baseline.js";

const stamp = new Date("2026-11-02T00:00:00Z");
const scored = (score, entries = []) => ({
  overall: score, issues: entries.map(([id,count=1]) => ({id,count,severity:"warning",detail:"Sensitive DOM text never saved",fix:"Example"}))
});

test("baseline is explicitly local and excludes query, fragments and audit evidence", () => {
  assert.equal(BASELINE_STORAGE_KEY,"sitecheckProBaselines");
  const report = {url:"https://example.test/contact?token=private#anchor",host:"example.test"};
  const b = snapshotOf(report,scored(52,[["seo-title-missing",3]]),stamp);
  assert.deepEqual(b, {
    v:1,url:"https://example.test/contact",score:52,
    issues:[{id:"seo-title-missing",count:3}],savedAt:"2026-11-02T00:00:00.000Z"
  });
  assert.equal(JSON.stringify(b).includes("Sensitive DOM"),false);
  assert.equal(JSON.stringify(b).includes("token=private"),false);
  assert.equal(JSON.stringify(b).includes("anchor"),false);
});

test("before/after comparison reports resolved, introduced and frequency changes", () => {
  const url={url:"https://example.test/"};
  const before=snapshotOf(url,scored(62,[["seo-title-missing",2],["a11y-form-labels",4],["tech-https",1]]),stamp);
  const after=snapshotOf(url,scored(85,[["seo-title-missing",1],["tech-https",2],["cro-trust",1]]),stamp);
  assert.deepEqual(compareWithBaseline(before,after),{
    before:62,after:85,delta:23,resolved:1,introduced:1,
    fewerOccurrences:1,moreOccurrences:1,
    checkedAt:"2026-11-02T00:00:00.000Z",baselineAt:"2026-11-02T00:00:00.000Z"
  });
});

test("a different page cannot silently reuse an unrelated baseline", () => {
  const b=snapshotOf({url:"https://example.test/a"},scored(60),stamp);
  const c=snapshotOf({url:"https://example.test/b"},scored(90),stamp);
  assert.throws(()=>compareWithBaseline(b,c),/exact page/);
  assert.equal(findSavedBaseline([b],c.url),null);
  assert.throws(()=>pageIdentity("file:///private/foo"),/regular public/);
  assert.throws(()=>pageIdentity("https://alice:secret@example.test/foo"),/regular public/);
});

test("saved baselines are deduplicated, bounded to 20, and remain local snapshots", () => {
  let rows=[];
  for(let i=0;i<MAX_BASELINES+5;i++){
    const snap=snapshotOf({url:"https://example.test/p"+i},scored(i%101),stamp);
    rows=withSavedBaseline(rows,snap);
  }
  assert.equal(rows.length,MAX_BASELINES);
  assert.equal(rows[0].url,"https://example.test/p24");
  assert.equal(rows.at(-1).url,"https://example.test/p5");
  rows=withSavedBaseline(rows,snapshotOf({url:"https://example.test/p19"},scored(77),stamp));
  assert.equal(rows.length,MAX_BASELINES);
  assert.equal(rows[0].score,77);
  assert.equal(rows.filter(x=>x.url==="https://example.test/p19").length,1);
});

test("invalid scores and issue counts fail closed", () => {
  assert.throws(()=>snapshotOf({url:"https://example.test"},scored(101),stamp),/score/);
  assert.throws(()=>snapshotOf({url:"https://example.test"},scored(50,[["seo-title-missing",-1]]),stamp),/count/);
  assert.equal(compareWithBaseline(
    snapshotOf({url:"https://example.test"},scored(null),stamp),
    snapshotOf({url:"https://example.test"},scored(90),stamp)).delta,null);
});
