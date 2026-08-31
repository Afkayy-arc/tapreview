/**
 * TapReview log collector — Google Apps Script.
 *
 * Setup (≈2 minutes, free):
 * 1. Create a Google Sheet, then Extensions → Apps Script.
 * 2. Paste this file over the default Code.gs, change MASTER_KEY below, save.
 * 3. Deploy → New deployment → type "Web app":
 *      Execute as: Me
 *      Who has access: Anyone
 * 4. Copy the web app URL (ends in /exec) into "analyticsUrl" in
 *    restaurants.json, commit and push.
 *
 * Writing (open): the app POSTs one JSON event per visitor action
 * (scan, rate, shuffle, length, pick, copy, google_click, feedback_send);
 * each becomes a row in the "logs" sheet.
 *
 * Reading (key-protected):
 *   GET ?key=<MASTER_KEY>&limit=500                  → all events (logs.html)
 *   GET ?business=<id>&key=<their-key>&limit=500     → that business only (admin.html)
 *
 * Per-business keys live in the "keys" sheet (created automatically):
 * one row per business — column A: business id, column B: its access key.
 * Give each client their admin link:
 *   https://<your-host>/admin.html?business=<id>&key=<their-key>
 */

var MASTER_KEY = "CHANGE-ME-master-key";   // <-- change this before deploying
var SHEET_NAME = "logs";
var KEYS_SHEET = "keys";
var COLUMNS = ["time", "event", "business", "category", "rating", "lang", "len", "text"];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(COLUMNS);
  }
  return sh;
}

function keysSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(KEYS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(KEYS_SHEET);
    sh.appendRow(["business", "key"]);
  }
  return sh;
}

function keyMatches_(business, key) {
  if (!business || !key) return false;
  var rows = keysSheet_().getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === business && String(rows[i][1]) === key && key !== "") return true;
  }
  return false;
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    sheet_().appendRow([
      new Date(d.t || Date.now()),
      d.event || "",
      d.business || "",
      d.category || "",
      d.rating || "",
      d.lang || "",
      d.len || "",
      (d.text || "").slice(0, 500)
    ]);
  } catch (err) { /* malformed event — ignore */ }
  return ContentService.createTextOutput("ok");
}

function doGet(e) {
  var p = e.parameter || {};
  var business = String(p.business || "");
  var key = String(p.key || "");
  var isMaster = key !== "" && key === MASTER_KEY;

  if (!isMaster && !keyMatches_(business, key)) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var limit = Math.min(Number(p.limit) || 300, 2000);
  var sh = sheet_();
  var last = sh.getLastRow();
  var events = [];
  if (last > 1) {
    // Read enough rows to satisfy the limit after filtering.
    var readN = Math.min(last - 1, business ? Math.max(limit * 5, 1000) : limit);
    var values = sh.getRange(last - readN + 1, 1, readN, COLUMNS.length).getValues();
    for (var i = values.length - 1; i >= 0 && events.length < limit; i--) {
      var row = values[i];
      if (business && String(row[2]) !== business) continue;
      var o = {};
      COLUMNS.forEach(function (c, j) {
        o[c] = (row[j] instanceof Date) ? row[j].toISOString() : row[j];
      });
      events.push(o); // newest first
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ events: events }))
    .setMimeType(ContentService.MimeType.JSON);
}
