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
export async function sendEmail({ to, cc, bcc, subject, body, isHtml, importance, attachments } = {}) {
  return _dbgWrap('sendEmail', [{ to, cc, bcc, subject, body, isHtml, importance, attachments }], async function() {
  var oMessage = {
    To: to,
    Subject: subject,
    Body: body,
  };
  if (cc) oMessage.Cc = cc;
  if (bcc) oMessage.Bcc = bcc;
  if (importance) oMessage.Importance = importance;
  if (attachments) oMessage.Attachments = attachments;
  if (isHtml === false) oMessage.IsHtml = false;

  return execOutlookOp("SendEmailV2", { emailMessage: oMessage });
  });
}

// ── Forward Email ──────────────────────────────────────────────
export async function forwardEmail(sMessageId, { to, comment } = {}) {
  return _dbgWrap('forwardEmail', [sMessageId, { to, comment }], async function() {
  return execOutlookOp("ForwardEmail", {
    message_id: sMessageId,
    body: { ToRecipients: to, Comment: comment },
  });
  });
}

// ── Reply to Email ─────────────────────────────────────────────
export async function replyToEmail(sMessageId, { comment, replyAll } = {}) {
  return _dbgWrap('replyToEmail', [sMessageId, { comment, replyAll }], async function() {
  return execOutlookOp("ReplyToV3", {
    messageId: sMessageId,
    replyParameters: { Body: comment, ReplyAll: replyAll === true },
  });
  });
}

// ── List Emails ────────────────────────────────────────────────
export async function listEmails({ folderId = "Inbox", fetchOnlyUnread, searchQuery, top, skip } = {}) {
  return _dbgWrap('listEmails', [{ folderId, fetchOnlyUnread, searchQuery, top, skip }], async function() {
  return execOutlookOp("GetEmailsV3", {
    folderPath: folderId,
    fetchOnlyUnread: fetchOnlyUnread,
    searchQuery: searchQuery,
    top: top != null ? top : 10,
    skip: skip,
  });
  });
}

// ── Send from Shared Mailbox ───────────────────────────────────
export async function sendFromSharedMailbox(sSharedMailbox, { to, cc, bcc, subject, body, importance, attachments } = {}) {
  return _dbgWrap('sendFromSharedMailbox', [sSharedMailbox, { to, cc, bcc, subject, body, importance, attachments }], async function() {
  var oMessage = {
    MailboxAddress: sSharedMailbox,
    To: to,
    Subject: subject,
    Body: body,
  };
  if (cc) oMessage.Cc = cc;
  if (bcc) oMessage.Bcc = bcc;
  if (importance) oMessage.Importance = importance;
  if (attachments) oMessage.Attachments = attachments;

  return execOutlookOp("SharedMailboxSendEmailV2", { emailMessage: oMessage });
  });
}

// ── Move Email ─────────────────────────────────────────────────
export async function moveEmail(sMessageId, sDestinationFolderId) {
  return _dbgWrap('moveEmail', [sMessageId, sDestinationFolderId], async function() {
  return execOutlookOp("MoveV2", {
    messageId: sMessageId,
    folderPath: sDestinationFolderId,
  });
  });
}

// ── Delete Email ───────────────────────────────────────────────
export async function deleteEmail(sMessageId) {
  return _dbgWrap('deleteEmail', [sMessageId], async function() {
  return execOutlookOp("DeleteEmail", { messageId: sMessageId });
  });
}

// ── Create Event ───────────────────────────────────────────────
export async function createEvent({ subject, start, end, attendees, body, location, importance, isAllDay, timeZone, calendarId } = {}) {
  return _dbgWrap('createEvent', [{ subject, start, end, attendees, body, location, importance, isAllDay, timeZone, calendarId }], async function() {
  var sAttendees = Array.isArray(attendees) ? attendees.join(";") : attendees;
  var oItem = {
    subject: subject,
    start: start,
    end: end,
    timeZone: timeZone || "",
  };
  if (sAttendees) oItem.requiredAttendees = sAttendees;
  if (body) oItem.body = body;
  if (location) oItem.location = location;
  if (importance) oItem.importance = importance;
  if (isAllDay) oItem.isAllDay = true;

  return execOutlookOp("V4CalendarPostItem", {
    table: calendarId || "Calendar",
    item: oItem,
  });
  });
}

// ── List Events ────────────────────────────────────────────────
export async function listEvents({ calendarId = "Calendar", filter, orderBy, top, skip } = {}) {
  return _dbgWrap('listEvents', [{ calendarId, filter, orderBy, top, skip }], async function() {
  return execOutlookOp("V4CalendarGetItems", {
    table: calendarId,
    $filter: filter,
    $orderby: orderBy,
    $top: top,
    $skip: skip,
  });
  });
}

// ── Edit Event ─────────────────────────────────────────────────
export async function editEvent(sEventId, oChangedFields, sCalendarId) {
  return _dbgWrap('editEvent', [sEventId, oChangedFields, sCalendarId], async function() {
  return execOutlookOp("V4CalendarPatchItem", {
    table: sCalendarId || "Calendar",
    id: sEventId,
    item: oChangedFields,
  });
  });
}

// ── Delete Event ───────────────────────────────────────────────
export async function deleteEvent(sEventId, sCalendarId) {
  return _dbgWrap('deleteEvent', [sEventId, sCalendarId], async function() {
  return execOutlookOp("CalendarDeleteItem", {
    table: sCalendarId || "Calendar",
    id: sEventId,
  });
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


// ── Data source names (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_GROUPS_CANDIDATES = ["office365groups", "Office365Groups"];

function initGroupsClient() {
  const dataSourcesInfo = {};

  DATA_SOURCE_GROUPS_CANDIDATES.forEach(function(sDataSourceName) {
    dataSourcesInfo[sDataSourceName] = {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: {},
    };
  });

  return getClient(dataSourcesInfo);
}

function isGroupsObject(oValue) {
  return !!oValue && typeof oValue === "object" && !Array.isArray(oValue);
}

function pickGroupsValue() {
  for (let iIndex = 0; iIndex < arguments.length; iIndex += 1) {
    const oValue = arguments[iIndex];
    if (oValue !== undefined && oValue !== null) return oValue;
  }
  return undefined;
}

function setGroupsIfDefined(oTarget, sKey, oValue) {
  if (oValue !== undefined && oValue !== null) {
    oTarget[sKey] = oValue;
  }
}

function stringifyGroupsError(oError) {
  if (!oError) return "Unknown error";
  if (typeof oError === "string") return oError;
  if (typeof oError.message === "string" && oError.message) return oError.message;

  try {
    return JSON.stringify(oError);
  } catch (oErr) {
    return String(oError);
  }
}

function normalizeGroupsSelect(oValue) {
  if (Array.isArray(oValue)) return oValue.join(",");
  return oValue;
}

function extractGroupsSkipToken(sNextLink) {
  if (!sNextLink || typeof sNextLink !== "string") return undefined;

  try {
    const oUrl = new URL(sNextLink);
    return pickGroupsValue(
      oUrl.searchParams.get("$skiptoken"),
      oUrl.searchParams.get("$skipToken"),
      oUrl.searchParams.get("skiptoken"),
      oUrl.searchParams.get("skipToken")
    );
  } catch (oError) {
    return undefined;
  }
}

function getGroupsHeaderValue(oHeaders, sName) {
  if (!isGroupsObject(oHeaders)) return undefined;

  const sMatch = String(sName).toLowerCase();
  const aEntries = Object.entries(oHeaders);
  for (let iIndex = 0; iIndex < aEntries.length; iIndex += 1) {
    const [sHeaderName, oValue] = aEntries[iIndex];
    if (String(sHeaderName).toLowerCase() === sMatch) {
      return oValue;
    }
  }

  return undefined;
}

function normalizeGroupsCustomHeaders(oHeaders, aCustomHeaders) {
  const aResolved = Array.isArray(aCustomHeaders) ? aCustomHeaders.filter((oValue) => oValue != null) : [];

  if (!isGroupsObject(oHeaders)) return aResolved.slice(0, 5);

  const aEntries = Object.entries(oHeaders);
  for (let iIndex = 0; iIndex < aEntries.length; iIndex += 1) {
    const [sHeaderName, oValue] = aEntries[iIndex];
    if (oValue === undefined || oValue === null) continue;
    if (String(sHeaderName).toLowerCase() === "content-type") continue;
    aResolved.push(String(sHeaderName) + ": " + String(oValue));
    if (aResolved.length >= 5) break;
  }

  return aResolved.slice(0, 5);
}

function normalizeGroupsStartEnd(oSource, sKey) {
  const oValue = pickGroupsValue(oSource[sKey], oSource[sKey.charAt(0).toUpperCase() + sKey.slice(1)]);

  if (isGroupsObject(oValue)) {
    return {
      dateTime: pickGroupsValue(oValue.dateTime, oValue.DateTime),
      timeZone: pickGroupsValue(oValue.timeZone, oValue.TimeZone, oSource.timeZone, oSource.TimeZone, oSource.timezone),
    };
  }

  const sDateTime = pickGroupsValue(
    oSource[sKey + "DateTime"],
    oSource[sKey + "At"],
    oSource[sKey],
    oSource[sKey.charAt(0).toUpperCase() + sKey.slice(1) + "DateTime"],
    oSource[sKey.charAt(0).toUpperCase() + sKey.slice(1) + "At"]
  );

  if (sDateTime === undefined || sDateTime === null) return undefined;

  return {
    dateTime: sDateTime,
    timeZone: pickGroupsValue(oSource.timeZone, oSource.TimeZone, oSource.timezone),
  };
}

function normalizeGroupsEventBody(oSource) {
  const oBodySource = isGroupsObject(oSource.body) ? oSource.body : (isGroupsObject(oSource.Body) ? oSource.Body : null);

  if (oBodySource) {
    const oBody = {};
    setGroupsIfDefined(oBody, "content", pickGroupsValue(oBodySource.content, oBodySource.Content, oBodySource.body, oBodySource.Body));
    setGroupsIfDefined(oBody, "contentType", pickGroupsValue(oBodySource.contentType, oBodySource.ContentType, oSource.contentType, oSource.ContentType, oSource.isHtml === false ? "Text" : undefined));
    return Object.keys(oBody).length > 0 ? oBody : undefined;
  }

  const sContent = pickGroupsValue(oSource.bodyContent, oSource.description, oSource.content);
  if (sContent === undefined || sContent === null) return undefined;

  return {
    content: sContent,
    contentType: pickGroupsValue(oSource.contentType, oSource.ContentType, oSource.isHtml === false ? "Text" : "Html"),
  };
}

function normalizeGroupsEventLocation(oSource) {
  const oLocation = pickGroupsValue(oSource.location, oSource.Location);
  if (typeof oLocation === "string") {
    return { displayName: oLocation };
  }

  if (isGroupsObject(oLocation)) {
    return { displayName: pickGroupsValue(oLocation.displayName, oLocation.DisplayName) };
  }

  return undefined;
}

function normalizeGroupsEventPayload(oOptions) {
  const oSource = isGroupsObject(oOptions && oOptions.body) && pickGroupsValue(oOptions.body.subject, oOptions.body.Subject, oOptions.body.start, oOptions.body.Start)
    ? oOptions.body
    : (isGroupsObject(oOptions) ? oOptions : {});

  const oPayload = {};
  setGroupsIfDefined(oPayload, "subject", pickGroupsValue(oSource.subject, oSource.Subject, oSource.title));
  setGroupsIfDefined(oPayload, "start", normalizeGroupsStartEnd(oSource, "start"));
  setGroupsIfDefined(oPayload, "end", normalizeGroupsStartEnd(oSource, "end"));
  setGroupsIfDefined(oPayload, "body", normalizeGroupsEventBody(oSource));
  setGroupsIfDefined(oPayload, "location", normalizeGroupsEventLocation(oSource));
  setGroupsIfDefined(oPayload, "importance", pickGroupsValue(oSource.importance, oSource.Importance));
  setGroupsIfDefined(oPayload, "isAllDay", pickGroupsValue(oSource.isAllDay, oSource.IsAllDay));
  setGroupsIfDefined(oPayload, "isReminderOn", pickGroupsValue(oSource.isReminderOn, oSource.IsReminderOn));
  setGroupsIfDefined(oPayload, "reminderMinutesBeforeStart", pickGroupsValue(oSource.reminderMinutesBeforeStart, oSource.ReminderMinutesBeforeStart, oSource.reminderMinutes, oSource.reminder));
  setGroupsIfDefined(oPayload, "showAs", pickGroupsValue(oSource.showAs, oSource.ShowAs));
  setGroupsIfDefined(oPayload, "responseRequested", pickGroupsValue(oSource.responseRequested, oSource.ResponseRequested));
  return oPayload;
}

// ── Internal: execute a connector operation ────────────────────
async function execGroupsOp(operationName, parameters) {
  const client = await initGroupsClient();
  const aErrors = [];

  for (let iIndex = 0; iIndex < DATA_SOURCE_GROUPS_CANDIDATES.length; iIndex += 1) {
    const sDataSourceName = DATA_SOURCE_GROUPS_CANDIDATES[iIndex];

    try {
      const result = await client.executeAsync({
        connectorOperation: {
          tableName: sDataSourceName,
          operationName,
          parameters,
        },
      });

      return unwrapResult(result);
    } catch (oErr) {
      const sMessage = stringifyGroupsError(oErr);
      aErrors.push(sDataSourceName + ": " + sMessage);

      if (sMessage.indexOf("Connection reference not found") === -1) {
        throw oErr;
      }
    }
  }

  throw new Error("No Office 365 Groups connection reference matched. Tried: " + aErrors.join(" || "));
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
export async function openGroupsHttpRequest({ method = "GET", uri, headers, body, contentType, customHeaders, version, useV2, operationName } = {}) {
  return _dbgWrap('openGroupsHttpRequest', [{ method, uri, headers, body, contentType, customHeaders, version, useV2, operationName }], async function() {
  const aHeaders = normalizeGroupsCustomHeaders(headers, customHeaders);
  const sOperationName = operationName || (pickGroupsValue(version, useV2 ? 2 : undefined) === 2 ? "HttpRequestV2" : "HttpRequest");
  return execGroupsOp(sOperationName, {
    Uri: uri,
    Method: method,
    Body: body,
    ContentType: pickGroupsValue(contentType, getGroupsHeaderValue(headers, "Content-Type")),
    CustomHeader1: aHeaders[0],
    CustomHeader2: aHeaders[1],
    CustomHeader3: aHeaders[2],
    CustomHeader4: aHeaders[3],
    CustomHeader5: aHeaders[4],
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  GROUPS
// ═══════════════════════════════════════════════════════════════

// ── List My Groups ─────────────────────────────────────────────
export async function listMyGroups(oOptions = {}) {
  return _dbgWrap('listMyGroups', [oOptions], async function() {
  if (!isGroupsObject(oOptions)) {
    oOptions = {};
  }

  const iVersion = pickGroupsValue(oOptions.version, oOptions.v, 1);
  const sOperationName = iVersion === 3 ? "ListOwnedGroups_V3" : (iVersion === 2 ? "ListOwnedGroups_V2" : "ListOwnedGroups");
  const params = {};
  setGroupsIfDefined(params, "extractSensitivityLabel", oOptions.extractSensitivityLabel);
  setGroupsIfDefined(params, "fetchSensitivityLabelMetadata", oOptions.fetchSensitivityLabelMetadata);
  return execGroupsOp(sOperationName, params);
  });
}

// ── List Members of a Group ────────────────────────────────────
export async function listGroupMembers(groupId, oOptions) {
  return _dbgWrap('listGroupMembers', [groupId, oOptions], async function() {
  if (isGroupsObject(groupId)) {
    oOptions = groupId;
    groupId = pickGroupsValue(oOptions.groupId, oOptions.id);
  }

  oOptions = isGroupsObject(oOptions) ? oOptions : {};
  const params = { groupId };
  setGroupsIfDefined(params, "$top", pickGroupsValue(oOptions.top, oOptions.$top));
  return execGroupsOp("ListGroupMembers", params);
  });
}

export async function listOwnedGroups(oOptions = {}) {
  return _dbgWrap('listOwnedGroups', [oOptions], async function() {
  return listMyGroups(oOptions);
  });
}

export async function listGroups(oOptions = {}) {
  return _dbgWrap('listGroups', [oOptions], async function() {
  oOptions = isGroupsObject(oOptions) ? oOptions : {};
  const params = {};
  setGroupsIfDefined(params, "extractSensitivityLabel", oOptions.extractSensitivityLabel);
  setGroupsIfDefined(params, "fetchSensitivityLabelMetadata", oOptions.fetchSensitivityLabelMetadata);
  setGroupsIfDefined(params, "$filter", pickGroupsValue(oOptions.filter, oOptions.$filter));
  setGroupsIfDefined(params, "$top", pickGroupsValue(oOptions.top, oOptions.$top));

  const oSkipToken = pickGroupsValue(
    oOptions.skipToken,
    oOptions.$skipToken,
    oOptions.$skiptoken,
    extractGroupsSkipToken(oOptions.nextLink),
    oOptions.skip
  );

  if (oSkipToken !== undefined && oSkipToken !== null) {
    params.$skiptoken = String(oSkipToken);
  }

  return execGroupsOp("ListGroups", params);
  });
}

export async function onGroupMembershipChange(groupId, oOptions = {}) {
  return _dbgWrap('onGroupMembershipChange', [groupId, oOptions], async function() {
  if (isGroupsObject(groupId)) {
    oOptions = groupId;
    groupId = pickGroupsValue(oOptions.groupId, oOptions.id);
  }

  oOptions = isGroupsObject(oOptions) ? oOptions : {};
  return execGroupsOp("OnGroupMembershipChange", {
    groupId,
    $select: normalizeGroupsSelect(pickGroupsValue(oOptions.select, oOptions.$select)),
  });
  });
}

export async function addMemberToGroup(userUpn, groupId) {
  return _dbgWrap('addMemberToGroup', [userUpn, groupId], async function() {
  if (isGroupsObject(userUpn)) {
    groupId = pickGroupsValue(userUpn.groupId, userUpn.id);
    userUpn = pickGroupsValue(userUpn.userUpn, userUpn.upn, userUpn.userPrincipalName, userUpn.email, userUpn.mail);
  }

  return execGroupsOp("AddMemberToGroup", {
    userUpn,
    groupId,
  });
  });
}

export async function removeMemberFromGroup(userUpn, groupId) {
  return _dbgWrap('removeMemberFromGroup', [userUpn, groupId], async function() {
  if (isGroupsObject(userUpn)) {
    groupId = pickGroupsValue(userUpn.groupId, userUpn.id);
    userUpn = pickGroupsValue(userUpn.userUpn, userUpn.upn, userUpn.userPrincipalName, userUpn.email, userUpn.mail);
  }

  return execGroupsOp("RemoveMemberFromGroup", {
    userUpn,
    groupId,
  });
  });
}

export async function createGroupEvent(groupId, oBodyOrOptions) {
  return _dbgWrap('createGroupEvent', [groupId, oBodyOrOptions], async function() {
  let oOptions = isGroupsObject(oBodyOrOptions) ? oBodyOrOptions : {};

  if (isGroupsObject(groupId)) {
    oOptions = groupId;
    groupId = pickGroupsValue(oOptions.groupId, oOptions.id);
  }

  const iVersion = pickGroupsValue(oOptions.version, oOptions.v, 2);
  return execGroupsOp(iVersion === 1 ? "CreateCalendarEvent" : "CreateCalendarEventV2", {
    groupId,
    body: normalizeGroupsEventPayload(oOptions),
  });
  });
}

export async function updateGroupEvent(sEventId, oBodyOrOptions, sGroupId) {
  return _dbgWrap('updateGroupEvent', [sEventId, oBodyOrOptions, sGroupId], async function() {
  let oOptions = isGroupsObject(oBodyOrOptions) ? oBodyOrOptions : {};

  if (isGroupsObject(sEventId)) {
    oOptions = sEventId;
    sEventId = pickGroupsValue(oOptions.eventId, oOptions.id, oOptions.event);
    sGroupId = pickGroupsValue(oOptions.groupId, oOptions.group, oOptions.ownerGroupId);
  }

  return execGroupsOp("UpdateCalendarEvent", {
    event: sEventId,
    groupId: pickGroupsValue(oOptions.groupId, sGroupId),
    body: normalizeGroupsEventPayload(oOptions),
  });
  });
}

export async function deleteGroupEvent(sEventId, sGroupId) {
  return _dbgWrap('deleteGroupEvent', [sEventId, sGroupId], async function() {
  if (isGroupsObject(sEventId)) {
    sGroupId = pickGroupsValue(sEventId.groupId, sEventId.group, sEventId.ownerGroupId);
    sEventId = pickGroupsValue(sEventId.eventId, sEventId.id, sEventId.event);
  }

  return execGroupsOp("CalendarDeleteItem_V2", {
    event: sEventId,
    groupId: sGroupId,
  });
  });
}

export async function onNewGroupEvent(groupId) {
  return _dbgWrap('onNewGroupEvent', [groupId], async function() {
  if (isGroupsObject(groupId)) {
    groupId = pickGroupsValue(groupId.groupId, groupId.id);
  }

  return execGroupsOp("OnNewEvent", {
    groupId,
  });
  });
}

export async function listDeletedGroups() {
  return _dbgWrap('listDeletedGroups', [], async function() {
  return execGroupsOp("ListDeletedGroups", {});
  });
}

export async function restoreDeletedGroup(groupId) {
  return _dbgWrap('restoreDeletedGroup', [groupId], async function() {
  if (isGroupsObject(groupId)) {
    groupId = pickGroupsValue(groupId.groupId, groupId.id);
  }

  return execGroupsOp("RestoreDeletedGroup", {
    groupId,
  });
  });
}

export async function listDeletedGroupsByOwner(userId) {
  return _dbgWrap('listDeletedGroupsByOwner', [userId], async function() {
  if (isGroupsObject(userId)) {
    userId = pickGroupsValue(userId.userId, userId.id, userId.ownerId);
  }

  return execGroupsOp("ListDeletedGroupsByOwner", {
    userId,
  });
  });
}

// ────────────────────────────────────────────────────────────────────────────