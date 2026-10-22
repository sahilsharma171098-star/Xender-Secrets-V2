// XEND-HQ-001 — AI failover handoff file (scripts/ops/handoff.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openTasks, keptNotes, renderHandoff } from '../../scripts/ops/handoff.mjs';

const TASKS = `# Board

## XEND-A-001 — Open thing
Status: REVIEW (branch \`x\`)

## XEND-B-002 — Finished thing
Status: DONE

## Task creation rule
Status: not a task

## CLAUDE-EXT-001 — Extension
Status: READY · Owner: Claude
`;

test('open tasks skip DONE and non-task headings', () => {
  assert.deepEqual(openTasks(TASKS), [
    { title: 'XEND-A-001 — Open thing', status: 'REVIEW (branch `x`)' },
    { title: 'CLAUDE-EXT-001 — Extension', status: 'READY · Owner: Claude' },
  ]);
  assert.deepEqual(openTasks(''), []);
});

test('agent notes survive a refresh; a new file gets the template', () => {
  assert.match(keptNotes(''), /Next step/);
  const old = '# Handoff\nstale generated part\n\n## Notes from the last agent\n- **Next step:** run the finder\n';
  const html = renderHandoff({ now: 'now', agent: 'codex', branch: 'claude/x', commits: ['abc1234 msg'], dirty: [' M src/a.mjs'], tasks: openTasks(TASKS), notes: keptNotes(old) });
  assert.match(html, /by \*\*codex\*\*/);
  assert.match(html, /Branch: `claude\/x`/);
  assert.match(html, /XEND-A-001 — Open thing — REVIEW/);
  assert.match(html, /run the finder/);
  assert.doesNotMatch(html, /stale generated part/);
  assert.match(renderHandoff({ now: 'n', agent: '', branch: 'b', commits: [], dirty: [], tasks: [], notes: keptNotes('') }), /working tree clean/);
});
