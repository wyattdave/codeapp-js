
import { listMyGroups } from './codeapp.js';

function getElements() {
  let eStatus = document.getElementById('groupsStatus');
  let eList = document.getElementById('groupsList');
  let eRefresh = document.getElementById('groupsRefresh');

  return { eStatus, eList, eRefresh };
}

function setStatus(sMessage) {
  let { eStatus } = getElements();
  if (eStatus) {
    eStatus.textContent = sMessage;
  }
}

function normalizeGroups(oResult) {
  if (Array.isArray(oResult)) {
    return oResult;
  }

  if (oResult && Array.isArray(oResult.value)) {
    return oResult.value;
  }

  if (oResult && Array.isArray(oResult.data)) {
    return oResult.data;
  }

  if (oResult && Array.isArray(oResult.groups)) {
    return oResult.groups;
  }

  return [];
}

function getGroupName(oGroup) {
  return oGroup.displayName || oGroup.name || oGroup.mailNickname || oGroup.id || 'Unnamed group';
}

function getGroupMeta(oGroup) {
  let aParts = [
    oGroup.mail || '',
    oGroup.visibility || '',
    oGroup.description || ''
  ].filter(Boolean);

  return aParts.join(' \u2014 ');
}

function renderGroups(aGroups) {
  let { eList } = getElements();

  if (!eList) {
    throw new Error('Missing groups list element.');
  }

  eList.innerHTML = '';

  if (!Array.isArray(aGroups) || aGroups.length === 0) {
    let eItem = document.createElement('li');
    eItem.textContent = 'No groups found.';
    eList.appendChild(eItem);
    return;
  }

  aGroups.forEach((oGroup) => {
    let eItem = document.createElement('li');
    let eTitle = document.createElement('strong');
    let sMeta = getGroupMeta(oGroup);

    eTitle.textContent = getGroupName(oGroup);
    eItem.appendChild(eTitle);

    if (sMeta) {
      let eMeta = document.createElement('div');
      eMeta.textContent = sMeta;
      eItem.appendChild(eMeta);
    }

    eList.appendChild(eItem);
  });
}

async function loadGroups() {
  try {
    setStatus('Loading groups...');
    let oResult = await listMyGroups();
    let aGroups = normalizeGroups(oResult);

    renderGroups(aGroups);
    setStatus('Loaded ' + aGroups.length + ' groups.');
  } catch (oErr) {
    renderGroups([]);
    setStatus('Failed to load groups: ' + (oErr.message || oErr));
  }
}

async function boot() {
  let { eRefresh } = getElements();

  if (eRefresh) {
    eRefresh.addEventListener('click', () => {
      loadGroups();
    });
  }

  await loadGroups();
}

boot();
