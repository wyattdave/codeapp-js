import { getMyProfile, getUserPhoto } from './connectors/office365users.js';
const eRoot = document.getElementById('root');
const aProfileSelect = [
  'id',
  'displayName',
  'givenName',
  'surname',
  'mail',
  'userPrincipalName',
  'jobTitle',
  'department',
  'officeLocation',
  'mobilePhone',
  'businessPhones',
  'city',
  'state',
  'country',
  'companyName',
  'preferredLanguage'
];

const oState = {
  bLoading: true,
  sError: '',
  oProfile: null,
  sPhotoSrc: '',
  sLastUpdated: ''
};

function escapeHtml(oValue) {
  return String(oValue || '')
    .replace(new RegExp('&', 'g'), '&amp;')
    .replace(new RegExp('<', 'g'), '&lt;')
    .replace(new RegExp('>', 'g'), '&gt;')
    .replace(new RegExp('"', 'g'), '&quot;');
}

function isNonEmptyString(oValue) {
  return typeof oValue === 'string' && oValue.trim() !== '';
}

function toTextOrEmpty(oValue) {
  return isNonEmptyString(oValue) ? oValue.trim() : '';
}

function toArray(oValue) {
  return Array.isArray(oValue) ? oValue.filter(Boolean) : [];
}

function getDisplayName(oProfile) {
  return toTextOrEmpty(oProfile.displayName) || toTextOrEmpty(oProfile.mail) || 'Your profile';
}

function getProfileId(oProfile) {
  return toTextOrEmpty(oProfile.id) || toTextOrEmpty(oProfile.mail) || toTextOrEmpty(oProfile.userPrincipalName);
}

function getInitials(sName) {
  const aParts = String(sName || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (aParts.length === 0) return 'ME';
  return aParts.map(function (sPart) {
    return sPart.charAt(0).toUpperCase();
  }).join('');
}

function getHeadline(oProfile) {
  const aParts = [
    toTextOrEmpty(oProfile.jobTitle),
    toTextOrEmpty(oProfile.department),
    toTextOrEmpty(oProfile.officeLocation)
  ].filter(Boolean);

  return aParts.join(' | ') || 'Signed-in Office 365 profile';
}

function getLocationLabel(oProfile) {
  const aParts = [
    toTextOrEmpty(oProfile.city),
    toTextOrEmpty(oProfile.state),
    toTextOrEmpty(oProfile.country)
  ].filter(Boolean);

  return aParts.join(', ') || 'Location not available';
}

function getPhoneLabel(oProfile) {
  const aBusinessPhones = toArray(oProfile.businessPhones);
  return toTextOrEmpty(oProfile.mobilePhone) || aBusinessPhones.join(', ') || 'No phone listed';
}

function normalizePhotoSource(oPhotoResult) {
  let sValue = '';

  if (typeof oPhotoResult === 'string') {
    sValue = oPhotoResult;
  } else if (oPhotoResult && typeof oPhotoResult === 'object') {
    sValue = toTextOrEmpty(oPhotoResult.value) || toTextOrEmpty(oPhotoResult.$content) || toTextOrEmpty(oPhotoResult.content);
  }

  if (!sValue) return '';
  if (sValue.indexOf('data:') === 0 || sValue.indexOf('blob:') === 0 || sValue.indexOf('http') === 0) return sValue;
  return 'data:image/jpeg;base64,' + sValue;
}

function formatUpdatedTime() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderActionLink(sHref, sLabel) {
  if (!sHref || !sLabel) return '';
  return '<a class="button button-secondary" href="' + escapeHtml(sHref) + '">' + escapeHtml(sLabel) + '</a>';
}

function renderInfoItems(aItems) {
  return aItems.filter(function (oItem) {
    return Boolean(oItem.sValue);
  }).map(function (oItem) {
    let sValueHtml = escapeHtml(oItem.sValue);

    if (oItem.sHref) {
      sValueHtml = '<a href="' + escapeHtml(oItem.sHref) + '">' + sValueHtml + '</a>';
    }

    return '<li class="info-item">'
      + '<span class="info-label">' + escapeHtml(oItem.sLabel) + '</span>'
      + '<div class="info-value">' + sValueHtml + '</div>'
      + '</li>';
  }).join('');
}

function renderSummaryCard(sLabel, sValue, sNote) {
  return '<article class="summary-card">'
    + '<p class="summary-label">' + escapeHtml(sLabel) + '</p>'
    + '<p class="summary-value">' + escapeHtml(sValue) + '</p>'
    + '<p class="summary-note">' + escapeHtml(sNote) + '</p>'
    + '</article>';
}

function bindEvents() {
  const eRefresh = document.getElementById('refreshProfile');
  if (eRefresh) {
    eRefresh.onclick = function () {
      loadProfile();
    };
  }
}

function renderLoading() {
  eRoot.innerHTML = '<section class="status-shell">'
    + '<div class="status-card" role="status" aria-live="polite">'
    + '<p class="eyebrow">Office 365 Users Demo</p>'
    + '<h1 class="status-title">Loading your Microsoft 365 profile</h1>'
    + '<p class="status-text">The app is calling the Office 365 Users connector for your profile details and profile photo.</p>'
    + '<div class="status-actions"><button class="button" id="refreshProfile" disabled>Loading...</button></div>'
    + '</div>'
    + '</section>';
  bindEvents();
}

function renderError() {
  eRoot.innerHTML = '<section class="status-shell">'
    + '<div class="status-card is-error">'
    + '<p class="eyebrow">Office 365 Users Demo</p>'
    + '<h1 class="status-title">Unable to load your profile</h1>'
    + '<p class="status-text">' + escapeHtml(oState.sError) + '</p>'
    + '<div class="status-actions"><button class="button" id="refreshProfile">Try again</button></div>'
    + '</div>'
    + '</section>';
  bindEvents();
}

function renderApp() {
  if (!eRoot) return;

  if (oState.bLoading) {
    renderLoading();
    return;
  }

  if (oState.sError) {
    renderError();
    return;
  }

  const oProfile = oState.oProfile || {};
  const sDisplayName = getDisplayName(oProfile);
  const sHeadline = getHeadline(oProfile);
  const sInitials = getInitials(sDisplayName);
  const aChips = [
    toTextOrEmpty(oProfile.department),
    toTextOrEmpty(oProfile.officeLocation),
    toTextOrEmpty(oProfile.companyName),
    toTextOrEmpty(oProfile.preferredLanguage)
  ].filter(Boolean);
  const aIdentityItems = [
    { sLabel: 'Name', sValue: sDisplayName },
    { sLabel: 'Job title', sValue: toTextOrEmpty(oProfile.jobTitle) || 'Not listed' },
    { sLabel: 'Department', sValue: toTextOrEmpty(oProfile.department) || 'Not listed' },
    { sLabel: 'Company', sValue: toTextOrEmpty(oProfile.companyName) || 'Not listed' }
  ];
  const aContactItems = [
    { sLabel: 'Email', sValue: toTextOrEmpty(oProfile.mail), sHref: toTextOrEmpty(oProfile.mail) ? 'mailto:' + toTextOrEmpty(oProfile.mail) : '' },
    { sLabel: 'Mobile phone', sValue: toTextOrEmpty(oProfile.mobilePhone), sHref: toTextOrEmpty(oProfile.mobilePhone) ? 'tel:' + toTextOrEmpty(oProfile.mobilePhone) : '' },
    { sLabel: 'Business phones', sValue: toArray(oProfile.businessPhones).join(', ') },
    { sLabel: 'User principal name', sValue: toTextOrEmpty(oProfile.userPrincipalName) }
  ];
  const aWorkItems = [
    { sLabel: 'Office', sValue: toTextOrEmpty(oProfile.officeLocation) || 'Not listed' },
    { sLabel: 'Location', sValue: getLocationLabel(oProfile) },
    { sLabel: 'Preferred language', sValue: toTextOrEmpty(oProfile.preferredLanguage) || 'Not listed' },
    { sLabel: 'Profile photo', sValue: oState.sPhotoSrc ? 'Available' : 'Not available' }
  ];
  const iFilledFields = aProfileSelect.reduce(function (iCount, sKey) {
    const oValue = oProfile[sKey];
    if (Array.isArray(oValue)) return iCount + (oValue.filter(Boolean).length > 0 ? 1 : 0);
    return iCount + (toTextOrEmpty(oValue) ? 1 : 0);
  }, 0);
  const sEmailHref = toTextOrEmpty(oProfile.mail) ? 'mailto:' + toTextOrEmpty(oProfile.mail) : '';
  const sPhotoMarkup = oState.sPhotoSrc
    ? '<img class="photo-image" src="' + escapeHtml(oState.sPhotoSrc) + '" alt="' + escapeHtml(sDisplayName) + ' profile photo" />'
    : '<div class="photo-fallback" aria-label="Avatar fallback">' + escapeHtml(sInitials) + '</div>';
  const sChipMarkup = aChips.map(function (sChip) {
    return '<li class="hero-chip">' + escapeHtml(sChip) + '</li>';
  }).join('');

  eRoot.innerHTML = '<main class="page-shell">'
    + '<section class="hero-card">'
    + '<div class="photo-column">'
    + '<div class="photo-frame">' + sPhotoMarkup + '</div>'
    + '<div class="photo-caption">'
    + '<p class="caption-label">Profile image</p>'
    + '<p class="caption-value">' + escapeHtml(oState.sPhotoSrc ? 'Synced from Office 365 Users' : 'Using initials fallback') + '</p>'
    + '</div>'
    + '</div>'
    + '<div class="hero-copy">'
    + '<p class="eyebrow">Office 365 Users Demo</p>'
    + '<h1 class="hero-title">' + escapeHtml(sDisplayName) + '</h1>'
    + '<p class="hero-subtitle">' + escapeHtml(sHeadline) + '</p>'
    + '<ul class="hero-chips">' + sChipMarkup + '</ul>'
    + '<div class="action-row">'
    + '<button class="button" id="refreshProfile">Refresh profile</button>'
    + renderActionLink(sEmailHref, 'Email me')
    + '</div>'
    + '</div>'
    + '</section>'
    + '<section class="summary-grid">'
    + renderSummaryCard('Fields loaded', String(iFilledFields), 'Values returned across the selected Office 365 profile fields.')
    + renderSummaryCard('Best contact', getPhoneLabel(oProfile), 'Primary phone detail chosen from mobile or business phone fields.')
    + renderSummaryCard('Last updated', oState.sLastUpdated || '--:--', 'Timestamp from the latest successful connector refresh in this session.')
    + '</section>'
    + '<section class="detail-grid">'
    + '<article class="panel">'
    + '<h2 class="panel-title">Identity</h2>'
    + '<p class="panel-text">The essentials returned for the signed-in user account.</p>'
    + '<ul class="info-list">' + renderInfoItems(aIdentityItems) + '</ul>'
    + '</article>'
    + '<article class="panel">'
    + '<h2 class="panel-title">Contact</h2>'
    + '<p class="panel-text">Direct contact values from the Office 365 Users connector response.</p>'
    + '<ul class="info-list">' + renderInfoItems(aContactItems) + '</ul>'
    + '</article>'
    + '<article class="panel panel-accent">'
    + '<h2 class="panel-title">Account Snapshot</h2>'
    + '<p class="panel-text">A small readout of the fields that usually matter first in a profile demo.</p>'
    + '<div class="account-highlight">'
    + '<div class="highlight-item"><p class="highlight-label">Office</p><p class="highlight-value">' + escapeHtml(toTextOrEmpty(oProfile.officeLocation) || 'No office listed') + '</p></div>'
    + '<div class="highlight-item"><p class="highlight-label">Location</p><p class="highlight-value">' + escapeHtml(getLocationLabel(oProfile)) + '</p></div>'
    + '<div class="highlight-item"><p class="highlight-label">Profile status</p><p class="highlight-value">' + escapeHtml(oState.sPhotoSrc ? 'Photo and key fields available' : 'Key fields available, photo fallback active') + '</p></div>'
    + '</div>'
    + '<ul class="info-list">' + renderInfoItems(aWorkItems) + '</ul>'
    + '<p class="footer-note">The demo reads your signed-in profile and converts the returned photo payload into an image source when a photo is available.</p>'
    + '</article>'
    + '</section>'
    + '</main>';

  bindEvents();
}

async function loadProfile() {
  oState.bLoading = true;
  oState.sError = '';
  renderApp();

  try {
    const oProfile = await getMyProfile({ select: aProfileSelect });
    const sUserId = getProfileId(oProfile);
    let sPhotoSrc = '';

    if (sUserId) {
      try {
        const oPhotoResult = await getUserPhoto(sUserId);
        sPhotoSrc = normalizePhotoSource(oPhotoResult);
      } catch (oPhotoError) {
        sPhotoSrc = '';
      }
    }

    oState.oProfile = oProfile;
    oState.sPhotoSrc = sPhotoSrc;
    oState.sLastUpdated = formatUpdatedTime();
  } catch (oError) {
    oState.sError = oError && oError.message ? oError.message : 'An unexpected error occurred while loading your Office 365 profile.';
  } finally {
    oState.bLoading = false;
    renderApp();
  }
}

async function boot() {
  renderApp();
  await loadProfile();
}

boot();