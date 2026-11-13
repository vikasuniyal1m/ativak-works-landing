function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  // First-time setup: if the sheet is empty, add a header row.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Name', 'WhatsApp', 'Service', 'UTM Source', 'UTM Campaign']);
  }

  sheet.appendRow([
    new Date(),
    data.name || '',
    data.whatsapp || '',
    data.service || '',
    data.utm_source || '',
    data.utm_campaign || ''
  ]);

  return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}
