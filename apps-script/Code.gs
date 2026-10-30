/**
 * LoopLens anonymous event endpoint (Google Apps Script web app).
 *
 * LoopLens POSTs a JSON array of events as text/plain. Each event becomes one
 * row in the "events" sheet. Nothing identifying is sent or stored: the session
 * id is a random string made in the learner's browser, and Apps Script does
 * not give the script the caller's IP address.
 *
 * Duplicates can happen when a browser resends a queue after going offline;
 * remove them in analysis by (sid, seq).
 */
const SHEET_NAME = 'events';
const HEADER = ['received', 'sid', 'seq', 'time', 'type', 'problem', 'mode', 'slot', 'step', 'phase', 'answer', 'expected', 'correct', 'misconception', 'variant', 'ms', 'data'];

function sheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sh = book.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = book.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = e && e.postData ? e.postData.contents : '[]';
    let events = JSON.parse(body);
    if (!Array.isArray(events)) events = [events];
    const now = new Date();
    const rows = events.slice(0, 500).map(function (ev) {
      const d = ev.data || {};
      return [now, ev.sid, ev.seq, ev.t, ev.type, d.problem || '', d.mode || '', d.slot || '', d.step == null ? '' : d.step, d.phase || '', d.answer == null ? '' : String(d.answer), d.expected == null ? '' : String(d.expected), d.correct == null ? '' : d.correct, d.misconception || '', d.variant || '', d.ms == null ? '' : d.ms, JSON.stringify(d)];
    });
    if (rows.length) {
      const sh = sheet_();
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADER.length).setValues(rows);
    }
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('LoopLens logging endpoint is running.');
}
