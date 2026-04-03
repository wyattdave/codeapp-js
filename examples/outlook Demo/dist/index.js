import { enableDebugger } from "./codeapp.js";

enableDebugger();

import {
  getCalendarView,
  getEmail,
  listContactFolders,
  listContacts,
  listEmails,
  listOutlookCategories,
  markEmailAsRead,
} from './outlook.js';

const eStatusLine = document.getElementById('statusLine');
const eInboxCount = document.getElementById('inboxCount');
const eEventCount = document.getElementById('eventCount');
const eContactCount = document.getElementById('contactCount');
const eCategoryCount = document.getElementById('categoryCount');
const eSearchInput = document.getElementById('searchInput');
const eUnreadOnlyInput = document.getElementById('unreadOnlyInput');
const eMailList = document.getElementById('mailList');
const eMailDetail = document.getElementById('mailDetail');
const eCalendarList = document.getElementById('calendarList');
const eCategoryList = document.getElementById('categoryList');
const eContactFolderSelect = document.getElementById('contactFolderSelect');
const eContactList = document.getElementById('contactList');
const eDiagnosticSelect = document.getElementById('diagnosticSelect');
const eDiagnosticOutput = document.getElementById('diagnosticOutput');
const eErrorBanner = document.getElementById('errorBanner');
const eRefreshAllButton = document.getElementById('refreshAllButton');
const eRefreshInboxButton = document.getElementById('refreshInboxButton');
const eRefreshCalendarButton = document.getElementById('refreshCalendarButton');
const eRefreshContactsButton = document.getElementById('refreshContactsButton');
const eMarkReadButton = document.getElementById('markReadButton');
const eInboxForm = document.getElementById('inboxForm');

const oState = {
  emails: [],
  selectedEmailId: '',
  selectedEmail: null,
  categories: [],
  events: [],
  contactFolders: [],
  selectedContactFolderId: '',
  contacts: [],
  diagnostics: {
    inbox: null,
    message: null,
    calendar: null,
    contacts: null,
    categories: null,
  },
};

function parseJsonIfNeeded(oValue) {
  if (typeof oValue !== 'string') {
    return oValue;
  }

  try {
    return JSON.parse(oValue);
  } catch {
    return oValue;
  }
}

function isPlainObject(oValue) {
  return oValue !== null && typeof oValue === 'object' && Array.isArray(oValue) === false;
}

function findRecords(oValue, fnPredicate, oSeen = new Set(), iDepth = 0) {
  const oParsed = parseJsonIfNeeded(oValue);

  if (Array.isArray(oParsed)) {
    if (oParsed.length === 0 || fnPredicate(oParsed[0])) {
      return oParsed;
    }

    for (let iIndex = 0; iIndex < oParsed.length; iIndex += 1) {
      const aNested = findRecords(oParsed[iIndex], fnPredicate, oSeen, iDepth + 1);
      if (aNested.length > 0) {
        return aNested;
      }
    }

    return [];
  }

  if (!isPlainObject(oParsed) || oSeen.has(oParsed) || iDepth > 6) {
    return [];
  }

  oSeen.add(oParsed);

  return Object.keys(oParsed).reduce(function(aFound, sKey) {
    if (aFound.length > 0) {
      return aFound;
    }

    return findRecords(oParsed[sKey], fnPredicate, oSeen, iDepth + 1);
  }, []);
}

function looksLikeEmail(oRecord) {
  return isPlainObject(oRecord) && Boolean(
    oRecord.Subject || oRecord.subject || oRecord.Id || oRecord.id || oRecord.receivedDateTime || oRecord.DateTimeReceived
  );
}

function looksLikeEvent(oRecord) {
  return isPlainObject(oRecord) && Boolean(
    oRecord.Subject || oRecord.subject || oRecord.Start || oRecord.start || oRecord.startWithTimeZone
  );
}

function looksLikeCategory(oRecord) {
  return isPlainObject(oRecord) && Boolean(oRecord.displayName || oRecord.DisplayName || oRecord.id || oRecord.Id);
}

function looksLikeFolder(oRecord) {
  return isPlainObject(oRecord) && Boolean(oRecord.id || oRecord.Id || oRecord.displayName || oRecord.title || oRecord.name);
}

function looksLikeContact(oRecord) {
  return isPlainObject(oRecord) && Boolean(
    oRecord.displayName || oRecord.DisplayName || oRecord.GivenName || oRecord.givenName || oRecord.EmailAddresses || oRecord.emailAddresses
  );
}

function formatDiagnostic(oValue) {
  try {
    return JSON.stringify(oValue, null, 2).slice(0, 4000);
  } catch {
    return String(oValue);
  }
}

function escapeHtml(sText) {
  if (!sText) {
    return '';
  }

  return String(sText)
    .replace(new RegExp('&', 'g'), '&amp;')
    .replace(new RegExp('<', 'g'), '&lt;')
    .replace(new RegExp('>', 'g'), '&gt;')
    .replace(new RegExp('"', 'g'), '&quot;')
    .replace(new RegExp("'", 'g'), '&#39;');
}

function formatDateTime(sValue) {
  if (!sValue) {
    return 'Not available';
  }

  const oDate = new Date(sValue);
  if (Number.isNaN(oDate.getTime())) {
    return sValue;
  }

  return oDate.toLocaleDateString() + ' ' + oDate.toLocaleTimeString();
}

function getSenderText(oEmail) {
  if (!oEmail) {
    return 'Unknown sender';
  }

  if (typeof oEmail.From === 'string') {
    return oEmail.From;
  }

  if (typeof oEmail._from === 'string') {
    return oEmail._from;
  }

  if (isPlainObject(oEmail.From)) {
    return oEmail.From.Email || oEmail.From.Address || oEmail.From.Name || 'Unknown sender';
  }

  return oEmail.from || oEmail.organizer || 'Unknown sender';
}

function getSubjectText(oEmail) {
  return oEmail.Subject || oEmail.subject || '(No Subject)';
}

function getReceivedDateText(oEmail) {
  return oEmail.DateTimeReceived || oEmail.receivedDateTime || oEmail.DateTimeCreated || oEmail.createdDateTime || '';
}

function isEmailRead(oEmail) {
  return oEmail.IsRead === true || oEmail.isRead === true;
}

function getEventTitle(oEvent) {
  return oEvent.Subject || oEvent.subject || '(Untitled event)';
}

function getEventStart(oEvent) {
  return oEvent.Start || oEvent.startWithTimeZone || oEvent.start || '';
}

function getEventEnd(oEvent) {
  return oEvent.End || oEvent.endWithTimeZone || oEvent.end || '';
}

function getContactName(oContact) {
  return oContact.DisplayName || oContact.displayName || [oContact.GivenName, oContact.Surname].filter(Boolean).join(' ') || 'Unnamed contact';
}

function getContactAddress(oContact) {
  if (typeof oContact.EmailAddresses === 'string') {
    return oContact.EmailAddresses;
  }

  const aEmailAddresses = oContact.EmailAddresses || oContact.emailAddresses || [];
  if (Array.isArray(aEmailAddresses) && aEmailAddresses.length > 0) {
    const oPrimary = aEmailAddresses[0];
    return oPrimary.Address || oPrimary.address || oPrimary.Name || oPrimary.name || 'No email';
  }

  return oContact.Email || oContact.email || 'No email';
}

function setStatus(sText) {
  eStatusLine.textContent = sText;
}

function showError(sText) {
  eErrorBanner.textContent = sText;
  eErrorBanner.classList.remove('is-hidden');
}

function clearError() {
  eErrorBanner.textContent = '';
  eErrorBanner.classList.add('is-hidden');
}

function updateDiagnostics() {
  const sKey = eDiagnosticSelect.value;
  eDiagnosticOutput.textContent = formatDiagnostic(oState.diagnostics[sKey] || 'No payload captured yet.');
}

function renderInbox() {
  eInboxCount.textContent = String(oState.emails.length);

  if (oState.emails.length === 0) {
    eMailList.innerHTML = '<div class="empty-state">No messages matched the current Outlook query.</div>';
    return;
  }

  eMailList.innerHTML = oState.emails.map(function(oEmail) {
    const sId = escapeHtml(oEmail.Id || oEmail.id || '');
    const sActiveClass = oState.selectedEmailId === (oEmail.Id || oEmail.id) ? ' is-active' : '';
    const sReadLabel = isEmailRead(oEmail) ? 'Read' : 'Unread';

    return '<button class="mail-item' + sActiveClass + '" type="button" data-email-id="' + sId + '">' +
      '<p class="mail-meta">' + escapeHtml(getSenderText(oEmail)) + '</p>' +
      '<p class="mail-item-subject">' + escapeHtml(getSubjectText(oEmail)) + '</p>' +
      '<p class="mail-meta">' + escapeHtml(formatDateTime(getReceivedDateText(oEmail))) + ' · ' + escapeHtml(sReadLabel) + '</p>' +
      '</button>';
  }).join('');
}

function renderSelectedEmail() {
  const oEmail = oState.selectedEmail;
  eMarkReadButton.disabled = !oEmail || isEmailRead(oEmail);

  if (!oEmail) {
    eMailDetail.className = 'mail-detail empty-state';
    eMailDetail.textContent = 'Pick a message to load the full Outlook payload.';
    return;
  }

  const sBody = oEmail.Body || oEmail.body || oEmail.BodyPreview || oEmail.bodyPreview || 'No body returned.';
  const aChips = [];
  const aAttachments = oEmail.Attachments || oEmail.attachments || [];

  if (oEmail.Importance || oEmail.importance) {
    aChips.push('<span class="detail-chip">Importance: ' + escapeHtml(oEmail.Importance || oEmail.importance) + '</span>');
  }
  if (aAttachments.length > 0) {
    aChips.push('<span class="detail-chip">Attachments: ' + escapeHtml(String(aAttachments.length)) + '</span>');
  }
  if (oEmail.Categories || oEmail.categories) {
    const aCategories = oEmail.Categories || oEmail.categories;
    aChips.push('<span class="detail-chip">Categories: ' + escapeHtml((aCategories || []).join(', ')) + '</span>');
  }

  eMailDetail.className = 'mail-detail';
  eMailDetail.innerHTML = '<div class="mail-detail-grid">' +
    '<p class="mail-meta">' + escapeHtml(getSenderText(oEmail)) + '</p>' +
    '<h3>' + escapeHtml(getSubjectText(oEmail)) + '</h3>' +
    '<p class="mail-meta">Received ' + escapeHtml(formatDateTime(getReceivedDateText(oEmail))) + '</p>' +
    '<div class="detail-chip-row">' + aChips.join('') + '</div>' +
    '<p class="mail-detail-body">' + escapeHtml(sBody) + '</p>' +
    '</div>';
}

function renderCalendar() {
  eEventCount.textContent = String(oState.events.length);

  if (oState.events.length === 0) {
    eCalendarList.innerHTML = '<div class="empty-state">No events were returned for the current calendar window.</div>';
    return;
  }

  eCalendarList.innerHTML = oState.events.map(function(oEvent) {
    return '<article class="event-item">' +
      '<p class="event-title">' + escapeHtml(getEventTitle(oEvent)) + '</p>' +
      '<p class="event-meta">' + escapeHtml(formatDateTime(getEventStart(oEvent))) + '</p>' +
      '<p class="event-meta">Ends ' + escapeHtml(formatDateTime(getEventEnd(oEvent))) + '</p>' +
      '</article>';
  }).join('');
}

function renderCategories() {
  eCategoryCount.textContent = String(oState.categories.length);

  if (oState.categories.length === 0) {
    eCategoryList.innerHTML = '<div class="empty-state">No Outlook categories were returned.</div>';
    return;
  }

  eCategoryList.innerHTML = oState.categories.map(function(oCategory) {
    return '<span class="category-pill">' + escapeHtml(oCategory.displayName || oCategory.DisplayName || oCategory.id || oCategory.Id || 'Category') + '</span>';
  }).join('');
}

function renderContactFolders() {
  const aFolders = oState.contactFolders;
  eContactFolderSelect.innerHTML = aFolders.map(function(oFolder) {
    const sId = oFolder.id || oFolder.Id || oFolder.name || oFolder.title || '';
    const sLabel = oFolder.displayName || oFolder.title || oFolder.name || sId || 'Contact folder';
    const sSelected = sId === oState.selectedContactFolderId ? ' selected' : '';
    return '<option value="' + escapeHtml(sId) + '"' + sSelected + '>' + escapeHtml(sLabel) + '</option>';
  }).join('');
}

function renderContacts() {
  eContactCount.textContent = String(oState.contacts.length);

  if (oState.contacts.length === 0) {
    eContactList.innerHTML = '<div class="empty-state">No contacts were returned for the selected folder.</div>';
    return;
  }

  eContactList.innerHTML = oState.contacts.map(function(oContact) {
    return '<article class="contact-item">' +
      '<p class="contact-name">' + escapeHtml(getContactName(oContact)) + '</p>' +
      '<p class="contact-meta">' + escapeHtml(getContactAddress(oContact)) + '</p>' +
      '</article>';
  }).join('');
}

async function loadInbox() {
  setStatus('Loading inbox...');
  const oResult = await listEmails({
    folderId: 'Inbox',
    fetchOnlyUnread: eUnreadOnlyInput.checked,
    searchQuery: eSearchInput.value.trim(),
    top: 12,
  });

  oState.diagnostics.inbox = oResult;
  oState.emails = findRecords(oResult, looksLikeEmail);
  renderInbox();
  updateDiagnostics();

  if (oState.emails.length > 0) {
    const sSelectedEmailId = oState.emails.some(function(oEmail) {
      return (oEmail.Id || oEmail.id) === oState.selectedEmailId;
    }) ? oState.selectedEmailId : (oState.emails[0].Id || oState.emails[0].id);

    await loadEmail(sSelectedEmailId);
  } else {
    oState.selectedEmailId = '';
    oState.selectedEmail = null;
    renderSelectedEmail();
  }
}

async function loadEmail(sEmailId) {
  if (!sEmailId) {
    oState.selectedEmailId = '';
    oState.selectedEmail = null;
    renderSelectedEmail();
    return;
  }

  setStatus('Loading selected message...');
  const oResult = await getEmail(sEmailId, { includeAttachments: true });
  oState.selectedEmailId = sEmailId;
  oState.selectedEmail = parseJsonIfNeeded(oResult);
  oState.diagnostics.message = oResult;
  renderInbox();
  renderSelectedEmail();
  updateDiagnostics();
}

async function loadCalendar() {
  setStatus('Loading calendar view...');
  const oNow = new Date();
  const oEnd = new Date(oNow.getTime() + (3 * 24 * 60 * 60 * 1000));
  const oResult = await getCalendarView({
    calendarId: 'Calendar',
    startDateTimeUtc: oNow.toISOString(),
    endDateTimeUtc: oEnd.toISOString(),
    top: 8,
  });

  oState.diagnostics.calendar = oResult;
  oState.events = findRecords(oResult, looksLikeEvent);
  renderCalendar();
  updateDiagnostics();
}

async function loadCategories() {
  setStatus('Loading Outlook categories...');
  const oResult = await listOutlookCategories();
  oState.diagnostics.categories = oResult;
  oState.categories = findRecords(oResult, looksLikeCategory);
  renderCategories();
  updateDiagnostics();
}

async function loadContactFoldersAndContacts() {
  setStatus('Loading contact folders...');
  const oFolderResult = await listContactFolders();
  oState.contactFolders = findRecords(oFolderResult, looksLikeFolder);
  if (!oState.selectedContactFolderId && oState.contactFolders.length > 0) {
    oState.selectedContactFolderId = oState.contactFolders[0].id || oState.contactFolders[0].Id || '';
  }
  renderContactFolders();

  if (!oState.selectedContactFolderId) {
    oState.contacts = [];
    oState.diagnostics.contacts = oFolderResult;
    renderContacts();
    updateDiagnostics();
    return;
  }

  setStatus('Loading contacts...');
  const oContactsResult = await listContacts(oState.selectedContactFolderId, { top: 10 });
  oState.contacts = findRecords(oContactsResult, looksLikeContact);
  oState.diagnostics.contacts = oContactsResult;
  renderContacts();
  updateDiagnostics();
}

async function refreshDesk() {
  clearError();
  try {
    await Promise.all([
      loadInbox(),
      loadCalendar(),
      loadCategories(),
      loadContactFoldersAndContacts(),
    ]);
    setStatus('Outlook desk updated at ' + new Date().toLocaleTimeString() + '.');
  } catch (oError) {
    showError('Outlook request failed: ' + (oError.message || oError));
    setStatus('Outlook returned an error.');
  }
}

async function handleMarkRead() {
  if (!oState.selectedEmailId) {
    return;
  }

  clearError();
  try {
    setStatus('Marking message as read...');
    await markEmailAsRead(oState.selectedEmailId, { isRead: true });
    await loadInbox();
    setStatus('Message updated at ' + new Date().toLocaleTimeString() + '.');
  } catch (oError) {
    showError('Unable to mark the message as read: ' + (oError.message || oError));
    setStatus('Mark read failed.');
  }
}

eInboxForm.addEventListener('submit', function(oEvent) {
  oEvent.preventDefault();
  refreshDesk();
});

eSearchInput.addEventListener('change', refreshDesk);
eUnreadOnlyInput.addEventListener('change', refreshDesk);
eRefreshAllButton.addEventListener('click', refreshDesk);
eRefreshInboxButton.addEventListener('click', loadInbox);
eRefreshCalendarButton.addEventListener('click', loadCalendar);
eRefreshContactsButton.addEventListener('click', loadContactFoldersAndContacts);
eMarkReadButton.addEventListener('click', handleMarkRead);

eMailList.addEventListener('click', function(oEvent) {
  const eButton = oEvent.target.closest('[data-email-id]');
  if (!eButton) {
    return;
  }

  loadEmail(eButton.getAttribute('data-email-id'));
});

eContactFolderSelect.addEventListener('change', function() {
  oState.selectedContactFolderId = eContactFolderSelect.value;
  loadContactFoldersAndContacts();
});

eDiagnosticSelect.addEventListener('change', updateDiagnostics);

refreshDesk();
