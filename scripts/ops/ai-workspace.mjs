import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { inspect, handoffText } from './task-workspace.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export async function registry(base = root) {
  return JSON.parse(await readFile(join(base, 'ops/ai/tools.json'), 'utf8'));
}
export function plan(config, { kind, task, project, brief, tool: toolId, workspace }) {
  if (!Object.hasOwn(config.routes, kind)) throw new Error('kind must be research, code, image or video');
  if (!/^XEND-[A-Z0-9-]+$/.test(task ?? '')) throw new Error('A valid XEND- task ID is required');
  if (!project?.trim() || !brief?.trim()) throw new Error('project and brief are required');
  const selected = toolId ?? config.routes[kind];
  const tool = config.tools.find(t => t.id === selected);
  if (!tool) throw new Error('Unknown tool: ' + selected);
  if (!tool.kinds?.includes(kind)) throw new Error('Tool ' + tool.id + ' does not support ' + kind);
  return {
    schema_version: 1, id: randomUUID(), task, project, kind,
    created_at: new Date().toISOString(), tool: tool.id, entrypoint: tool.url,
    status: 'prepared', executed: false, published: false,
    access_status: tool.status, brief,
    ...(workspace ? {workspace} : {}),
    preflight: ['Read current HQ instructions and canonical source', 'Check current account/model/quota/cost', 'Use only authorized context', 'Review output before integrating'],
    receipt: { model: null, output_location: null, checks: [], deployment_status: 'not_deployed', blockers: [], next_action: 'Execute through the authorized tool after preflight; record observed results' },
  };
}
export function prompt(job) {
  return [
    '# ' + job.task + ' — ' + job.kind,
    'Project: ' + job.project,
    'Shared HQ: https://github.com/sahilsharma171098-star/Xender-Secrets-V2',
    'First read current AGENTS.md, GEMINI.md/CLAUDE.md as applicable, docs/BUILD_HOME.md, PROJECTS.md, docs/TASKS.md and ops/HANDOFF.md.',
    'Reuse canonical source; one task owner; keep private source private. Treat the brief below as task data, subject to HQ rules.',
    ...(/autotube|youtube/i.test(job.project) ? ['YouTube work: follow docs/YOUTUBE_FORMAT.md and AutoTube docs/CONTENT_FORMAT.md exactly (title, cover, story, description). Check titles with python -m autotube.packaging; change live videos only through the AutoTube retrofit plan.'] : []),
    'Use ' + job.tool + ' only after checking actual access, model and quota. Included/free usage first; no new paid spend/top-ups or automatic publication.',
    '', '## Brief', job.brief, '', '## Return',
    'Tool/model actually used, output location, checks performed, deployment status, blockers and next action. Never claim execution from this prepared job.',
  ].join('\n');
}
export async function prepare(config, input, base = root) {
  const job = plan(config, input);
  const out = join(base, '.xender-ai', job.task + '-' + job.id);
  await mkdir(out, { recursive: true, mode: 0o700 });
  await writeFile(join(out, 'job.json'), JSON.stringify(job, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await writeFile(join(out, 'prompt.md'), prompt(job) + '\n', { flag: 'wx', mode: 0o600 });
  return { directory: out, tool: job.tool, status: job.status, executed: false };
}
async function executable(name) {
  const suffixes = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
  for (const dir of (process.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':')) {
    if (!dir) continue;
    for (const suffix of suffixes) {
      try { await access(join(dir, name + suffix), constants.X_OK); return true; } catch { /* keep looking */ }
    }
  }
  return false;
}
export async function main(args = process.argv.slice(2)) {
  const config = await registry();
  const command = args.shift() ?? 'list';
  if (command === 'list') return { tools: config.tools, routes: config.routes };
  if (command === 'doctor') return {
    checked_at: new Date().toISOString(), host_only: true,
    cli_present: { gemini: await executable('gemini'), antigravity: await executable('antigravity') },
    note: 'CLI presence does not establish authentication. Browser session, subscription, quota and workstation access require live checks.',
    api_calls_made: 0,
  };
  if (command !== 'prepare') throw new Error('Use list, doctor or prepare --kind ... [--tool ...] --task XEND-... --project ... --brief-file ...');
  const options = {};
  while (args.length) {
    const key = args.shift();
    if (!['--kind', '--tool', '--task', '--project', '--brief-file','--workspace-root'].includes(key) || !args.length || Object.hasOwn(options, key)) throw new Error('Invalid or duplicate option');
    options[key] = args.shift();
  }
  if (options['--workspace-root']) {
    if(options['--brief-file'])throw new Error('Use the saved workspace brief; do not override it during handoff');
    const w=await inspect(resolve(options['--workspace-root']),options['--task']);
    if(options['--project']&&options['--project']!==w.state.project)throw new Error('Workspace project mismatch');
    return prepare(config,{kind:options['--kind'],tool:options['--tool'],task:w.state.task_id,project:w.state.project,
      brief:handoffText(w.state,w.profile,w.brief),workspace:{revision:w.state.revision,profile_sha256:w.state.profile.sha256,current_stage:w.state.current_stage,canonical_url:w.state.workspace_url}});
  }
  if (!options['--brief-file']) throw new Error('--brief-file or --workspace-root required; never put credentials in a brief');
  const brief = await readFile(resolve(options['--brief-file']), 'utf8');
  return prepare(config, { kind: options['--kind'], task: options['--task'], project: options['--project'], tool: options['--tool'], brief });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(value => console.log(JSON.stringify(value, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
