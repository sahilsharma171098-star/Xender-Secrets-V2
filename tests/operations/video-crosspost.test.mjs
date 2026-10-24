import test from 'node:test';import assert from 'node:assert/strict';
import {captionFor,crosspostPlan} from '../../operations/video-crosspost.mjs';
const channel_url='https://www.youtube.com/channel/UCsPuN94qsA9m_4sajdB56DQ';
const base={id:'z4dHrx9AllE',visibility:'public',title:'Original Hindi title',description:'Illustrative assumptions; original credits and AI disclosure.',seconds:34};
test('cross-post caption preserves source context and appends the required channel link',()=>{
 const c=captionFor({...base,channel_url});assert.ok(c.startsWith(base.title));assert.ok(c.includes(base.description));assert.ok(c.endsWith(channel_url));
 assert.throws(()=>captionFor({...base,channel_url:'https://example.com/'}),/channel URL/);
 assert.throws(()=>captionFor({...base,description:'x'.repeat(2200),channel_url}),/2200/);
});
test('only public sources with verified media are ready and publication is never inferred',()=>{
 const rows=crosspostPlan({account:'verified-account',channel_url,videos:[base,{...base,id:'j2Ebtdv4_9A',visibility:'unlisted'},{...base,id:'RspbSpy1rdw',seconds:1227},{...base,id:'eB6Lg0jwBec',asset:{url:'https://example.com/approved.mp4',sha256:'a'.repeat(64)}}]});
 assert.deepEqual(rows.map(r=>r.status),['needs_source_file','excluded_nonpublic','needs_reviewed_parts','ready_for_authorized_publisher']);assert.ok(rows.every(r=>r.provider_id===null));
});
test('existing source links require reconciliation and duplicate source IDs cannot be enqueued',()=>{
 const args={account:'verified-account',channel_url,videos:[base]};
 assert.equal(crosspostPlan({...args,existing:[{source_video_id:base.id,provider_id:'existing-post'}]})[0].status,'existing_link_needs_reconciliation');
 assert.throws(()=>crosspostPlan({...args,videos:[base,base]}),/duplicate/);
 assert.equal(crosspostPlan({...args,videos:[{...base,description:''}]})[0].status,'needs_caption_review');
});
