
import {
  addMemberToGroup,
  createGroupEvent,
  deleteGroupEvent,
  listDeletedGroups,
  listDeletedGroupsByOwner,
  listGroupMembers,
  listGroups,
  listMyGroups,
  openGroupsHttpRequest,
  removeMemberFromGroup,
  restoreDeletedGroup,
  updateGroupEvent,
} from './codeapp.js';

const oElements = {};
const oState = {
  aOwnedGroups: [],
  aDirectoryGroups: [],
  aDeletedGroups: [],
  aMembers: [],
  oSelectedGroup: null,
  oDiagnostic: null,
  sActiveCollection: 'owned',
};

function getElement(sId) {
  return document.getElementById(sId);
}

function cacheElements() {
  oElements.eAppStatus = getElement('appStatus');
  oElements.eOwnedVersion = getElement('ownedVersion');
  oElements.eOwnedSensitivity = getElement('ownedSensitivity');
  oElements.eOwnedMetadata = getElement('ownedMetadata');
  oElements.eLoadOwnedButton = getElement('loadOwnedButton');
  oElements.eDirectoryFilter = getElement('directoryFilter');
  oElements.eDirectoryTop = getElement('directoryTop');
  oElements.eLoadDirectoryButton = getElement('loadDirectoryButton');
  oElements.eDeletedOwnerId = getElement('deletedOwnerId');
  oElements.eLoadDeletedButton = getElement('loadDeletedButton');
  oElements.eLoadDeletedByOwnerButton = getElement('loadDeletedByOwnerButton');
  oElements.eHttpVersion = getElement('httpVersion');
  oElements.eLoadHttpButton = getElement('loadHttpButton');
  oElements.eSelectedGroupId = getElement('selectedGroupId');
  oElements.eMemberUpn = getElement('memberUpn');
  oElements.eAddMemberButton = getElement('addMemberButton');
  oElements.eRemoveMemberButton = getElement('removeMemberButton');
  oElements.eEventGroupId = getElement('eventGroupId');
  oElements.eEventId = getElement('eventId');
  oElements.eEventVersion = getElement('eventVersion');
  oElements.eEventSubject = getElement('eventSubject');
  oElements.eEventStart = getElement('eventStart');
  oElements.eEventEnd = getElement('eventEnd');
  oElements.eEventTimeZone = getElement('eventTimeZone');
  oElements.eEventBody = getElement('eventBody');
  oElements.eCreateEventButton = getElement('createEventButton');
  oElements.eUpdateEventButton = getElement('updateEventButton');
  oElements.eDeleteEventButton = getElement('deleteEventButton');
  oElements.eRestoreGroupId = getElement('restoreGroupId');
  oElements.eRestoreDeletedButton = getElement('restoreDeletedButton');
  oElements.eOwnedCount = getElement('ownedCount');
  oElements.eDirectoryCount = getElement('directoryCount');
  oElements.eMemberCount = getElement('memberCount');
  oElements.eDeletedCount = getElement('deletedCount');
  oElements.eCollectionTitle = getElement('collectionTitle');
  oElements.eGroupGrid = getElement('groupGrid');
  oElements.eLoadMembersButton = getElement('loadMembersButton');
  oElements.eGroupDetail = getElement('groupDetail');
  oElements.eMemberListTitle = getElement('memberListTitle');
  oElements.eMemberList = getElement('memberList');
  oElements.eClearMembersButton = getElement('clearMembersButton');
  oElements.eDiagnosticOutput = getElement('diagnosticOutput');
  oElements.eClearDiagnosticsButton = getElement('clearDiagnosticsButton');
}

function setStatus(sMessage, sTone) {
  if (!oElements.eAppStatus) {
    return;
  }

  oElements.eAppStatus.textContent = sMessage;
  oElements.eAppStatus.className = 'statusLine ' + (sTone || 'pending');
}

function normalizePayload(oValue) {
  if (oValue === undefined || oValue === null) {
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

  return oValue;
}

function normalizeArray(oValue) {
  const oPayload = normalizePayload(oValue);

  if (Array.isArray(oPayload)) {
    return oPayload;
  }

  if (oPayload && Array.isArray(oPayload.value)) {
    return oPayload.value;
  }

  if (oPayload && Array.isArray(oPayload.data)) {
    return oPayload.data;
  }

  if (oPayload && Array.isArray(oPayload.groups)) {
    return oPayload.groups;
  }

  if (oPayload && Array.isArray(oPayload.members)) {
    return oPayload.members;
  }

  return [];
}

function parseIntegerValue(sValue) {
  const iValue = Number.parseInt(String(sValue || '').trim(), 10);
  return Number.isNaN(iValue) ? undefined : iValue;
}

function formatJson(oValue) {
  const oPayload = normalizePayload(oValue);

  try {
    return JSON.stringify(oPayload, null, 2);
  } catch (oErr) {
    return String(oPayload);
  }
}

function getGroupId(oGroup) {
  if (!oGroup || typeof oGroup !== 'object') {
    return '';
  }

  return String(oGroup.id || oGroup.groupId || '');
}

function getGroupName(oGroup) {
  if (!oGroup || typeof oGroup !== 'object') {
    return 'Unnamed group';
  }

  return oGroup.displayName || oGroup.name || oGroup.mailNickname || getGroupId(oGroup) || 'Unnamed group';
}

function getGroupSummary(oGroup) {
  const aParts = [
    oGroup.mail || '',
    oGroup.visibility || '',
    oGroup.classification || '',
  ].filter(Boolean);

  return aParts.join(' | ');
}

function getActiveGroups() {
  if (oState.sActiveCollection === 'directory') {
    return oState.aDirectoryGroups;
  }

  if (oState.sActiveCollection === 'deleted') {
    return oState.aDeletedGroups;
  }

  return oState.aOwnedGroups;
}

function renderMetrics() {
  if (oElements.eOwnedCount) {
    oElements.eOwnedCount.textContent = String(oState.aOwnedGroups.length);
  }
  if (oElements.eDirectoryCount) {
    oElements.eDirectoryCount.textContent = String(oState.aDirectoryGroups.length);
  }
  if (oElements.eMemberCount) {
    oElements.eMemberCount.textContent = String(oState.aMembers.length);
  }
  if (oElements.eDeletedCount) {
    oElements.eDeletedCount.textContent = String(oState.aDeletedGroups.length);
  }
}

function renderDiagnostics() {
  if (!oElements.eDiagnosticOutput) {
    return;
  }

  if (!oState.oDiagnostic) {
    oElements.eDiagnosticOutput.textContent = 'Run a smoke test action to inspect the connector payload.';
    return;
  }

  oElements.eDiagnosticOutput.textContent = formatJson(oState.oDiagnostic);
}

function syncSelectedInputs() {
  const sGroupId = oState.oSelectedGroup ? getGroupId(oState.oSelectedGroup) : '';

  if (oElements.eSelectedGroupId && !oElements.eSelectedGroupId.matches(':focus')) {
    oElements.eSelectedGroupId.value = sGroupId;
  }

  if (oElements.eEventGroupId && !oElements.eEventGroupId.matches(':focus')) {
    oElements.eEventGroupId.value = sGroupId;
  }

  if (oElements.eRestoreGroupId && oState.sActiveCollection === 'deleted' && sGroupId && !oElements.eRestoreGroupId.matches(':focus')) {
    oElements.eRestoreGroupId.value = sGroupId;
  }
}

function createDetailPair(sLabel, sValue) {
  const eWrap = document.createElement('div');
  const eLabel = document.createElement('span');
  const eValue = document.createElement('strong');

  eWrap.className = 'detailPair';
  eLabel.textContent = sLabel;
  eValue.textContent = sValue || 'Not returned';

  eWrap.appendChild(eLabel);
  eWrap.appendChild(eValue);
  return eWrap;
}

function renderGroupDetail() {
  if (!oElements.eGroupDetail) {
    return;
  }

  oElements.eGroupDetail.innerHTML = '';

  if (!oState.oSelectedGroup) {
    oElements.eGroupDetail.className = 'detailCard emptyState';
    oElements.eGroupDetail.textContent = 'Select a group to inspect its details and reuse its ID for member or event checks.';
    syncSelectedInputs();
    return;
  }

  oElements.eGroupDetail.className = 'detailCard';

  const eTitle = document.createElement('h3');
  const eMeta = document.createElement('p');
  const eDescription = document.createElement('p');
  const eGrid = document.createElement('div');

  eTitle.textContent = getGroupName(oState.oSelectedGroup);
  eMeta.className = 'detailMeta';
  eMeta.textContent = getGroupSummary(oState.oSelectedGroup) || 'No summary fields returned.';
  eDescription.className = 'detailMeta';
  eDescription.textContent = oState.oSelectedGroup.description || 'No description returned.';
  eGrid.className = 'detailGrid';

  [
    ['Group ID', getGroupId(oState.oSelectedGroup)],
    ['Mail nickname', oState.oSelectedGroup.mailNickname || ''],
    ['Created', oState.oSelectedGroup.createdDateTime || ''],
    ['Renewed', oState.oSelectedGroup.renewedDateTime || ''],
    ['Deleted', oState.oSelectedGroup.deletedDateTime || ''],
    ['Security enabled', String(oState.oSelectedGroup.securityEnabled)],
  ].forEach((aPair) => {
    eGrid.appendChild(createDetailPair(aPair[0], aPair[1]));
  });

  oElements.eGroupDetail.appendChild(eTitle);
  oElements.eGroupDetail.appendChild(eMeta);
  oElements.eGroupDetail.appendChild(eDescription);
  oElements.eGroupDetail.appendChild(eGrid);

  syncSelectedInputs();
}

function renderGroups() {
  const aGroups = getActiveGroups();
  const oCollectionLabels = {
    owned: 'Owned groups',
    directory: 'Organization groups',
    deleted: 'Deleted groups',
  };

  if (oElements.eCollectionTitle) {
    oElements.eCollectionTitle.textContent = oCollectionLabels[oState.sActiveCollection] || 'Groups';
  }

  if (!oElements.eGroupGrid) {
    return;
  }

  oElements.eGroupGrid.innerHTML = '';

  if (!Array.isArray(aGroups) || aGroups.length === 0) {
    const eEmpty = document.createElement('div');
    eEmpty.className = 'detailCard emptyState';
    eEmpty.textContent = 'This collection is empty. Run another query or adjust the filters.';
    oElements.eGroupGrid.appendChild(eEmpty);
    return;
  }

  aGroups.forEach((oGroup) => {
    const eCard = document.createElement('button');
    const eTitle = document.createElement('h3');
    const eMeta = document.createElement('p');
    const eDescription = document.createElement('p');

    eCard.type = 'button';
    eCard.className = 'groupCard' + (getGroupId(oGroup) === getGroupId(oState.oSelectedGroup) ? ' isSelected' : '');
    eTitle.textContent = getGroupName(oGroup);
    eMeta.className = 'groupMeta';
    eMeta.textContent = getGroupSummary(oGroup) || 'No summary fields returned.';
    eDescription.className = 'groupMeta';
    eDescription.textContent = oGroup.description || 'No description returned.';

    eCard.appendChild(eTitle);
    eCard.appendChild(eMeta);
    eCard.appendChild(eDescription);
    eCard.addEventListener('click', () => {
      oState.oSelectedGroup = oGroup;
      renderGroups();
      renderGroupDetail();
    });

    oElements.eGroupGrid.appendChild(eCard);
  });
}

function renderMembers() {
  if (oElements.eMemberListTitle) {
    oElements.eMemberListTitle.textContent = oState.aMembers.length > 0 ? String(oState.aMembers.length) + ' loaded' : 'Not loaded';
  }

  if (!oElements.eMemberList) {
    return;
  }

  oElements.eMemberList.innerHTML = '';

  if (!Array.isArray(oState.aMembers) || oState.aMembers.length === 0) {
    oElements.eMemberList.className = 'memberList emptyState';
    oElements.eMemberList.textContent = 'Run a member lookup to populate this panel.';
    return;
  }

  oElements.eMemberList.className = 'memberList';
  oState.aMembers.forEach((oMember) => {
    const eRow = document.createElement('div');
    const eName = document.createElement('h3');
    const eMeta = document.createElement('p');

    eRow.className = 'memberRow';
    eName.textContent = oMember.displayName || oMember.userPrincipalName || oMember.mail || oMember.id || 'Unnamed member';
    eMeta.className = 'memberMeta';
    eMeta.textContent = [
      oMember.mail || '',
      oMember.userPrincipalName || '',
      oMember.jobTitle || '',
    ].filter(Boolean).join(' | ');

    eRow.appendChild(eName);
    eRow.appendChild(eMeta);
    oElements.eMemberList.appendChild(eRow);
  });
}

function renderAll() {
  renderMetrics();
  renderGroups();
  renderGroupDetail();
  renderMembers();
  renderDiagnostics();
}

async function runAction(sAction, fnAction) {
  setStatus(sAction + ' in progress...', 'pending');

  try {
    const oResult = await fnAction();
    oState.oDiagnostic = {
      action: sAction,
      timestamp: new Date().toISOString(),
      result: normalizePayload(oResult),
    };
    renderDiagnostics();
    setStatus(sAction + ' completed.', 'success');
    return oResult;
  } catch (oErr) {
    const sMessage = oErr && oErr.message ? oErr.message : String(oErr);
    oState.oDiagnostic = {
      action: sAction,
      timestamp: new Date().toISOString(),
      error: sMessage,
    };
    renderDiagnostics();
    setStatus(sAction + ' failed: ' + sMessage, 'error');
    throw oErr;
  }
}

function selectFirstGroupIfNeeded(aGroups) {
  if (!Array.isArray(aGroups) || aGroups.length === 0) {
    oState.oSelectedGroup = null;
    return;
  }

  const sCurrentId = getGroupId(oState.oSelectedGroup);
  const oMatch = aGroups.find((oGroup) => getGroupId(oGroup) === sCurrentId);
  oState.oSelectedGroup = oMatch || aGroups[0];
}

function getSelectedGroupId() {
  return String((oElements.eSelectedGroupId && oElements.eSelectedGroupId.value) || getGroupId(oState.oSelectedGroup) || '').trim();
}

function getEventGroupId() {
  return String((oElements.eEventGroupId && oElements.eEventGroupId.value) || getSelectedGroupId()).trim();
}

function buildEventOptions() {
  const sSubject = String((oElements.eEventSubject && oElements.eEventSubject.value) || '').trim();
  const sStart = String((oElements.eEventStart && oElements.eEventStart.value) || '').trim();
  const sEnd = String((oElements.eEventEnd && oElements.eEventEnd.value) || '').trim();
  const sTimeZone = String((oElements.eEventTimeZone && oElements.eEventTimeZone.value) || '').trim();
  const sBody = String((oElements.eEventBody && oElements.eEventBody.value) || '').trim();
  const iVersion = parseIntegerValue(oElements.eEventVersion && oElements.eEventVersion.value) || 2;

  if (!sSubject || !sStart || !sEnd || !sTimeZone) {
    throw new Error('Subject, start, end, and time zone are required for group event tests.');
  }

  return {
    version: iVersion,
    subject: sSubject,
    start: {
      dateTime: sStart,
      timeZone: sTimeZone,
    },
    end: {
      dateTime: sEnd,
      timeZone: sTimeZone,
    },
    body: {
      content: sBody,
      contentType: 'Html',
    },
  };
}

async function loadOwnedGroups() {
  const oOptions = {
    version: parseIntegerValue(oElements.eOwnedVersion && oElements.eOwnedVersion.value) || 3,
    extractSensitivityLabel: !!(oElements.eOwnedSensitivity && oElements.eOwnedSensitivity.checked),
    fetchSensitivityLabelMetadata: !!(oElements.eOwnedMetadata && oElements.eOwnedMetadata.checked),
  };

  const oResult = await runAction('Load my groups', () => listMyGroups(oOptions));
  oState.aOwnedGroups = normalizeArray(oResult);
  oState.sActiveCollection = 'owned';
  selectFirstGroupIfNeeded(oState.aOwnedGroups);
  renderAll();
}

async function loadDirectoryGroups() {
  const oOptions = {
    filter: String((oElements.eDirectoryFilter && oElements.eDirectoryFilter.value) || '').trim() || undefined,
    top: parseIntegerValue(oElements.eDirectoryTop && oElements.eDirectoryTop.value),
  };

  const oResult = await runAction('Search organization groups', () => listGroups(oOptions));
  oState.aDirectoryGroups = normalizeArray(oResult);
  oState.sActiveCollection = 'directory';
  selectFirstGroupIfNeeded(oState.aDirectoryGroups);
  renderAll();
}

async function loadDeletedGroupResults() {
  const oResult = await runAction('List deleted groups', () => listDeletedGroups());
  oState.aDeletedGroups = normalizeArray(oResult);
  oState.sActiveCollection = 'deleted';
  selectFirstGroupIfNeeded(oState.aDeletedGroups);
  renderAll();
}

async function loadDeletedGroupsForOwner() {
  const sOwnerId = String((oElements.eDeletedOwnerId && oElements.eDeletedOwnerId.value) || '').trim();

  if (!sOwnerId) {
    throw new Error('Enter a user ID or UPN before loading deleted groups by owner.');
  }

  const oResult = await runAction('List deleted groups by owner', () => listDeletedGroupsByOwner(sOwnerId));
  oState.aDeletedGroups = normalizeArray(oResult);
  oState.sActiveCollection = 'deleted';
  selectFirstGroupIfNeeded(oState.aDeletedGroups);
  renderAll();
}

async function runRawHttpCheck() {
  const iVersion = parseIntegerValue(oElements.eHttpVersion && oElements.eHttpVersion.value) || 1;
  await runAction('Run raw /groups request', () => openGroupsHttpRequest({
    method: 'GET',
    uri: '/groups?$top=10',
    version: iVersion,
    headers: iVersion === 2 ? { ConsistencyLevel: 'eventual' } : {},
  }));
}

async function loadSelectedGroupMembers() {
  const sGroupId = getSelectedGroupId();

  if (!sGroupId) {
    throw new Error('Select a group or paste a group ID before loading members.');
  }

  const oResult = await runAction('Load group members', () => listGroupMembers(sGroupId, { top: 25 }));
  oState.aMembers = normalizeArray(oResult);
  renderAll();
}

async function addGroupMember() {
  const sGroupId = getSelectedGroupId();
  const sMemberUpn = String((oElements.eMemberUpn && oElements.eMemberUpn.value) || '').trim();

  if (!sGroupId || !sMemberUpn) {
    throw new Error('Provide both a group ID and a member UPN before adding a member.');
  }

  await runAction('Add member to group', () => addMemberToGroup(sMemberUpn, sGroupId));
  await loadSelectedGroupMembers();
}

async function removeGroupMember() {
  const sGroupId = getSelectedGroupId();
  const sMemberUpn = String((oElements.eMemberUpn && oElements.eMemberUpn.value) || '').trim();

  if (!sGroupId || !sMemberUpn) {
    throw new Error('Provide both a group ID and a member UPN before removing a member.');
  }

  await runAction('Remove member from group', () => removeMemberFromGroup(sMemberUpn, sGroupId));
  await loadSelectedGroupMembers();
}

async function createEventForGroup() {
  const sGroupId = getEventGroupId();

  if (!sGroupId) {
    throw new Error('Provide a group ID before creating an event.');
  }

  await runAction('Create group event', () => createGroupEvent(sGroupId, buildEventOptions()));
}

async function updateEventForGroup() {
  const sGroupId = getEventGroupId();
  const sEventId = String((oElements.eEventId && oElements.eEventId.value) || '').trim();

  if (!sGroupId || !sEventId) {
    throw new Error('Provide both a group ID and an event ID before updating an event.');
  }

  await runAction('Update group event', () => updateGroupEvent(sEventId, buildEventOptions(), sGroupId));
}

async function deleteEventForGroup() {
  const sGroupId = getEventGroupId();
  const sEventId = String((oElements.eEventId && oElements.eEventId.value) || '').trim();

  if (!sGroupId || !sEventId) {
    throw new Error('Provide both a group ID and an event ID before deleting an event.');
  }

  await runAction('Delete group event', () => deleteGroupEvent(sEventId, sGroupId));
}

async function restoreDeletedGroupEntry() {
  const sGroupId = String((oElements.eRestoreGroupId && oElements.eRestoreGroupId.value) || '').trim();

  if (!sGroupId) {
    throw new Error('Provide a deleted group ID before restoring it.');
  }

  await runAction('Restore deleted group', () => restoreDeletedGroup(sGroupId));
}

function clearMembers() {
  oState.aMembers = [];
  renderMembers();
  renderMetrics();
}

function clearDiagnostics() {
  oState.oDiagnostic = null;
  renderDiagnostics();
  setStatus('Diagnostics cleared.', 'pending');
}

function seedDefaultTimes() {
  const oNow = new Date();
  const oStart = new Date(oNow.getTime() + (60 * 60 * 1000));
  const oEnd = new Date(oStart.getTime() + (30 * 60 * 1000));

  const toLocalDateTime = (oDate) => {
    const iYear = oDate.getFullYear();
    const iMonth = String(oDate.getMonth() + 1).padStart(2, '0');
    const iDay = String(oDate.getDate()).padStart(2, '0');
    const iHours = String(oDate.getHours()).padStart(2, '0');
    const iMinutes = String(oDate.getMinutes()).padStart(2, '0');
    return String(iYear) + '-' + iMonth + '-' + iDay + 'T' + iHours + ':' + iMinutes;
  };

  if (oElements.eEventStart && !oElements.eEventStart.value) {
    oElements.eEventStart.value = toLocalDateTime(oStart);
  }

  if (oElements.eEventEnd && !oElements.eEventEnd.value) {
    oElements.eEventEnd.value = toLocalDateTime(oEnd);
  }
}

function bindEvents() {
  oElements.eLoadOwnedButton.addEventListener('click', () => {
    loadOwnedGroups().catch(() => {});
  });
  oElements.eLoadDirectoryButton.addEventListener('click', () => {
    loadDirectoryGroups().catch(() => {});
  });
  oElements.eLoadDeletedButton.addEventListener('click', () => {
    loadDeletedGroupResults().catch(() => {});
  });
  oElements.eLoadDeletedByOwnerButton.addEventListener('click', () => {
    loadDeletedGroupsForOwner().catch(() => {});
  });
  oElements.eLoadHttpButton.addEventListener('click', () => {
    runRawHttpCheck().catch(() => {});
  });
  oElements.eLoadMembersButton.addEventListener('click', () => {
    loadSelectedGroupMembers().catch(() => {});
  });
  oElements.eAddMemberButton.addEventListener('click', () => {
    addGroupMember().catch(() => {});
  });
  oElements.eRemoveMemberButton.addEventListener('click', () => {
    removeGroupMember().catch(() => {});
  });
  oElements.eCreateEventButton.addEventListener('click', () => {
    createEventForGroup().catch(() => {});
  });
  oElements.eUpdateEventButton.addEventListener('click', () => {
    updateEventForGroup().catch(() => {});
  });
  oElements.eDeleteEventButton.addEventListener('click', () => {
    deleteEventForGroup().catch(() => {});
  });
  oElements.eRestoreDeletedButton.addEventListener('click', () => {
    restoreDeletedGroupEntry().catch(() => {});
  });
  oElements.eClearMembersButton.addEventListener('click', clearMembers);
  oElements.eClearDiagnosticsButton.addEventListener('click', clearDiagnostics);
}

async function boot() {
  cacheElements();
  seedDefaultTimes();
  bindEvents();
  renderAll();
  await loadOwnedGroups();
}

boot().catch((oErr) => {
  const sMessage = oErr && oErr.message ? oErr.message : String(oErr);
  setStatus('Boot failed: ' + sMessage, 'error');
});
