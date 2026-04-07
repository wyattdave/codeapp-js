import { registerTable, listItems, callUnboundAction } from './codeapp.js';
import { enableDebugger } from "./codeapp.js";

enableDebugger();

// ── Register Dataverse Tables ───────────────────────────────────
registerTable('solutions', 'solutionid');
registerTable('solutioncomponents', 'solutioncomponentid');
registerTable('workflows', 'workflowid');
registerTable('connectionreferences', 'connectionreferenceid');
registerTable('environmentvariabledefinitions', 'environmentvariabledefinitionid');
registerTable('canvasapps', 'canvasappid');
registerTable('systemusers', 'systemuserid');

// ── Component Type Config ───────────────────────────────────────
// Types 1, 29, 300, 380 are standard and fixed across environments.
// Connection Reference type varies per environment so we resolve by
// matching objectids against the connectionreferences table instead.
const oComponentConfig = {
  29: {
    sTable: 'workflows',
    sPrimaryKey: 'workflowid',
    sDisplayField: 'name',
    sLabel: 'Workflows',
    sEntityType: 'workflow'
  },
  300: {
    sTable: 'canvasapps',
    sPrimaryKey: 'canvasappid',
    sDisplayField: 'displayname',
    sLabel: 'Canvas Apps',
    sEntityType: 'canvasapp'
  },
  380: {
    sTable: 'environmentvariabledefinitions',
    sPrimaryKey: 'environmentvariabledefinitionid',
    sDisplayField: 'displayname',
    sLabel: 'Environment Variables',
    sEntityType: 'environmentvariabledefinition'
  }
};

const oConnRefConfig = {
  sTable: 'connectionreferences',
  sPrimaryKey: 'connectionreferenceid',
  sDisplayField: 'connectionreferencedisplayname',
  sLabel: 'Connection References',
  sEntityType: 'connectionreference'
};

// Entity (type 1) is metadata — EntityDefinitions are not queryable
// through the standard data API, so we show objectids only.
const ENTITY_TYPE = 1;
const aKnownTypes = [ENTITY_TYPE, 29, 300, 380];

// ── State ───────────────────────────────────────────────────────
let aSolutions = [];
let oShareTarget = null;
let sSelectedUserId = null;

// ── DOM References ──────────────────────────────────────────────
const eSolutionPanel = document.getElementById('solution-panel');
const eComponentPanel = document.getElementById('component-panel');
const eSolutionList = document.getElementById('solution-list');
const eSearchBox = document.getElementById('search-box');
const eSolutionTitle = document.getElementById('solution-title');
const eComponentSections = document.getElementById('component-sections');
const eComponentLoading = document.getElementById('component-loading');
const eShareModal = document.getElementById('share-modal');
const eShareCompName = document.getElementById('share-comp-name');
const eShareCompId = document.getElementById('share-comp-id');
const eUserSearch = document.getElementById('user-search');
const eUserResults = document.getElementById('user-results');
const eShareBtn = document.getElementById('share-btn');
const eAccessLevel = document.getElementById('access-level');

// ── Boot ────────────────────────────────────────────────────────
async function boot() {
  setupEventListeners();
  await loadSolutions();
}

function setupEventListeners() {
  eSearchBox.addEventListener('input', () => {
    const sQuery = eSearchBox.value.trim().toLowerCase();
    renderSolutions(filterSolutions(sQuery));
  });

  document.getElementById('back-btn').addEventListener('click', showSolutionList);
  document.getElementById('modal-close').addEventListener('click', closeShareModal);
  eShareModal.addEventListener('click', (oEvent) => {
    if (oEvent.target === eShareModal) closeShareModal();
  });

  let iUserSearchTimer = null;
  eUserSearch.addEventListener('input', () => {
    clearTimeout(iUserSearchTimer);
    iUserSearchTimer = setTimeout(() => searchUsers(eUserSearch.value.trim()), 400);
  });

  eShareBtn.addEventListener('click', executeShare);
}

// ── Solutions ───────────────────────────────────────────────────
async function loadSolutions() {
  try {
    const oResult = await listItems('solutions', 'solutionid', {
      filter: "ismanaged eq false and uniquename ne 'Default' and uniquename ne 'Active'",
      select: ['solutionid', 'friendlyname', 'uniquename', 'version'],
      orderBy: ['friendlyname asc']
    });
    aSolutions = oResult.entities || [];
    renderSolutions(aSolutions);
  } catch (oErr) {
    eSolutionList.innerHTML = '<div class="no-results">Failed to load solutions: ' + escapeHtml(oErr.message) + '</div>';
  }
}

function filterSolutions(sQuery) {
  if (!sQuery) return aSolutions;
  return aSolutions.filter(oSol =>
    (oSol.friendlyname || '').toLowerCase().includes(sQuery) ||
    (oSol.uniquename || '').toLowerCase().includes(sQuery)
  );
}

function renderSolutions(aList) {
  if (aList.length === 0) {
    eSolutionList.innerHTML = '<div class="no-results">No solutions found</div>';
    return;
  }

  eSolutionList.innerHTML = aList.map(oSol => `
    <div class="solution-card" data-id="${oSol.solutionid}">
      <div>
        <div class="solution-name">${escapeHtml(oSol.friendlyname || oSol.uniquename)}</div>
        <div class="solution-unique">${escapeHtml(oSol.uniquename)}</div>
      </div>
      <div class="solution-meta">
        <span class="solution-version">${escapeHtml(oSol.version || '')}</span>
        <span class="arrow">›</span>
      </div>
    </div>
  `).join('');

  eSolutionList.querySelectorAll('.solution-card').forEach(eCard => {
    eCard.addEventListener('click', () => {
      const sSolId = eCard.dataset.id;
      const oSol = aSolutions.find(oS => oS.solutionid === sSolId);
      showComponents(sSolId, oSol ? oSol.friendlyname : '');
    });
  });
}

// ── Component Panel ─────────────────────────────────────────────
function showSolutionList() {
  eSolutionPanel.style.display = '';
  eComponentPanel.style.display = 'none';
}

async function showComponents(sSolutionId, sSolutionName) {
  eSolutionPanel.style.display = 'none';
  eComponentPanel.style.display = '';
  eSolutionTitle.textContent = sSolutionName;
  eComponentSections.innerHTML = '';
  eComponentLoading.style.display = '';

  try {
    const oResult = await listItems('solutioncomponents', 'solutioncomponentid', {
      filter: "_solutionid_value eq '" + sSolutionId + "'",
      select: ['solutioncomponentid', 'componenttype', 'objectid'],
      top: 5000
    });

    const aComponents = oResult.entities || [];
    const oGrouped = groupByType(aComponents);

    // Collect objectids from types NOT in our known set for connection ref matching
    const aUnknownObjectIds = aComponents
      .filter(oC => !aKnownTypes.includes(Number(oC.componenttype)))
      .map(oC => oC.objectid)
      .filter(Boolean);

    const [aWorkflows, aCanvasApps, aEnvVars, aConnRefs] = await Promise.all([
      resolveTypedComponents(oGrouped[29] || [], oComponentConfig[29]),
      resolveTypedComponents(oGrouped[300] || [], oComponentConfig[300]),
      resolveTypedComponents(oGrouped[380] || [], oComponentConfig[380]),
      resolveConnectionReferences(aUnknownObjectIds)
    ]);

    // Build entity list from type 1 objectids (metadata-only, no API resolution)
    const aEntities = (oGrouped[ENTITY_TYPE] || []).map(sId => ({
      sId: sId,
      sDisplayName: sId,
      sTable: null,
      sPrimaryKey: null,
      sEntityType: null,
      bShareable: false
    }));

    eComponentLoading.style.display = 'none';
    renderComponentSection('Workflows', aWorkflows);
    renderComponentSection('Connection References', aConnRefs);
    renderComponentSection('Environment Variables', aEnvVars);
    renderComponentSection('Canvas Apps', aCanvasApps);
    renderComponentSection('Entities', aEntities);

  } catch (oErr) {
    eComponentLoading.style.display = 'none';
    eComponentSections.innerHTML =
      '<div class="no-results">Failed to load components: ' + escapeHtml(oErr.message) + '</div>';
  }
}

function groupByType(aComponents) {
  const oGrouped = {};
  aComponents.forEach(oComp => {
    const iType = Number(oComp.componenttype);
    if (!oGrouped[iType]) oGrouped[iType] = [];
    if (oComp.objectid) oGrouped[iType].push(cleanGuid(oComp.objectid));
  });
  return oGrouped;
}

// ── Resolve Typed Components ────────────────────────────────────
async function resolveTypedComponents(aObjectIds, oConfig) {
  if (!aObjectIds.length || !oConfig) return [];

  const aResolved = [];
  const iBatchSize = 15;

  for (let i = 0; i < aObjectIds.length; i += iBatchSize) {
    const aBatch = aObjectIds.slice(i, i + iBatchSize);
    const sFilter = aBatch
      .map(sId => oConfig.sPrimaryKey + " eq '" + sId + "'")
      .join(' or ');

    try {
      const oResult = await listItems(oConfig.sTable, oConfig.sPrimaryKey, {
        filter: sFilter,
        select: [oConfig.sPrimaryKey, oConfig.sDisplayField]
      });

      (oResult.entities || []).forEach(oRecord => {
        aResolved.push({
          sId: oRecord[oConfig.sPrimaryKey],
          sDisplayName: oRecord[oConfig.sDisplayField] || oRecord[oConfig.sPrimaryKey],
          sTable: oConfig.sTable,
          sPrimaryKey: oConfig.sPrimaryKey,
          sEntityType: oConfig.sEntityType,
          bShareable: true
        });
      });
    } catch (oErr) {
      aBatch.forEach(sId => {
        aResolved.push({
          sId: sId,
          sDisplayName: oConfig.sLabel + ' (' + sId.substring(0, 8) + '…)',
          sTable: oConfig.sTable,
          sPrimaryKey: oConfig.sPrimaryKey,
          sEntityType: oConfig.sEntityType,
          bShareable: true
        });
      });
    }
  }

  return aResolved;
}

// Connection Reference component type varies per environment.
// We query connectionreferences matching ALL non-standard objectids.
async function resolveConnectionReferences(aObjectIds) {
  if (!aObjectIds.length) return [];

  const aResolved = [];
  const oConfig = oConnRefConfig;
  const iBatchSize = 15;

  for (let i = 0; i < aObjectIds.length; i += iBatchSize) {
    const aBatch = aObjectIds.slice(i, i + iBatchSize);
    const sFilter = aBatch
      .map(sId => oConfig.sPrimaryKey + " eq '" + sId + "'")
      .join(' or ');

    try {
      const oResult = await listItems(oConfig.sTable, oConfig.sPrimaryKey, {
        filter: sFilter,
        select: [oConfig.sPrimaryKey, oConfig.sDisplayField]
      });

      (oResult.entities || []).forEach(oRecord => {
        aResolved.push({
          sId: oRecord[oConfig.sPrimaryKey],
          sDisplayName: oRecord[oConfig.sDisplayField] || oRecord[oConfig.sPrimaryKey],
          sTable: oConfig.sTable,
          sPrimaryKey: oConfig.sPrimaryKey,
          sEntityType: oConfig.sEntityType,
          bShareable: true
        });
      });
    } catch (_oErr) {
      // Silently skip — these objectids may not be connection references
    }
  }

  return aResolved;
}

// ── Render Component Section ────────────────────────────────────
function renderComponentSection(sLabel, aItems) {
  const eSection = document.createElement('div');
  eSection.className = 'component-section';

  const eHeader = document.createElement('div');
  eHeader.className = 'section-header';
  eHeader.innerHTML = escapeHtml(sLabel) +
    ' <span class="count">' + aItems.length + '</span>';
  eSection.appendChild(eHeader);

  if (aItems.length === 0) {
    const eEmpty = document.createElement('div');
    eEmpty.className = 'empty-msg';
    eEmpty.textContent = 'No ' + sLabel.toLowerCase() + ' found in this solution';
    eSection.appendChild(eEmpty);
  } else {
    aItems.forEach(oItem => {
      const eItem = document.createElement('div');
      eItem.className = 'component-item' + (oItem.bShareable ? '' : ' no-share');

      eItem.innerHTML =
        '<div>' +
          '<div class="comp-name">' + escapeHtml(oItem.sDisplayName) + '</div>' +
          '<div class="comp-id">' + escapeHtml(oItem.sId) + '</div>' +
        '</div>' +
        (oItem.bShareable ? '<span class="share-icon" title="Share this component">📤</span>' : '');

      if (oItem.bShareable) {
        eItem.addEventListener('click', () => openShareModal(oItem));
      }

      eSection.appendChild(eItem);
    });
  }

  eComponentSections.appendChild(eSection);
}

// ── Share Modal ─────────────────────────────────────────────────
function openShareModal(oItem) {
  oShareTarget = oItem;
  sSelectedUserId = null;
  eShareCompName.textContent = oItem.sDisplayName;
  eShareCompId.textContent = oItem.sId;
  eUserSearch.value = '';
  eUserResults.innerHTML = '';
  eShareBtn.disabled = true;
  eShareBtn.textContent = 'Share';
  eShareModal.classList.add('active');
}

function closeShareModal() {
  eShareModal.classList.remove('active');
  oShareTarget = null;
  sSelectedUserId = null;
}

async function searchUsers(sQuery) {
  if (sQuery.length < 2) {
    eUserResults.innerHTML = '';
    return;
  }

  const sEscaped = escapeOData(sQuery);

  try {
    const oResult = await listItems('systemusers', 'systemuserid', {
      filter: "contains(fullname,'" + sEscaped + "') and isdisabled eq false",
      select: ['systemuserid', 'fullname', 'internalemailaddress'],
      top: 10,
      orderBy: ['fullname asc']
    });

    const aUsers = oResult.entities || [];

    if (aUsers.length === 0) {
      eUserResults.innerHTML = '<div class="empty-msg">No users found</div>';
      return;
    }

    eUserResults.innerHTML = aUsers.map(oUser =>
      '<div class="user-result-item" data-id="' + oUser.systemuserid + '">' +
        '<div>' +
          '<div class="user-name">' + escapeHtml(oUser.fullname || '') + '</div>' +
          '<div class="user-email">' + escapeHtml(oUser.internalemailaddress || '') + '</div>' +
        '</div>' +
      '</div>'
    ).join('');

    eUserResults.querySelectorAll('.user-result-item').forEach(eItem => {
      eItem.addEventListener('click', () => {
        eUserResults.querySelectorAll('.user-result-item').forEach(eEl => eEl.classList.remove('selected'));
        eItem.classList.add('selected');
        sSelectedUserId = eItem.dataset.id;
        eShareBtn.disabled = false;
      });
    });

  } catch (oErr) {
    eUserResults.innerHTML = '<div class="empty-msg">Search failed: ' + escapeHtml(oErr.message) + '</div>';
  }
}

async function executeShare() {
  if (!oShareTarget || !sSelectedUserId) return;

  eShareBtn.disabled = true;
  eShareBtn.textContent = 'Sharing…';

  try {
    const sAccessMask = eAccessLevel.value;

    await callUnboundAction('solutions', 'solutionid', 'GrantAccess', {
      Target: {
        '@odata.type': 'Microsoft.Dynamics.CRM.' + oShareTarget.sEntityType,
        [oShareTarget.sPrimaryKey]: oShareTarget.sId
      },
      PrincipalAccess: {
        Principal: {
          '@odata.type': 'Microsoft.Dynamics.CRM.systemuser',
          systemuserid: sSelectedUserId
        },
        AccessMask: sAccessMask
      }
    });

    showToast('Component shared successfully!', 'success');
    closeShareModal();
  } catch (oErr) {
    showToast('Share failed: ' + oErr.message, 'error');
  } finally {
    eShareBtn.disabled = false;
    eShareBtn.textContent = 'Share';
  }
}

// ── Utilities ───────────────────────────────────────────────────
function escapeHtml(sStr) {
  const eDiv = document.createElement('div');
  eDiv.textContent = sStr || '';
  return eDiv.innerHTML;
}

function escapeOData(sValue) {
  return (sValue || '').replace(/'/g, "''");
}

function cleanGuid(sGuid) {
  if (!sGuid) return sGuid;
  return sGuid.replace(/[{}]/g, '');
}

function showToast(sMessage, sType) {
  const eToast = document.createElement('div');
  eToast.className = 'toast ' + sType;
  eToast.textContent = sMessage;
  document.body.appendChild(eToast);
  setTimeout(() => eToast.remove(), 4000);
}

// ── Start ───────────────────────────────────────────────────────
boot();