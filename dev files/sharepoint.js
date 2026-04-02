
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