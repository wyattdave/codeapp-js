import { getClient, getContext, callActionAsync } from "./power-apps-data.js";

// ── Initialize SDK & Client ────────────────────────────────────
let oSharedClient = null;
let oInitialDataSources = {};

// ── Set initial data sources (call before any API calls) ───────
export function initDataSources(oSources) {
  return _dbgWrap('initDataSources', [oSources], function() {
  oInitialDataSources = oSources || {};
  oSharedClient = null;
  });
}

function getSharedClient() {
  if (!oSharedClient) {
    oSharedClient = getClient(Object.assign({}, oInitialDataSources, oDataSources));
  }
  return oSharedClient;
}

// ── Unwrap SDK response ────────────────────────────────────────
function unwrapResult(result) {
  if (result && result.success === false) {
    let sMsg = result.error ? (result.error.message || JSON.stringify(result.error)) : "Operation failed";
    throw new Error(sMsg);
  }
  return result && "data" in result ? result.data : result;
}

// ── Debugger ───────────────────────────────────────────────────
let _bDebugActive = false;
let _aDebugEntries = [];
let _eDebugPanel = null;
let _eDebugIcon = null;
let _eDebugList = null;
let _iDebugCounter = 0;

function _dbgWrap(sName, aArgs, fnBody) {
  if (!_bDebugActive) return fnBody();
  let oEntry = { iId: ++_iDebugCounter, sName: sName, aArgs: _dbgClone(aArgs), iTime: Date.now() };
  _aDebugEntries.unshift(oEntry);
  _dbgRenderEntry(oEntry, true);
  let oResult;
  try {
    oResult = fnBody();
  } catch (oErr) {
    oEntry.oError = oErr && oErr.message ? oErr.message : String(oErr);
    oEntry.iDuration = Date.now() - oEntry.iTime;
    _dbgRenderEntry(oEntry, false);
    throw oErr;
  }
  if (oResult && typeof oResult.then === 'function') {
    return oResult.then(function(oVal) {
      oEntry.oResult = _dbgClone(oVal);
      oEntry.iDuration = Date.now() - oEntry.iTime;
      _dbgRenderEntry(oEntry, false);
      return oVal;
    }, function(oErr) {
      oEntry.oError = oErr && oErr.message ? oErr.message : String(oErr);
      oEntry.iDuration = Date.now() - oEntry.iTime;
      _dbgRenderEntry(oEntry, false);
      throw oErr;
    });
  }
  oEntry.oResult = _dbgClone(oResult);
  oEntry.iDuration = Date.now() - oEntry.iTime;
  _dbgRenderEntry(oEntry, false);
  return oResult;
}

function _dbgClone(oVal) {
  try { return JSON.parse(JSON.stringify(oVal)); }
  catch (oErr) { return String(oVal); }
}

function _dbgFormatTime(iTimestamp) {
  let oDate = new Date(iTimestamp);
  let sH = String(oDate.getHours()).padStart(2, '0');
  let sM = String(oDate.getMinutes()).padStart(2, '0');
  let sS = String(oDate.getSeconds()).padStart(2, '0');
  let sMs = String(oDate.getMilliseconds()).padStart(3, '0');
  return sH + ':' + sM + ':' + sS + '.' + sMs;
}

function _dbgEscapeHtml(sStr) {
  if (typeof sStr !== 'string') sStr = String(sStr);
  return sStr.replace(new RegExp('&', 'g'), '&amp;').replace(new RegExp('<', 'g'), '&lt;').replace(new RegExp('>', 'g'), '&gt;');
}

function _dbgRenderEntry(oEntry, bPending) {
  if (!_eDebugList) return;
  let sId = 'dbg-' + oEntry.iId;
  let eRow = _eDebugList.querySelector('[data-dbg-id="' + sId + '"]');
  if (!eRow) {
    eRow = document.createElement('div');
    eRow.setAttribute('data-dbg-id', sId);
    eRow.style.cssText = 'border-bottom:1px solid #333;padding:6px 8px;font-size:12px;cursor:pointer;';
    _eDebugList.prepend(eRow);
  }
  let sStatus = bPending ? '\u23F3' : (oEntry.oError ? '\u274C' : '\u2705');
  let sDuration = bPending ? '\u2026' : oEntry.iDuration + 'ms';
  eRow.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">'
    + '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;"><strong>' + sStatus + ' ' + _dbgEscapeHtml(oEntry.sName) + '</strong></span>'
    + '<span style="color:#888;font-size:11px;white-space:nowrap;">' + _dbgFormatTime(oEntry.iTime) + ' | ' + sDuration + '</span>'
    + '<button class="dbg-copy" style="background:#333;color:#e0e0e0;border:1px solid #555;border-radius:3px;padding:1px 6px;cursor:pointer;font-size:11px;white-space:nowrap;" title="Copy to clipboard">⎘</button>'
    + '</div>';
  eRow.querySelector('.dbg-copy').onclick = function(e) {
    e.stopPropagation();
    let oData = { name: oEntry.sName, args: oEntry.aArgs, time: _dbgFormatTime(oEntry.iTime) };
    if (oEntry.oError) { oData.error = oEntry.oError; }
    else if (oEntry.oResult !== undefined) { oData.result = oEntry.oResult; }
    if (oEntry.iDuration !== undefined) { oData.duration = oEntry.iDuration + 'ms'; }
    navigator.clipboard.writeText(JSON.stringify(oData, null, 2)).then(function() {
      let eBtn = eRow.querySelector('.dbg-copy');
      eBtn.textContent = '\u2713';
      setTimeout(function() { eBtn.textContent = '\u2398'; }, 1000);
    });
  };
  eRow.onclick = function() {
    let eDetail = eRow.querySelector('.dbg-detail');
    if (eDetail) { eDetail.remove(); return; }
    eDetail = document.createElement('div');
    eDetail.className = 'dbg-detail';
    eDetail.style.cssText = 'margin-top:4px;padding:4px;background:#1a1a2e;border-radius:4px;font-size:11px;overflow:auto;max-height:300px;';
    let sArgsHtml = '<div style="color:#61dafb;margin-bottom:4px;"><b>Args:</b> <pre style="margin:2px 0;white-space:pre-wrap;word-break:break-all;">' + _dbgEscapeHtml(JSON.stringify(oEntry.aArgs, null, 2)) + '</pre></div>';
    let sResultHtml = '';
    if (oEntry.oError) {
      sResultHtml = '<div style="color:#ff6b6b;"><b>Error:</b> <pre style="margin:2px 0;white-space:pre-wrap;word-break:break-all;">' + _dbgEscapeHtml(oEntry.oError) + '</pre></div>';
    } else if (!bPending) {
      sResultHtml = '<div style="color:#a8e6cf;"><b>Result:</b> <pre style="margin:2px 0;white-space:pre-wrap;word-break:break-all;">' + _dbgEscapeHtml(JSON.stringify(oEntry.oResult, null, 2)) + '</pre></div>';
    }
    eDetail.innerHTML = sArgsHtml + sResultHtml;
    eRow.appendChild(eDetail);
  };
  if (_eDebugIcon) {
    let eBadge = _eDebugIcon.querySelector('.dbg-badge');
    if (eBadge) eBadge.textContent = String(_aDebugEntries.length);
  }
}

function _dbgInjectUI() {
  _eDebugIcon = document.createElement('div');
  _eDebugIcon.id = 'codeapp-debug-icon';
  _eDebugIcon.innerHTML = '<span style="font-size:18px;">\uD83D\uDC1B</span>'
    + '<span class="dbg-badge" style="position:absolute;top:-4px;right:-4px;background:#ff6b6b;color:#fff;font-size:10px;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">0</span>';
  _eDebugIcon.style.cssText = 'position:fixed;top:10px;right:70px;z-index:999999;width:36px;height:36px;background:#1e1e2e;border:1px solid #444;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.4);user-select:none;';
  _eDebugIcon.onclick = function() {
    _eDebugPanel.style.display = _eDebugPanel.style.display === 'none' ? 'flex' : 'none';
  };
  document.body.appendChild(_eDebugIcon);

  _eDebugPanel = document.createElement('div');
  _eDebugPanel.id = 'codeapp-debug-panel';
  _eDebugPanel.style.cssText = 'position:fixed;top:0;right:0;z-index:999998;width:420px;height:100vh;background:#16161e;color:#e0e0e0;font-family:monospace;display:none;flex-direction:column;box-shadow:-4px 0 16px rgba(0,0,0,0.5);';

  let eHeader = document.createElement('div');
  eHeader.style.cssText = 'padding:10px 12px;background:#1e1e2e;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
  eHeader.innerHTML = '<span style="font-weight:bold;font-size:14px;">\uD83D\uDC1B codeapp.js Debugger</span>';
  let eClear = document.createElement('button');
  eClear.textContent = 'Clear';
  eClear.style.cssText = 'background:#333;color:#e0e0e0;border:1px solid #555;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:12px;';
  eClear.onclick = function() {
    _aDebugEntries = [];
    _eDebugList.innerHTML = '';
    let eBadge = _eDebugIcon.querySelector('.dbg-badge');
    if (eBadge) eBadge.textContent = '0';
  };
  eHeader.appendChild(eClear);
  _eDebugPanel.appendChild(eHeader);

  _eDebugList = document.createElement('div');
  _eDebugList.style.cssText = 'flex:1;overflow-y:auto;';
  _eDebugPanel.appendChild(_eDebugList);
  document.body.appendChild(_eDebugPanel);

  // Render entries logged before UI was ready
  _aDebugEntries.slice().reverse().forEach(function(oEntry) {
    _dbgRenderEntry(oEntry, false);
  });
}

export function enableDebugger() {
  console.warn("Debug mode enabled: all API calls will be logged in the debug panel. Call enableDebugger() only in development environments.");
  if (_bDebugActive) return;
  _bDebugActive = true;
  if (document.body) {
    _dbgInjectUI();
  } else {
    document.addEventListener('DOMContentLoaded', _dbgInjectUI);
  }
}

// ── Get Environment Variable (single query with expand) ────────
export async function getEnvironmentVariable(sSchemaName) {
  return _dbgWrap('getEnvironmentVariable', [sSchemaName], async function() {
  let client = getSharedClient();

  // Try single query: filter values by expanded definition schema name
  let valResult = await client.retrieveMultipleRecordsAsync("environmentvariablevalues", {
    filter: "EnvironmentVariableDefinitionId/schemaname eq '" + sSchemaName + "'",
    select: ["value"],
    expand: [{ name: "EnvironmentVariableDefinitionId", select: ["defaultvalue", "schemaname"] }],
  });
  let aVals = unwrapResult(valResult);

  // If value record exists, return it
  if (Array.isArray(aVals) && aVals.length > 0 && aVals[0].value) {
    return aVals[0].value;
  }

  // No value record — fall back to definition default value
  let defResult = await client.retrieveMultipleRecordsAsync("environmentvariabledefinitions", {
    filter: "schemaname eq '" + sSchemaName + "'",
    select: ["defaultvalue"],
  });
  let aDefs = unwrapResult(defResult);
  if (!Array.isArray(aDefs) || aDefs.length === 0) {
    throw new Error("Environment variable not found: " + sSchemaName);
  }
  return aDefs[0].defaultvalue || "";
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────── Dataverse ──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

// ── Table Registry (populated at runtime via registerTable) ────
let oDataSources = {};

// ── Register a Dataverse table for use by the library ──────────
export function registerTable(sTableName, sPrimaryKey) {
  return _dbgWrap('registerTable', [sTableName, sPrimaryKey], function() {
  oDataSources[sTableName] = {
    tableId: '',
    version: '',
    primaryKey: sPrimaryKey,
    dataSourceType: 'Dataverse',
    apis: {}
  };
  // reset client so it picks up the new table on next call
  oSharedClient = null;
  });
}

// ── Ensure value is an array (accepts array or comma-separated string)
function ensureArray(value) {
  if (!value) return value;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map(function (s) { return s.trim(); });
  return value;
}

// ── Create ─────────────────────────────────────────────────────
export async function createItem(tableName, primaryKey, record) {
  return _dbgWrap('createItem', [tableName, primaryKey, record], async function() {
  const client = getSharedClient();
  const result = await client.createRecordAsync(tableName, record);
  return unwrapResult(result);
  });
}

// ── Read (single) ──────────────────────────────────────────────
export async function getItem(tableName, primaryKey, id, select) {
  return _dbgWrap('getItem', [tableName, primaryKey, id, select], async function() {
  const client = getSharedClient();
  select = ensureArray(select);
  const options = select ? { select } : undefined;
  const result = await client.retrieveRecordAsync(tableName, id, options);
  return unwrapResult(result);
  });
}

// ── List (multiple) ────────────────────────────────────────────
export async function listItems(tableName, primaryKey, { filter, select, orderBy, top, skip } = {}) {
  return _dbgWrap('listItems', [tableName, primaryKey, { filter, select, orderBy, top, skip }], async function() {
  const client = getSharedClient();
  select = ensureArray(select);
  orderBy = ensureArray(orderBy);
  const result = await client.retrieveMultipleRecordsAsync(tableName, {
    filter,
    select,
    orderBy,
    top,
    skip,
  });
  var unwrapped = unwrapResult(result);
  return { entities: Array.isArray(unwrapped) ? unwrapped : [] };
  });
}

// ── Update ─────────────────────────────────────────────────────
export async function updateItem(tableName, primaryKey, id, changedFields) {
  return _dbgWrap('updateItem', [tableName, primaryKey, id, changedFields], async function() {
  const client = getSharedClient();
  const result = await client.updateRecordAsync(tableName, id, changedFields);
  return unwrapResult(result);
  });
}

// ── Delete ─────────────────────────────────────────────────────
export async function deleteItem(tableName, primaryKey, id) {
  return _dbgWrap('deleteItem', [tableName, primaryKey, id], async function() {
  const client = getSharedClient();
  const result = await client.deleteRecordAsync(tableName, id);
  return unwrapResult(result);
  });
}

// ── Unbound Action ─────────────────────────────────────────────
// Calls an unbound Dataverse action by POSTing to the action endpoint.
// Do NOT add action names to power.config.json dataSources — they are
// not entities and will cause deploy errors.
export async function callUnboundAction(tableName, primaryKey, actionName, params) {
  return _dbgWrap('callUnboundAction', [tableName, primaryKey, actionName, params], async function() {
  var oAllSources = Object.assign({}, oInitialDataSources, oDataSources);
  var result = await callActionAsync(oAllSources, actionName, params || {});
  return unwrapResult(result);
  });
}

// ── WhoAmI ─────────────────────────────────────────────────────
export async function whoAmI() {
  return _dbgWrap('whoAmI', [], async function() {
  var oCtx = await getContext();
  var sId = oCtx.UserId || oCtx.userId || oCtx.systemuserid;
  if (sId) return sId;
  if (oCtx.userSettings && oCtx.userSettings.userId) return oCtx.userSettings.userId;
  return oCtx;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────── SharePoint ─────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_SP = "sharepointonline";

// ── Initialize SDK client for the SharePoint connector ─────────
function initSpClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE_SP]: {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: {
        GetItems: {
          path: "/{connectionId}/datasets/{siteUrl}/tables/{table}/items",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
            { name: "table", in: "path", required: true },
            { name: "$filter", in: "query", required: false },
            { name: "$orderby", in: "query", required: false },
            { name: "$top", in: "query", required: false },
            { name: "$skip", in: "query", required: false },
          ],
        },
        GetItem: {
          path: "/{connectionId}/datasets/{siteUrl}/tables/{table}/items/{id}",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
            { name: "table", in: "path", required: true },
            { name: "id", in: "path", required: true },
          ],
        },
        PostItem: {
          path: "/{connectionId}/datasets/{siteUrl}/tables/{table}/items",
          method: "POST",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
            { name: "table", in: "path", required: true },
            { name: "item", in: "body", required: true },
          ],
        },
        PatchItem: {
          path: "/{connectionId}/datasets/{siteUrl}/tables/{table}/items/{id}",
          method: "PATCH",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
            { name: "table", in: "path", required: true },
            { name: "id", in: "path", required: true },
            { name: "item", in: "body", required: true },
          ],
        },
        DeleteItem: {
          path: "/{connectionId}/datasets/{siteUrl}/tables/{table}/items/{id}",
          method: "DELETE",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
            { name: "table", in: "path", required: true },
            { name: "id", in: "path", required: true },
          ],
        },
        GetTables: {
          path: "/{connectionId}/datasets/{siteUrl}/tables",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
          ],
        },
        GetDataSetsMetadata: {
          path: "/{connectionId}/datasets/{siteUrl}",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
          ],
        },
        CreateFile: {
          path: "/{connectionId}/datasets/{siteUrl}/files",
          method: "POST",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
            { name: "folderPath", in: "query", required: true },
            { name: "name", in: "query", required: true },
            { name: "body", in: "body", required: true },
          ],
        },
        UpdateFile: {
          path: "/{connectionId}/datasets/{siteUrl}/files/{id}",
          method: "PUT",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
            { name: "id", in: "path", required: true },
            { name: "body", in: "body", required: true },
          ],
        },
        DeleteFile: {
          path: "/{connectionId}/datasets/{siteUrl}/files/{id}",
          method: "DELETE",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
            { name: "id", in: "path", required: true },
          ],
        },
        MoveFile: {
          path: "/{connectionId}/datasets/{siteUrl}/files/{id}/moveto",
          method: "POST",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
            { name: "id", in: "path", required: true },
            { name: "destinationFolderPath", in: "query", required: true },
            { name: "newFileName", in: "query", required: false },
          ],
        },
        GetFileMetadata: {
          path: "/{connectionId}/datasets/{siteUrl}/files/{id}",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "siteUrl", in: "path", required: true },
            { name: "id", in: "path", required: true },
          ],
        },
        HttpRequest: {
          path: "/{connectionId}/httprequest",
          method: "POST",
          parameters: [
            { name: "connectionId", in: "path", required: true },
          ],
        },
      },
    },
  };
  return getClient(dataSourcesInfo);
}

// ── Internal: execute a connector operation ────────────────────
async function execSpOp(operationName, parameters) {
  const client = await initSpClient();
  const result = await client.executeAsync({
    connectorOperation: {
      tableName: DATA_SOURCE_SP,
      operationName,
      parameters,
    },
  });
  if (!result.success) {
    throw new Error(result.error?.message || "Operation failed");
  }
  return result.data;
}

// ═══════════════════════════════════════════════════════════════
//  GENERIC
// ═══════════════════════════════════════════════════════════════

// ── Call any SharePoint connector operation by name ─────────────
export async function callSharePointOperation(operationName, parameters = {}) {
  return _dbgWrap('callSharePointOperation', [operationName, parameters], async function() {
  return execSpOp(operationName, parameters);
  });
}

// ── Send HTTP Request (for list-name-based operations) ─────────
export async function sendHttpRequest({ method = "GET", uri, headers, body }) {
  return _dbgWrap('sendHttpRequest', [{ method, uri, headers, body }], async function() {
  return execSpOp("HttpRequest", {
    method,
    uri,
    headers: headers || {},
    body: body || "",
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  ITEMS (standard API — uses list ID)
// ═══════════════════════════════════════════════════════════════

// ── Get Items ──────────────────────────────────────────────────
export async function getItems(sSiteUrl, sListId, { filter, orderBy, top, skip } = {}) {
  return _dbgWrap('getItems', [sSiteUrl, sListId, { filter, orderBy, top, skip }], async function() {
  let params = { siteUrl: encodeURIComponent(sSiteUrl), table: sListId };
  if (filter)       params.$filter = filter;
  if (orderBy)      params.$orderby = orderBy;
  if (top != null)  params.$top = top;
  if (skip != null) params.$skip = skip;
  return execSpOp("GetItems", params);
  });
}

// ── Get Item ───────────────────────────────────────────────────
export async function getSpItem(sSiteUrl, sListId, iItemId) {
  return _dbgWrap('getSpItem', [sSiteUrl, sListId, iItemId], async function() {
  return execSpOp("GetItem", {
    siteUrl: encodeURIComponent(sSiteUrl),
    table: sListId,
    id: iItemId,
  });
  });
}

// ── Create Item ────────────────────────────────────────────────
export async function createSpItem(sSiteUrl, sListId, oFields) {
  return _dbgWrap('createSpItem', [sSiteUrl, sListId, oFields], async function() {
  return execSpOp("PostItem", {
    siteUrl: encodeURIComponent(sSiteUrl),
    table: sListId,
    item: oFields,
  });
  });
}

// ── Update Item ────────────────────────────────────────────────
export async function updateSpItem(sSiteUrl, sListId, iItemId, oChangedFields) {
  return _dbgWrap('updateSpItem', [sSiteUrl, sListId, iItemId, oChangedFields], async function() {
  return execSpOp("PatchItem", {
    siteUrl: encodeURIComponent(sSiteUrl),
    table: sListId,
    id: iItemId,
    item: oChangedFields,
  });
  });
}

// ── Delete Item ────────────────────────────────────────────────
export async function deleteSpItem(sSiteUrl, sListId, iItemId) {
  return _dbgWrap('deleteSpItem', [sSiteUrl, sListId, iItemId], async function() {
  return execSpOp("DeleteItem", {
    siteUrl: encodeURIComponent(sSiteUrl),
    table: sListId,
    id: iItemId,
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  ITEMS (HTTP API — uses list name)
// ═══════════════════════════════════════════════════════════════

// ── Get Items by List Name ─────────────────────────────────────
export async function getItemsByName(sSiteUrl, sListName, { filter, orderBy, top, skip } = {}) {
  return _dbgWrap('getItemsByName', [sSiteUrl, sListName, { filter, orderBy, top, skip }], async function() {
  let sUri = sSiteUrl + "/_api/web/lists/getbytitle('" + sListName + "')/items";
  let aQuery = [];
  if (filter)       aQuery.push("$filter=" + filter);
  if (orderBy)      aQuery.push("$orderby=" + orderBy);
  if (top != null)  aQuery.push("$top=" + top);
  if (skip != null) aQuery.push("$skip=" + skip);
  if (aQuery.length > 0) sUri = sUri + "?" + aQuery.join("&");
  return sendHttpRequest({ method: "GET", uri: sUri, headers: { Accept: "application/json;odata=nometadata" } });
  });
}

// ── Get Item by List Name ──────────────────────────────────────
export async function getItemByName(sSiteUrl, sListName, iItemId) {
  return _dbgWrap('getItemByName', [sSiteUrl, sListName, iItemId], async function() {
  let sUri = sSiteUrl + "/_api/web/lists/getbytitle('" + sListName + "')/items(" + iItemId + ")";
  return sendHttpRequest({ method: "GET", uri: sUri, headers: { Accept: "application/json;odata=nometadata" } });
  });
}

// ── Create Item by List Name ───────────────────────────────────
export async function createItemByName(sSiteUrl, sListName, oFields) {
  return _dbgWrap('createItemByName', [sSiteUrl, sListName, oFields], async function() {
  let sUri = sSiteUrl + "/_api/web/lists/getbytitle('" + sListName + "')/items";
  return sendHttpRequest({ method: "POST", uri: sUri, headers: { Accept: "application/json;odata=nometadata", "Content-Type": "application/json;odata=nometadata" }, body: JSON.stringify(oFields) });
  });
}

// ── Update Item by List Name ───────────────────────────────────
export async function updateItemByName(sSiteUrl, sListName, iItemId, oChangedFields) {
  return _dbgWrap('updateItemByName', [sSiteUrl, sListName, iItemId, oChangedFields], async function() {
  let sUri = sSiteUrl + "/_api/web/lists/getbytitle('" + sListName + "')/items(" + iItemId + ")";
  return sendHttpRequest({ method: "PATCH", uri: sUri, headers: { Accept: "application/json;odata=nometadata", "Content-Type": "application/json;odata=nometadata", "If-Match": "*" }, body: JSON.stringify(oChangedFields) });
  });
}

// ── Delete Item by List Name ───────────────────────────────────
export async function deleteItemByName(sSiteUrl, sListName, iItemId) {
  return _dbgWrap('deleteItemByName', [sSiteUrl, sListName, iItemId], async function() {
  let sUri = sSiteUrl + "/_api/web/lists/getbytitle('" + sListName + "')/items(" + iItemId + ")";
  return sendHttpRequest({ method: "DELETE", uri: sUri, headers: { Accept: "application/json;odata=nometadata", "If-Match": "*" } });
  });
}

// ═══════════════════════════════════════════════════════════════
//  TABLES / LISTS
// ═══════════════════════════════════════════════════════════════

// ── List Tables (Lists) ────────────────────────────────────────
export async function listTables(sSiteUrl) {
  return _dbgWrap('listTables', [sSiteUrl], async function() {
  return execSpOp("GetTables", {
    siteUrl: encodeURIComponent(sSiteUrl),
  });
  });
}

// ── List Library (Document Libraries) ──────────────────────────
export async function listLibrary(sSiteUrl) {
  return _dbgWrap('listLibrary', [sSiteUrl], async function() {
  return execSpOp("GetDataSetsMetadata", {
    siteUrl: encodeURIComponent(sSiteUrl),
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  FILES
// ═══════════════════════════════════════════════════════════════

// ── Create File ────────────────────────────────────────────────
export async function createFile(sSiteUrl, sLibraryName, sFileName, fileContent) {
  return _dbgWrap('createFile', [sSiteUrl, sLibraryName, sFileName, fileContent], async function() {
  return execSpOp("CreateFile", {
    siteUrl: encodeURIComponent(sSiteUrl),
    folderPath: sLibraryName,
    name: sFileName,
    body: fileContent,
  });
  });
}

// ── Update File ────────────────────────────────────────────────
export async function updateFile(sSiteUrl, sFileId, fileContent) {
  return _dbgWrap('updateFile', [sSiteUrl, sFileId, fileContent], async function() {
  return execSpOp("UpdateFile", {
    siteUrl: encodeURIComponent(sSiteUrl),
    id: sFileId,
    body: fileContent,
  });
  });
}

// ── Delete File ────────────────────────────────────────────────
export async function deleteFile(sSiteUrl, sFileId) {
  return _dbgWrap('deleteFile', [sSiteUrl, sFileId], async function() {
  return execSpOp("DeleteFile", {
    siteUrl: encodeURIComponent(sSiteUrl),
    id: sFileId,
  });
  });
}

// ── Move File ──────────────────────────────────────────────────
export async function moveFile(sSiteUrl, sSourceFileId, sDestinationFolderPath, sNewFileName) {
  return _dbgWrap('moveFile', [sSiteUrl, sSourceFileId, sDestinationFolderPath, sNewFileName], async function() {
  return execSpOp("MoveFile", {
    siteUrl: encodeURIComponent(sSiteUrl),
    id: sSourceFileId,
    destinationFolderPath: sDestinationFolderPath,
    newFileName: sNewFileName || "",
  });
  });
}

// ── Get File Metadata ──────────────────────────────────────────
export async function getFileMetadata(sSiteUrl, sFileId) {
  return _dbgWrap('getFileMetadata', [sSiteUrl, sFileId], async function() {
  return execSpOp("GetFileMetadata", {
    siteUrl: encodeURIComponent(sSiteUrl),
    id: sFileId,
  });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────── Outlook365 ──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_CANDIDATES = ["office365outlook", "Office365Outlook", "office365"];
const OUTLOOK_APIS = {
  // ── Email operations ──
  GetEmailsV3: {
    path: "/{connectionId}/v3/Mail",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "folderPath", in: "query", required: false },
      { name: "to", in: "query", required: false },
      { name: "cc", in: "query", required: false },
      { name: "toOrCc", in: "query", required: false },
      { name: "from", in: "query", required: false },
      { name: "importance", in: "query", required: false },
      { name: "fetchOnlyWithAttachment", in: "query", required: false },
      { name: "subjectFilter", in: "query", required: false },
      { name: "fetchOnlyUnread", in: "query", required: false },
      { name: "fetchOnlyFlagged", in: "query", required: false },
      { name: "mailboxAddress", in: "query", required: false },
      { name: "includeAttachments", in: "query", required: false },
      { name: "searchQuery", in: "query", required: false },
      { name: "top", in: "query", required: false },
    ],
  },
  SendEmailV2: {
    path: "/{connectionId}/v2/Mail",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "emailMessage", in: "body", required: true },
    ],
  },
  ForwardEmail: {
    path: "/{connectionId}/codeless/api/v2.0/me/messages/{message_id}/forward",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "message_id", in: "path", required: true },
      { name: "body", in: "body", required: true },
    ],
  },
  ReplyToV3: {
    path: "/{connectionId}/v3/Mail/ReplyTo/{messageId}",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "messageId", in: "path", required: true },
      { name: "replyParameters", in: "body", required: true },
      { name: "mailboxAddress", in: "query", required: false },
    ],
  },
  MoveV2: {
    path: "/{connectionId}/v2/Mail/Move/{messageId}",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "messageId", in: "path", required: true },
      { name: "folderPath", in: "query", required: true },
      { name: "mailboxAddress", in: "query", required: false },
    ],
  },
  DeleteEmail: {
    path: "/{connectionId}/Mail/{messageId}",
    method: "DELETE",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "messageId", in: "path", required: true },
    ],
  },
  SharedMailboxSendEmailV2: {
    path: "/{connectionId}/v2/SharedMailbox/Mail",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "emailMessage", in: "body", required: true },
    ],
  },
  // ── Calendar operations ──
  V4CalendarGetItems: {
    path: "/{connectionId}/datasets/calendars/v4/tables/{table}/items",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "table", in: "path", required: true },
      { name: "$filter", in: "query", required: false },
      { name: "$orderby", in: "query", required: false },
      { name: "$top", in: "query", required: false },
      { name: "$skip", in: "query", required: false },
    ],
  },
  V4CalendarPostItem: {
    path: "/{connectionId}/datasets/calendars/v4/tables/{table}/items",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "table", in: "path", required: true },
      { name: "item", in: "body", required: true },
    ],
  },
  V4CalendarPatchItem: {
    path: "/{connectionId}/datasets/calendars/v4/tables/{table}/items/{id}",
    method: "PATCH",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "table", in: "path", required: true },
      { name: "id", in: "path", required: true },
      { name: "item", in: "body", required: true },
    ],
  },
  CalendarDeleteItem: {
    path: "/{connectionId}/datasets/calendars/tables/{table}/items/{id}",
    method: "DELETE",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "table", in: "path", required: true },
      { name: "id", in: "path", required: true },
    ],
  },
};

Object.assign(OUTLOOK_APIS, JSON.parse(String.raw`{
  "GetEmailsV2": {
    "path": "/{connectionId}/v2/Mail",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folderPath", "in": "query", "required": false, "type": "string" },
      { "name": "to", "in": "query", "required": false, "type": "string" },
      { "name": "cc", "in": "query", "required": false, "type": "string" },
      { "name": "toOrCc", "in": "query", "required": false, "type": "string" },
      { "name": "from", "in": "query", "required": false, "type": "string" },
      { "name": "importance", "in": "query", "required": false, "type": "string" },
      { "name": "fetchOnlyWithAttachment", "in": "query", "required": false, "type": "boolean" },
      { "name": "subjectFilter", "in": "query", "required": false, "type": "string" },
      { "name": "fetchOnlyUnread", "in": "query", "required": false, "type": "boolean" },
      { "name": "fetchOnlyFlagged", "in": "query", "required": false, "type": "boolean" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "includeAttachments", "in": "query", "required": false, "type": "boolean" },
      { "name": "searchQuery", "in": "query", "required": false, "type": "string" },
      { "name": "top", "in": "query", "required": false, "type": "integer" }
    ]
  },
  "GetEmail": {
    "path": "/{connectionId}/Mail/{messageId}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "includeAttachments", "in": "query", "required": false, "type": "boolean" },
      { "name": "internetMessageId", "in": "query", "required": false, "type": "string" }
    ]
  },
  "GetEmailV2": {
    "path": "/{connectionId}/v2/Mail/{messageId}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "includeAttachments", "in": "query", "required": false, "type": "boolean" },
      { "name": "internetMessageId", "in": "query", "required": false, "type": "string" },
      { "name": "extractSensitivityLabel", "in": "query", "required": false, "type": "boolean" },
      { "name": "fetchSensitivityLabelMetadata", "in": "query", "required": false, "type": "boolean" }
    ]
  },
  "SendEmail": {
    "path": "/{connectionId}/Mail",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "emailMessage", "in": "body", "required": true, "type": "object" }
    ]
  },
  "DraftEmail": {
    "path": "/{connectionId}/Draft",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "draftMessage", "in": "body", "required": true, "type": "object" },
      { "name": "messageId", "in": "query", "required": false, "type": "string" },
      { "name": "draftType", "in": "query", "required": false, "type": "string" },
      { "name": "comment", "in": "query", "required": false, "type": "string" }
    ]
  },
  "UpdateDraftEmail": {
    "path": "/{connectionId}/Draft",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "draftMessage", "in": "body", "required": true, "type": "object" },
      { "name": "messageId", "in": "query", "required": true, "type": "string" }
    ]
  },
  "SendDraftEmail": {
    "path": "/{connectionId}/Draft/Send/{messageId}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "DeleteEmail_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/messages/{messageId}",
    "method": "DELETE",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" }
    ]
  },
  "ForwardEmail_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/messages/{message_id}/forward",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "message_id", "in": "path", "required": true, "type": "string" },
      { "name": "body", "in": "body", "required": true, "type": "object" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" }
    ]
  },
  "ReplyToV2": {
    "path": "/{connectionId}/v2/Mail/ReplyTo/{messageId}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "replyParameters", "in": "body", "required": true, "type": "object" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" }
    ]
  },
  "Flag": {
    "path": "/{connectionId}/Mail/Flag/{messageId}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "Flag_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/messages/{messageId}/flag",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "body", "in": "body", "required": false, "type": "object" }
    ]
  },
  "MarkAsRead": {
    "path": "/{connectionId}/Mail/MarkAsRead/{messageId}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "MarkAsRead_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/messages/{messageId}/markAsRead",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "body", "in": "body", "required": false, "type": "object" }
    ]
  },
  "MarkAsRead_V3": {
    "path": "/{connectionId}/codeless/v3/v1.0/me/messages/{messageId}/markAsRead",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "body", "in": "body", "required": false, "type": "object" }
    ]
  },
  "GetAttachment": {
    "path": "/{connectionId}/Mail/{messageId}/Attachments/{attachmentId}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "attachmentId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetAttachment_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/messages/{messageId}/attachments/{attachmentId}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "attachmentId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "extractSensitivityLabel", "in": "query", "required": false, "type": "boolean" },
      { "name": "fetchSensitivityLabelMetadata", "in": "query", "required": false, "type": "boolean" }
    ]
  },
  "AssignCategory": {
    "path": "/{connectionId}/Mail/Category",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "query", "required": true, "type": "string" },
      { "name": "category", "in": "query", "required": true, "type": "string" }
    ]
  },
  "AssignCategoryBulk": {
    "path": "/{connectionId}/Mail/Category/Bulk/{categoryName}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageIds", "in": "body", "required": true, "type": "object" },
      { "name": "categoryName", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetOutlookCategoryNames": {
    "path": "/{connectionId}/Categories",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "SharedMailboxSendEmail": {
    "path": "/{connectionId}/SharedMailbox/Mail",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "emailMessage", "in": "body", "required": true, "type": "object" }
    ]
  },
  "V3CalendarGetItem": {
    "path": "/{connectionId}/datasets/calendars/v3/tables/{table}/items/{id}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "table", "in": "path", "required": true, "type": "string" },
      { "name": "id", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetEventsCalendarViewV3": {
    "path": "/{connectionId}/datasets/calendars/v3/tables/items/calendarview",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "calendarId", "in": "query", "required": true, "type": "string" },
      { "name": "startDateTimeUtc", "in": "query", "required": true, "type": "string" },
      { "name": "endDateTimeUtc", "in": "query", "required": true, "type": "string" },
      { "name": "$filter", "in": "query", "required": false, "type": "string" },
      { "name": "$orderby", "in": "query", "required": false, "type": "string" },
      { "name": "$top", "in": "query", "required": false, "type": "integer" },
      { "name": "$skip", "in": "query", "required": false, "type": "integer" },
      { "name": "search", "in": "query", "required": false, "type": "string" }
    ]
  },
  "RespondToEvent_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/events/{event_id}/{response}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "event_id", "in": "path", "required": true, "type": "string" },
      { "name": "response", "in": "path", "required": true, "type": "string" },
      { "name": "body", "in": "body", "required": false, "type": "object" }
    ]
  },
  "CalendarGetTables_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/calendars",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "skip", "in": "query", "required": false, "type": "integer" },
      { "name": "top", "in": "query", "required": false, "type": "integer" },
      { "name": "orderBy", "in": "query", "required": false, "type": "string" }
    ]
  },
  "ContactGetTablesV2": {
    "path": "/{connectionId}/v2/datasets/contacts/tables",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "ContactGetItems_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folder", "in": "path", "required": true, "type": "string" },
      { "name": "$filter", "in": "query", "required": false, "type": "string" },
      { "name": "$orderby", "in": "query", "required": false, "type": "string" },
      { "name": "$top", "in": "query", "required": false, "type": "integer" },
      { "name": "$skip", "in": "query", "required": false, "type": "integer" }
    ]
  },
  "ContactGetItem_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts/{id}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folder", "in": "path", "required": true, "type": "string" },
      { "name": "id", "in": "path", "required": true, "type": "string" }
    ]
  },
  "ContactPostItem_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folder", "in": "path", "required": true, "type": "string" },
      { "name": "item", "in": "body", "required": true, "type": "object" }
    ]
  },
  "ContactPatchItem_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts/{id}",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folder", "in": "path", "required": true, "type": "string" },
      { "name": "id", "in": "path", "required": true, "type": "string" },
      { "name": "item", "in": "body", "required": true, "type": "object" }
    ]
  },
  "ContactDeleteItem_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts/{id}",
    "method": "DELETE",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folder", "in": "path", "required": true, "type": "string" },
      { "name": "id", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetRoomLists_V2": {
    "path": "/{connectionId}/codeless/beta/me/findRoomLists",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetRooms_V2": {
    "path": "/{connectionId}/codeless/beta/me/findRooms",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetRoomsInRoomList_V2": {
    "path": "/{connectionId}/codeless/beta/me/findRooms(RoomList='{room_list}')",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "room_list", "in": "path", "required": true, "type": "string" }
    ]
  },
  "FindMeetingTimes_V2": {
    "path": "/{connectionId}/codeless/beta/me/findMeetingTimes",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "body", "in": "body", "required": true, "type": "object" }
    ]
  },
  "SetAutomaticRepliesSetting": {
    "path": "/{connectionId}/AutomaticRepliesSetting",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "clientSetting", "in": "body", "required": true, "type": "object" }
    ]
  },
  "SetAutomaticRepliesSetting_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/mailboxSettings",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "body", "in": "body", "required": true, "type": "object" }
    ]
  },
  "GetMailTips": {
    "path": "/{connectionId}/MailTips",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": true, "type": "string" }
    ]
  },
  "GetMailTips_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/getMailTips",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "body", "in": "body", "required": true, "type": "object" }
    ]
  },
  "HttpRequest": {
    "path": "/{connectionId}/codeless/httprequest",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "Uri", "in": "header", "required": true, "type": "string" },
      { "name": "Method", "in": "header", "required": true, "type": "string" },
      { "name": "Body", "in": "body", "required": false, "type": "object" },
      { "name": "ContentType", "in": "header", "required": false, "type": "string" },
      { "name": "CustomHeader1", "in": "header", "required": false, "type": "string" },
      { "name": "CustomHeader2", "in": "header", "required": false, "type": "string" },
      { "name": "CustomHeader3", "in": "header", "required": false, "type": "string" },
      { "name": "CustomHeader4", "in": "header", "required": false, "type": "string" },
      { "name": "CustomHeader5", "in": "header", "required": false, "type": "string" }
    ]
  },
  "mcp_EmailsManagement": {
    "path": "/{connectionId}/mcp/EmailsManagement",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "queryRequest", "in": "body", "required": false, "type": "object" },
      { "name": "sessionId", "in": "query", "required": false, "type": "string" }
    ]
  },
  "mcp_MeetingManagement": {
    "path": "/{connectionId}/mcp/MeetingManagement",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "queryRequest", "in": "body", "required": false, "type": "object" },
      { "name": "sessionId", "in": "query", "required": false, "type": "string" }
    ]
  },
  "mcp_ContactsManagement": {
    "path": "/{connectionId}/mcp/ContactsManagement",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "queryRequest", "in": "body", "required": false, "type": "object" },
      { "name": "sessionId", "in": "query", "required": false, "type": "string" }
    ]
  }
}`));

// ── Initialize SDK client for the Office 365 Outlook connector ──
function initOutlookClient() {
  const dataSourcesInfo = {};

  DATA_SOURCE_CANDIDATES.forEach((sDataSourceName) => {
    dataSourcesInfo[sDataSourceName] = {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: OUTLOOK_APIS,
    };
  });

  return getClient(dataSourcesInfo);
}

function stringifyOutlookError(oError) {
  if (!oError) return "Operation failed";
  if (typeof oError === "string") return oError;
  if (oError instanceof Error) return oError.message || "Operation failed";

  var aPropertyNames = Object.getOwnPropertyNames(oError);
  var oSerializable = {};
  aPropertyNames.forEach((sName) => {
    oSerializable[sName] = oError[sName];
  });

  try {
    return JSON.stringify(oSerializable);
  } catch {
    return String(oError);
  }
}

function unwrapOutlookResult(oResult) {
  if (oResult && oResult.success === false) {
    var sMessage = stringifyOutlookError(oResult.error);
    if (oResult.data !== undefined) {
      sMessage += " | data: " + stringifyOutlookError(oResult.data);
    }
    throw new Error(sMessage);
  }

  if (oResult && Object.prototype.hasOwnProperty.call(oResult, "data")) {
    return oResult.data;
  }

  return oResult;
}

function isOutlookObject(oValue) {
  return !!oValue && typeof oValue === "object" && !Array.isArray(oValue);
}

function pickOutlookValue() {
  for (let iIndex = 0; iIndex < arguments.length; iIndex += 1) {
    if (arguments[iIndex] !== undefined && arguments[iIndex] !== null) {
      return arguments[iIndex];
    }
  }

  return undefined;
}

function setOutlookIfDefined(oTarget, sKey, oValue) {
  if (oValue !== undefined && oValue !== null) {
    oTarget[sKey] = oValue;
  }

  return oTarget;
}

function normalizeOutlookList(value) {
  if (Array.isArray(value)) {
    return value.map(function(item) {
      if (typeof item === "string") {
        return item;
      }

      if (isOutlookObject(item)) {
        return pickOutlookValue(
          item.Address,
          item.address,
          item.EmailAddress && item.EmailAddress.Address,
          item.EmailAddress && item.EmailAddress.address
        );
      }

      return item;
    }).filter(Boolean).join(";");
  }

  return value;
}

function normalizeOutlookAttachments(aAttachments) {
  if (!Array.isArray(aAttachments)) {
    return aAttachments;
  }

  return aAttachments.map(function(oAttachment) {
    if (!isOutlookObject(oAttachment)) {
      return oAttachment;
    }

    const oNormalized = Object.assign({}, oAttachment);
    setOutlookIfDefined(oNormalized, "Name", pickOutlookValue(oAttachment.Name, oAttachment.name));
    setOutlookIfDefined(oNormalized, "ContentBytes", pickOutlookValue(oAttachment.ContentBytes, oAttachment.contentBytes));
    return oNormalized;
  });
}

function normalizeEmailMessage(oOptions, bSupportsPlainText) {
  const oSource = isOutlookObject(oOptions && oOptions.emailMessage) ? oOptions.emailMessage : (isOutlookObject(oOptions) ? oOptions : {});
  const oMessage = Object.assign({}, oSource);

  setOutlookIfDefined(oMessage, "To", normalizeOutlookList(pickOutlookValue(oSource.To, oSource.to)));
  setOutlookIfDefined(oMessage, "Cc", normalizeOutlookList(pickOutlookValue(oSource.Cc, oSource.cc)));
  setOutlookIfDefined(oMessage, "Bcc", normalizeOutlookList(pickOutlookValue(oSource.Bcc, oSource.bcc)));
  setOutlookIfDefined(oMessage, "ReplyTo", normalizeOutlookList(pickOutlookValue(oSource.ReplyTo, oSource.replyTo)));
  setOutlookIfDefined(oMessage, "From", pickOutlookValue(oSource.From, oSource.from));
  setOutlookIfDefined(oMessage, "Subject", pickOutlookValue(oSource.Subject, oSource.subject));
  setOutlookIfDefined(oMessage, "Body", pickOutlookValue(oSource.Body, oSource.body));
  setOutlookIfDefined(oMessage, "Sensitivity", pickOutlookValue(oSource.Sensitivity, oSource.sensitivity));
  setOutlookIfDefined(oMessage, "Importance", pickOutlookValue(oSource.Importance, oSource.importance));
  setOutlookIfDefined(oMessage, "Attachments", normalizeOutlookAttachments(pickOutlookValue(oSource.Attachments, oSource.attachments)));

  if (bSupportsPlainText) {
    setOutlookIfDefined(oMessage, "IsHtml", pickOutlookValue(oSource.IsHtml, oSource.isHtml));
  }

  return oMessage;
}

function normalizeSharedMailboxMessage(sSharedMailbox, oOptions, bSupportsPlainText) {
  const oSource = isOutlookObject(oOptions && oOptions.emailMessage) ? oOptions.emailMessage : (isOutlookObject(oOptions) ? oOptions : {});
  const oMessage = normalizeEmailMessage(oOptions, bSupportsPlainText);
  setOutlookIfDefined(oMessage, "MailboxAddress", pickOutlookValue(oSource.MailboxAddress, oSource.mailboxAddress, sSharedMailbox));
  return oMessage;
}

function normalizeReplyParameters(oOptions, bSupportsPlainText) {
  const oSource = isOutlookObject(oOptions && oOptions.replyParameters) ? oOptions.replyParameters : (isOutlookObject(oOptions) ? oOptions : {});
  const oReply = Object.assign({}, oSource);

  setOutlookIfDefined(oReply, "To", normalizeOutlookList(pickOutlookValue(oSource.To, oSource.to)));
  setOutlookIfDefined(oReply, "Cc", normalizeOutlookList(pickOutlookValue(oSource.Cc, oSource.cc)));
  setOutlookIfDefined(oReply, "Bcc", normalizeOutlookList(pickOutlookValue(oSource.Bcc, oSource.bcc)));
  setOutlookIfDefined(oReply, "Subject", pickOutlookValue(oSource.Subject, oSource.subject));
  setOutlookIfDefined(oReply, "Body", pickOutlookValue(oSource.Body, oSource.body, oSource.comment));
  setOutlookIfDefined(oReply, "ReplyAll", pickOutlookValue(oSource.ReplyAll, oSource.replyAll));
  setOutlookIfDefined(oReply, "Importance", pickOutlookValue(oSource.Importance, oSource.importance));
  setOutlookIfDefined(oReply, "Attachments", normalizeOutlookAttachments(pickOutlookValue(oSource.Attachments, oSource.attachments)));

  if (bSupportsPlainText) {
    setOutlookIfDefined(oReply, "IsHtml", pickOutlookValue(oSource.IsHtml, oSource.isHtml));
  }

  return oReply;
}

function normalizeForwardBody(oOptions) {
  const oSource = isOutlookObject(oOptions && oOptions.body) ? oOptions.body : (isOutlookObject(oOptions) ? oOptions : {});
  const oBody = Object.assign({}, oSource);
  setOutlookIfDefined(oBody, "ToRecipients", normalizeOutlookList(pickOutlookValue(oSource.ToRecipients, oSource.toRecipients, oSource.To, oSource.to)));
  setOutlookIfDefined(oBody, "Comment", pickOutlookValue(oSource.Comment, oSource.comment));
  return oBody;
}

function normalizeEventItem(oOptions, bApplyDefaults) {
  const oSource = isOutlookObject(oOptions && oOptions.item) ? oOptions.item : (isOutlookObject(oOptions) ? oOptions : {});
  const oItem = Object.assign({}, oSource);

  setOutlookIfDefined(oItem, "subject", pickOutlookValue(oSource.subject, oSource.Subject, oSource.title));
  setOutlookIfDefined(oItem, "start", pickOutlookValue(oSource.start, oSource.Start, oSource.startWithTimeZone));
  setOutlookIfDefined(oItem, "end", pickOutlookValue(oSource.end, oSource.End, oSource.endWithTimeZone));
  setOutlookIfDefined(oItem, "timeZone", pickOutlookValue(oSource.timeZone, oSource.TimeZone, oSource.timezone, oSource.StartTimeZone, oSource.EndTimeZone));
  setOutlookIfDefined(oItem, "requiredAttendees", normalizeOutlookList(pickOutlookValue(oSource.requiredAttendees, oSource.RequiredAttendees, oSource.attendees)));
  setOutlookIfDefined(oItem, "optionalAttendees", normalizeOutlookList(pickOutlookValue(oSource.optionalAttendees, oSource.OptionalAttendees)));
  setOutlookIfDefined(oItem, "resourceAttendees", normalizeOutlookList(pickOutlookValue(oSource.resourceAttendees, oSource.ResourceAttendees)));
  setOutlookIfDefined(oItem, "body", pickOutlookValue(oSource.body, oSource.Body));
  setOutlookIfDefined(oItem, "categories", pickOutlookValue(oSource.categories, oSource.Categories));
  setOutlookIfDefined(oItem, "location", pickOutlookValue(oSource.location, oSource.Location));
  setOutlookIfDefined(oItem, "importance", pickOutlookValue(oSource.importance, oSource.Importance));
  setOutlookIfDefined(oItem, "isAllDay", pickOutlookValue(oSource.isAllDay, oSource.IsAllDay));
  setOutlookIfDefined(oItem, "recurrence", pickOutlookValue(oSource.recurrence, oSource.Recurrence));
  setOutlookIfDefined(oItem, "selectedDaysOfWeek", pickOutlookValue(oSource.selectedDaysOfWeek, oSource.SelectedDaysOfWeek));
  setOutlookIfDefined(oItem, "recurrenceEnd", pickOutlookValue(oSource.recurrenceEnd, oSource.RecurrenceEnd));
  setOutlookIfDefined(oItem, "numberOfOccurences", pickOutlookValue(oSource.numberOfOccurences, oSource.numberOfOccurrences, oSource.NumberOfOccurrences));
  setOutlookIfDefined(oItem, "reminderMinutesBeforeStart", pickOutlookValue(oSource.reminderMinutesBeforeStart, oSource.Reminder, oSource.reminder));
  setOutlookIfDefined(oItem, "isReminderOn", pickOutlookValue(oSource.isReminderOn, oSource.IsReminderOn));
  setOutlookIfDefined(oItem, "showAs", pickOutlookValue(oSource.showAs, oSource.ShowAs));
  setOutlookIfDefined(oItem, "responseRequested", pickOutlookValue(oSource.responseRequested, oSource.ResponseRequested));
  setOutlookIfDefined(oItem, "sensitivity", pickOutlookValue(oSource.sensitivity, oSource.Sensitivity));

  if (bApplyDefaults && oItem.timeZone === undefined) {
    oItem.timeZone = "";
  }

  return oItem;
}

function normalizeEmailQuery(oOptions) {
  const oSource = isOutlookObject(oOptions) ? oOptions : {};
  const oQuery = {};

  setOutlookIfDefined(oQuery, "folderPath", pickOutlookValue(oSource.folderPath, oSource.folderId));
  setOutlookIfDefined(oQuery, "to", normalizeOutlookList(pickOutlookValue(oSource.to, oSource.To)));
  setOutlookIfDefined(oQuery, "cc", normalizeOutlookList(pickOutlookValue(oSource.cc, oSource.Cc)));
  setOutlookIfDefined(oQuery, "toOrCc", normalizeOutlookList(pickOutlookValue(oSource.toOrCc, oSource.ToOrCc)));
  setOutlookIfDefined(oQuery, "from", pickOutlookValue(oSource.from, oSource.From));
  setOutlookIfDefined(oQuery, "importance", pickOutlookValue(oSource.importance, oSource.Importance));
  setOutlookIfDefined(oQuery, "fetchOnlyWithAttachment", pickOutlookValue(oSource.fetchOnlyWithAttachment, oSource.hasAttachment));
  setOutlookIfDefined(oQuery, "subjectFilter", pickOutlookValue(oSource.subjectFilter, oSource.subject));
  setOutlookIfDefined(oQuery, "fetchOnlyUnread", pickOutlookValue(oSource.fetchOnlyUnread, oSource.unreadOnly));
  setOutlookIfDefined(oQuery, "fetchOnlyFlagged", pickOutlookValue(oSource.fetchOnlyFlagged, oSource.flaggedOnly));
  setOutlookIfDefined(oQuery, "mailboxAddress", pickOutlookValue(oSource.mailboxAddress, oSource.MailboxAddress));
  setOutlookIfDefined(oQuery, "includeAttachments", pickOutlookValue(oSource.includeAttachments, oSource.IncludeAttachments));
  setOutlookIfDefined(oQuery, "searchQuery", pickOutlookValue(oSource.searchQuery, oSource.search, oSource.SearchQuery));
  setOutlookIfDefined(oQuery, "top", pickOutlookValue(oSource.top, oSource.Top));
  return oQuery;
}

function normalizeFlagBody(oOptions) {
  const oSource = isOutlookObject(oOptions) ? oOptions : {};
  if (isOutlookObject(oSource.body)) {
    return oSource.body;
  }

  if (isOutlookObject(oSource.flag)) {
    return { flag: oSource.flag };
  }

  const sFlagStatus = pickOutlookValue(oSource.flagStatus, oSource.status);
  if (sFlagStatus) {
    return { flag: { flagStatus: sFlagStatus } };
  }

  return undefined;
}

function normalizeMarkAsReadBody(oOptions) {
  const oSource = isOutlookObject(oOptions) ? oOptions : {};
  if (isOutlookObject(oSource.body)) {
    return oSource.body;
  }

  return { isRead: pickOutlookValue(oSource.isRead, true) };
}

// ── Internal: execute a connector operation ────────────────────
async function execOutlookOp(operationName, parameters) {
  const client = await initOutlookClient();
  const aErrors = [];

  for (let iIndex = 0; iIndex < DATA_SOURCE_CANDIDATES.length; iIndex += 1) {
    const sDataSourceName = DATA_SOURCE_CANDIDATES[iIndex];

    try {
      const result = await client.executeAsync({
        connectorOperation: {
          tableName: sDataSourceName,
          operationName,
          parameters,
        },
      });

      return unwrapOutlookResult(result);
    } catch (oErr) {
      const sMessage = stringifyOutlookError(oErr);
      aErrors.push(sDataSourceName + ": " + sMessage);

      if (sMessage.indexOf("Connection reference not found") === -1) {
        throw oErr;
      }
    }
  }

  throw new Error("No Outlook connection reference matched. Tried: " + aErrors.join(" || "));
}

// ── Generic: call any Outlook connector operation ──────────────
export async function callOutlookOperation(sOperationName, oParameters) {
  return _dbgWrap('callOutlookOperation', [sOperationName, oParameters], async function() {
  return execOutlookOp(sOperationName, oParameters);
  });
}

// ── Send Email ─────────────────────────────────────────────────
export async function sendEmail(oOptions = {}) {
  return _dbgWrap('sendEmail', [oOptions], async function() {
  const bUsePlainText = pickOutlookValue(oOptions.isHtml, oOptions.emailMessage && oOptions.emailMessage.IsHtml) === false;
  const oMessage = normalizeEmailMessage(oOptions, bUsePlainText);
  return execOutlookOp(bUsePlainText ? "SendEmail" : "SendEmailV2", { emailMessage: oMessage });
  });
}

// ── Forward Email ──────────────────────────────────────────────
export async function forwardEmail(sMessageId, oOptions = {}) {
  return _dbgWrap('forwardEmail', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  const sMailboxAddress = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  const sOperationName = sMailboxAddress ? "ForwardEmail_V2" : "ForwardEmail";
  const oParameters = {
    message_id: sMessageId,
    body: normalizeForwardBody(oOptions),
  };
  setOutlookIfDefined(oParameters, "mailboxAddress", sMailboxAddress);
  return execOutlookOp(sOperationName, oParameters);
  });
}

// ── Reply to Email ─────────────────────────────────────────────
export async function replyToEmail(sMessageId, oOptions = {}) {
  return _dbgWrap('replyToEmail', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  const bUsePlainText = pickOutlookValue(oOptions.isHtml, oOptions.replyParameters && oOptions.replyParameters.IsHtml) === false;
  const oParameters = {
    messageId: sMessageId,
    replyParameters: normalizeReplyParameters(oOptions, bUsePlainText),
  };
  setOutlookIfDefined(oParameters, "mailboxAddress", pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress));
  return execOutlookOp(bUsePlainText ? "ReplyToV2" : "ReplyToV3", oParameters);
  });
}

// ── List Emails ────────────────────────────────────────────────
export async function listEmails(oOptions = {}) {
  return _dbgWrap('listEmails', [oOptions], async function() {
  const iVersion = pickOutlookValue(oOptions.version, 3);
  const oParameters = normalizeEmailQuery(Object.assign({}, oOptions, { folderId: pickOutlookValue(oOptions.folderId, "Inbox") }));
  if (oParameters.top === undefined) {
    oParameters.top = 10;
  }
  void oOptions.skip;
  return execOutlookOp(iVersion === 2 ? "GetEmailsV2" : "GetEmailsV3", oParameters);
  });
}

// ── Send from Shared Mailbox ───────────────────────────────────
export async function sendFromSharedMailbox(sSharedMailbox, oOptions = {}) {
  return _dbgWrap('sendFromSharedMailbox', [sSharedMailbox, oOptions], async function() {
  if (isOutlookObject(sSharedMailbox)) {
    oOptions = sSharedMailbox;
    sSharedMailbox = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  }

  const bUsePlainText = pickOutlookValue(oOptions.isHtml, oOptions.emailMessage && oOptions.emailMessage.IsHtml) === false;
  const oMessage = normalizeSharedMailboxMessage(sSharedMailbox, oOptions, bUsePlainText);
  return execOutlookOp(bUsePlainText ? "SharedMailboxSendEmail" : "SharedMailboxSendEmailV2", { emailMessage: oMessage });
  });
}

// ── Move Email ─────────────────────────────────────────────────
export async function moveEmail(sMessageId, sDestinationFolderId, oOptions) {
  return _dbgWrap('moveEmail', [sMessageId, sDestinationFolderId, oOptions], async function() {
  if (isOutlookObject(sDestinationFolderId)) {
    oOptions = sDestinationFolderId;
    sDestinationFolderId = pickOutlookValue(oOptions.folderPath, oOptions.folderId, oOptions.destinationFolderId);
  }

  oOptions = isOutlookObject(oOptions) ? oOptions : {};
  return execOutlookOp("MoveV2", {
    messageId: sMessageId,
    folderPath: sDestinationFolderId,
    mailboxAddress: pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress),
  });
  });
}

// ── Delete Email ───────────────────────────────────────────────
export async function deleteEmail(sMessageId, oOptions) {
  return _dbgWrap('deleteEmail', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  oOptions = isOutlookObject(oOptions) ? oOptions : {};
  const sMailboxAddress = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  const sOperationName = sMailboxAddress ? "DeleteEmail_V2" : "DeleteEmail";
  const oParameters = { messageId: sMessageId };
  setOutlookIfDefined(oParameters, "mailboxAddress", sMailboxAddress);
  return execOutlookOp(sOperationName, oParameters);
  });
}

// ── Create Event ───────────────────────────────────────────────
export async function createEvent(oOptions = {}) {
  return _dbgWrap('createEvent', [oOptions], async function() {
  const oItem = normalizeEventItem(oOptions, true);

  return execOutlookOp("V4CalendarPostItem", {
    table: pickOutlookValue(oOptions.calendarId, oOptions.table, "Calendar"),
    item: oItem,
  });
  });
}

// ── List Events ────────────────────────────────────────────────
export async function listEvents(oOptions = {}) {
  return _dbgWrap('listEvents', [oOptions], async function() {
  return execOutlookOp("V4CalendarGetItems", {
    table: pickOutlookValue(oOptions.calendarId, oOptions.table, "Calendar"),
    $filter: pickOutlookValue(oOptions.filter, oOptions.$filter),
    $orderby: pickOutlookValue(oOptions.orderBy, oOptions.$orderby),
    $top: pickOutlookValue(oOptions.top, oOptions.$top),
    $skip: pickOutlookValue(oOptions.skip, oOptions.$skip),
  });
  });
}

// ── Edit Event ─────────────────────────────────────────────────
export async function editEvent(sEventId, oChangedFields, sCalendarId) {
  return _dbgWrap('editEvent', [sEventId, oChangedFields, sCalendarId], async function() {
  let oOptions = isOutlookObject(oChangedFields) ? oChangedFields : {};
  if (isOutlookObject(sEventId)) {
    oOptions = sEventId;
    sEventId = pickOutlookValue(oOptions.eventId, oOptions.id);
  }

  return execOutlookOp("V4CalendarPatchItem", {
    table: pickOutlookValue(oOptions.calendarId, oOptions.table, sCalendarId, "Calendar"),
    id: sEventId,
    item: normalizeEventItem(oOptions, false),
  });
  });
}

// ── Delete Event ───────────────────────────────────────────────
export async function deleteEvent(sEventId, sCalendarId, oOptions) {
  return _dbgWrap('deleteEvent', [sEventId, sCalendarId, oOptions], async function() {
  if (isOutlookObject(sCalendarId)) {
    oOptions = sCalendarId;
    sCalendarId = pickOutlookValue(oOptions.calendarId, oOptions.table);
  }

  return execOutlookOp("CalendarDeleteItem", {
    table: pickOutlookValue(sCalendarId, oOptions && oOptions.calendarId, oOptions && oOptions.table, "Calendar"),
    id: sEventId,
  });
  });
}

export async function getEmail(sMessageId, oOptions = {}) {
  return _dbgWrap('getEmail', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  const bUseV2 = pickOutlookValue(oOptions.version, 2) !== 1;
  const oParameters = {
    messageId: sMessageId,
    mailboxAddress: pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress),
    includeAttachments: pickOutlookValue(oOptions.includeAttachments, oOptions.IncludeAttachments),
    internetMessageId: pickOutlookValue(oOptions.internetMessageId, oOptions.InternetMessageId),
  };
  if (bUseV2) {
    setOutlookIfDefined(oParameters, "extractSensitivityLabel", oOptions.extractSensitivityLabel);
    setOutlookIfDefined(oParameters, "fetchSensitivityLabelMetadata", oOptions.fetchSensitivityLabelMetadata);
  }

  return execOutlookOp(bUseV2 ? "GetEmailV2" : "GetEmail", oParameters);
  });
}

export async function draftEmail(oOptions = {}) {
  return _dbgWrap('draftEmail', [oOptions], async function() {
  return execOutlookOp("DraftEmail", {
    draftMessage: normalizeEmailMessage(oOptions, false),
    messageId: pickOutlookValue(oOptions.messageId, oOptions.id),
    draftType: pickOutlookValue(oOptions.draftType, oOptions.type),
    comment: pickOutlookValue(oOptions.comment, oOptions.Comment),
  });
  });
}

export async function updateDraftEmail(sMessageId, oOptions = {}) {
  return _dbgWrap('updateDraftEmail', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  return execOutlookOp("UpdateDraftEmail", {
    messageId: sMessageId,
    draftMessage: normalizeEmailMessage(oOptions, false),
  });
  });
}

export async function sendDraftEmail(sMessageId) {
  return _dbgWrap('sendDraftEmail', [sMessageId], async function() {
  if (isOutlookObject(sMessageId)) {
    sMessageId = pickOutlookValue(sMessageId.messageId, sMessageId.id);
  }

  return execOutlookOp("SendDraftEmail", { messageId: sMessageId });
  });
}

export async function markEmailAsRead(sMessageId, oOptions = {}) {
  return _dbgWrap('markEmailAsRead', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  const sMailboxAddress = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  const bUseLegacy = pickOutlookValue(oOptions.version, 3) === 1 && !sMailboxAddress && !oOptions.body && oOptions.isRead === undefined;
  if (bUseLegacy) {
    return execOutlookOp("MarkAsRead", { messageId: sMessageId });
  }

  return execOutlookOp("MarkAsRead_V3", {
    messageId: sMessageId,
    mailboxAddress: sMailboxAddress,
    body: normalizeMarkAsReadBody(oOptions),
  });
  });
}

export async function updateEmailFlag(sMessageId, oOptions = {}) {
  return _dbgWrap('updateEmailFlag', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  const sMailboxAddress = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  const oBody = normalizeFlagBody(oOptions);
  if (!sMailboxAddress && !oBody) {
    return execOutlookOp("Flag", { messageId: sMessageId });
  }

  return execOutlookOp("Flag_V2", {
    messageId: sMessageId,
    mailboxAddress: sMailboxAddress,
    body: oBody,
  });
  });
}

export async function getEmailAttachment(sMessageId, sAttachmentId, oOptions = {}) {
  return _dbgWrap('getEmailAttachment', [sMessageId, sAttachmentId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
    sAttachmentId = pickOutlookValue(oOptions.attachmentId, oOptions.AttachmentId);
  } else if (isOutlookObject(sAttachmentId)) {
    oOptions = sAttachmentId;
    sAttachmentId = pickOutlookValue(oOptions.attachmentId, oOptions.AttachmentId);
  }

  const sMailboxAddress = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  const bUseV2 = !!sMailboxAddress || oOptions.extractSensitivityLabel === true || oOptions.fetchSensitivityLabelMetadata === true;
  const oParameters = {
    messageId: sMessageId,
    attachmentId: sAttachmentId,
  };
  if (bUseV2) {
    setOutlookIfDefined(oParameters, "mailboxAddress", sMailboxAddress);
    setOutlookIfDefined(oParameters, "extractSensitivityLabel", oOptions.extractSensitivityLabel);
    setOutlookIfDefined(oParameters, "fetchSensitivityLabelMetadata", oOptions.fetchSensitivityLabelMetadata);
  }

  return execOutlookOp(bUseV2 ? "GetAttachment_V2" : "GetAttachment", oParameters);
  });
}

export async function listOutlookCategories() {
  return _dbgWrap('listOutlookCategories', [], async function() {
  return execOutlookOp("GetOutlookCategoryNames");
  });
}

export async function assignOutlookCategory(sMessageId, sCategory) {
  return _dbgWrap('assignOutlookCategory', [sMessageId, sCategory], async function() {
  if (isOutlookObject(sMessageId)) {
    sCategory = pickOutlookValue(sMessageId.category, sMessageId.categoryName);
    sMessageId = pickOutlookValue(sMessageId.messageId, sMessageId.id);
  }

  return execOutlookOp("AssignCategory", { messageId: sMessageId, category: sCategory });
  });
}

export async function assignOutlookCategoryBulk(aMessageIds, sCategoryName) {
  return _dbgWrap('assignOutlookCategoryBulk', [aMessageIds, sCategoryName], async function() {
  if (isOutlookObject(aMessageIds)) {
    sCategoryName = pickOutlookValue(aMessageIds.categoryName, aMessageIds.category);
    aMessageIds = pickOutlookValue(aMessageIds.messageIds, aMessageIds.ids);
  }

  return execOutlookOp("AssignCategoryBulk", { messageIds: aMessageIds, categoryName: sCategoryName });
  });
}

export async function listCalendars(oOptions = {}) {
  return _dbgWrap('listCalendars', [oOptions], async function() {
  return execOutlookOp("CalendarGetTables_V2", {
    skip: oOptions.skip,
    top: oOptions.top,
    orderBy: pickOutlookValue(oOptions.orderBy, oOptions.$orderby),
  });
  });
}

export async function getEvent(sEventId, sCalendarId, oOptions) {
  return _dbgWrap('getEvent', [sEventId, sCalendarId, oOptions], async function() {
  if (isOutlookObject(sEventId)) {
    oOptions = sEventId;
    sEventId = pickOutlookValue(oOptions.eventId, oOptions.id);
    sCalendarId = pickOutlookValue(oOptions.calendarId, oOptions.table);
  } else if (isOutlookObject(sCalendarId)) {
    oOptions = sCalendarId;
    sCalendarId = pickOutlookValue(oOptions.calendarId, oOptions.table);
  }

  return execOutlookOp("V3CalendarGetItem", {
    table: pickOutlookValue(sCalendarId, oOptions && oOptions.calendarId, oOptions && oOptions.table, "Calendar"),
    id: sEventId,
  });
  });
}

export async function getCalendarView(oOptions = {}) {
  return _dbgWrap('getCalendarView', [oOptions], async function() {
  return execOutlookOp("GetEventsCalendarViewV3", {
    calendarId: pickOutlookValue(oOptions.calendarId, oOptions.table, "Calendar"),
    startDateTimeUtc: pickOutlookValue(oOptions.startDateTimeUtc, oOptions.start, oOptions.startDateTime),
    endDateTimeUtc: pickOutlookValue(oOptions.endDateTimeUtc, oOptions.end, oOptions.endDateTime),
    $filter: pickOutlookValue(oOptions.filter, oOptions.$filter),
    $orderby: pickOutlookValue(oOptions.orderBy, oOptions.$orderby),
    $top: pickOutlookValue(oOptions.top, oOptions.$top),
    $skip: pickOutlookValue(oOptions.skip, oOptions.$skip),
    search: oOptions.search,
  });
  });
}

export async function respondToEventInvite(sEventId, sResponse, oOptions = {}) {
  return _dbgWrap('respondToEventInvite', [sEventId, sResponse, oOptions], async function() {
  if (isOutlookObject(sEventId)) {
    oOptions = sEventId;
    sEventId = pickOutlookValue(oOptions.eventId, oOptions.id);
    sResponse = pickOutlookValue(oOptions.response, oOptions.action);
  }

  return execOutlookOp("RespondToEvent_V2", {
    event_id: sEventId,
    response: sResponse,
    body: isOutlookObject(oOptions.body) ? oOptions.body : {
      Comment: pickOutlookValue(oOptions.comment, oOptions.Comment),
      SendResponse: pickOutlookValue(oOptions.sendResponse, oOptions.SendResponse),
    },
  });
  });
}

export async function listRoomLists() {
  return _dbgWrap('listRoomLists', [], async function() {
  return execOutlookOp("GetRoomLists_V2");
  });
}

export async function listRooms() {
  return _dbgWrap('listRooms', [], async function() {
  return execOutlookOp("GetRooms_V2");
  });
}

export async function listRoomsInRoomList(sRoomList) {
  return _dbgWrap('listRoomsInRoomList', [sRoomList], async function() {
  if (isOutlookObject(sRoomList)) {
    sRoomList = pickOutlookValue(sRoomList.roomList, sRoomList.id, sRoomList.name);
  }

  return execOutlookOp("GetRoomsInRoomList_V2", { room_list: sRoomList });
  });
}

export async function findMeetingTimes(oRequest = {}) {
  return _dbgWrap('findMeetingTimes', [oRequest], async function() {
  return execOutlookOp("FindMeetingTimes_V2", {
    body: isOutlookObject(oRequest.body) ? oRequest.body : oRequest,
  });
  });
}

export async function setAutomaticReplies(oSettings = {}) {
  return _dbgWrap('setAutomaticReplies', [oSettings], async function() {
  const bUseLegacy = oSettings.version === 1 || oSettings.clientSetting || oSettings.Status || oSettings.ExternalAudience;
  return execOutlookOp(bUseLegacy ? "SetAutomaticRepliesSetting" : "SetAutomaticRepliesSetting_V2", bUseLegacy ? {
    clientSetting: isOutlookObject(oSettings.clientSetting) ? oSettings.clientSetting : oSettings,
  } : {
    body: isOutlookObject(oSettings.body) ? oSettings.body : oSettings,
  });
  });
}

export async function getMailTips(oRequest) {
  return _dbgWrap('getMailTips', [oRequest], async function() {
  if (typeof oRequest === "string") {
    return execOutlookOp("GetMailTips", { mailboxAddress: oRequest });
  }

  const oOptions = isOutlookObject(oRequest) ? oRequest : {};
  if (oOptions.body || !oOptions.mailboxAddress) {
    return execOutlookOp("GetMailTips_V2", {
      body: isOutlookObject(oOptions.body) ? oOptions.body : oOptions,
    });
  }

  return execOutlookOp("GetMailTips", { mailboxAddress: oOptions.mailboxAddress });
  });
}

export async function listContactFolders() {
  return _dbgWrap('listContactFolders', [], async function() {
  return execOutlookOp("ContactGetTablesV2");
  });
}

export async function listContacts(sFolderId, oOptions) {
  return _dbgWrap('listContacts', [sFolderId, oOptions], async function() {
  if (isOutlookObject(sFolderId)) {
    oOptions = sFolderId;
    sFolderId = pickOutlookValue(oOptions.folderId, oOptions.folder, oOptions.table);
  }

  oOptions = isOutlookObject(oOptions) ? oOptions : {};
  return execOutlookOp("ContactGetItems_V2", {
    folder: sFolderId,
    $filter: pickOutlookValue(oOptions.filter, oOptions.$filter),
    $orderby: pickOutlookValue(oOptions.orderBy, oOptions.$orderby),
    $top: pickOutlookValue(oOptions.top, oOptions.$top),
    $skip: pickOutlookValue(oOptions.skip, oOptions.$skip),
  });
  });
}

export async function getContact(sFolderId, sContactId, oOptions) {
  return _dbgWrap('getContact', [sFolderId, sContactId, oOptions], async function() {
  if (isOutlookObject(sFolderId)) {
    oOptions = sFolderId;
    sFolderId = pickOutlookValue(oOptions.folderId, oOptions.folder, oOptions.table);
    sContactId = pickOutlookValue(oOptions.contactId, oOptions.id);
  } else if (isOutlookObject(sContactId)) {
    oOptions = sContactId;
    sContactId = pickOutlookValue(oOptions.contactId, oOptions.id);
  }

  return execOutlookOp("ContactGetItem_V2", { folder: sFolderId, id: sContactId });
  });
}

export async function createContact(sFolderId, oContact) {
  return _dbgWrap('createContact', [sFolderId, oContact], async function() {
  if (isOutlookObject(sFolderId)) {
    oContact = sFolderId;
    sFolderId = pickOutlookValue(oContact.folderId, oContact.folder, oContact.table);
  }

  return execOutlookOp("ContactPostItem_V2", {
    folder: sFolderId,
    item: isOutlookObject(oContact && oContact.item) ? oContact.item : oContact,
  });
  });
}

export async function updateContact(sFolderId, sContactId, oContact) {
  return _dbgWrap('updateContact', [sFolderId, sContactId, oContact], async function() {
  if (isOutlookObject(sFolderId)) {
    oContact = sFolderId;
    sFolderId = pickOutlookValue(oContact.folderId, oContact.folder, oContact.table);
    sContactId = pickOutlookValue(oContact.contactId, oContact.id);
  } else if (isOutlookObject(sContactId)) {
    oContact = sContactId;
    sContactId = pickOutlookValue(oContact.contactId, oContact.id);
  }

  return execOutlookOp("ContactPatchItem_V2", {
    folder: sFolderId,
    id: sContactId,
    item: isOutlookObject(oContact && oContact.item) ? oContact.item : oContact,
  });
  });
}

export async function deleteContact(sFolderId, sContactId, oOptions) {
  return _dbgWrap('deleteContact', [sFolderId, sContactId, oOptions], async function() {
  if (isOutlookObject(sFolderId)) {
    oOptions = sFolderId;
    sFolderId = pickOutlookValue(oOptions.folderId, oOptions.folder, oOptions.table);
    sContactId = pickOutlookValue(oOptions.contactId, oOptions.id);
  } else if (isOutlookObject(sContactId)) {
    oOptions = sContactId;
    sContactId = pickOutlookValue(oOptions.contactId, oOptions.id);
  }

  return execOutlookOp("ContactDeleteItem_V2", { folder: sFolderId, id: sContactId });
  });
}

export async function callOutlookHttpRequest({ uri, method = "GET", body, contentType, customHeaders } = {}) {
  return _dbgWrap('callOutlookHttpRequest', [{ uri, method, body, contentType, customHeaders }], async function() {
  const aHeaders = Array.isArray(customHeaders) ? customHeaders : [];
  return execOutlookOp("HttpRequest", {
    Uri: uri,
    Method: method,
    Body: body,
    ContentType: contentType,
    CustomHeader1: aHeaders[0],
    CustomHeader2: aHeaders[1],
    CustomHeader3: aHeaders[2],
    CustomHeader4: aHeaders[3],
    CustomHeader5: aHeaders[4],
  });
  });
}

export async function manageOutlookEmails(queryRequest, sessionId) {
  return _dbgWrap('manageOutlookEmails', [queryRequest, sessionId], async function() {
  return execOutlookOp("mcp_EmailsManagement", { queryRequest: queryRequest, sessionId: sessionId });
  });
}

export async function manageOutlookMeetings(queryRequest, sessionId) {
  return _dbgWrap('manageOutlookMeetings', [queryRequest, sessionId], async function() {
  return execOutlookOp("mcp_MeetingManagement", { queryRequest: queryRequest, sessionId: sessionId });
  });
}

export async function manageOutlookContacts(queryRequest, sessionId) {
  return _dbgWrap('manageOutlookContacts', [queryRequest, sessionId], async function() {
  return execOutlookOp("mcp_ContactsManagement", { queryRequest: queryRequest, sessionId: sessionId });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────── O365 User ──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_USERS = "office365users";

// ── Initialize SDK client for the Office 365 Users connector ───
function initUsersClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE_USERS]: {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: {
        MyProfile_V2: {
          path: "/{connectionId}/codeless/v1.0/me",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
          ],
        },
        UserProfile_V2: {
          path: "/{connectionId}/codeless/v1.0/users/{id}",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "id", in: "path", required: true },
          ],
        },
        Manager_V2: {
          path: "/{connectionId}/codeless/v1.0/users/{id}/manager",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "id", in: "path", required: true },
          ],
        },
        DirectReports_V2: {
          path: "/{connectionId}/codeless/v1.0/users/{id}/directReports",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "id", in: "path", required: true },
          ],
        },
        UserPhoto_V2: {
          path: "/{connectionId}/codeless/v1.0/users/{id}/photo/$value",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "id", in: "path", required: true },
          ],
          responseInfo: { "200": "image/jpeg" },
        },
        SearchUser_V2: {
          path: "/{connectionId}/codeless/v1.0/users",
          method: "GET",
          parameters: [
            { name: "connectionId", in: "path", required: true },
            { name: "searchTerm", in: "query", required: false },
            { name: "$top", in: "query", required: false },
            { name: "$skip", in: "query", required: false },
          ],
        },
        HttpRequest: {
          path: "/{connectionId}/codeless/v1.0/httprequest",
          method: "POST",
          parameters: [
            { name: "connectionId", in: "path", required: true },
          ],
        },
      },
    },
  };
  return getClient(dataSourcesInfo);
}

// ── Internal: execute a connector operation ────────────────────
async function execUsersOp(operationName, parameters) {
  const client = await initUsersClient();
  const result = await client.executeAsync({
    connectorOperation: {
      tableName: DATA_SOURCE_USERS,
      operationName,
      parameters,
    },
  });
  if (!result.success) {
    throw new Error(result.error?.message || "Operation failed");
  }
  return result.data;
}

// ═══════════════════════════════════════════════════════════════
//  GENERIC
// ═══════════════════════════════════════════════════════════════

// ── Call any Office 365 Users operation by name ────────────────
export async function callUsersOperation(operationName, parameters = {}) {
  return _dbgWrap('callUsersOperation', [operationName, parameters], async function() {
  return execUsersOp(operationName, parameters);
  });
}

// ── Open HTTP Request ──────────────────────────────────────────
export async function openUsersHttpRequest({ method = "GET", uri, headers, body }) {
  return _dbgWrap('openUsersHttpRequest', [{ method, uri, headers, body }], async function() {
  return execUsersOp("HttpRequest", {
    method,
    uri,
    headers: headers || {},
    body: body || "",
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════════

// ── Get My Profile ─────────────────────────────────────────────
export async function getMyProfile() {
  return _dbgWrap('getMyProfile', [], async function() {
  return execUsersOp("MyProfile_V2", {});
  });
}

// ── Get User Profile ───────────────────────────────────────────
export async function getUserProfile(userId) {
  return _dbgWrap('getUserProfile', [userId], async function() {
  return execUsersOp("UserProfile_V2", {
    id: userId,
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  MANAGER & REPORTS
// ═══════════════════════════════════════════════════════════════

// ── Get Manager ────────────────────────────────────────────────
export async function getManager(userId) {
  return _dbgWrap('getManager', [userId], async function() {
  return execUsersOp("Manager_V2", {
    id: userId,
  });
  });
}

// ── Get Direct Reports ─────────────────────────────────────────
export async function getDirectReports(userId) {
  return _dbgWrap('getDirectReports', [userId], async function() {
  return execUsersOp("DirectReports_V2", {
    id: userId,
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  PHOTO
// ═══════════════════════════════════════════════════════════════

// ── Get User Photo ─────────────────────────────────────────────
export async function getUserPhoto(userId) {
  return _dbgWrap('getUserPhoto', [userId], async function() {
  return execUsersOp("UserPhoto_V2", {
    id: userId,
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════

// ── Search for Users ───────────────────────────────────────────
export async function searchForUsers({ searchTerm, top, skip } = {}) {
  return _dbgWrap('searchForUsers', [{ searchTerm, top, skip }], async function() {
  const params = {};
  if (searchTerm) params.searchTerm = searchTerm;
  if (top != null) params.$top = top;
  if (skip != null) params.$skip = skip;
  return execUsersOp("SearchUser_V2", params);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────── O365 Groups──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────


// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_GROUPS = "Office365Groups";

// ── Initialize SDK client for the Office 365 Groups connector ──
function initGroupsClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE_GROUPS]: {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: {},
    },
  };
  return getClient(dataSourcesInfo);
}

// ── Internal: execute a connector operation ────────────────────
async function execGroupsOp(operationName, parameters) {
  const client = await initGroupsClient();
  return client.executeAsync({
    connectorOperation: {
      tableName: DATA_SOURCE_GROUPS,
      operationName,
      parameters,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
//  GENERIC
// ═══════════════════════════════════════════════════════════════

// ── Call any Office 365 Groups operation by name ───────────────
export async function callGroupsOperation(operationName, parameters = {}) {
  return _dbgWrap('callGroupsOperation', [operationName, parameters], async function() {
  return execGroupsOp(operationName, parameters);
  });
}

// ── Open HTTP Request ──────────────────────────────────────────
export async function openGroupsHttpRequest({ method = "GET", uri, headers, body }) {
  return _dbgWrap('openGroupsHttpRequest', [{ method, uri, headers, body }], async function() {
  return execGroupsOp("HttpRequest", {
    method,
    uri,
    headers: headers || {},
    body: body || "",
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  GROUPS
// ═══════════════════════════════════════════════════════════════

// ── List My Groups ─────────────────────────────────────────────
export async function listMyGroups() {
  return _dbgWrap('listMyGroups', [], async function() {
  return execGroupsOp("ListOwnedGroups", {});
  });
}

// ── List Members of a Group ────────────────────────────────────
export async function listGroupMembers(groupId) {
  return _dbgWrap('listGroupMembers', [groupId], async function() {
  return execGroupsOp("ListGroupMembers", {
    groupId,
  });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ───────────────────────── Connector Helpers ────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

function initConnectorClientWithCandidates(aDataSourceCandidates, oApis) {
  const dataSourcesInfo = {};

  aDataSourceCandidates.forEach(function(sDataSourceName) {
    dataSourcesInfo[sDataSourceName] = {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: oApis,
    };
  });

  return getClient(dataSourcesInfo);
}

async function execConnectorOpWithCandidates(aDataSourceCandidates, oApis, sConnectorName, operationName, parameters) {
  const client = await initConnectorClientWithCandidates(aDataSourceCandidates, oApis);
  const aErrors = [];

  for (let iIndex = 0; iIndex < aDataSourceCandidates.length; iIndex += 1) {
    const sDataSourceName = aDataSourceCandidates[iIndex];

    try {
      const result = await client.executeAsync({
        connectorOperation: {
          tableName: sDataSourceName,
          operationName,
          parameters,
        },
      });

      return unwrapOutlookResult(result);
    } catch (oErr) {
      const sMessage = stringifyOutlookError(oErr);
      aErrors.push(sDataSourceName + ": " + sMessage);

      if (sMessage.indexOf("Connection reference not found") === -1) {
        throw oErr;
      }
    }
  }

  throw new Error("No " + sConnectorName + " connection reference matched. Tried: " + aErrors.join(" || "));
}

// ────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────── Jira ───────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

const JIRA_DATA_SOURCE_CANDIDATES = ["jira", "Jira", "JIRA"];
const JIRA_APIS = {
  AddComment_V2: {
    path: "/{connectionId}/v2/issue/{issueKey}/comment",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "X-Request-Jirainstance", in: "header", required: true },
      { name: "issueKey", in: "path", required: true },
      { name: "body", in: "body", required: true },
    ],
  },
  CancelTask_V2: {
    path: "/{connectionId}/v2/task/{taskId}/cancel",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "X-Request-Jirainstance", in: "header", required: true },
      { name: "taskId", in: "path", required: true },
      { name: "X-Atlassian-Token", in: "header", required: true },
    ],
  },
  CreateIssue_V3: {
    path: "/{connectionId}/v3/issue",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "X-Request-Jirainstance", in: "header", required: true },
      { name: "projectKey", in: "query", required: true },
      { name: "issueTypeIds", in: "query", required: true },
      { name: "item", in: "body", required: false },
    ],
  },
  EditIssue_V2: {
    path: "/{connectionId}/v2/3/issue/{issueIdOrKey}",
    method: "PUT",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "X-Request-Jirainstance", in: "header", required: true },
      { name: "issueIdOrKey", in: "path", required: true },
      { name: "notifyUsers", in: "query", required: false },
      { name: "overrideScreenSecurity", in: "query", required: false },
      { name: "overrideEditableFlag", in: "query", required: false },
      { name: "body", in: "body", required: false },
    ],
  },
  GetCurrentUser: {
    path: "/{connectionId}/3/myself",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "X-Request-Jirainstance", in: "header", required: true },
      { name: "expand", in: "query", required: false },
    ],
  },
  GetIssue_V2: {
    path: "/{connectionId}/v2/issue/{issueKey}",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "X-Request-Jirainstance", in: "header", required: true },
      { name: "issueKey", in: "path", required: true },
    ],
  },
  ListFilters_V2: {
    path: "/{connectionId}/v2/filter/search",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "X-Request-Jirainstance", in: "header", required: true },
    ],
  },
  ListIssues: {
    path: "/{connectionId}/2/search",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "X-Request-Jirainstance", in: "header", required: true },
      { name: "jql", in: "query", required: false },
      { name: "expand", in: "query", required: false },
      { name: "fields", in: "query", required: false },
    ],
  },
  ListProjects_V2: {
    path: "/{connectionId}/project/search",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
    ],
  },
  GetTask_V2: {
    path: "/{connectionId}/v2/task/{taskId}",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "X-Request-Jirainstance", in: "header", required: true },
      { name: "taskId", in: "path", required: true },
    ],
  },
  GetUser_V2: {
    path: "/{connectionId}/v2/user",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "X-Request-Jirainstance", in: "header", required: true },
      { name: "accountId", in: "query", required: true },
      { name: "expand", in: "query", required: false },
    ],
  },
};

async function execJiraOp(operationName, parameters) {
  return execConnectorOpWithCandidates(JIRA_DATA_SOURCE_CANDIDATES, JIRA_APIS, "Jira", operationName, parameters);
}

export async function callJiraOperation(operationName, parameters = {}) {
  return _dbgWrap('callJiraOperation', [operationName, parameters], async function() {
  return execJiraOp(operationName, parameters);
  });
}

export async function addJiraComment(sIssueKey, body, sJiraInstance) {
  return _dbgWrap('addJiraComment', [sIssueKey, body, sJiraInstance], async function() {
  return execJiraOp("AddComment_V2", {
    "X-Request-Jirainstance": sJiraInstance,
    issueKey: sIssueKey,
    body,
  });
  });
}

export async function cancelJiraTask(sTaskId, sJiraInstance, sToken) {
  return _dbgWrap('cancelJiraTask', [sTaskId, sJiraInstance, sToken], async function() {
  return execJiraOp("CancelTask_V2", {
    "X-Request-Jirainstance": sJiraInstance,
    taskId: sTaskId,
    "X-Atlassian-Token": sToken || "nocheck",
  });
  });
}

export async function createJiraIssueV3({ jiraInstance, projectKey, issueTypeIds, item } = {}) {
  return _dbgWrap('createJiraIssueV3', [{ jiraInstance, projectKey, issueTypeIds, item }], async function() {
  return execJiraOp("CreateIssue_V3", {
    "X-Request-Jirainstance": jiraInstance,
    projectKey,
    issueTypeIds,
    item,
  });
  });
}

export async function editJiraIssueV2(sIssueIdOrKey, { jiraInstance, body, notifyUsers, overrideScreenSecurity, overrideEditableFlag } = {}) {
  return _dbgWrap('editJiraIssueV2', [sIssueIdOrKey, { jiraInstance, body, notifyUsers, overrideScreenSecurity, overrideEditableFlag }], async function() {
  return execJiraOp("EditIssue_V2", {
    "X-Request-Jirainstance": jiraInstance,
    issueIdOrKey: sIssueIdOrKey,
    notifyUsers,
    overrideScreenSecurity,
    overrideEditableFlag,
    body,
  });
  });
}

export async function getCurrentJiraUser({ jiraInstance, expand } = {}) {
  return _dbgWrap('getCurrentJiraUser', [{ jiraInstance, expand }], async function() {
  return execJiraOp("GetCurrentUser", {
    "X-Request-Jirainstance": jiraInstance,
    expand,
  });
  });
}

export async function getJiraIssueByKey(sIssueKey, sJiraInstance) {
  return _dbgWrap('getJiraIssueByKey', [sIssueKey, sJiraInstance], async function() {
  return execJiraOp("GetIssue_V2", {
    "X-Request-Jirainstance": sJiraInstance,
    issueKey: sIssueKey,
  });
  });
}

export async function listJiraFilters(sJiraInstance) {
  return _dbgWrap('listJiraFilters', [sJiraInstance], async function() {
  return execJiraOp("ListFilters_V2", {
    "X-Request-Jirainstance": sJiraInstance,
  });
  });
}

export async function listJiraIssues({ jiraInstance, jql, fields, expand } = {}) {
  return _dbgWrap('listJiraIssues', [{ jiraInstance, jql, fields, expand }], async function() {
  return execJiraOp("ListIssues", {
    "X-Request-Jirainstance": jiraInstance,
    jql,
    fields,
    expand,
  });
  });
}

export async function listJiraProjects() {
  return _dbgWrap('listJiraProjects', [], async function() {
  return execJiraOp("ListProjects_V2", {});
  });
}

export async function getJiraTask(sTaskId, sJiraInstance) {
  return _dbgWrap('getJiraTask', [sTaskId, sJiraInstance], async function() {
  return execJiraOp("GetTask_V2", {
    "X-Request-Jirainstance": sJiraInstance,
    taskId: sTaskId,
  });
  });
}

export async function getJiraUser(sAccountId, { jiraInstance, expand } = {}) {
  return _dbgWrap('getJiraUser', [sAccountId, { jiraInstance, expand }], async function() {
  return execJiraOp("GetUser_V2", {
    "X-Request-Jirainstance": jiraInstance,
    accountId: sAccountId,
    expand,
  });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ───────────────────────────── Azure Key Vault ──────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

const KEY_VAULT_DATA_SOURCE_CANDIDATES = ["keyvault", "KeyVault", "azurekeyvault", "azureKeyVault", "AzureKeyVault"];
const KEY_VAULT_APIS = {
  GetSecret: {
    path: "/{connectionId}/secrets/{secretName}/value",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "secretName", in: "path", required: true },
    ],
  },
  ListSecrets: {
    path: "/{connectionId}/secrets",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
    ],
  },
};

async function execKeyVaultOp(operationName, parameters) {
  return execConnectorOpWithCandidates(KEY_VAULT_DATA_SOURCE_CANDIDATES, KEY_VAULT_APIS, "Azure Key Vault", operationName, parameters);
}

export async function callKeyVaultOperation(operationName, parameters = {}) {
  return _dbgWrap('callKeyVaultOperation', [operationName, parameters], async function() {
  return execKeyVaultOp(operationName, parameters);
  });
}

export async function getSecret(sSecretName, sApiVersion) {
  return _dbgWrap('getSecret', [sSecretName, sApiVersion], async function() {
  return execKeyVaultOp("GetSecret", {
    secretName: sSecretName,
  });
  });
}

export async function listSecrets({ maxresults, apiVersion } = {}) {
  return _dbgWrap('listSecrets', [{ maxresults, apiVersion }], async function() {
  return execKeyVaultOp("ListSecrets", {});
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────── SQL ────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

const SQL_DATA_SOURCE_CANDIDATES = ["sql", "Sql", "SQL"];
const SQL_APIS = {
  GetTables_V2: {
    path: "/GetTables_V2",
    method: "POST",
    parameters: [
      { name: "body", in: "body", required: true },
    ],
  },
  GetItems_V2: {
    path: "/GetItems_V2",
    method: "POST",
    parameters: [
      { name: "body", in: "body", required: true },
    ],
  },
  GetItem_V2: {
    path: "/GetItem_V2",
    method: "POST",
    parameters: [
      { name: "body", in: "body", required: true },
    ],
  },
  PostItem_V2: {
    path: "/PostItem_V2",
    method: "POST",
    parameters: [
      { name: "body", in: "body", required: true },
    ],
  },
  PatchItem_V2: {
    path: "/PatchItem_V2",
    method: "POST",
    parameters: [
      { name: "body", in: "body", required: true },
    ],
  },
  DeleteItem_V2: {
    path: "/DeleteItem_V2",
    method: "POST",
    parameters: [
      { name: "body", in: "body", required: true },
    ],
  },
  ExecutePassThroughNativeQuery_V2: {
    path: "/ExecutePassThroughNativeQuery_V2",
    method: "POST",
    parameters: [
      { name: "body", in: "body", required: true },
    ],
  },
  ExecuteProcedure_V2: {
    path: "/ExecuteProcedure_V2",
    method: "POST",
    parameters: [
      { name: "body", in: "body", required: true },
    ],
  },
};

async function execSqlOp(operationName, parameters) {
  return execConnectorOpWithCandidates(SQL_DATA_SOURCE_CANDIDATES, SQL_APIS, "SQL Server", operationName, parameters);
}

export async function callSqlOperation(operationName, parameters = {}) {
  return _dbgWrap('callSqlOperation', [operationName, parameters], async function() {
  return execSqlOp(operationName, parameters);
  });
}

export async function getSqlTables({ server = "default", database = "default" } = {}) {
  return _dbgWrap('getSqlTables', [{ server, database }], async function() {
  return execSqlOp("GetTables_V2", {
    body: { server, database },
  });
  });
}

export async function getSqlRows({ server = "default", database = "default", table, apply, filter, orderBy, skip, top, select } = {}) {
  return _dbgWrap('getSqlRows', [{ server, database, table, apply, filter, orderBy, skip, top, select }], async function() {
  const body = { server, database, table };
  if (apply) body.$apply = apply;
  if (filter) body.$filter = filter;
  if (orderBy) body.$orderby = orderBy;
  if (skip != null) body.$skip = skip;
  if (top != null) body.$top = top;
  if (select) body.$select = select;

  return execSqlOp("GetItems_V2", { body });
  });
}

export async function getSqlRow({ server = "default", database = "default", table, id } = {}) {
  return _dbgWrap('getSqlRow', [{ server, database, table, id }], async function() {
  return execSqlOp("GetItem_V2", {
    body: { server, database, table, id },
  });
  });
}

export async function insertSqlRow({ server = "default", database = "default", table, item } = {}) {
  return _dbgWrap('insertSqlRow', [{ server, database, table, item }], async function() {
  return execSqlOp("PostItem_V2", {
    body: { server, database, table, item },
  });
  });
}

export async function updateSqlRow({ server = "default", database = "default", table, id, item } = {}) {
  return _dbgWrap('updateSqlRow', [{ server, database, table, id, item }], async function() {
  return execSqlOp("PatchItem_V2", {
    body: { server, database, table, id, item },
  });
  });
}

export async function deleteSqlRow({ server = "default", database = "default", table, id } = {}) {
  return _dbgWrap('deleteSqlRow', [{ server, database, table, id }], async function() {
  return execSqlOp("DeleteItem_V2", {
    body: { server, database, table, id },
  });
  });
}

export async function executeSqlQuery({ server = "default", database = "default", query } = {}) {
  return _dbgWrap('executeSqlQuery', [{ server, database, query }], async function() {
  return execSqlOp("ExecutePassThroughNativeQuery_V2", {
    body: { server, database, query },
  });
  });
}

export async function executeSqlStoredProcedure({ server = "default", database = "default", procedure, parameters } = {}) {
  return _dbgWrap('executeSqlStoredProcedure', [{ server, database, procedure, parameters }], async function() {
  return execSqlOp("ExecuteProcedure_V2", {
    body: {
      server,
      database,
      procedure,
      parameters: parameters || {},
    },
  });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────── Teams ───────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

const TEAMS_DATA_SOURCE_CANDIDATES = ["teams", "Teams", "microsoftteams", "MicrosoftTeams"];
const TEAMS_APIS = {
  GetAllTeams: {
    path: "/{connectionId}/GetAllTeams",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
    ],
  },
  GetChannelsForGroup: {
    path: "/{connectionId}/GetChannelsForGroup",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "groupId", in: "query", required: true },
    ],
  },
  GetTeam: {
    path: "/{connectionId}/GetTeam",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "teamId", in: "query", required: true },
    ],
  },
  GetChannel: {
    path: "/{connectionId}/GetChannel",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "groupId", in: "query", required: true },
      { name: "channelId", in: "query", required: true },
    ],
  },
  AddMemberToTeam: {
    path: "/{connectionId}/AddMemberToTeam",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "teamId", in: "query", required: true },
      { name: "body", in: "body", required: true },
    ],
  },
  AddMemberToChannel: {
    path: "/{connectionId}/AddMemberToChannel",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "groupId", in: "query", required: true },
      { name: "channelId", in: "query", required: true },
      { name: "body", in: "body", required: true },
    ],
  },
  AtMentionUser: {
    path: "/{connectionId}/AtMentionUser",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "userId", in: "query", required: true },
    ],
  },
  AtMentionTag: {
    path: "/{connectionId}/AtMentionTag",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "teamId", in: "query", required: true },
      { name: "tagId", in: "query", required: true },
    ],
  },
  ListChats: {
    path: "/{connectionId}/ListChats",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "$top", in: "query", required: false },
      { name: "$skip", in: "query", required: false },
    ],
  },
  ListMembers: {
    path: "/{connectionId}/ListMembers",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "groupId", in: "query", required: true },
      { name: "channelId", in: "query", required: false },
    ],
  },
  PostUserNotification: {
    path: "/{connectionId}/PostUserNotification",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "PostNotificationRequest", in: "body", required: true },
    ],
  },
  PostChannelNotification: {
    path: "/{connectionId}/PostChannelNotification",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "groupId", in: "query", required: true },
      { name: "PostNotificationRequest", in: "body", required: true },
    ],
  },
  PostCardToConversation: {
    path: "/{connectionId}/PostCardToConversation",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "poster", in: "query", required: true },
      { name: "location", in: "query", required: true },
      { name: "body", in: "body", required: true },
    ],
  },
  PostMessageToConversation: {
    path: "/{connectionId}/PostMessageToConversation",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "poster", in: "query", required: true },
      { name: "location", in: "query", required: true },
      { name: "body", in: "body", required: true },
    ],
  },
  HttpRequest: {
    path: "/{connectionId}/codeless/v1.0/httprequest",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
    ],
  },
};

async function execTeamsOp(operationName, parameters) {
  return execConnectorOpWithCandidates(TEAMS_DATA_SOURCE_CANDIDATES, TEAMS_APIS, "Microsoft Teams", operationName, parameters);
}

export async function callTeamsOperation(operationName, parameters = {}) {
  return _dbgWrap('callTeamsOperation', [operationName, parameters], async function() {
  return execTeamsOp(operationName, parameters);
  });
}

export async function sendTeamsGraphHttpRequest({ method = "GET", uri, headers, body } = {}) {
  return _dbgWrap('sendTeamsGraphHttpRequest', [{ method, uri, headers, body }], async function() {
  return execTeamsOp("HttpRequest", {
    method,
    uri,
    headers: headers || {},
    body: body || "",
  });
  });
}

export async function listTeams() {
  return _dbgWrap('listTeams', [], async function() {
  return execTeamsOp("GetAllTeams", {});
  });
}

export async function listChannels(sTeamId) {
  return _dbgWrap('listChannels', [sTeamId], async function() {
  return execTeamsOp("GetChannelsForGroup", {
    groupId: sTeamId,
  });
  });
}

export async function getTeam(sTeamId) {
  return _dbgWrap('getTeam', [sTeamId], async function() {
  return execTeamsOp("GetTeam", {
    teamId: sTeamId,
  });
  });
}

export async function getChannelDetails(sTeamId, sChannelId) {
  return _dbgWrap('getChannelDetails', [sTeamId, sChannelId], async function() {
  return execTeamsOp("GetChannel", {
    groupId: sTeamId,
    channelId: sChannelId,
  });
  });
}

export async function addMemberToTeam(sTeamId, body) {
  return _dbgWrap('addMemberToTeam', [sTeamId, body], async function() {
  return execTeamsOp("AddMemberToTeam", {
    teamId: sTeamId,
    body,
  });
  });
}

export async function addMemberToChannel(sTeamId, sChannelId, body) {
  return _dbgWrap('addMemberToChannel', [sTeamId, sChannelId, body], async function() {
  return execTeamsOp("AddMemberToChannel", {
    groupId: sTeamId,
    channelId: sChannelId,
    body,
  });
  });
}

export async function getUserMentionToken(sUserId) {
  return _dbgWrap('getUserMentionToken', [sUserId], async function() {
  return execTeamsOp("AtMentionUser", {
    userId: sUserId,
  });
  });
}

export async function getTeamTagMentionToken(sTeamId, sTagId) {
  return _dbgWrap('getTeamTagMentionToken', [sTeamId, sTagId], async function() {
  return execTeamsOp("AtMentionTag", {
    teamId: sTeamId,
    tagId: sTagId,
  });
  });
}

export async function listChats({ top, skip } = {}) {
  return _dbgWrap('listChats', [{ top, skip }], async function() {
  return execTeamsOp("ListChats", {
    $top: top,
    $skip: skip,
  });
  });
}

export async function listMembers(sTeamId, sChannelId) {
  return _dbgWrap('listMembers', [sTeamId, sChannelId], async function() {
  return execTeamsOp("ListMembers", {
    groupId: sTeamId,
    channelId: sChannelId,
  });
  });
}

export async function postFeedNotification({ groupId, body } = {}) {
  return _dbgWrap('postFeedNotification', [{ groupId, body }], async function() {
  if (groupId) {
    return execTeamsOp("PostChannelNotification", {
      groupId,
      PostNotificationRequest: body,
    });
  }

  return execTeamsOp("PostUserNotification", {
    PostNotificationRequest: body,
  });
  });
}

export async function postCardInChatOrChannel({ poster = "Flow bot", location, body } = {}) {
  return _dbgWrap('postCardInChatOrChannel', [{ poster, location, body }], async function() {
  return execTeamsOp("PostCardToConversation", {
    poster,
    location,
    body,
  });
  });
}

export async function postMessageInChatOrChannel({ poster = "Flow bot", location, body } = {}) {
  return _dbgWrap('postMessageInChatOrChannel', [{ poster, location, body }], async function() {
  return execTeamsOp("PostMessageToConversation", {
    poster,
    location,
    body,
  });
  });
}

