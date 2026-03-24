import { initDataSources, registerTable, listItems, getItem } from './codeapp.js';

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
  fxexpressions:                  dsEntry('fxexpressionid')
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
        sCompHTML +=
          '<div class="comp-row">' +
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