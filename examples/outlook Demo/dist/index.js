import { listEmails } from './codeapp.js';

let eLoading = document.getElementById('loading');
let eTable = document.getElementById('emailTable');
let eBody = document.getElementById('emailBody');
let eError = document.getElementById('error');

function parseJsonIfNeeded(oValue) {
  if (typeof oValue !== 'string') return oValue;

  try {
    return JSON.parse(oValue);
  } catch {
    return oValue;
  }
}

function isPlainObject(oValue) {
  return oValue != null && typeof oValue === 'object' && Array.isArray(oValue) === false;
}

function looksLikeEmailRecord(oValue) {
  if (!isPlainObject(oValue)) return false;

  return Boolean(
    oValue.Subject ||
    oValue.subject ||
    oValue.From ||
    oValue.from ||
    oValue.DateTimeReceived ||
    oValue.receivedDateTime ||
    oValue.Id ||
    oValue.id
  );
}

function findEmailArray(oValue, oSeen = new Set(), iDepth = 0) {
  var oParsed = parseJsonIfNeeded(oValue);

  if (Array.isArray(oParsed)) {
    if (oParsed.length === 0 || looksLikeEmailRecord(oParsed[0])) return oParsed;

    for (var iArrayIndex = 0; iArrayIndex < oParsed.length; iArrayIndex += 1) {
      var aNested = findEmailArray(oParsed[iArrayIndex], oSeen, iDepth + 1);
      if (aNested.length > 0) return aNested;
    }

    return [];
  }

  if (!isPlainObject(oParsed) || oSeen.has(oParsed) || iDepth > 6) return [];

  oSeen.add(oParsed);

  var aKeys = Object.keys(oParsed);
  for (var iKeyIndex = 0; iKeyIndex < aKeys.length; iKeyIndex += 1) {
    var sKey = aKeys[iKeyIndex];
    var aNested = findEmailArray(oParsed[sKey], oSeen, iDepth + 1);
    if (aNested.length > 0) return aNested;
  }

  return [];
}

function extractEmails(oResult) {
  return findEmailArray(oResult);
}

function getSenderText(oEmail) {
  if (!oEmail) return '';
  if (typeof oEmail.From === 'string') return oEmail.From;
  if (oEmail.From && typeof oEmail.From === 'object') {
    return oEmail.From.Email || oEmail.From.Address || oEmail.From.Name || '';
  }
  return oEmail.from || '';
}

function getSubjectText(oEmail) {
  return oEmail.Subject || oEmail.subject || '(No Subject)';
}

function getReceivedDate(oEmail) {
  return oEmail.DateTimeReceived || oEmail.ReceivedTime || oEmail.receivedDateTime || '';
}

function isEmailRead(oEmail) {
  return oEmail.IsRead === true || oEmail.isRead === true;
}

function formatDiagnostic(oResult) {
  try {
    return JSON.stringify(oResult, null, 2).slice(0, 2000);
  } catch {
    return String(oResult);
  }
}

function formatDate(sDate) {
  if (!sDate) return '';
  var oDate = new Date(sDate);
  return oDate.toLocaleDateString() + ' ' + oDate.toLocaleTimeString();
}

function escapeHtml(sText) {
  if (!sText) return '';
  let sStr = String(sText);
  return sStr
    .replace(new RegExp('&', 'g'), '&amp;')
    .replace(new RegExp('<', 'g'), '&lt;')
    .replace(new RegExp('>', 'g'), '&gt;')
    .replace(new RegExp('"', 'g'), '&quot;')
    .replace(new RegExp("'", 'g'), '&#39;');
}

function renderEmails(aEmails) {
  eBody.innerHTML = '';

  if (aEmails.length === 0) {
    eBody.innerHTML = '<tr><td colspan="4">No emails found.</td></tr>';
  }

  aEmails.forEach((oEmail) => {
    var sFrom = escapeHtml(getSenderText(oEmail));
    var sSubject = escapeHtml(getSubjectText(oEmail));
    var sReceived = formatDate(getReceivedDate(oEmail));
    var bRead = isEmailRead(oEmail);
    var sRow = '<tr>' +
      '<td>' + sFrom + '</td>' +
      '<td>' + sSubject + '</td>' +
      '<td>' + sReceived + '</td>' +
      '<td>' + (bRead ? 'Yes' : 'No') + '</td>' +
      '</tr>';
    eBody.innerHTML += sRow;
  });
  eLoading.style.display = 'none';
  eTable.style.display = 'table';
}

function showError(sMessage) {
  eLoading.style.display = 'none';
  eError.style.display = 'block';
  eError.textContent = 'Error: ' + sMessage;
}

async function boot() {
  try {
    var oResult = await listEmails({ folderId: 'Inbox', top: 10 });
    var aEmails = extractEmails(oResult);

    if (aEmails.length === 0) {
      var oFallbackResult = await listEmails({ top: 10 });
      var aFallbackEmails = extractEmails(oFallbackResult);

      if (aFallbackEmails.length > 0) {
        renderEmails(aFallbackEmails);
        return;
      }

      showError('No emails extracted from Outlook response. Raw response: ' + formatDiagnostic(oResult));
      renderEmails([]);
      return;
    }

    renderEmails(aEmails);
  } catch (oErr) {
    showError('Outlook: ' + (oErr.message || oErr));
  }
}

boot();
