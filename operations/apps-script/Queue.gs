/* XEND-OS-003. Private bound Apps Script. No send/publish endpoints. */
var OS_HEADERS = ['task_id','lane','title','status','owner','resource_key','lease_token','lease_until','updated_at','artifact_url','blocker','next_action','version'];

function osBook_() {
  var id = PropertiesService.getScriptProperties().getProperty('OS_SHEET_ID');
  if (!id) throw new Error('OS_SHEET_ID missing');
  return SpreadsheetApp.openById(id);
}
function osRows_(name) {
  var sheet = osBook_().getSheetByName(name);
  if (!sheet) throw new Error('Missing tab: ' + name);
  var values = sheet.getDataRange().getValues();
  return {sheet:sheet, headers:values[0], rows:values.slice(1).map(function(row, i) {
    var obj = {_row:i+2}; values[0].forEach(function(key,j){obj[key]=row[j];}); return obj;
  })};
}
function osSafe_(value) {
  var text = String(value == null ? '' : value);
  return /^[=+@-]/.test(text) ? "'" + text : text;
}
function osWrite_(table, task) {
  table.sheet.getRange(task._row,1,1,table.headers.length).setValues([table.headers.map(function(h){return osSafe_(task[h]);})]);
}
function osAudit_(req, phase, before, after) {
  osBook_().getSheetByName('OS Audit').appendRow([
    Utilities.getUuid(),req.request_id,new Date().toISOString(),req.actor,req.action,req.task_id || '',phase,
    before || '',after || '',osSafe_(JSON.stringify({status:req.status || '', note:req.note || ''}))
  ]);
  SpreadsheetApp.flush();
}
function osMutation_(req) {
  if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(req.request_id || '')) throw new Error('Valid unique request_id required');
  var allAudit = osRows_('OS Audit').rows;
  var audit = allAudit.filter(function(r){return r.request_id === req.request_id;});
  if (audit.length) throw new Error('Request already recorded; inspect audit before retry');
  var pending = allAudit.some(function(r){
    return r.entity_id === req.task_id && r.phase === 'intent' && !allAudit.some(function(c){return c.request_id === r.request_id && c.phase === 'commit';});
  });
  if (pending) throw new Error('Unresolved audit intent; owner reconciliation required');
  var table = osRows_('OS Tasks');
  if (table.headers.join('|') !== OS_HEADERS.join('|')) throw new Error('Task schema mismatch');
  var task = table.rows.find(function(t){return t.task_id === req.task_id;});
  if (!task) throw new Error('Unknown task');
  if (task.lane === 'amazon') throw new Error('Amazon SOP not defined');
  var now = Date.now(), active = Date.parse(task.lease_until) > now;
  var next = Object.assign({}, task), before = Number(task.version) || 0;
  if (req.action === 'claim') {
    if (!(task.status === 'READY' || (task.status === 'IN_PROGRESS' && !active))) throw new Error('Task not claimable');
    if (active) throw new Error('Lease held');
    if (task.resource_key && table.rows.some(function(t){return t.task_id !== task.task_id && t.resource_key === task.resource_key && Date.parse(t.lease_until)>now;})) throw new Error('Resource locked');
    next.owner = req.actor; next.status = 'IN_PROGRESS'; next.lease_token = Utilities.getUuid();
    next.lease_until = new Date(now+30*60*1000).toISOString();
  } else {
    if (!active || task.owner !== req.actor || !req.lease_token || task.lease_token !== req.lease_token) throw new Error('Expired or foreign lease');
    if (Number(req.version) !== before) throw new Error('Stale version');
    if (req.action === 'heartbeat') next.lease_until = new Date(now+30*60*1000).toISOString();
    else if (req.action === 'handoff') {
      if (!['REVIEW','BLOCKED'].includes(req.status)) throw new Error('Handoff requires REVIEW or BLOCKED');
      if (!req.next_action || (req.status === 'BLOCKED' && !req.blocker)) throw new Error('Next action/blocker required');
      if (req.status === 'REVIEW' && !/^https:\/\//.test(req.artifact_url || '')) throw new Error('Review artifact required');
      next.status=req.status; next.artifact_url=req.artifact_url || ''; next.blocker=req.blocker || '';
      next.next_action=req.next_action; next.lease_token=''; next.lease_until='';
    } else throw new Error('Unsupported mutation');
  }
  next.version=before+1; next.updated_at=new Date(now).toISOString();
  osAudit_(req,'intent',before,next.version);
  osWrite_(table,next); SpreadsheetApp.flush();
  osAudit_(req,'commit',before,next.version);
  delete next._row; return next;
}
function osHandle_(req) {
  var props = PropertiesService.getScriptProperties();
  var actors = JSON.parse(props.getProperty('OS_ACTOR_TOKENS') || '{}');
  // Tokens are unique per actor and stored only in Script Properties/runner credentials.
  if (!req.actor || !actors[req.actor] || !req.token || actors[req.actor] !== req.token) throw new Error('Unauthorized');
  if (!['list','claim','heartbeat','handoff'].includes(req.action)) throw new Error('Unsupported action');
  var lock=LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Busy; retry later with same request only if no audit intent exists');
  try {
    if (req.action === 'list') return osRows_('OS Tasks').rows.map(function(t){delete t._row;return t;});
    return osMutation_(req);
  } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}
function doPost(e) {
  var result;
  try {
    if (!e || !e.postData || e.postData.contents.length>20000) throw new Error('Invalid body');
    result={ok:true,result:osHandle_(JSON.parse(e.postData.contents))};
  } catch (err) { result={ok:false,error:String(err.message || err)}; }
  // Apps Script ContentService responses are HTTP 200; callers MUST check ok.
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function onOpen() { SpreadsheetApp.getUi().createMenu('Xender OS').addItem('Review selected task','osReviewSelected').addToUi(); }
function osReviewSelected() {
  var props=PropertiesService.getScriptProperties(), email=Session.getActiveUser().getEmail();
  if (!email || email !== props.getProperty('OS_APPROVER_EMAIL')) throw new Error('Approver identity unavailable or unauthorized');
  var selected=SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (selected.getName() !== 'OS Tasks') throw new Error('Select a task row in OS Tasks');
  var row=selected.getActiveRange().getRow();
  if (row<2) throw new Error('Select a task, not the header');
  var ui=SpreadsheetApp.getUi(), answer=ui.alert('Mark task DONE?', 'Review linked artifact and checks first. This does not approve outreach or publishing.',ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return;
  var lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var table=osRows_('OS Tasks'), task=table.rows.find(function(t){return t._row===row;});
    if (!task || task.status !== 'REVIEW' || !task.artifact_url) throw new Error('Reviewed artifact required');
    var events=osRows_('OS Audit').rows;
    if(events.some(function(r){return r.entity_id===task.task_id && r.phase==='intent' && !events.some(function(c){return c.request_id===r.request_id && c.phase==='commit';});})) throw new Error('Reconcile audit intent first');
    var before=Number(task.version)||0, req={request_id:Utilities.getUuid(),actor:email,action:'human_review',task_id:task.task_id};
    osAudit_(req,'intent',before,before+1); task.status='DONE'; task.version=before+1; task.updated_at=new Date().toISOString();
    osWrite_(table,task); SpreadsheetApp.flush(); osAudit_(req,'commit',before,before+1);
  } finally {lock.releaseLock();}
}
