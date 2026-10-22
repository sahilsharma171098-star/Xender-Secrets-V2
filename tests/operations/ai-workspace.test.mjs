import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registry, plan, prepare } from '../../scripts/ops/ai-workspace.mjs';

test('all requested jobs route to their intended tool without claiming execution', async () => {
  const config = await registry();
  for (const [kind, tool] of Object.entries({ research: 'gemini', code: 'antigravity', image: 'nano-banana', video: 'veo' })) {
    const job = plan(config, { kind, task: 'XEND-TEST-001', project: 'HQ', brief: 'Example brief' });
    assert.equal(job.tool, tool); assert.equal(job.executed, false); assert.equal(job.status, 'prepared');
  }
});
test('invalid task IDs cannot escape output directory', async () => {
  const config = await registry();
  for (const task of ['../../escape', 'XEND-../../escape', '', null]) {
    assert.throws(() => plan(config, {kind: 'image', task, project: 'HQ', brief: 'test'}));
  }
  assert.throws(() => plan(config, {kind:'__proto__',task:'XEND-TEST',project:'HQ',brief:'test'}));
});
test('prepared jobs use separate local folders and carry neutral result receipts', async () => {
  const base = await mkdtemp(join(tmpdir(), 'xender-ai-'));
  try {
    const config = await registry();
    const input = {kind:'video',task:'XEND-TEST-001',project:'AutoTube',brief:'Create a fictional bakery scene'};
    const a = await prepare(config, input, base), b = await prepare(config, input, base);
    assert.notEqual(a.directory, b.directory);
    const job = JSON.parse(await readFile(join(a.directory,'job.json'),'utf8'));
    assert.equal(job.published,false); assert.equal(job.receipt.output_location,null);
    assert.match(await readFile(join(a.directory,'prompt.md'),'utf8'),/no new paid spend/);
  } finally { await rm(base,{recursive:true,force:true}); }
});
