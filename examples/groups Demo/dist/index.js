import { listMyGroups } from './office365groups.js';
import { enableDebugger } from "./codeapp.js";

enableDebugger();

const eRoot = document.getElementById('root');

const oState = {
  aGroups: [],
  bLoading: false,
  sSearch: '',
  sStatusTone: 'loading',
  sStatusTitle: 'Loading groups',
  sStatusMessage: 'Reading your Office 365 Groups membership from the local connector wrapper.',
  sStatusDetail: '',
  sLastLoadedAt: '',
};

function escapeHtml(sValue) {
  return String(sValue || '')
    .replace(new RegExp('&', 'g'), '&amp;')
    .replace(new RegExp('<', 'g'), '&lt;')
    .replace(new RegExp('>', 'g'), '&gt;')
    .replace(new RegExp('"', 'g'), '&quot;')
    .replace(new RegExp("'", 'g'), '&#39;');
}

function normalizeGroupsResponse(oPayload) {
  const aCandidates = [
    oPayload,
    oPayload && oPayload.value,
    oPayload && oPayload.body,
    oPayload && oPayload.body && oPayload.body.value,
    oPayload && oPayload.data,
    oPayload && oPayload.data && oPayload.data.value,
    oPayload && oPayload.result,
    oPayload && oPayload.result && oPayload.result.value,
  ];

  const aMatch = aCandidates.find(function(oCandidate) {
    return Array.isArray(oCandidate);
  });

  return Array.isArray(aMatch) ? aMatch : [];
}

function normalizeGroup(oGroup) {
  const sDisplayName = String(oGroup && oGroup.displayName ? oGroup.displayName : 'Untitled group');
  const sDescription = String(oGroup && oGroup.description ? oGroup.description : 'No description available.');
  const sVisibility = String(oGroup && oGroup.visibility ? oGroup.visibility : 'Unknown');
  const sMail = String(oGroup && oGroup.mail ? oGroup.mail : '');
  const sClassification = String(oGroup && oGroup.classification ? oGroup.classification : 'Unclassified');
  const sCreatedDateTime = String(oGroup && oGroup.createdDateTime ? oGroup.createdDateTime : '');

  return {
    sId: String(oGroup && oGroup.id ? oGroup.id : sDisplayName),
    sDisplayName: sDisplayName,
    sDescription: sDescription,
    sVisibility: sVisibility,
    sMail: sMail,
    sClassification: sClassification,
    sCreatedDateTime: sCreatedDateTime,
    bMailEnabled: Boolean(oGroup && oGroup.mailEnabled),
    bSecurityEnabled: Boolean(oGroup && oGroup.securityEnabled),
  };
}

function formatDate(sValue) {
  if (!sValue) {
    return 'Not provided';
  }

  const oDate = new Date(sValue);
  if (Number.isNaN(oDate.getTime())) {
    return sValue;
  }

  return oDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function setStatus(sTone, sTitle, sMessage, sDetail) {
  oState.sStatusTone = sTone;
  oState.sStatusTitle = sTitle;
  oState.sStatusMessage = sMessage;
  oState.sStatusDetail = sDetail || '';
}

function getFilteredGroups() {
  const sNeedle = oState.sSearch.trim().toLowerCase();

  if (!sNeedle) {
    return oState.aGroups.slice();
  }

  return oState.aGroups.filter(function(oGroup) {
    const aHaystack = [
      oGroup.sDisplayName,
      oGroup.sDescription,
      oGroup.sMail,
      oGroup.sVisibility,
      oGroup.sClassification,
    ];

    return aHaystack.some(function(sValue) {
      return String(sValue || '').toLowerCase().indexOf(sNeedle) !== -1;
    });
  });
}

function getMetrics() {
  const iTotal = oState.aGroups.length;
  const iMailEnabled = oState.aGroups.filter(function(oGroup) {
    return oGroup.bMailEnabled;
  }).length;
  const iPrivate = oState.aGroups.filter(function(oGroup) {
    return oGroup.sVisibility.toLowerCase() === 'private';
  }).length;

  return {
    iTotal: iTotal,
    iMailEnabled: iMailEnabled,
    iPrivate: iPrivate,
  };
}

function getStatusMark() {
  if (oState.sStatusTone === 'error') {
    return '!';
  }

  if (oState.sStatusTone === 'success') {
    return 'OK';
  }

  if (oState.sStatusTone === 'loading') {
    return '...';
  }

  return 'i';
}

function renderGroups() {
  const aGroups = getFilteredGroups();

  if (!aGroups.length) {
    if (oState.aGroups.length && oState.sSearch.trim()) {
      return [
        '<div class="empty-state">',
        '<strong>No groups match this filter.</strong>',
        '<div>Try a different keyword or clear the search box to see every group the connector returned.</div>',
        '</div>',
      ].join('');
    }

    return [
      '<div class="empty-state">',
      '<strong>No groups returned.</strong>',
      '<div>If you expected results, confirm the signed-in user is a member of one or more Microsoft 365 groups and refresh the page.</div>',
      '</div>',
    ].join('');
  }

  return [
    '<div class="group-grid">',
    aGroups.map(function(oGroup) {
      const aTags = [];

      aTags.push('<span class="tag">' + escapeHtml(oGroup.sVisibility) + '</span>');
      aTags.push('<span class="tag">' + escapeHtml(oGroup.sClassification) + '</span>');
      aTags.push('<span class="tag">' + (oGroup.bMailEnabled ? 'Mail enabled' : 'No mailbox') + '</span>');
      aTags.push('<span class="tag">' + (oGroup.bSecurityEnabled ? 'Security enabled' : 'Not security enabled') + '</span>');

      return [
        '<article class="group-card">',
        '<div class="card-top">',
        '<div class="card-kicker">Member group</div>',
        '<h3 class="card-title">' + escapeHtml(oGroup.sDisplayName) + '</h3>',
        '<p class="card-description">' + escapeHtml(oGroup.sDescription) + '</p>',
        '</div>',
        '<div class="tag-row">' + aTags.join('') + '</div>',
        '<div class="meta-list">',
        '<div class="meta-row"><span>Mailbox</span>' + (oGroup.sMail ? '<a href="mailto:' + encodeURIComponent(oGroup.sMail) + '">' + escapeHtml(oGroup.sMail) + '</a>' : '<strong>No group mailbox</strong>') + '</div>',
        '<div class="meta-row"><span>Created</span><strong>' + escapeHtml(formatDate(oGroup.sCreatedDateTime)) + '</strong></div>',
        '<div class="meta-row"><span>Group id</span><strong>' + escapeHtml(oGroup.sId) + '</strong></div>',
        '</div>',
        '</article>',
      ].join('');
    }).join(''),
    '</div>',
  ].join('');
}

function renderApp() {
  if (!eRoot) {
    return;
  }

  const oMetrics = getMetrics();
  const iVisibleGroups = getFilteredGroups().length;
  const sRefreshLabel = oState.sLastLoadedAt ? oState.sLastLoadedAt : 'Not loaded yet';

  eRoot.innerHTML = [
    '<main class="app-shell">',
    '<section class="hero">',
    '<div>',
    '<p class="eyebrow">Office 365 Groups demo</p>',
    '<h1>Your group memberships</h1>',
    '<p>This page uses the local <strong>office365groups</strong> wrapper and the signed-in Power Apps connection to list every Microsoft 365 group the current user belongs to.</p>',
    '</div>',
    '<div class="hero-meta">',
    '<div class="meta-card"><span class="meta-label">App</span><div class="meta-value">test groups app</div></div>',
    '<div class="meta-card"><span class="meta-label">Connection</span><div class="meta-value">Office 365 Groups connector via <strong>listMyGroups({ version: 3 })</strong></div></div>',
    '<div class="meta-card"><span class="meta-label">Last refresh</span><div class="meta-value">' + escapeHtml(sRefreshLabel) + '</div></div>',
    '</div>',
    '</section>',
    '<section class="toolbar">',
    '<div class="toolbar-copy">',
    '<strong>Filter the returned groups</strong>',
    '<span>Search by display name, description, mailbox, visibility, or classification.</span>',
    '</div>',
    '<div class="toolbar-actions">',
    '<input class="search-input" id="group-search" type="search" placeholder="Search groups" value="' + escapeHtml(oState.sSearch) + '" />',
    '<button class="button" id="refresh-groups" type="button" ' + (oState.bLoading ? 'disabled' : '') + '>' + (oState.bLoading ? 'Loading...' : 'Refresh groups') + '</button>',
    '</div>',
    '</section>',
    '<section class="metrics">',
    '<article class="metric"><span class="metric-label">All groups</span><strong class="metric-value">' + oMetrics.iTotal + '</strong></article>',
    '<article class="metric"><span class="metric-label">Mail enabled</span><strong class="metric-value">' + oMetrics.iMailEnabled + '</strong></article>',
    '<article class="metric"><span class="metric-label">Visible now</span><strong class="metric-value">' + iVisibleGroups + '</strong></article>',
    '</section>',
    '<section class="status" data-tone="' + escapeHtml(oState.sStatusTone) + '">',
    '<div class="status-mark">' + escapeHtml(getStatusMark()) + '</div>',
    '<div class="status-copy">',
    '<strong>' + escapeHtml(oState.sStatusTitle) + '</strong>',
    '<p>' + escapeHtml(oState.sStatusMessage) + '</p>',
    (oState.sStatusDetail ? '<pre>' + escapeHtml(oState.sStatusDetail) + '</pre>' : ''),
    '</div>',
    '</section>',
    '<section>',
    '<div class="section-head">',
    '<div>',
    '<h2>Groups</h2>',
    '<p>Private groups: ' + oMetrics.iPrivate + '</p>',
    '</div>',
    '</div>',
    renderGroups(),
    '<p class="footer-note">This demo uses the local wrapper with generated connector metadata so the runtime can resolve the Office 365 Groups operations correctly.</p>',
    '</section>',
    '</main>',
  ].join('');

  const eSearch = document.getElementById('group-search');
  const eRefresh = document.getElementById('refresh-groups');

  if (eSearch) {
    eSearch.addEventListener('input', function(oEvent) {
      oState.sSearch = oEvent.target.value;
      renderApp();
    });
  }

  if (eRefresh) {
    eRefresh.addEventListener('click', function() {
      loadGroups();
    });
  }
}

async function loadGroups() {
  oState.bLoading = true;
  setStatus('loading', 'Loading groups', 'Reading your Office 365 Groups membership from the connector.', '');
  renderApp();

  try {
    const oPayload = await listMyGroups({ version: 3 });
    const aGroups = normalizeGroupsResponse(oPayload)
      .map(normalizeGroup)
      .sort(function(oLeft, oRight) {
        return oLeft.sDisplayName.localeCompare(oRight.sDisplayName);
      });

    oState.aGroups = aGroups;
    oState.sLastLoadedAt = new Date().toLocaleTimeString();
    setStatus('success', 'Groups loaded', 'The page loaded ' + aGroups.length + ' group memberships for the signed-in user.', '');
  } catch (oError) {
    const sMessage = oError && oError.message ? oError.message : String(oError);
    oState.aGroups = [];
    setStatus('error', 'Unable to load groups', 'The connector call failed. Review the error detail below and confirm the Office 365 Groups connection is available for this app.', sMessage);
  }

  oState.bLoading = false;
  renderApp();
}

async function boot() {
  renderApp();
  await loadGroups();
}

boot();