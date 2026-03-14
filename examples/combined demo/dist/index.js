
import { getClient } from '@microsoft/power-apps/data';

const ALL_DATA_SOURCES = {
  office365: {
    tableId: '',
    version: '',
    primaryKey: '',
    dataSourceType: 'Connector',
    apis: {
      GetEmailsV3: {
        path: '/{connectionId}/v3/Mail',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true },
          { name: 'folderPath', in: 'query', required: false },
          { name: 'to', in: 'query', required: false },
          { name: 'cc', in: 'query', required: false },
          { name: 'toOrCc', in: 'query', required: false },
          { name: 'from', in: 'query', required: false },
          { name: 'importance', in: 'query', required: false },
          { name: 'fetchOnlyWithAttachment', in: 'query', required: false },
          { name: 'subjectFilter', in: 'query', required: false },
          { name: 'fetchOnlyUnread', in: 'query', required: false },
          { name: 'fetchOnlyFlagged', in: 'query', required: false },
          { name: 'mailboxAddress', in: 'query', required: false },
          { name: 'includeAttachments', in: 'query', required: false },
          { name: 'searchQuery', in: 'query', required: false },
          { name: 'top', in: 'query', required: false }
        ]
      },
      SendEmailV2: {
        path: '/{connectionId}/v2/Mail',
        method: 'POST',
        parameters: [
          { name: 'connectionId', in: 'path', required: true },
          { name: 'emailMessage', in: 'body', required: true }
        ]
      }
    }
  },
  office365users: {
    tableId: '',
    version: '',
    primaryKey: '',
    dataSourceType: 'Connector',
    apis: {
      MyProfile_V2: {
        path: '/{connectionId}/codeless/v1.0/me',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true },
          { name: '$select', in: 'query', required: false }
        ]
      }
    }
  },
  office365groups: {
    tableId: '',
    version: '',
    primaryKey: '',
    dataSourceType: 'Connector',
    apis: {
      ListOwnedGroups_V3: {
        path: '/{connectionId}/v2/v1.0/me/memberOf/$/microsoft.graph.group',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true },
          { name: 'extractSensitivityLabel', in: 'query', required: false },
          { name: 'fetchSensitivityLabelMetadata', in: 'query', required: false }
        ]
      }
    }
  }
};

let oClient = null;
let eStatusMessage = null;
let eProfileCard = null;
let eProfileStatus = null;
let eEmailList = null;
let eGroupList = null;
let eEmailCount = null;
let eGroupCount = null;
let eRefreshButton = null;
let eScrollComposeButton = null;
let eComposeForm = null;
let eComposeTo = null;
let eComposeSubject = null;
let eComposeBody = null;
let eSendButton = null;

let oProfile = null;
let aEmails = [];
let aGroups = [];

function getSharedClient() {
  if (!oClient) {
    oClient = getClient(ALL_DATA_SOURCES);
  }
  return oClient;
}

function getElement(sId) {
  return document.getElementById(sId);
}

function cacheDomElements() {
  eStatusMessage = getElement('statusMessage');
  eProfileCard = getElement('profileCard');
  eProfileStatus = getElement('profileStatus');
  eEmailList = getElement('emailList');
  eGroupList = getElement('groupList');
  eEmailCount = getElement('emailCount');
  eGroupCount = getElement('groupCount');
  eRefreshButton = getElement('refreshButton');
  eScrollComposeButton = getElement('scrollComposeButton');
  eComposeForm = getElement('composeForm');
  eComposeTo = getElement('composeTo');
  eComposeSubject = getElement('composeSubject');
  eComposeBody = getElement('composeBody');
  eSendButton = getElement('sendButton');
}

function unwrapResult(oResult) {
  if (oResult && oResult.success === false) {
    throw new Error(oResult.error ? (oResult.error.message || JSON.stringify(oResult.error)) : 'Operation failed');
  }
  return oResult && Object.prototype.hasOwnProperty.call(oResult, 'data') ? oResult.data : oResult;
}

async function execConnector(sTableName, sOperationName, oParameters = {}) {
  const client = getSharedClient();
  const oResult = await client.executeAsync({
    connectorOperation: {
      tableName: sTableName,
      operationName: sOperationName,
      parameters: oParameters
    }
  });
  return unwrapResult(oResult);
}

function escapeHtml(sValue) {
  let sText = String(sValue == null ? '' : sValue);
  return sText
    .replace(new RegExp('&', 'g'), '&amp;')
    .replace(new RegExp('<', 'g'), '&lt;')
    .replace(new RegExp('>', 'g'), '&gt;')
    .replace(new RegExp('"', 'g'), '&quot;')
    .replace(new RegExp("'", 'g'), '&#39;');
}

function setStatus(sMessage, sTone = 'info') {
  if (!eStatusMessage) {
    return;
  }
  eStatusMessage.textContent = sMessage;
  eStatusMessage.className = 'statusBar ' + sTone;
}

function getInitials(sName) {
  let aParts = String(sName || 'U').trim().split(new RegExp('\\s+', 'g')).filter(Boolean);
  return aParts.slice(0, 2).map((sPart) => sPart.charAt(0).toUpperCase()).join('');
}

function normalizePayload(oValue) {
  if (oValue == null) {
    return null;
  }

  if (typeof oValue === 'string') {
    try {
      return JSON.parse(oValue);
    } catch (oErr) {
      return oValue;
    }
  }

  if (typeof oValue === 'object' && Object.prototype.hasOwnProperty.call(oValue, 'body')) {
    return normalizePayload(oValue.body);
  }

  if (typeof oValue === 'object' && Object.prototype.hasOwnProperty.call(oValue, 'value') && Array.isArray(oValue.value)) {
    return oValue;
  }

  return oValue;
}

function getArrayFromPayload(oValue) {
  let oPayload = normalizePayload(oValue);

  if (Array.isArray(oPayload)) {
    return oPayload;
  }

  if (oPayload && Array.isArray(oPayload.value)) {
    return oPayload.value;
  }

  if (oPayload && Array.isArray(oPayload.messages)) {
    return oPayload.messages;
  }

  if (oPayload && Array.isArray(oPayload.items)) {
    return oPayload.items;
  }

  return [];
}

function getProfileFromPayload(oValue) {
  let oPayload = normalizePayload(oValue);
  if (!oPayload || typeof oPayload !== 'object') {
    return {};
  }
  return oPayload.user && typeof oPayload.user === 'object' ? oPayload.user : oPayload;
}

function formatEmailDate(sValue) {
  if (!sValue) {
    return 'No date';
  }

  let oDate = new Date(sValue);
  if (Number.isNaN(oDate.getTime())) {
    return String(sValue);
  }

  return oDate.toLocaleString();
}

function getEmailFromValue(oValue) {
  if (!oValue || typeof oValue !== 'object') {
    return '';
  }

  if (typeof oValue.address === 'string') {
    return oValue.address;
  }

  if (typeof oValue.email === 'string') {
    return oValue.email;
  }

  if (oValue.emailAddress && typeof oValue.emailAddress.address === 'string') {
    return oValue.emailAddress.address;
  }

  if (oValue.EmailAddress && typeof oValue.EmailAddress.Address === 'string') {
    return oValue.EmailAddress.Address;
  }

  return '';
}

function getSenderLabel(oEmail) {
  let oFrom = oEmail.from || oEmail.From || oEmail.sender || oEmail.Sender || {};
  if (oFrom.emailAddress && typeof oFrom.emailAddress === 'object') {
    return oFrom.emailAddress.name || oFrom.emailAddress.address || 'Unknown sender';
  }
  if (oFrom.EmailAddress && typeof oFrom.EmailAddress === 'object') {
    return oFrom.EmailAddress.Name || oFrom.EmailAddress.Address || 'Unknown sender';
  }
  if (typeof oFrom.displayName === 'string') {
    return oFrom.displayName;
  }
  return getEmailFromValue(oFrom) || 'Unknown sender';
}

function getGroupTagsMarkup(oGroup) {
  let aTags = Array.isArray(oGroup.groupTypes) ? oGroup.groupTypes : [];
  return aTags.map((sTag) => '<span class="pill">' + escapeHtml(sTag) + '</span>').join('');
}

function renderProfile() {
  if (!eProfileCard) {
    return;
  }

  if (!oProfile || Object.keys(oProfile).length === 0) {
    eProfileCard.innerHTML = '<div class="emptyState">Profile information was not returned.</div>';
    if (eProfileStatus) {
      eProfileStatus.textContent = 'Unavailable';
    }
    return;
  }

  let sName = oProfile.displayName || oProfile.DisplayName || oProfile.name || 'Unknown user';
  let sEmail = oProfile.mail || oProfile.Mail || oProfile.userPrincipalName || oProfile.UserPrincipalName || '';
  let sJobTitle = oProfile.jobTitle || oProfile.JobTitle || 'No title';
  let sDepartment = oProfile.department || oProfile.Department || 'No department';
  let sPhone = oProfile.mobilePhone || oProfile.MobilePhone || '';

  eProfileCard.innerHTML = `
    <div class="profileBadge">${escapeHtml(getInitials(sName))}</div>
    <div>
      <h3 class="profileName">${escapeHtml(sName)}</h3>
      <p class="profileMeta">${escapeHtml(sJobTitle)} · ${escapeHtml(sDepartment)}</p>
      <p class="profileSubMeta">${escapeHtml(sEmail || 'No email')}</p>
      <p class="profileSubMeta">${escapeHtml(sPhone || 'No phone')}</p>
    </div>
  `;

  if (eProfileStatus) {
    eProfileStatus.textContent = 'Ready';
  }
}

function renderEmails() {
  if (!eEmailList) {
    return;
  }

  if (eEmailCount) {
    eEmailCount.textContent = String(aEmails.length);
  }

  if (!Array.isArray(aEmails) || aEmails.length === 0) {
    eEmailList.innerHTML = '<div class="emptyState">No emails were returned.</div>';
    return;
  }

  eEmailList.innerHTML = aEmails.map((oEmail) => {
    let sSubject = oEmail.subject || oEmail.Subject || '(No subject)';
    let sPreview = oEmail.bodyPreview || oEmail.BodyPreview || oEmail.body || oEmail.Body || '';
    let sReceived = oEmail.receivedDateTime || oEmail.DateTimeReceived || oEmail.createdDateTime || '';
    let sSender = getSenderLabel(oEmail);

    return `
      <article class="listCard">
        <h3 class="listTitle">${escapeHtml(sSubject)}</h3>
        <p class="listMeta">From: ${escapeHtml(sSender)} · ${escapeHtml(formatEmailDate(sReceived))}</p>
        <p class="listBody">${escapeHtml(String(sPreview).slice(0, 220) || 'No preview available.')}</p>
      </article>
    `;
  }).join('');
}

function renderGroups() {
  if (!eGroupList) {
    return;
  }

  if (eGroupCount) {
    eGroupCount.textContent = String(aGroups.length);
  }

  if (!Array.isArray(aGroups) || aGroups.length === 0) {
    eGroupList.innerHTML = '<div class="emptyState">No group memberships were returned.</div>';
    return;
  }

  eGroupList.innerHTML = aGroups.map((oGroup) => {
    let sName = oGroup.displayName || oGroup.DisplayName || 'Unnamed group';
    let sDescription = oGroup.description || oGroup.Description || 'No description';
    let sMail = oGroup.mail || oGroup.Mail || 'No group mailbox';

    return `
      <article class="listCard">
        <h3 class="listTitle">${escapeHtml(sName)}</h3>
        <p class="listMeta">${escapeHtml(sMail)}</p>
        <p class="listBody">${escapeHtml(sDescription)}</p>
        ${getGroupTagsMarkup(oGroup)}
      </article>
    `;
  }).join('');
}

async function loadProfile() {
  oProfile = getProfileFromPayload(await execConnector('office365users', 'MyProfile_V2', {}));
  renderProfile();
}

async function loadEmails() {
  aEmails = getArrayFromPayload(await execConnector('office365', 'GetEmailsV3', {
    folderPath: 'Inbox',
    top: 15
  }));
  renderEmails();
}

async function loadGroups() {
  aGroups = getArrayFromPayload(await execConnector('office365groups', 'ListOwnedGroups_V3', {}));
  renderGroups();
}

async function sendEmailMessage(sTo, sSubject, sBody) {
  return execConnector('office365', 'SendEmailV2', {
    emailMessage: {
      To: sTo,
      Subject: sSubject,
      Body: sBody,
      Importance: 'Normal',
      IsHtml: true
    }
  });
}

async function loadDashboard() {
  setStatus('Loading your dashboard…', 'info');

  let aResults = await Promise.allSettled([
    loadProfile(),
    loadEmails(),
    loadGroups()
  ]);

  let aErrors = aResults
    .filter((oResult) => oResult.status === 'rejected')
    .map((oResult) => oResult.reason?.message || String(oResult.reason));

  renderProfile();
  renderEmails();
  renderGroups();

  if (aErrors.length > 0) {
    setStatus('Loaded with connector issues: ' + aErrors.join(' | '), 'error');
    return;
  }

  setStatus('Dashboard loaded successfully.', 'success');
}

async function handleRefreshClick() {
  await loadDashboard();
}

function handleScrollComposeClick() {
  let eComposeSection = getElement('composeSection');
  if (eComposeSection) {
    eComposeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function handleComposeSubmit(oEvent) {
  oEvent.preventDefault();

  let sTo = String(eComposeTo?.value || '').trim();
  let sSubject = String(eComposeSubject?.value || '').trim();
  let sBody = String(eComposeBody?.value || '').trim();

  if (!sTo || !sSubject || !sBody) {
    setStatus('Complete the To, Subject, and Message fields before sending.', 'error');
    return;
  }

  try {
    if (eSendButton) {
      eSendButton.disabled = true;
      eSendButton.textContent = 'Sending...';
    }

    setStatus('Sending email…', 'info');
    await sendEmailMessage(sTo, sSubject, sBody);

    if (eComposeForm) {
      eComposeForm.reset();
    }

    setStatus('Email sent successfully.', 'success');
    await loadEmails();
  } catch (oErr) {
    setStatus('Send email failed: ' + (oErr.message || oErr), 'error');
  } finally {
    if (eSendButton) {
      eSendButton.disabled = false;
      eSendButton.textContent = 'Send email';
    }
  }
}

function attachEvents() {
  if (eRefreshButton) {
    eRefreshButton.addEventListener('click', () => {
      handleRefreshClick().catch((oErr) => {
        setStatus('Refresh failed: ' + (oErr.message || oErr), 'error');
      });
    });
  }

  if (eScrollComposeButton) {
    eScrollComposeButton.addEventListener('click', handleScrollComposeClick);
  }

  if (eComposeForm) {
    eComposeForm.addEventListener('submit', (oEvent) => {
      handleComposeSubmit(oEvent).catch((oErr) => {
        setStatus('Send email failed: ' + (oErr.message || oErr), 'error');
      });
    });
  }
}

async function boot() {
  cacheDomElements();
  attachEvents();
  renderProfile();
  renderEmails();
  renderGroups();

  try {
    getSharedClient();
    await loadDashboard();
  } catch (oErr) {
    setStatus('App failed to start: ' + (oErr.message || oErr), 'error');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  boot().catch((oErr) => {
    setStatus('App failed to start: ' + (oErr.message || oErr), 'error');
  });
});
