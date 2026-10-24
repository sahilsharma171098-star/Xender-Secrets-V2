import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {init,inspect,mutate,digest,main} from '../../scripts/ops/task-workspace.mjs';
import {main as prepareMain} from '../../scripts/ops/ai-workspace.mjs';
const profile={schema_version:1,id:'test-video',version:1,stages:['research','script','review'],format:{language:'hi',width:1080,height:1920,fps:30}};
test('private content cannot be initialized inside public source directories',async()=>{
 await assert.rejects(init(fileURLToPath(new URL('../../ops/ai/profiles/',import.meta.url)),{task:'XEND-PRIVATE-001',project:'Test',owner:'chatgpt',profile,brief:'Private content'}),/outside public source/);
});
async function fixture(t) {const base=await mkdtemp(join(tmpdir(),'xender-task-'));t.after(()=>rm(base,{recursive:true,force:true}));await init(base,{task:'XEND-TEST-001',project:'Test',owner:'chatgpt',profile,brief:'Fictional bakery workflow test'});const file=join(base,'research.md');await writeFile(file,'Synthetic test; not business evidence');return {base,file};}
test('limit handoff resumes exactly the saved stage, artifact and pinned format under the next owner',async t=>{
 const {base,file}=await fixture(t);
 const a=await mutate(base,'XEND-TEST-001',{action:'checkpoint',owner:'chatgpt',expected_revision:0,stage:'research',artifact_file:file,complete:true,next_action:'Write the script using the saved research'});
 const b=await mutate(base,'XEND-TEST-001',{action:'handoff',owner:'chatgpt',expected_revision:1,to:'claude',reason:'limit',next_action:'Write the script using the saved research'});
 assert.equal(b.state.status,'paused_limit');
 const c=await mutate(base,'XEND-TEST-001',{action:'resume',owner:'claude',expected_revision:2});
 assert.equal(c.state.owner,'claude');assert.equal(c.state.current_stage,'script');assert.deepEqual(c.state.artifacts,a.state.artifacts);assert.equal(c.state.profile.sha256,digest(profile));
 assert.match(await readFile(join(c.directory,'HANDOFF.md'),'utf8'),/Write the script using the saved research/);
 assert.equal(c.state.publication.status,'not_published');
});
test('stale/foreign workers, skipped stages and evidence-free completion fail closed',async t=>{
 const {base}=await fixture(t);
 for(const override of [{owner:'claude'},{expected_revision:2},{stage:'script'},{complete:true}]) await assert.rejects(mutate(base,'XEND-TEST-001',{action:'checkpoint',owner:'chatgpt',expected_revision:0,stage:'research',next_action:'Continue',...override}));
 assert.equal((await inspect(base,'XEND-TEST-001')).state.revision,0);
});
test('tampering with the locked profile or checkpoint history is detected before resume',async t=>{
 const {base}=await fixture(t),dir=join(base,'XEND-TEST-001');
 await writeFile(join(dir,'profile.json'),JSON.stringify({...profile,format:{...profile.format,width:1920}}));
 await assert.rejects(inspect(base,'XEND-TEST-001'),/Profile\/state mismatch/);
 await writeFile(join(dir,'profile.json'),JSON.stringify(profile));
 const state=JSON.parse(await readFile(join(dir,'task.json'),'utf8'));state.next_action='silently changed';await writeFile(join(dir,'task.json'),JSON.stringify(state));
 await assert.rejects(inspect(base,'XEND-TEST-001'),/history mismatch/);
});
test('changed artifacts and unsafe task/artifact paths cannot silently pass a checkpoint',async t=>{
 const {base,file}=await fixture(t);
 await assert.rejects(init(base,{task:'XEND-../../escape',owner:'chatgpt',project:'Test',profile,brief:'test'}),/task ID/);
 await assert.rejects(mutate(base,'XEND-TEST-001',{action:'checkpoint',owner:'chatgpt',expected_revision:0,stage:'research',artifact_file:file,artifact_name:'../escape',next_action:'Continue'}),/filename/);
 const a=await mutate(base,'XEND-TEST-001',{action:'checkpoint',owner:'chatgpt',expected_revision:0,stage:'research',artifact_file:file,complete:true,next_action:'Script'});
 await writeFile(join(a.directory,a.state.artifacts[0].path),'different bytes');
 await assert.rejects(inspect(base,'XEND-TEST-001'),/Artifact changed/);
});
test('competing writers cannot both commit the same revision; task creation never overwrites',async t=>{
 const {base}=await fixture(t),args={action:'checkpoint',owner:'chatgpt',expected_revision:0,stage:'research',next_action:'Continue'};
 const results=await Promise.allSettled([mutate(base,'XEND-TEST-001',args),mutate(base,'XEND-TEST-001',args)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await inspect(base,'XEND-TEST-001')).state.revision,1);
 await assert.rejects(init(base,{task:'XEND-TEST-001',owner:'chatgpt',project:'Test',profile,brief:'overwrite'}),{code:'EEXIST'});
});
test('wrong handoff recipient, unsupported publication and invalid CLI revisions are rejected',async t=>{
 const {base}=await fixture(t);
 await mutate(base,'XEND-TEST-001',{action:'handoff',owner:'chatgpt',expected_revision:0,to:'claude',reason:'limit',next_action:'Research'});
 await assert.rejects(mutate(base,'XEND-TEST-001',{action:'resume',owner:'gemini',expected_revision:1}),/No handoff/);
 await assert.rejects(main(['resume','--root',base,'--task','XEND-TEST-001','--owner','claude','--expected-revision','no']),/revision/);
 await assert.rejects(main(['publish','--root',base,'--task','XEND-TEST-001']),/Use init/);
 assert.equal((await inspect(base,'XEND-TEST-001')).state.publication.status,'not_published');
});
test('symlink task/artifact directories are rejected', {skip:process.platform==='win32'},async t=>{
 const {base}=await fixture(t);const outside=await mkdtemp(join(tmpdir(),'xender-outside-'));t.after(()=>rm(outside,{recursive:true,force:true}));
 await symlink(outside,join(base,'XEND-LINK-001'));
 await assert.rejects(inspect(base,'XEND-LINK-001'),/Non-symlink/);
});
test('a provider handoff brief retains the saved format/revision and rejects project or brief replacement',async t=>{
 const {base}=await fixture(t);
 const result=await prepareMain(['prepare','--workspace-root',base,'--task','XEND-TEST-001','--kind','research','--tool','grok']);
 t.after(()=>rm(result.directory,{recursive:true,force:true}));
 const job=JSON.parse(await readFile(join(result.directory,'job.json'),'utf8'));
 assert.equal(job.workspace.profile_sha256,digest(profile));assert.equal(job.workspace.revision,0);assert.equal(job.executed,false);
 assert.match(await readFile(join(result.directory,'prompt.md'),'utf8'),/Locked format/);
 await assert.rejects(prepareMain(['prepare','--workspace-root',base,'--task','XEND-TEST-001','--kind','code','--project','other']),/project mismatch/);
 await assert.rejects(prepareMain(['prepare','--workspace-root',base,'--task','XEND-TEST-001','--kind','code','--brief-file','other']),/do not override/);
});
