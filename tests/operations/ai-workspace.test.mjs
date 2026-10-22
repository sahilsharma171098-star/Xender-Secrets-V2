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

test('explicit NVIDIA and Grok routes retain pending access without executing', async () => {
  const config = await registry();
  for (const tool of ['nvidia', 'grok']) {
    for (const kind of ['research', 'code']) {
      const job = plan(config, {kind, tool, task:'XEND-TEST-002', project:'HQ', brief:'Review a design'});
      assert.equal(job.tool, tool);
      assert.equal(job.access_status, 'registered_connection_pending');
      assert.equal(job.executed, false);
    }
    assert.throws(() => plan(config, {kind:'video',tool,task:'XEND-TEST-002',project:'HQ',brief:'test'}), /does not support/);
  }
  assert.throws(() => plan(config, {kind:'research',tool:'unregistered',task:'XEND-TEST-002',project:'HQ',brief:'test'}), /Unknown tool/);
});
test('selected provider survives prompt and receipt preparation', async () => {
  const base = await mkdtemp(join(tmpdir(), 'xender-grok-'));
  try {
    const result = await prepare(await registry(), {kind:'research',tool:'grok',task:'XEND-TEST-003',project:'HQ',brief:'Draft a review'}, base);
    const job = JSON.parse(await readFile(join(result.directory,'job.json'),'utf8'));
    assert.equal(job.tool, 'grok');
    assert.match(await readFile(join(result.directory,'prompt.md'),'utf8'), /Use grok only/);
    assert.equal(job.receipt.model, null);
  } finally { await rm(base,{recursive:true,force:true}); }
});
