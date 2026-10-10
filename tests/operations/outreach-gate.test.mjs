import test from 'node:test';
import assert from 'node:assert/strict';
import {checkOutreach} from '../../operations/outreach-gate.mjs';
const now=Date.parse('2026-10-09T10:00:00Z');
function input() {return {now,lead:{id:'synthetic',target:'test@example.invalid',suppression_key:'email:test@example.invalid',contact_status:'VERIFIED',permission_status:'OPTED_IN',permission_evidence:'synthetic evidence',preferred_channel:'Email'},touch:{target:'test@example.invalid',channel:'Email',content_hash:'sha256:example'},approval:{approval_id:'synthetic-approval',status:'APPROVED',approved_by:'human',evidence_url:'https://example.invalid/approval',action:'send',target:'test@example.invalid',channel:'Email',content_hash:'sha256:example',approved_at:'2026-10-09T09:00:00Z',expires_at:'2026-10-09T11:00:00Z'}};}
test('exact human-approved permitted contact passes preflight only',()=>assert.equal(checkOutreach(input()).ok,true));
test('suppression overrides valid approval',()=>{const i=input();i.suppression=[{lead_id:'synthetic'}];assert.equal(checkOutreach(i).ok,false);});
test('copy changes, wrong action, expiry and missing permission block',()=>{
  for (const mutate of [i=>i.touch.content_hash='changed',i=>i.approval.action='task',i=>i.approval.expires_at='2000-01-01',i=>i.lead.permission_status='HOLD',i=>i.lead.is_fixture=true]) {const i=input();mutate(i);assert.equal(checkOutreach(i).ok,false);}
});
test('ambiguous provider receipt, pending reply, contact cooldown and followup cap block',()=>{
  for (const mutate of [i=>i.touch.previous_result='unknown',i=>i.lead.reply_pending=true,i=>i.lead.last_sent_at='2026-10-09T09:00:00Z',i=>{i.touch.is_followup=true;i.lead.unanswered_followups=2;}]) {const i=input();mutate(i);assert.equal(checkOutreach(i).ok,false);}
});
test('WhatsApp requires opt-in and matching channel preference',()=>{const i=input();i.touch.channel=i.approval.channel=i.lead.preferred_channel='WhatsApp';i.lead.permission_status='REVIEWED_BASIS';assert.equal(checkOutreach(i).ok,false);});
test('approval for another contact cannot borrow this leads permission',()=>{const i=input();i.touch.target=i.approval.target='other@example.invalid';assert.equal(checkOutreach(i).ok,false);});

test('approved email cannot borrow an unrelated suppression key',()=>{
  const i=input();
  i.lead.suppression_key='email:other@example.invalid';
  i.suppression=[{contact_key:'email:test@example.invalid'}];
  assert.equal(checkOutreach(i).ok,false);
  assert.equal(checkOutreach(i).reason,'Suppression identity mismatch');
});
