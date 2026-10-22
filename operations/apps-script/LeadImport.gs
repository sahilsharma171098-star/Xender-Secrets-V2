/* XEND-HQ-01. Pull website leads from the Worker into the Command Center ("Website Leads" tab).
 *
 * One-way: this script only reads the Worker's export feed and writes the Sheet. It never writes
 * back to the Worker except an audit-only ack, and it has no send/publish code.
 *
 * Script Properties (Project Settings → Script properties; never in the repo):
 *   OS_SHEET_ID              Command Center spreadsheet id (same as Queue.gs)
 *   XENDER_EXPORT_TOKEN      the Worker's EXPORT_TOKEN secret (read-only feed access)
 *   XENDER_EXPORT_BASE       optional, default https://www.xendersecrets.com
 *   LEAD_EXPORT_CURSOR       managed by this script; delete it to re-import everything
 *
 * Safety: rows are upserted by lead_id only when the feed entry is newer, and the cursor
 * moves only after the rows are written, so a crash or retry never duplicates or loses a lead.
 */
var WL_TAB = 'Website Leads';
var WL_HEADERS = ['lead_id','version','created_at','name','phone','email','business','website','offer','budget','timeline',
  'message','contact_pref','source','medium','campaign','landing_page','page','cta','stage','quote_value','collected_value',
  'next_action','next_action_at','export_seq','imported_at'];
var WL_SEQ_COL = WL_HEADERS.indexOf('export_seq') + 1;
var WL_CONSUMER = 'command-center';
var WL_PAGE = 100;
var WL_MAX_PAGES = 5;

function wlSafe_(value) {
  var text = String(value == null ? '' : value);
  return /^[=+@\-\t\r]/.test(text) ? "'" + text : text;
}
function wlProps_() { return PropertiesService.getScriptProperties(); }
function wlBase_() { return (wlProps_().getProperty('XENDER_EXPORT_BASE') || 'https://www.xendersecrets.com').replace(/\/+$/, ''); }

/** GET/POST with up to 3 attempts on network errors, 429 and 5xx. 4xx (bad token etc.) fails at once. */
function wlFetch_(path, options) {
  var token = wlProps_().getProperty('XENDER_EXPORT_TOKEN');
  if (!token) throw new Error('XENDER_EXPORT_TOKEN missing in Script Properties');
  var opts = Object.assign({muteHttpExceptions: true, headers: {Authorization: 'Bearer ' + token}}, options || {});
  var lastError = '';
  for (var attempt = 0; attempt < 3; attempt++) {
    if (attempt) Utilities.sleep(1000 * Math.pow(2, attempt - 1));
    var res;
    try { res = UrlFetchApp.fetch(wlBase_() + path, opts); }
    catch (e) { lastError = 'network: ' + e; continue; }
    var code = res.getResponseCode();
    if (code === 429 || code >= 500) { lastError = 'HTTP ' + code; continue; }
    if (code !== 200) throw new Error('Export feed refused the request: HTTP ' + code);
    return JSON.parse(res.getContentText());
  }
  throw new Error('Export feed unavailable after 3 attempts (' + lastError + ')');
}

function wlSheet_() {
  var id = wlProps_().getProperty('OS_SHEET_ID');
  if (!id) throw new Error('OS_SHEET_ID missing');
  var book = SpreadsheetApp.openById(id);
  var sheet = book.getSheetByName(WL_TAB) || book.insertSheet(WL_TAB);
  var values = sheet.getDataRange().getValues();
  if (!values.length || !values[0][0]) {
    sheet.getRange(1, 1, 1, WL_HEADERS.length).setValues([WL_HEADERS]);
    values = [WL_HEADERS];
  }
  if (values[0].slice(0, WL_HEADERS.length).join('|') !== WL_HEADERS.join('|')) throw new Error('Website Leads header mismatch; fix the tab before importing');
  return {book: book, sheet: sheet, values: values};
}

function wlAudit_(book, requestId, detail) {
  var audit = book.getSheetByName('OS Audit');
  if (!audit) return;
  audit.appendRow([Utilities.getUuid(), requestId, new Date().toISOString(), 'lead-import', 'lead_import', '', 'commit', '', '', wlSafe_(JSON.stringify(detail))]);
}

/** Time-driven entry point (every 15 minutes). Safe to run by hand at any time. */
function importWebsiteLeads() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return {ok: false, reason: 'busy'};
  try {
    var props = wlProps_();
    var cursor = Number(props.getProperty('LEAD_EXPORT_CURSOR') || 0);
    var t = wlSheet_();
    var index = {};
    for (var r = 1; r < t.values.length; r++) index[String(t.values[r][0]).replace(/^'/, '')] = r + 1;
    var nextRow = t.values.length + 1;
    var written = 0, skipped = 0, pages = 0;
    for (; pages < WL_MAX_PAGES; pages++) {
      var page = wlFetch_('/api/admin/export/leads?consumer=' + WL_CONSUMER + '&limit=' + WL_PAGE + '&after=' + cursor);
      if (!page || page.ok !== true || !Array.isArray(page.items)) throw new Error('Unexpected export response');
      page.items.forEach(function (item) {
        var row = index[item.lead_id];
        if (row) {
          // A later queue entry for the same lead always carries a newer version, so the numeric
          // export_seq is the safe comparison (Sheets can turn ISO strings into dates).
          var stored = Number(t.sheet.getRange(row, WL_SEQ_COL).getValues()[0][0]);
          if (stored && stored >= item.seq) { skipped++; return; }
        }
        var l = item.lead || {};
        var values = WL_HEADERS.map(function (h) {
          if (h === 'lead_id') return item.lead_id;
          if (h === 'version') return item.version;
          if (h === 'export_seq') return item.seq;
          if (h === 'imported_at') return new Date().toISOString();
          return l[h];
        }).map(wlSafe_);
        if (!row) { row = nextRow++; index[item.lead_id] = row; }
        var range = t.sheet.getRange(row, 1, 1, WL_HEADERS.length);
        range.setNumberFormat('@'); // keep phones, ids and timestamps as plain text
        range.setValues([values]);
        written++;
      });
      SpreadsheetApp.flush();
      // Only now is it safe to move past this page.
      if (page.next_after > cursor) {
        wlAudit_(t.book, 'lead-export:' + cursor + '-' + page.next_after, {items: page.items.length, head: page.head_seq});
        cursor = page.next_after;
        props.setProperty('LEAD_EXPORT_CURSOR', String(cursor));
      }
      if (!page.has_more) break;
    }
    try {
      wlFetch_('/api/admin/export/ack', {method: 'post', contentType: 'application/json', payload: JSON.stringify({consumer: WL_CONSUMER, through_seq: cursor})});
    } catch (e) { /* ack is audit-only; the next run acks again */ }
    return {ok: true, cursor: cursor, written: written, skipped: skipped, pages: pages + 1};
  } finally {
    lock.releaseLock();
  }
}

/** Run once by hand after the OAuth consent: installs the 15-minute trigger, without duplicates. */
function installLeadImportTrigger() {
  var exists = ScriptApp.getProjectTriggers().some(function (tr) { return tr.getHandlerFunction() === 'importWebsiteLeads'; });
  if (!exists) ScriptApp.newTrigger('importWebsiteLeads').timeBased().everyMinutes(15).create();
  return {ok: true, installed: !exists};
}
