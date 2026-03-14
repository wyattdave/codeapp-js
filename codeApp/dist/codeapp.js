import { getClient } from "@microsoft/power-apps/data";

// ── All Table Definitions ──────────────────────────────────────
const ALL_DATA_SOURCES = {
  environmentvariabledefinitions: { tableId: "", version: "", primaryKey: "environmentvariabledefinitionid", dataSourceType: "Dataverse", apis: {} },
  environmentvariablevalues:      { tableId: "", version: "", primaryKey: "environmentvariablevalueid",      dataSourceType: "Dataverse", apis: {} },
};

// ── Initialize SDK & Client ────────────────────────────────────
let oSharedClient = null;

function getSharedClient() {
  if (!oSharedClient) {
    oSharedClient = getClient(ALL_DATA_SOURCES);
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

// ── Get Environment Variable (single query with expand) ────────
export async function getEnvironmentVariable(sSchemaName) {
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
}

// ────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────── Dataverse ──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

// ── Table Registry (populated at runtime via registerTable) ────
let oDataSources = {};

// ── Register a Dataverse table for use by the library ──────────
export function registerTable(sTableName, sPrimaryKey) {
  oDataSources[sTableName] = {
    tableId: '',
    version: '',
    primaryKey: sPrimaryKey,
    dataSourceType: 'Dataverse',
    apis: {}
  };
  // reset client so it picks up the new table on next call
  oSharedClient = null;
}

// ── Unwrap SDK response ────────────────────────────────────────
function unwrapResult(result) {
  if (result && result.success === false) {
    var sMsg = result.error ? (result.error.message || JSON.stringify(result.error)) : 'Operation failed';
    throw new Error(sMsg);
  }
  return result && 'data' in result ? result.data : result;
}

// ── Create ─────────────────────────────────────────────────────
export async function createItem(tableName, primaryKey, record) {
  const client = getSharedClient();
  const result = await client.createRecordAsync(tableName, record);
  return unwrapResult(result);
}

// ── Read (single) ──────────────────────────────────────────────
export async function getItem(tableName, primaryKey, id, select) {
  const client = getSharedClient();
  const options = select ? { select } : undefined;
  const result = await client.retrieveRecordAsync(tableName, id, options);
  return unwrapResult(result);
}

// ── List (multiple) ────────────────────────────────────────────
export async function listItems(tableName, primaryKey, { filter, select, orderBy, top, skip } = {}) {
  const client = getSharedClient();
  const result = await client.retrieveMultipleRecordsAsync(tableName, {
    filter,
    select,
    orderBy,
    top,
    skip,
  });
  var unwrapped = unwrapResult(result);
  return { entities: Array.isArray(unwrapped) ? unwrapped : [] };
}

// ── Update ─────────────────────────────────────────────────────
export async function updateItem(tableName, primaryKey, id, changedFields) {
  const client = getSharedClient();
  const result = await client.updateRecordAsync(tableName, id, changedFields);
  return unwrapResult(result);
}

// ── Delete ─────────────────────────────────────────────────────
export async function deleteItem(tableName, primaryKey, id) {
  const client = getSharedClient();
  const result = await client.deleteRecordAsync(tableName, id);
  return unwrapResult(result);
}

// ── Unbound Action ─────────────────────────────────────────────
export async function callUnboundAction(tableName, primaryKey, actionName, params) {
  const client = getSharedClient();
  const result = await client.invokeActionAsync(tableName, actionName, params);
  return unwrapResult(result);
}

// ── WhoAmI ─────────────────────────────────────────────────────
export async function whoAmI() {
  const client = getSharedClient();
  const result = await client.invokeActionAsync('', 'WhoAmI', {});
  var data = unwrapResult(result);
  return data.UserId || data.userid || data.systemuserid || data;
}

// ────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────── SharePoint ─────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_SP = "sharepointonline";

// ── Initialize SDK client for the SharePoint connector ─────────
function initClient() {
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
async function execOp(operationName, parameters) {
  const client = await initClient();
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

// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────── Outlook365 ──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_CANDIDATES = ["office365outlook", "Office365Outlook", "office365"];
const OUTLOOK_APIS = {
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
};

// ── Initialize SDK client for the Office 365 Outlook connector ──
function initClient() {
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

function stringifyErrorDetails(oError) {
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

function unwrapResult(oResult) {
  if (oResult && oResult.success === false) {
    var sMessage = stringifyErrorDetails(oResult.error);
    if (oResult.data !== undefined) {
      sMessage += " | data: " + stringifyErrorDetails(oResult.data);
    }
    throw new Error(sMessage);
  }

  if (oResult && Object.prototype.hasOwnProperty.call(oResult, "data")) {
    return oResult.data;
  }

  return oResult;
}

// ── Internal: execute a connector operation ────────────────────
async function execOp(operationName, parameters) {
  const client = await initClient();
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

      return unwrapResult(result);
    } catch (oErr) {
      const sMessage = stringifyErrorDetails(oErr);
      aErrors.push(sDataSourceName + ": " + sMessage);

      if (sMessage.indexOf("Connection reference not found") === -1) {
        throw oErr;
      }
    }
  }

  throw new Error("No Outlook connection reference matched. Tried: " + aErrors.join(" || "));
}

// ── List Emails ────────────────────────────────────────────────
export async function listEmails({ folderId = "Inbox", fetchOnlyUnread, searchQuery, top, skip } = {}) {
  void skip;

  return execOp("GetEmailsV3", {
    folderPath: folderId,
    fetchOnlyUnread,
    searchQuery,
    top: top != null ? top : 10,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────── O365 User ──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_USERS = "office365users";

// ── Initialize SDK client for the Office 365 Users connector ───
function initClient() {
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
async function execOp(operationName, parameters) {
  const client = await initClient();
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
  return execOp(operationName, parameters);
}

// ── Open HTTP Request ──────────────────────────────────────────
export async function openHttpRequest({ method = "GET", uri, headers, body }) {
  return execOp("HttpRequest", {
    method,
    uri,
    headers: headers || {},
    body: body || "",
  });
}

// ═══════════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════════

// ── Get My Profile ─────────────────────────────────────────────
export async function getMyProfile() {
  return execOp("MyProfile_V2", {});
}

// ── Get User Profile ───────────────────────────────────────────
export async function getUserProfile(userId) {
  return execOp("UserProfile_V2", {
    id: userId,
  });
}

// ═══════════════════════════════════════════════════════════════
//  MANAGER & REPORTS
// ═══════════════════════════════════════════════════════════════

// ── Get Manager ────────────────────────────────────────────────
export async function getManager(userId) {
  return execOp("Manager_V2", {
    id: userId,
  });
}

// ── Get Direct Reports ─────────────────────────────────────────
export async function getDirectReports(userId) {
  return execOp("DirectReports_V2", {
    id: userId,
  });
}

// ═══════════════════════════════════════════════════════════════
//  PHOTO
// ═══════════════════════════════════════════════════════════════

// ── Get User Photo ─────────────────────────────────────────────
export async function getUserPhoto(userId) {
  return execOp("UserPhoto_V2", {
    id: userId,
  });
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════

// ── Search for Users ───────────────────────────────────────────
export async function searchForUsers({ searchTerm, top, skip } = {}) {
  const params = {};
  if (searchTerm) params.searchTerm = searchTerm;
  if (top != null) params.$top = top;
  if (skip != null) params.$skip = skip;
  return execOp("SearchUser_V2", params);
}

// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────── O365 Groups──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────


// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_GROUPS = "Office365Groups";

// ── Initialize SDK client for the Office 365 Groups connector ──
function initClient() {
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
async function execOp(operationName, parameters) {
  const client = await initClient();
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
  return execOp(operationName, parameters);
}

// ── Open HTTP Request ──────────────────────────────────────────
export async function openHttpRequest({ method = "GET", uri, headers, body }) {
  return execOp("HttpRequest", {
    method,
    uri,
    headers: headers || {},
    body: body || "",
  });
}

// ═══════════════════════════════════════════════════════════════
//  GROUPS
// ═══════════════════════════════════════════════════════════════

// ── List My Groups ─────────────────────────────────────────────
export async function listMyGroups() {
  return execOp("ListOwnedGroups", {});
}

// ── List Members of a Group ────────────────────────────────────
export async function listGroupMembers(groupId) {
  return execOp("ListGroupMembers", {
    groupId,
  });
}
