/**
 * TapReview log collector — Google Apps Script.
 *
 * Setup (≈2 minutes, free):
 * 1. Create a Google Sheet, then Extensions → Apps Script.
 * 2. Paste this file over the default Code.gs and save.
 * 3. Deploy → New deployment → type "Web app":
 *      Execute as: Me
 *      Who has access: Anyone
 * 4. Copy the web app URL (ends in /exec) into "analyticsUrl" in
 *    restaurants.json, commit and push.
 *
 * The app POSTs one JSON event per action (scan, rate, shuffle, length,
 * pick, copy, google_click, feedback_send); each becomes a row in the
 * sheet. logs.html GETs the same URL to render the dashboard.
 */

var SHEET_NAME = "logs";
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
  var limit = Math.min(Number((e.parameter || {}).limit) || 300, 2000);
  var sh = sheet_();
  var last = sh.getLastRow();
  var n = Math.min(limit, Math.max(0, last - 1));
  var events = [];
  if (n > 0) {
    var values = sh.getRange(last - n + 1, 1, n, COLUMNS.length).getValues();
    events = values.map(function (row) {
      var o = {};
      COLUMNS.forEach(function (c, i) {
        o[c] = (row[i] instanceof Date) ? row[i].toISOString() : row[i];
      });
      return o;
    }).reverse(); // newest first
  }
  return ContentService
    .createTextOutput(JSON.stringify({ events: events }))
    .setMimeType(ContentService.MimeType.JSON);
}
