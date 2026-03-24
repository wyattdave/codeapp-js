
import { initDataSources, registerTable, listItems, getItem,  callUnboundAction, enableDebugger } from './codeapp.js';

enableDebugger();

/* ── Data Sources (tables used by this app) ─────────────────── */
function dsEntry(sPrimaryKey) {
  return { tableId: '', version: '', primaryKey: sPrimaryKey, dataSourceType: 'Dataverse', apis: {} };
}
initDataSources({
  solutions:                      dsEntry('solutionid'),
  solutioncomponents:             dsEntry('solutioncomponentid'),
  entities:                       dsEntry('entityid'),
  roles:                          dsEntry('roleid'),
  workflows:                      dsEntry('workflowid'),
  reports:                        dsEntry('reportid'),
  connectionroles:                dsEntry('connectionroleid'),
  systemforms:                    dsEntry('formid'),
  savedqueryvisualizations:       dsEntry('savedqueryvisualizationid'),
  savedqueries:                   dsEntry('savedqueryid'),
  webresourceset:                 dsEntry('webresourceid'),
  plugintypes:                    dsEntry('plugintypeid'),
  pluginassemblies:               dsEntry('pluginassemblyid'),
  sdkmessageprocessingsteps:      dsEntry('sdkmessageprocessingstepid'),
  customcontrols:                 dsEntry('customcontrolid'),
  appmodules:                     dsEntry('appmoduleid'),
  canvasapps:                     dsEntry('canvasappid'),
  sitemaps:                       dsEntry('sitemapid'),
  connectionreferences:           dsEntry('connectionreferenceid'),
  environmentvariabledefinitions: dsEntry('environmentvariabledefinitionid'),
  environmentvariablevalues:      dsEntry('environmentvariablevalueid'),
  fxexpressions:                  dsEntry('fxexpressionid'),
  systemusers:                    dsEntry('systemuserid'),
  teams:                          dsEntry('teamid')
});

/* ── Well-known Component Types (hardcoded table mappings) ─── */
var oComponentTypes = {
  1:   { sLabel: 'Entity',              sTable: 'entities',                    sPrimaryKey: 'entityid' },
  2:   { sLabel: 'Attribute',           sTable: null },
  9:   { sLabel: 'Option Set',          sTable: null },
  10:  { sLabel: 'Entity Relationship', sTable: null },
  20:  { sLabel: 'Security Role',       sTable: 'roles',                       sPrimaryKey: 'roleid' },
  24:  { sLabel: 'Form',               sTable: 'systemforms',                 sPrimaryKey: 'formid' },
  26:  { sLabel: 'View',               sTable: 'savedqueries',                sPrimaryKey: 'savedqueryid' },
  29:  { sLabel: 'Workflow',            sTable: 'workflows',                   sPrimaryKey: 'workflowid' },
  31:  { sLabel: 'Report',             sTable: 'reports',                     sPrimaryKey: 'reportid' },
  59:  { sLabel: 'Chart',              sTable: 'savedqueryvisualizations',    sPrimaryKey: 'savedqueryvisualizationid' },
  60:  { sLabel: 'System Form',        sTable: 'systemforms',                 sPrimaryKey: 'formid' },
  61:  { sLabel: 'Web Resource',       sTable: 'webresourceset',              sPrimaryKey: 'webresourceid' },
  62:  { sLabel: 'Site Map',           sTable: 'sitemaps',                    sPrimaryKey: 'sitemapid' },
  63:  { sLabel: 'Connection Role',    sTable: 'connectionroles',             sPrimaryKey: 'connectionroleid' },
  66:  { sLabel: 'Custom Control',     sTable: 'customcontrols',              sPrimaryKey: 'customcontrolid' },
  70:  { sLabel: 'Model-driven App',   sTable: 'appmodules',                  sPrimaryKey: 'appmoduleid' },
  71:  { sLabel: 'Plugin Type',        sTable: 'plugintypes',                 sPrimaryKey: 'plugintypeid' },
  72:  { sLabel: 'Plugin Assembly',    sTable: 'pluginassemblies',            sPrimaryKey: 'pluginassemblyid' },
  80:  { sLabel: 'Model-driven App',   sTable: 'appmodules',                  sPrimaryKey: 'appmoduleid' },
  91:  { sLabel: 'SDK Message Step',   sTable: 'sdkmessageprocessingsteps',   sPrimaryKey: 'sdkmessageprocessingstepid' },
  300: { sLabel: 'Canvas App',         sTable: 'canvasapps',                  sPrimaryKey: 'canvasappid' }
};

/* ── Dynamic Entity Cache (componenttype → discovered metadata) */
var oEntityCache = {};

/* ── State ──────────────────────────────────────────────────── */
var aSolutions = [];
var sActiveId = '';

/* ── DOM References ─────────────────────────────────────────── */
const eSolList = document.getElementById('solList');
const eSolCount = document.getElementById('solCount');
const eDetailPanel = document.getElementById('detailPanel');
const eSearchInput = document.getElementById('searchInput');
const eManagedFilter = document.getElementById('managedFilter');

/* ── Register Core Tables ───────────────────────────────────── */
function registerCoreTables() {
  registerTable('solutions', 'solutionid');
  registerTable('solutioncomponents', 'solutioncomponentid');
  registerTable('entities', 'entityid');

  registerTable('systemusers', 'systemuserid');
  registerTable('teams', 'teamid');

  /* Register well-known component tables */
  var oRegistered = {};
  Object.keys(oComponentTypes).forEach(function(sKey) {
    var oDef = oComponentTypes[sKey];
    if (oDef.sTable && !oRegistered[oDef.sTable]) {
      registerTable(oDef.sTable, oDef.sPrimaryKey);
      oRegistered[oDef.sTable] = true;
    }
  });
}

/* ── Lookup entity metadata for an unknown componenttype ────── */
async function lookupEntityType(iType) {
  if (oEntityCache[iType]) return oEntityCache[iType];
  var oResult = await listItems('entities', 'entityid', {
    filter: 'objecttypecode eq ' + iType,
    select: ['logicalcollectionname', 'logicalname', 'originallocalizedname'],
    top: 1
  });
  var aEntities = oResult.entities || [];
  if (aEntities.length > 0) {
    var oEnt = aEntities[0];
    oEntityCache[iType] = {
      sLabel: oEnt.originallocalizedname || oEnt.logicalname,
      sTable: oEnt.logicalcollectionname,
      sPrimaryKey: oEnt.logicalname + 'id'
    };
    return oEntityCache[iType];
  }
  return null;
}

/* ── Extract display name from a record ─────────────────────── */
var aNameFields = ['name', 'displayname', 'friendlyname', 'sitemapname', 'fullname', 'title', 'subject'];
function extractName(oRecord) {
  for (var i = 0; i < aNameFields.length; i++) {
    if (oRecord[aNameFields[i]]) return oRecord[aNameFields[i]];
  }
  /* Fallback: first string value that is not a guid, url, or odata field */
  var sGuidPattern = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'i');
  var aKeys = Object.keys(oRecord);
  for (var j = 0; j < aKeys.length; j++) {
    var sKey = aKeys[j];
    if (sKey.indexOf('@') === 0) continue;
    if (sKey.indexOf('_') === 0) continue;
    var val = oRecord[sKey];
    if (typeof val === 'string' && val.length > 0 && val.length < 200 && !sGuidPattern.test(val) && val.indexOf('http') !== 0 && val.indexOf('/') === -1) return val;
  }
  return '';
}

/* ── Load Solutions ─────────────────────────────────────────── */
async function loadSolutions() {
  var oResult = await listItems('solutions', 'solutionid', {
    select: ['solutionid', 'friendlyname', 'uniquename', 'version', 'ismanaged', 'modifiedon', 'description'],
    orderBy: ['friendlyname asc'],
    top: 5000
  });
  return oResult.entities || [];
}

/* ── Load Solution Components ───────────────────────────────── */
async function loadComponents(sSolutionId) {
  var oResult = await listItems('solutioncomponents', 'solutioncomponentid', {
    filter: '_solutionid_value eq ' + sSolutionId,
    select: ['solutioncomponentid', 'componenttype', 'objectid'],
    top: 5000
  });
  return oResult.entities || [];
}

/* ── Resolve a single component name ─────────────────────────── */
function resolveOneComponent(oItem, oDef) {
  /* Entity (type 1) does not support Retrieve — must use filter */
  if (oItem.iType === 1) {
    return listItems('entities', 'entityid', {
      filter: 'entityid eq ' + oItem.sObjectId,
      select: ['name', 'logicalname', 'originallocalizedname'],
      top: 1
    })
      .then(function(oResult) {
        var aRows = oResult.entities || [];
        if (aRows.length > 0) {
          oItem.sName = aRows[0].originallocalizedname || aRows[0].name || aRows[0].logicalname || oItem.sObjectId;
        } else {
          oItem.sName = oItem.sObjectId;
        }
      })
      .catch(function() {
        oItem.sName = oItem.sObjectId;
      });
  }
  /* All other types — direct retrieve by ID */
  return getItem(oDef.sTable, oDef.sPrimaryKey, oItem.sObjectId)
    .then(function(oRecord) {
      oItem.sName = extractName(oRecord) || oItem.sObjectId;
    })
    .catch(function() {
      oItem.sName = (oDef.sLabel || oDef.sTable) + ' (' + oItem.sObjectId.substring(0, 8) + '…)';
    });
}

/* ── Resolve Component Names ────────────────────────────────── */
async function resolveComponentNames(aComponents) {
  var aResolved = aComponents.map(function(oComp) {
    return {
      iType: oComp.componenttype,
      sObjectId: oComp.objectid,
      sName: ''
    };
  });

  /* Discover unknown types via entity metadata */
  var oUnknown = {};
  aResolved.forEach(function(oItem) {
    if (!oComponentTypes[oItem.iType] && !oUnknown[oItem.iType]) {
      oUnknown[oItem.iType] = true;
    }
  });
  var aLookups = Object.keys(oUnknown).map(function(sKey) {
    return lookupEntityType(parseInt(sKey)).catch(function() { return null; });
  });
  await Promise.allSettled(aLookups);

  /* Register dynamically discovered tables */
  var oRegistered = {};
  Object.keys(oEntityCache).forEach(function(sKey) {
    var oDef = oEntityCache[sKey];
    if (oDef && oDef.sTable && !oRegistered[oDef.sTable]) {
      registerTable(oDef.sTable, oDef.sPrimaryKey);
      oRegistered[oDef.sTable] = true;
    }
  });

  /* Build lookup promises */
  var aPromises = aResolved.map(function(oItem) {
    var oDef = oComponentTypes[oItem.iType] || oEntityCache[oItem.iType];
    if (!oDef || !oDef.sTable) {
      oItem.sName = oItem.sObjectId;
      return Promise.resolve();
    }
    return resolveOneComponent(oItem, oDef);
  });

  await Promise.allSettled(aPromises);
  return aResolved;
}

/* ── Format Date ────────────────────────────────────────────── */
function formatDate(sISO) {
  if (!sISO) return '';
  var d = new Date(sISO);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Render Solutions List ──────────────────────────────────── */
function renderSolutions(aFiltered) {
  eSolList.innerHTML = '';
  eSolCount.textContent = aFiltered.length;

  if (aFiltered.length === 0) {
    eSolList.innerHTML = '<div class="loading-msg">No solutions found</div>';
    return;
  }

  aFiltered.forEach(function(oSol, i) {
    var eItem = document.createElement('div');
    eItem.className = 'sol-item' + (oSol.ismanaged ? ' managed' : '');
    if (oSol.solutionid === sActiveId) {
      eItem.classList.add('active');
    }
    eItem.style.animationDelay = (i * 0.04) + 's';
    eItem.innerHTML =
      '<div class="sol-indicator"></div>' +
      '<div>' +
        '<div class="sol-name">' + oSol.friendlyname + '</div>' +
        '<div class="sol-version">' + oSol.uniquename + ' &middot; v' + oSol.version + '</div>' +
      '</div>' +
      '<div>' +
        '<div class="sol-managed">' + (oSol.ismanaged ? 'Managed' : 'Unmanaged') + '</div>' +
        '<div class="sol-modified">' + formatDate(oSol.modifiedon) + '</div>' +
      '</div>';
    eItem.addEventListener('click', function() {
      sActiveId = oSol.solutionid;
      renderSolutions(aFiltered);
      showDetail(oSol);
    });
    eSolList.appendChild(eItem);
  });
}

/* ── Show Detail Panel ──────────────────────────────────────── */
async function showDetail(oSol) {
  eDetailPanel.innerHTML =
    '<div class="detail-header">' +
      '<h2>' + oSol.friendlyname + '</h2>' +
      '<div class="detail-meta">' +
        '<span>Unique Name: <b>' + oSol.uniquename + '</b></span>' +
        '<span>Version: <b>' + oSol.version + '</b></span>' +
        '<span>' + (oSol.ismanaged ? 'Managed' : 'Unmanaged') + '</span>' +
      '</div>' +
    '</div>' +
    (oSol.description ? '<div class="detail-desc">' + oSol.description + '</div>' : '') +
    '<div class="comp-bar"><span>Components</span><span class="comp-total">Loading…</span></div>';

  try {
    var aRawComps = await loadComponents(oSol.solutionid);
    var aComps = await resolveComponentNames(aRawComps);

    /* Group by type label */
    var oGroups = {};
    aComps.forEach(function(oComp) {
      var oDef = oComponentTypes[oComp.iType] || oEntityCache[oComp.iType];
      var sLabel = oDef ? oDef.sLabel : 'Type ' + oComp.iType;
      if (!oGroups[sLabel]) {
        oGroups[sLabel] = [];
      }
      oGroups[sLabel].push(oComp);
    });

    /* Build components HTML */
    var sCompHTML =
      '<div class="comp-bar">' +
        '<span>Components</span>' +
        '<span class="comp-total">' + aComps.length + ' items</span>' +
      '</div>' +
      '<div class="comp-groups">';

    var iGroupIdx = 0;
    Object.keys(oGroups).sort().forEach(function(sType) {
      sCompHTML +=
        '<div class="comp-group" style="animation-delay:' + (iGroupIdx * 0.08) + 's">' +
          '<div class="comp-group-title">' + sType + ' (' + oGroups[sType].length + ')</div>';
      oGroups[sType].forEach(function(oComp) {
        var sEscName = oComp.sName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        sCompHTML +=
          '<div class="comp-row" onclick="window._openShareModal(\'' + sEscName + '\', \'' + oComp.sObjectId + '\', ' + oComp.iType + ')">' +
            '<span class="comp-row-name">' + oComp.sName + '</span>' +
            '<span class="comp-row-id">' + oComp.sObjectId + '</span>' +
          '</div>';
      });
      sCompHTML += '</div>';
      iGroupIdx++;
    });
    sCompHTML += '</div>';

    /* Replace only the components section */
    eDetailPanel.innerHTML =
      '<div class="detail-header">' +
        '<h2>' + oSol.friendlyname + '</h2>' +
        '<div class="detail-meta">' +
          '<span>Unique Name: <b>' + oSol.uniquename + '</b></span>' +
          '<span>Version: <b>' + oSol.version + '</b></span>' +
          '<span>' + (oSol.ismanaged ? 'Managed' : 'Unmanaged') + '</span>' +
        '</div>' +
      '</div>' +
      (oSol.description ? '<div class="detail-desc">' + oSol.description + '</div>' : '') +
      sCompHTML;

  } catch (oErr) {
    eDetailPanel.querySelector('.comp-bar .comp-total').textContent = 'Error loading components';
  }
}

/* ── Filter Solutions ───────────────────────────────────────── */
function filterSolutions(sQuery, sManagedValue) {
  return aSolutions.filter(function(oSol) {
    var bMatchesSearch = !sQuery ||
      oSol.friendlyname.toLowerCase().indexOf(sQuery) !== -1 ||
      oSol.uniquename.toLowerCase().indexOf(sQuery) !== -1;
    var bMatchesManaged = sManagedValue === 'all' ||
      (sManagedValue === 'managed' && oSol.ismanaged) ||
      (sManagedValue === 'unmanaged' && !oSol.ismanaged);
    return bMatchesSearch && bMatchesManaged;
  });
}

/* ── Search & Filter Handlers ──────────────────────────────── */
function applyFilters() {
  var sQuery = eSearchInput.value.toLowerCase();
  var sManagedValue = eManagedFilter.value;
  renderSolutions(filterSolutions(sQuery, sManagedValue));
}
eSearchInput.addEventListener('input', applyFilters);
eManagedFilter.addEventListener('change', applyFilters);

/* ── Boot ────────────────────────────────────────────────────── */
async function boot() {
  try {
    registerCoreTables();
    aSolutions = await loadSolutions();
    renderSolutions(aSolutions);
  } catch (oErr) {
    eSolList.innerHTML = '<div class="error-msg">Failed to load solutions: ' + oErr.message + '</div>';
  }
}

boot();

/* ══════════════════════════════════════════════════════════════
   Share Component Modal
   ══════════════════════════════════════════════════════════════ */

/* ── Share Modal State ──────────────────────────────────────── */
let oShareContext = { sComponentName: '', sObjectId: '', iType: 0 };
let sShareTab = 'user';
let aShareSelected = []; // { sId, sName, sType ('user'|'team'), sDetail }
let iShareSearchTimer = 0;

/* ── Share Modal DOM References ─────────────────────────────── */
const eShareBackdrop = document.getElementById('shareBackdrop');
const eShareModalTitle = document.getElementById('shareModalTitle');
const eShareCloseBtn = document.getElementById('shareCloseBtn');
const eShareSearchInput = document.getElementById('shareSearchInput');
const eShareResults = document.getElementById('shareResults');
const eShareSelectedSection = document.getElementById('shareSelectedSection');
const eShareSelectedList = document.getElementById('shareSelectedList');
const eShareCancelBtn = document.getElementById('shareCancelBtn');
const eShareConfirmBtn = document.getElementById('shareConfirmBtn');
const aShareTabs = document.querySelectorAll('.share-tab');

/* ── Open Share Modal ───────────────────────────────────────── */
function openShareModal(sComponentName, sObjectId, iType) {
  oShareContext = { sComponentName, sObjectId, iType };
  aShareSelected = [];
  sShareTab = 'user';

  eShareModalTitle.textContent = 'Share — ' + sComponentName;
  eShareSearchInput.value = '';
  eShareSearchInput.placeholder = 'Search users…';
  eShareResults.innerHTML = '<div class="share-empty-msg">Type to search</div>';
  renderShareSelected();
  updateShareTabs();

  eShareBackdrop.classList.add('open');
  setTimeout(() => eShareSearchInput.focus(), 100);
}

/* ── Close Share Modal ──────────────────────────────────────── */
function closeShareModal() {
  eShareBackdrop.classList.remove('open');
  oShareContext = { sComponentName: '', sObjectId: '', iType: 0 };
  aShareSelected = [];
}

/* ── Tab Switching ──────────────────────────────────────────── */
function updateShareTabs() {
  aShareTabs.forEach((eTab) => {
    if (eTab.dataset.tab === sShareTab) {
      eTab.classList.add('active');
    } else {
      eTab.classList.remove('active');
    }
  });
}

aShareTabs.forEach((eTab) => {
  eTab.addEventListener('click', () => {
    sShareTab = eTab.dataset.tab;
    updateShareTabs();
    eShareSearchInput.value = '';
    eShareSearchInput.placeholder = sShareTab === 'user' ? 'Search users…' : 'Search teams…';
    eShareResults.innerHTML = '<div class="share-empty-msg">Type to search</div>';
    eShareSearchInput.focus();
  });
});

/* ── Search Users (Dataverse systemusers) ───────────────────── */
async function searchUsers(sQuery) {
  try {
    const oResult = await listItems('systemusers', 'systemuserid', {
      filter: "contains(fullname,'" + sQuery.replace(/'/g, "''") + "') and isdisabled eq false",
      select: ['systemuserid', 'fullname', 'internalemailaddress', 'jobtitle'],
      orderBy: ['fullname asc'],
      top: 20
    });
    return (oResult.entities || []).map((oUser) => ({
      sId: oUser.systemuserid,
      sName: oUser.fullname || 'Unknown',
      sDetail: oUser.internalemailaddress || oUser.jobtitle || '',
      sType: 'user'
    }));
  } catch (oErr) {
    console.error('User search failed:', oErr);
    return [];
  }
}

/* ── Search Teams (Dataverse teams) ─────────────────────────── */
async function searchTeams(sQuery) {
  try {
    const oResult = await listItems('teams', 'teamid', {
      filter: "contains(name,'" + sQuery.replace(/'/g, "''") + "')",
      select: ['teamid', 'name', 'description', 'teamtype'],
      orderBy: ['name asc'],
      top: 20
    });
    const aTeamTypeLabels = { 0: 'Owner', 1: 'Access', 2: 'AAD Security', 3: 'AAD Office' };
    return (oResult.entities || []).map((oTeam) => ({
      sId: oTeam.teamid,
      sName: oTeam.name || 'Unknown',
      sDetail: aTeamTypeLabels[oTeam.teamtype] || ('Type ' + oTeam.teamtype),
      sType: 'team'
    }));
  } catch (oErr) {
    console.error('Team search failed:', oErr);
    return [];
  }
}

/* ── Render Search Results ──────────────────────────────────── */
function renderShareResults(aResults) {
  if (!aResults || aResults.length === 0) {
    eShareResults.innerHTML = '<div class="share-empty-msg">No results found</div>';
    return;
  }

  eShareResults.innerHTML = '';
  aResults.forEach((oItem) => {
    const bSelected = aShareSelected.some((s) => s.sId === oItem.sId);
    const eRow = document.createElement('div');
    eRow.className = 'share-result-item' + (bSelected ? ' selected' : '');

    const sInitials = getInitials(oItem.sName);
    const sAvatarClass = oItem.sType === 'team' ? 'share-result-avatar team-avatar' : 'share-result-avatar';

    eRow.innerHTML =
      '<div class="' + sAvatarClass + '">' + sInitials + '</div>' +
      '<div class="share-result-info">' +
        '<div class="share-result-name">' + escapeHtml(oItem.sName) + '</div>' +
        '<div class="share-result-detail">' + escapeHtml(oItem.sDetail) + '</div>' +
      '</div>' +
      '<div class="share-result-check">' + (bSelected ? '&#10003;' : '') + '</div>';

    eRow.addEventListener('click', () => {
      toggleShareSelection(oItem);
      renderShareResults(aResults);
    });

    eShareResults.appendChild(eRow);
  });
}

/* ── Toggle Selection ───────────────────────────────────────── */
function toggleShareSelection(oItem) {
  const iIdx = aShareSelected.findIndex((s) => s.sId === oItem.sId);
  if (iIdx >= 0) {
    aShareSelected.splice(iIdx, 1);
  } else {
    aShareSelected.push(oItem);
  }
  renderShareSelected();
}

/* ── Render Selected Chips ──────────────────────────────────── */
function renderShareSelected() {
  if (aShareSelected.length === 0) {
    eShareSelectedSection.style.display = 'none';
    eShareConfirmBtn.disabled = true;
    return;
  }

  eShareSelectedSection.style.display = '';
  eShareConfirmBtn.disabled = false;

  eShareSelectedList.innerHTML = '';
  aShareSelected.forEach((oItem) => {
    const eChip = document.createElement('span');
    eChip.className = 'share-selected-chip';
    eChip.innerHTML =
      escapeHtml(oItem.sName) +
      '<span class="share-chip-remove" data-id="' + oItem.sId + '">&times;</span>';
    eShareSelectedList.appendChild(eChip);
  });

  eShareSelectedList.querySelectorAll('.share-chip-remove').forEach((eBtn) => {
    eBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sRemoveId = eBtn.dataset.id;
      aShareSelected = aShareSelected.filter((s) => s.sId !== sRemoveId);
      renderShareSelected();
      /* Re-render results if visible */
      const aCurrentRows = eShareResults.querySelectorAll('.share-result-item');
      if (aCurrentRows.length > 0) {
        const sCurrentQuery = eShareSearchInput.value.trim();
        if (sCurrentQuery.length >= 2) {
          doShareSearch(sCurrentQuery);
        }
      }
    });
  });
}

/* ── Debounced Search ───────────────────────────────────────── */
eShareSearchInput.addEventListener('input', () => {
  clearTimeout(iShareSearchTimer);
  const sQuery = eShareSearchInput.value.trim();
  if (sQuery.length < 2) {
    eShareResults.innerHTML = '<div class="share-empty-msg">Type to search</div>';
    return;
  }
  eShareResults.innerHTML = '<div class="share-loading">Searching</div>';
  iShareSearchTimer = setTimeout(() => doShareSearch(sQuery), 350);
});

async function doShareSearch(sQuery) {
  let aResults = [];
  if (sShareTab === 'user') {
    aResults = await searchUsers(sQuery);
  } else {
    aResults = await searchTeams(sQuery);
  }
  renderShareResults(aResults);
}

/* ── Resolve entity logical name from component type ────────── */
const oTypeToLogicalName = {
  1:   'entity',
  20:  'role',
  24:  'systemform',
  26:  'savedquery',
  29:  'workflow',
  31:  'report',
  59:  'savedqueryvisualization',
  60:  'systemform',
  61:  'webresource',
  62:  'sitemap',
  63:  'connectionrole',
  66:  'customcontrol',
  70:  'appmodule',
  71:  'plugintype',
  72:  'pluginassembly',
  80:  'appmodule',
  91:  'sdkmessageprocessingstep',
  300: 'canvasapp'
};

function getLogicalNameForType(iType) {
  if (oTypeToLogicalName[iType]) return oTypeToLogicalName[iType];
  /* Try the entity cache for dynamically discovered types */
  if (oEntityCache[iType] && oEntityCache[iType].sTable) {
    /* logicalname is singular; sTable is the collection name */
    const sDef = oEntityCache[iType];
    /* sPrimaryKey is usually "<logicalname>id", so strip "id" */
    if (sDef.sPrimaryKey && sDef.sPrimaryKey.endsWith('id')) {
      return sDef.sPrimaryKey.slice(0, -2);
    }
    return sDef.sTable;
  }
  return null;
}

/* ── Call GrantAccess for one principal ──────────────────────── */
async function grantAccess(sTargetLogicalName, sTargetId, sPrincipalType, sPrincipalId) {
  const sPrincipalLogical = sPrincipalType === 'user' ? 'systemuser' : 'team';
  const sPrincipalKeyField = sPrincipalType === 'user' ? 'systemuserid' : 'teamid';

  const oParams = {
    Target: {
      [sTargetLogicalName + 'id']: sTargetId,
      '@odata.type': 'Microsoft.Dynamics.CRM.' + sTargetLogicalName
    },
    PrincipalAccess: {
      Principal: {
        [sPrincipalKeyField]: sPrincipalId,
        '@odata.type': 'Microsoft.Dynamics.CRM.' + sPrincipalLogical
      },
      AccessMask: 'ReadAccess,WriteAccess,AppendAccess,AppendToAccess,ShareAccess,AssignAccess'
    }
  };

  return await callUnboundAction('', '', 'GrantAccess', oParams);
}

/* ── Confirm Share ──────────────────────────────────────────── */
eShareConfirmBtn.addEventListener('click', async () => {
  if (aShareSelected.length === 0) return;

  const sLogicalName = getLogicalNameForType(oShareContext.iType);
  if (!sLogicalName) {
    showShareToast('Error: Cannot share this component type (type ' + oShareContext.iType + ')');
    return;
  }

  /* Disable button while processing */
  eShareConfirmBtn.disabled = true;
  eShareConfirmBtn.textContent = 'Sharing…';

  const aResults = await Promise.allSettled(
    aShareSelected.map((oItem) =>
      grantAccess(sLogicalName, oShareContext.sObjectId, oItem.sType, oItem.sId)
    )
  );

  const aFailed = aResults.filter((r) => r.status === 'rejected');
  const aSucceeded = aResults.filter((r) => r.status === 'fulfilled');

  if (aFailed.length === 0) {
    const sNames = aShareSelected.map((s) => s.sName).join(', ');
    showShareToast('Shared "' + oShareContext.sComponentName + '" with ' + sNames);
  } else if (aSucceeded.length > 0) {
    showShareToast(
      aSucceeded.length + ' shared OK, ' + aFailed.length + ' failed: ' +
      (aFailed[0].reason?.message || 'Unknown error')
    );
  } else {
    showShareToast('Share failed: ' + (aFailed[0].reason?.message || 'Unknown error'));
  }

  eShareConfirmBtn.textContent = 'Share';
  eShareConfirmBtn.disabled = false;
  closeShareModal();
});

/* ── Close Handlers ─────────────────────────────────────────── */
eShareCloseBtn.addEventListener('click', closeShareModal);
eShareCancelBtn.addEventListener('click', closeShareModal);
eShareBackdrop.addEventListener('click', (e) => {
  if (e.target === eShareBackdrop) closeShareModal();
});

/* ── Toast Notification ─────────────────────────────────────── */
function showShareToast(sMessage) {
  let eToast = document.querySelector('.share-toast');
  if (!eToast) {
    eToast = document.createElement('div');
    eToast.className = 'share-toast';
    document.body.appendChild(eToast);
  }
  eToast.textContent = sMessage;
  eToast.classList.remove('show');
  void eToast.offsetWidth; /* force reflow */
  eToast.classList.add('show');
  setTimeout(() => eToast.classList.remove('show'), 3000);
}

/* ── Utilities ──────────────────────────────────────────────── */
function getInitials(sName) {
  if (!sName) return '?';
  const aParts = sName.trim().split(/\s+/);
  if (aParts.length >= 2) return (aParts[0][0] + aParts[aParts.length - 1][0]).toUpperCase();
  return sName.substring(0, 2).toUpperCase();
}

function escapeHtml(sStr) {
  if (typeof sStr !== 'string') return '';
  return sStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Expose openShareModal to the detail panel ──────────────── */
window._openShareModal = openShareModal;
