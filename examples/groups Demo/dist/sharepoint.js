import { getClient } from "@microsoft/power-apps/data";

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE = "sharepointonline";

// ── Initialize SDK client for the SharePoint connector ─────────
function initClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE]: {
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
async function execOp(operationName, parameters) {
  const client = await initClient();
  const result = await client.executeAsync({
    connectorOperation: {
      tableName: DATA_SOURCE,
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
  return execOp(operationName, parameters);
}

// ── Send HTTP Request (for list-name-based operations) ─────────
export async function sendHttpRequest({ method = "GET", uri, headers, body }) {
  return execOp("HttpRequest", {
    method,
    uri,
    headers: headers || {},
    body: body || "",
  });
}

// ═══════════════════════════════════════════════════════════════
//  ITEMS (standard API — uses list ID)
// ═══════════════════════════════════════════════════════════════

// ── Get Items ──────────────────────────────────────────────────
export async function getItems(sSiteUrl, sListId, { filter, orderBy, top, skip } = {}) {
  let params = { siteUrl: encodeURIComponent(sSiteUrl), table: sListId };
  if (filter)       params.$filter = filter;
  if (orderBy)      params.$orderby = orderBy;
  if (top != null)  params.$top = top;
  if (skip != null) params.$skip = skip;
  return execOp("GetItems", params);
}

// ── Get Item ───────────────────────────────────────────────────
export async function getItem(sSiteUrl, sListId, iItemId) {
  return execOp("GetItem", {
    siteUrl: encodeURIComponent(sSiteUrl),
    table: sListId,
    id: iItemId,
  });
}

// ── Create Item ────────────────────────────────────────────────
export async function createItem(sSiteUrl, sListId, oFields) {
  return execOp("PostItem", {
    siteUrl: encodeURIComponent(sSiteUrl),
    table: sListId,
    item: oFields,
  });
}

// ── Update Item ────────────────────────────────────────────────
export async function updateItem(sSiteUrl, sListId, iItemId, oChangedFields) {
  return execOp("PatchItem", {
    siteUrl: encodeURIComponent(sSiteUrl),
    table: sListId,
    id: iItemId,
    item: oChangedFields,
  });
}

// ── Delete Item ────────────────────────────────────────────────
export async function deleteItem(sSiteUrl, sListId, iItemId) {
  return execOp("DeleteItem", {
    siteUrl: encodeURIComponent(sSiteUrl),
    table: sListId,
    id: iItemId,
  });
}

// ═══════════════════════════════════════════════════════════════
//  ITEMS (HTTP API — uses list name)
// ═══════════════════════════════════════════════════════════════

// ── Get Items by List Name ─────────────────────────────────────
export async function getItemsByName(sSiteUrl, sListName, { filter, orderBy, top, skip } = {}) {
  let sUri = sSiteUrl + "/_api/web/lists/getbytitle('" + sListName + "')/items";
  let aQuery = [];
  if (filter)       aQuery.push("$filter=" + filter);
  if (orderBy)      aQuery.push("$orderby=" + orderBy);
  if (top != null)  aQuery.push("$top=" + top);
  if (skip != null) aQuery.push("$skip=" + skip);
  if (aQuery.length > 0) sUri = sUri + "?" + aQuery.join("&");
  return sendHttpRequest({ method: "GET", uri: sUri, headers: { Accept: "application/json;odata=nometadata" } });
}

// ── Get Item by List Name ──────────────────────────────────────
export async function getItemByName(sSiteUrl, sListName, iItemId) {
  let sUri = sSiteUrl + "/_api/web/lists/getbytitle('" + sListName + "')/items(" + iItemId + ")";
  return sendHttpRequest({ method: "GET", uri: sUri, headers: { Accept: "application/json;odata=nometadata" } });
}

// ── Create Item by List Name ───────────────────────────────────
export async function createItemByName(sSiteUrl, sListName, oFields) {
  let sUri = sSiteUrl + "/_api/web/lists/getbytitle('" + sListName + "')/items";
  return sendHttpRequest({ method: "POST", uri: sUri, headers: { Accept: "application/json;odata=nometadata", "Content-Type": "application/json;odata=nometadata" }, body: JSON.stringify(oFields) });
}

// ── Update Item by List Name ───────────────────────────────────
export async function updateItemByName(sSiteUrl, sListName, iItemId, oChangedFields) {
  let sUri = sSiteUrl + "/_api/web/lists/getbytitle('" + sListName + "')/items(" + iItemId + ")";
  return sendHttpRequest({ method: "PATCH", uri: sUri, headers: { Accept: "application/json;odata=nometadata", "Content-Type": "application/json;odata=nometadata", "If-Match": "*" }, body: JSON.stringify(oChangedFields) });
}

// ── Delete Item by List Name ───────────────────────────────────
export async function deleteItemByName(sSiteUrl, sListName, iItemId) {
  let sUri = sSiteUrl + "/_api/web/lists/getbytitle('" + sListName + "')/items(" + iItemId + ")";
  return sendHttpRequest({ method: "DELETE", uri: sUri, headers: { Accept: "application/json;odata=nometadata", "If-Match": "*" } });
}

// ═══════════════════════════════════════════════════════════════
//  TABLES / LISTS
// ═══════════════════════════════════════════════════════════════

// ── List Tables (Lists) ────────────────────────────────────────
export async function listTables(sSiteUrl) {
  return execOp("GetTables", {
    siteUrl: encodeURIComponent(sSiteUrl),
  });
}

// ── List Library (Document Libraries) ──────────────────────────
export async function listLibrary(sSiteUrl) {
  return execOp("GetDataSetsMetadata", {
    siteUrl: encodeURIComponent(sSiteUrl),
  });
}

// ═══════════════════════════════════════════════════════════════
//  FILES
// ═══════════════════════════════════════════════════════════════

// ── Create File ────────────────────────────────────────────────
export async function createFile(sSiteUrl, sLibraryName, sFileName, fileContent) {
  return execOp("CreateFile", {
    siteUrl: encodeURIComponent(sSiteUrl),
    folderPath: sLibraryName,
    name: sFileName,
    body: fileContent,
  });
}

// ── Update File ────────────────────────────────────────────────
export async function updateFile(sSiteUrl, sFileId, fileContent) {
  return execOp("UpdateFile", {
    siteUrl: encodeURIComponent(sSiteUrl),
    id: sFileId,
    body: fileContent,
  });
}

// ── Delete File ────────────────────────────────────────────────
export async function deleteFile(sSiteUrl, sFileId) {
  return execOp("DeleteFile", {
    siteUrl: encodeURIComponent(sSiteUrl),
    id: sFileId,
  });
}

// ── Move File ──────────────────────────────────────────────────
export async function moveFile(sSiteUrl, sSourceFileId, sDestinationFolderPath, sNewFileName) {
  return execOp("MoveFile", {
    siteUrl: encodeURIComponent(sSiteUrl),
    id: sSourceFileId,
    destinationFolderPath: sDestinationFolderPath,
    newFileName: sNewFileName || "",
  });
}

// ── Get File Metadata ──────────────────────────────────────────
export async function getFileMetadata(sSiteUrl, sFileId) {
  return execOp("GetFileMetadata", {
    siteUrl: encodeURIComponent(sSiteUrl),
    id: sFileId,
  });
}
