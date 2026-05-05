import { getMyProfile, getUserPhoto } from './connectors/office365users.js';
import { getCalendarView, listEmails } from './connectors/office365outlook.js';
import { enableDebugger } from "./codeapp.js";

enableDebugger();
const eRoot = document.getElementById('root');

const oState = {
  bLoading: true,
  bRefreshing: false,
  oProfile: null,
  sPhoto: '',
  aEmails: [],
  aMeetings: [],
  aErrors: [],
  sUpdatedAt: '',
};

function getDayWindow() {
  const oNow = new Date();
  const oStart = new Date(oNow.getFullYear(), oNow.getMonth(), oNow.getDate());
  const oEnd = new Date(oNow.getFullYear(), oNow.getMonth(), oNow.getDate() + 1);

  return {
    oNow,
    oStart,
    oEnd,
    sStartIso: oStart.toISOString(),
    sEndIso: oEnd.toISOString(),
    sLabel: oStart.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  };
}

function normalizeItems(oResult) {
  const aCandidates = [oResult];

  while (aCandidates.length > 0) {
    const oCandidate = aCandidates.shift();

    if (Array.isArray(oCandidate)) {
      return oCandidate;
    }

    if (!oCandidate || typeof oCandidate !== 'object') {
      continue;
    }

    if (Array.isArray(oCandidate.value)) {
      return oCandidate.value;
    }

    if (Array.isArray(oCandidate.items)) {
      return oCandidate.items;
    }

    if (Array.isArray(oCandidate.entities)) {
      return oCandidate.entities;
    }

    if (Array.isArray(oCandidate.records)) {
      return oCandidate.records;
    }

    if (Array.isArray(oCandidate.results)) {
      return oCandidate.results;
    }

    aCandidates.push(oCandidate.data, oCandidate.body);
  }

  return [];
}

function getErrorMessage(oError) {
  if (!oError) {
    return 'Unknown error';
  }

  if (typeof oError === 'string') {
    return oError;
  }

  if (typeof oError.message === 'string' && oError.message) {
    return oError.message;
  }

  try {
    return JSON.stringify(oError);
  } catch (oInnerError) {
    return String(oError);
  }
}

function escapeHtml(sValue) {
  const eDiv = document.createElement('div');
  eDiv.textContent = sValue || '';
  return eDiv.innerHTML;
}

function stripHtml(sValue) {
  const eDiv = document.createElement('div');
  eDiv.innerHTML = sValue || '';
  return eDiv.textContent || eDiv.innerText || '';
}

function getInitials(sName) {
  if (!sName) {
    return '?';
  }

  const aParts = String(sName)
    .split(' ')
    .map((sPart) => sPart.trim())
    .filter(Boolean);

  if (aParts.length === 0) {
    return '?';
  }

  if (aParts.length === 1) {
    return aParts[0].slice(0, 2).toUpperCase();
  }

  return (aParts[0].charAt(0) + aParts[aParts.length - 1].charAt(0)).toUpperCase();
}

function getEmailDate(oEmail) {
  return oEmail.DateTimeReceived || oEmail.receivedDateTime || oEmail.ReceivedDateTime || '';
}

function getMeetingStart(oMeeting) {
  return oMeeting.Start || oMeeting.start || oMeeting.startDateTime || '';
}

function getMeetingEnd(oMeeting) {
  return oMeeting.End || oMeeting.end || oMeeting.endDateTime || '';
}

function toDate(oValue) {
  if (!oValue) {
    return null;
  }

  const oDate = new Date(oValue);
  if (Number.isNaN(oDate.getTime())) {
    return null;
  }

  return oDate;
}

function isInDay(oValue, oWindow) {
  const oDate = toDate(oValue);
  if (!oDate) {
    return false;
  }

  return oDate >= oWindow.oStart && oDate < oWindow.oEnd;
}

function formatTime(oValue) {
  const oDate = toDate(oValue);
  if (!oDate) {
    return '';
  }

  return oDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatUpdatedAt() {
  return new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMeetingRange(oMeeting) {
  if (oMeeting.IsAllDay || oMeeting.isAllDay) {
    return 'All day';
  }

  const sStart = formatTime(getMeetingStart(oMeeting));
  const sEnd = formatTime(getMeetingEnd(oMeeting));
  if (!sStart && !sEnd) {
    return 'Time unavailable';
  }

  return sStart + ' - ' + sEnd;
}

function renderMetaChip(sLabel, sValue) {
  if (!sValue) {
    return '';
  }

  return '<span class="meta-chip">' + escapeHtml(sLabel + ': ' + sValue) + '</span>';
}

function renderProfileCard(oWindow) {
  if (!oState.oProfile) {
    return '<div class="profile-card skeleton" style="min-height:130px"></div>';
  }

  const oProfile = oState.oProfile;
  const sImageHtml = oState.sPhoto
    ? '<img src="data:image/jpeg;base64,' + oState.sPhoto + '" alt="Profile photo" />'
    : '<span>' + escapeHtml(getInitials(oProfile.displayName || oProfile.mail || 'Me')) + '</span>';

  const aMeta = [
    renderMetaChip('Mail', oProfile.mail || oProfile.userPrincipalName),
    renderMetaChip('Phone', (oProfile.businessPhones && oProfile.businessPhones[0]) || oProfile.mobilePhone),
    renderMetaChip('Department', oProfile.department),
    renderMetaChip('Office', oProfile.officeLocation),
  ].filter(Boolean);

  return '<div class="profile-card">'
    + '<div class="avatar-frame">' + sImageHtml + '</div>'
    + '<div>'
    + '<h2 class="profile-name">' + escapeHtml(oProfile.displayName || 'Signed-in user') + '</h2>'
    + '<p class="profile-role">' + escapeHtml(oProfile.jobTitle || 'Role unavailable') + '</p>'
    + '<p class="profile-line">' + escapeHtml(oWindow.sLabel) + '</p>'
    + '<p class="profile-line">'
    + escapeHtml((oProfile.mail || oProfile.userPrincipalName || '').toString())
    + '</p>'
    + '</div>'
    + '</div>'
    + '<div class="hero-meta">' + aMeta.join('') + '</div>';
}

function renderStatsCard() {
  const sUpdatedCopy = oState.sUpdatedAt
    ? 'Updated at ' + oState.sUpdatedAt
    : 'Waiting for data';

  return '<div class="stats-card">'
    + '<div class="stats-row">'
    + '<div class="stat-tile' + (oState.bLoading ? ' skeleton' : '') + '">'
    + '<span class="stat-label">Inbox Emails</span>'
    + '<span class="stat-value">' + String(oState.aEmails.length) + '</span>'
    + '</div>'
    + '<div class="stat-tile' + (oState.bLoading ? ' skeleton' : '') + '">'
    + '<span class="stat-label">Meetings Today</span>'
    + '<span class="stat-value">' + String(oState.aMeetings.length) + '</span>'
    + '</div>'
    + '</div>'
    + '<div class="toolbar">'
    + '<span class="status-copy">' + escapeHtml(sUpdatedCopy) + '</span>'
    + '<button class="action-button" data-action="refresh"' + (oState.bRefreshing ? ' disabled' : '') + '>'
    + (oState.bRefreshing ? 'Refreshing...' : 'Refresh')
    + '</button>'
    + '</div>'
    + '</div>';
}

function renderEmailList() {
  if (oState.bLoading && oState.aEmails.length === 0) {
    return '<div class="item-list">'
      + '<div class="list-item skeleton" style="min-height:110px"></div>'
      + '<div class="list-item skeleton" style="min-height:110px"></div>'
      + '<div class="list-item skeleton" style="min-height:110px"></div>'
      + '</div>';
  }

  if (oState.aEmails.length === 0) {
    return '<div class="empty-state">'
      + '<h3 class="empty-title">No inbox emails returned</h3>'
      + '<p class="empty-copy">The Outlook connector call succeeded, but it did not return any inbox items in the current batch.</p>'
      + '</div>';
  }

  return '<div class="item-list">'
    + oState.aEmails.map((oEmail) => {
      const oFrom = oEmail.From || oEmail.from || {};
      const oEmailAddress = oFrom.EmailAddress || oFrom.emailAddress || {};
      const sSender = oEmailAddress.Name || oEmailAddress.name || oFrom.Name || 'Unknown sender';
      const sAddress = oEmailAddress.Address || oEmailAddress.address || oFrom.Address || '';
      const sSubject = oEmail.Subject || oEmail.subject || '(No subject)';
      const sPreview = stripHtml(oEmail.BodyPreview || oEmail.bodyPreview || oEmail.Body || oEmail.body || '');
      const sReceived = formatTime(getEmailDate(oEmail));
      const bUnread = oEmail.IsRead === false || oEmail.isRead === false;

      return '<article class="list-item' + (bUnread ? ' list-item--unread' : '') + '">'
        + '<div class="item-topline">'
        + '<div>'
        + '<h3 class="item-title">' + escapeHtml(sSubject) + '</h3>'
        + '<p class="item-meta">' + escapeHtml(sSender + (sAddress ? ' • ' + sAddress : '')) + '</p>'
        + '</div>'
        + '<span class="item-time">' + escapeHtml(sReceived || 'Today') + '</span>'
        + '</div>'
        + '<p class="item-preview">' + escapeHtml(sPreview.slice(0, 180) || 'No preview available.') + '</p>'
        + '</article>';
    }).join('')
    + '</div>';
}

function renderMeetingList() {
  if (oState.bLoading && oState.aMeetings.length === 0) {
    return '<div class="item-list">'
      + '<div class="list-item skeleton" style="min-height:104px"></div>'
      + '<div class="list-item skeleton" style="min-height:104px"></div>'
      + '<div class="list-item skeleton" style="min-height:104px"></div>'
      + '</div>';
  }

  if (oState.aMeetings.length === 0) {
    return '<div class="empty-state">'
      + '<h3 class="empty-title">No meetings on the calendar</h3>'
      + '<p class="empty-copy">Today looks open. When events appear on your primary calendar, they will show up here.</p>'
      + '</div>';
  }

  return '<div class="item-list">'
    + oState.aMeetings.map((oMeeting) => {
      const sSubject = oMeeting.Subject || oMeeting.subject || '(Untitled meeting)';
      const sLocation = oMeeting.Location || oMeeting.location || 'Location not set';
      const sOrganizer = oMeeting.Organizer || oMeeting.organizer || '';
      const sRange = formatMeetingRange(oMeeting);
      const sWebLink = oMeeting.WebLink || oMeeting.webLink || '';

      return '<article class="list-item">'
        + '<div class="item-topline">'
        + '<div>'
        + '<h3 class="item-title">' + escapeHtml(sSubject) + '</h3>'
        + '<p class="item-meta">' + escapeHtml(sLocation) + '</p>'
        + '</div>'
        + '<span class="item-time">' + escapeHtml(sRange) + '</span>'
        + '</div>'
        + (sOrganizer ? '<p class="item-preview">Organizer: ' + escapeHtml(sOrganizer) + '</p>' : '')
        + (sWebLink ? '<a class="meeting-link" href="' + escapeHtml(sWebLink) + '" target="_blank" rel="noreferrer">Open in Outlook</a>' : '')
        + '</article>';
    }).join('')
    + '</div>';
}

function renderNotice() {
  if (oState.aErrors.length === 0) {
    return '';
  }

  return '<section class="notice">'
    + '<h3 class="notice-title">Some data could not be loaded</h3>'
    + '<p class="notice-copy">' + escapeHtml(oState.aErrors.join(' ')) + ' If this is a fresh app, use Sync Connections so Outlook and Office 365 Users are available.</p>'
    + '</section>';
}

function renderApp() {
  const oWindow = getDayWindow();

  eRoot.innerHTML = '<div class="app-shell">'
    + '<section class="hero-card">'
    + '<div class="hero-layout">'
    + '<div>'
    + '<p class="eyebrow">Daily snapshot</p>'
    + '<h1 class="hero-heading">Profile, mail, and meetings in one glance.</h1>'
    + '<p class="hero-subtitle">A compact view of the signed-in user, the latest inbox messages, and the meetings scheduled for the rest of the day.</p>'
    + renderProfileCard(oWindow)
    + '</div>'
    + '<div class="hero-side">'
    + renderStatsCard()
    + '</div>'
    + '</div>'
    + '</section>'
    + '<div class="content-grid">'
    + '<section class="panel">'
    + '<header class="panel-header">'
    + '<div>'
    + '<h2 class="panel-title">Inbox Emails</h2>'
    + '<p class="panel-subtitle">Latest inbox items returned by the Outlook connector.</p>'
    + '</div>'
    + '<span class="count-pill">' + String(oState.aEmails.length) + '</span>'
    + '</header>'
    + renderEmailList()
    + '</section>'
    + '<section class="panel">'
    + '<header class="panel-header">'
    + '<div>'
    + '<h2 class="panel-title">Today\'s Meetings</h2>'
    + '<p class="panel-subtitle">Events from your primary calendar for ' + escapeHtml(oWindow.sLabel) + '.</p>'
    + '</div>'
    + '<span class="count-pill">' + String(oState.aMeetings.length) + '</span>'
    + '</header>'
    + renderMeetingList()
    + '</section>'
    + '</div>'
    + renderNotice()
    + '</div>';
}

async function loadProfileBundle() {
  const oProfile = await getMyProfile({
    select: ['displayName', 'mail', 'userPrincipalName', 'jobTitle', 'department', 'officeLocation', 'businessPhones', 'mobilePhone', 'id'],
  });
  const sUserId = oProfile.id || oProfile.mail || oProfile.userPrincipalName;
  let sPhoto = '';

  if (sUserId) {
    try {
      const oPhotoResult = await getUserPhoto(sUserId);
      sPhoto = (oPhotoResult && oPhotoResult.value) || oPhotoResult || '';
    } catch (oPhotoError) {
      sPhoto = '';
    }
  }

  return {
    oProfile,
    sPhoto,
  };
}

async function loadInboxEmails() {
  const oResult = await listEmails({ folderId: 'Inbox', top: 50 });

  return normalizeItems(oResult)
    .sort((oLeft, oRight) => {
      const iLeft = (toDate(getEmailDate(oLeft)) || new Date(0)).getTime();
      const iRight = (toDate(getEmailDate(oRight)) || new Date(0)).getTime();
      return iRight - iLeft;
    })
    .slice(0, 10);
}

async function loadTodayMeetings() {
  const oWindow = getDayWindow();
  const oResult = await getCalendarView({
    calendarId: 'Calendar',
    startDateTimeUtc: oWindow.sStartIso,
    endDateTimeUtc: oWindow.sEndIso,
    top: 20,
  });

  return normalizeItems(oResult)
    .filter((oMeeting) => isInDay(getMeetingStart(oMeeting), oWindow))
    .sort((oLeft, oRight) => {
      const iLeft = (toDate(getMeetingStart(oLeft)) || new Date(0)).getTime();
      const iRight = (toDate(getMeetingStart(oRight)) || new Date(0)).getTime();
      return iLeft - iRight;
    })
    .slice(0, 20);
}

async function refreshDashboard() {
  oState.bLoading = !oState.sUpdatedAt;
  oState.bRefreshing = true;
  oState.aErrors = [];
  renderApp();

  const aResults = await Promise.allSettled([
    loadProfileBundle(),
    loadInboxEmails(),
    loadTodayMeetings(),
  ]);

  const [oProfileResult, oEmailResult, oMeetingResult] = aResults;
  const aErrors = [];

  if (oProfileResult.status === 'fulfilled') {
    oState.oProfile = oProfileResult.value.oProfile;
    oState.sPhoto = oProfileResult.value.sPhoto;
  } else {
    oState.oProfile = null;
    oState.sPhoto = '';
    aErrors.push('Profile: ' + getErrorMessage(oProfileResult.reason) + '.');
  }

  if (oEmailResult.status === 'fulfilled') {
    oState.aEmails = oEmailResult.value;
  } else {
    oState.aEmails = [];
    aErrors.push('Emails: ' + getErrorMessage(oEmailResult.reason) + '.');
  }

  if (oMeetingResult.status === 'fulfilled') {
    oState.aMeetings = oMeetingResult.value;
  } else {
    oState.aMeetings = [];
    aErrors.push('Meetings: ' + getErrorMessage(oMeetingResult.reason) + '.');
  }

  oState.aErrors = aErrors;
  oState.bLoading = false;
  oState.bRefreshing = false;
  oState.sUpdatedAt = formatUpdatedAt();
  renderApp();
}

function handleRootClick(oEvent) {
  const eTarget = oEvent.target.closest('[data-action]');
  if (!eTarget) {
    return;
  }

  if (eTarget.dataset.action === 'refresh' && !oState.bRefreshing) {
    refreshDashboard();
  }
}

async function boot() {
  if (!eRoot) {
    return;
  }

  eRoot.addEventListener('click', handleRootClick);
  renderApp();
  await refreshDashboard();
}

boot();