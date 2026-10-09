import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

function fixture() {
  const headers=['task_id','lane','title','status','owner','resource_key','lease_token','lease_until','updated_at','artifact_url','blocker','next_action','version'];
  const data={ 'OS Tasks':[headers,['T1','sales','Draft','READY','','repo:x','','','','','','',1],['T2','sales','Draft','READY','','repo:x','','','','','','',1],['A1','amazon','Reserved','READY','','amazon:x','','','','','','',1]], 'OS Audit':[['event_id','request_id','occurred_at','actor','action','entity_id','phase','before_version','after_version','detail']] };
  const sheets=Object.fromEntries(Object.entries(data).map(([name,rows])=>[name,{
    getDataRange:()=>({getValues:()=>rows.map(r=>[...r])}),
    getRange:(row)=>({setValues:(values)=>{rows[row-1]=values[0];}}),
    appendRow:(row)=>rows.push(row)
  }]));
  let held=false;
  const context=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:(key)=>({OS_SHEET_ID:'test',OS_ACTOR_TOKENS:'{"codex":"key1","claude":"key2"}'}[key])})},SpreadsheetApp:{openById:()=>({getSheetByName:n=>sheets[n]}),flush:()=>{}},Utilities:{getUuid:()=>crypto.randomUUID()},LockService:{getScriptLock:()=>({tryLock:()=>{if(held)return false;held=true;return true;},releaseLock:()=>{held=false;}})}});
  vm.runInContext(fs.readFileSync(new URL('../../operations/apps-script/Queue.gs',import.meta.url),'utf8'),context);
  const call=(req)=>context.osHandle_({actor:'codex',token:'key1',request_id:crypto.randomUUID(),task_id:'T1',...req});
  return {call,data,context};
}
test('claims serialize resource access and fence foreign/stale updates',()=>{
  const {call}=fixture(); const first=call({action:'claim'});
  assert.throws(()=>call({action:'claim'}),/not claimable|Lease held/);
  assert.throws(()=>call({action:'claim',task_id:'T2'}),/Resource locked/);
  assert.throws(()=>call({action:'heartbeat',actor:'claude',token:'key2',lease_token:first.lease_token,version:first.version}),/foreign lease/);
  assert.throws(()=>call({action:'heartbeat',lease_token:first.lease_token,version:1}),/Stale version/);
  const next=call({action:'heartbeat',lease_token:first.lease_token,version:first.version});
  assert.equal(next.version,3);
});
test('expiry reclaim rotates token; old worker cannot handoff',()=>{
  const {call,data}=fixture(); const old=call({action:'claim'});
  data['OS Tasks'][1][7]='2000-01-01T00:00:00Z';
  const next=call({action:'claim',actor:'claude',token:'key2'});
  assert.notEqual(old.lease_token,next.lease_token);
  assert.throws(()=>call({action:'handoff',lease_token:old.lease_token,version:next.version,status:'REVIEW',artifact_url:'https://example.com',next_action:'review'}),/foreign lease/);
});
test('handoff requires evidence, releases resource, logs intent and commit',()=>{
  const {call,data}=fixture();const t=call({action:'claim'});
  assert.throws(()=>call({action:'handoff',lease_token:t.lease_token,version:t.version,status:'DONE'}),/REVIEW or BLOCKED/);
  assert.throws(()=>call({action:'handoff',lease_token:t.lease_token,version:t.version,status:'BLOCKED',next_action:'auth'}),/blocker required/);
  const next=call({action:'handoff',lease_token:t.lease_token,version:t.version,status:'REVIEW',artifact_url:'https://example.com',next_action:'Human review'});
  assert.equal(next.lease_token,''); assert.equal(next.status,'REVIEW');
  assert.equal(call({action:'claim',task_id:'T2'}).status,'IN_PROGRESS');
  assert.deepEqual(data['OS Audit'].slice(1).map(r=>r[6]),['intent','commit','intent','commit','intent','commit']);
});
test('authorization, unknown actions, reserved Amazon and duplicate requests fail closed',()=>{
  const {call}=fixture();
  assert.throws(()=>call({action:'list',token:'wrong'}),/Unauthorized/);
  assert.throws(()=>call({action:'send'}),/Unsupported/);
  assert.throws(()=>call({action:'claim',task_id:'A1'}),/not defined/);
  call({action:'claim',request_id:'request-0001'});
  assert.throws(()=>call({action:'claim',request_id:'request-0001'}),/already recorded/);
});
test('interrupted mutation leaves intent and blocks blind replay',()=>{
  const {call,data,context}=fixture();
  context.osWrite_=()=>{throw new Error('write unavailable');};
  assert.throws(()=>call({action:'claim',request_id:'request-fail1'}),/unavailable/);
  assert.equal(data['OS Audit'][1][6],'intent');
  assert.equal(data['OS Tasks'][1][3],'READY');
  assert.throws(()=>call({action:'claim',request_id:'request-fail1'}),/already recorded/);
  assert.throws(()=>call({action:'claim',request_id:'request-fail2'}),/Unresolved audit intent/);
});
test('sheet-bound text escapes formula injection',()=>{
  const {context}=fixture();
  assert.equal(context.osSafe_('=IMPORTXML("x")'),'\'=IMPORTXML("x")');
});
