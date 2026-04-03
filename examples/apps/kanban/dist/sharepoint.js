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
  try {
    const client = await initClient();
    const result = await client.executeAsync({
      connectorOperation: {
        tableName: DATA_SOURCE,
        operationName,
        parameters: parameters || {},
      },
    });

    if (!result) {
      throw new Error("No result returned");
    }

    if (result.success === false) {
      throw new Error(getSpErrorMessage(result.error));
    }

    return Object.prototype.hasOwnProperty.call(result, "data") ? result.data : result;
  } catch (oError) {
    throw new Error("SharePoint " + operationName + " failed: " + getSpErrorMessage(oError));
  }
}

function getSpErrorMessage(oError) {
  if (!oError) {
    return "Unknown error";
  }

  if (typeof oError === "string") {
    return oError;
  }

  if (oError instanceof Error && oError.message) {
    return oError.message;
  }

  const aCandidates = [
    oError.message,
    oError.error && oError.error.message,
    oError.body && oError.body.message,
    oError.body && oError.body.error && oError.body.error.message,
    oError.data && oError.data.message,
    oError.detail,
  ];

  const sCandidate = aCandidates.find(function(sValue) {
    return typeof sValue === "string" && sValue.trim() !== "";
  });

  if (sCandidate) {
    return sCandidate;
  }

  try {
    return JSON.stringify(oError);
  } catch (oStringifyError) {
    return String(oError);
  }
}

function requireNonEmptyString(sValue, sLabel) {
  if (typeof sValue !== "string" || sValue.trim() === "") {
    throw new Error("SharePoint " + sLabel + " is required.");
  }

  return sValue.trim();
}

function requireRecord(oValue, sLabel) {
  if (!oValue || typeof oValue !== "object" || Array.isArray(oValue)) {
    throw new Error("SharePoint " + sLabel + " must be an object.");
  }

  return oValue;
}

function normalizeHeaders(oHeaders) {
  if (oHeaders == null) {
    return {};
  }

  if (typeof oHeaders !== "object" || Array.isArray(oHeaders)) {
    throw new Error("SharePoint request headers must be an object.");
  }

  return oHeaders;
}

function normalizeNumericQueryValue(value, sLabel) {
  if (value == null || value === "") {
    return null;
  }

  const iValue = Number(value);
  if (!Number.isFinite(iValue)) {
    throw new Error("SharePoint " + sLabel + " must be numeric.");
  }

  return iValue;
}

function requireItemId(iItemId) {
  if ((typeof iItemId !== "string" && typeof iItemId !== "number") || String(iItemId).trim() === "") {
    throw new Error("SharePoint item ID is required.");
  }

  return iItemId;
}

function buildListContext(sSiteUrl, sListId) {
  return {
    siteUrl: encodeURIComponent(requireNonEmptyString(sSiteUrl, "site URL")),
    table: requireNonEmptyString(sListId, "list ID"),
  };
}

function buildItemQueryParameters(sSiteUrl, sListId, { filter, orderBy, top, skip } = {}) {
  const oParams = buildListContext(sSiteUrl, sListId);

  if (filter) {
    oParams.$filter = String(filter);
  }
  if (orderBy) {
    oParams.$orderby = String(orderBy);
  }

  const iTop = normalizeNumericQueryValue(top, "top");
  const iSkip = normalizeNumericQueryValue(skip, "skip");
  if (iTop != null) {
    oParams.$top = iTop;
  }
  if (iSkip != null) {
    oParams.$skip = iSkip;
  }

  return oParams;
}

function normalizeCollection(oPayload) {
  if (Array.isArray(oPayload)) {
    return oPayload;
  }

  const aCandidates = [
    oPayload,
    oPayload && oPayload.value,
    oPayload && oPayload.items,
    oPayload && oPayload.results,
    oPayload && oPayload.body,
    oPayload && oPayload.data,
    oPayload && oPayload.result,
    oPayload && oPayload.response,
    oPayload && oPayload.d && oPayload.d.results,
  ];

  const aMatch = aCandidates.find(function(oCandidate) {
    return Array.isArray(oCandidate);
  });

  return aMatch || [];
}

// ═══════════════════════════════════════════════════════════════
//  GENERIC
// ═══════════════════════════════════════════════════════════════

// ── Call any SharePoint connector operation by name ─────────────
export async function callSharePointOperation(operationName, parameters = {}) {
  return execOp(operationName, parameters);
}

// ── Send HTTP Request (raw escape hatch) ───────────────────────
export async function sendHttpRequest({ method = "GET", uri, headers, body } = {}) {
  return execOp("HttpRequest", {
    method: String(method || "GET").toUpperCase(),
    uri: requireNonEmptyString(uri, "request URI"),
    headers: normalizeHeaders(headers),
    body: body == null ? "" : body,
  });
}

// ═══════════════════════════════════════════════════════════════
//  ITEMS (standard API — uses list ID)
// ═══════════════════════════════════════════════════════════════

// ── Get Items ──────────────────────────────────────────────────
export async function getItems(sSiteUrl, sListId, { filter, orderBy, top, skip } = {}) {
  return execOp("GetItems", buildItemQueryParameters(sSiteUrl, sListId, { filter, orderBy, top, skip }));
}

// ── Get Item ───────────────────────────────────────────────────
export async function getItem(sSiteUrl, sListId, iItemId) {
  return execOp("GetItem", Object.assign(buildListContext(sSiteUrl, sListId), {
    id: requireItemId(iItemId),
  }));
}

// ── Create Item ────────────────────────────────────────────────
export async function createItem(sSiteUrl, sListId, oFields) {
  return execOp("PostItem", Object.assign(buildListContext(sSiteUrl, sListId), {
    item: requireRecord(oFields, "item payload"),
  }));
}

// ── Update Item ────────────────────────────────────────────────
export async function updateItem(sSiteUrl, sListId, iItemId, oChangedFields) {
  return execOp("PatchItem", Object.assign(buildListContext(sSiteUrl, sListId), {
    id: requireItemId(iItemId),
    item: requireRecord(oChangedFields, "item payload"),
  }));
}

// ── Delete Item ────────────────────────────────────────────────
export async function deleteItem(sSiteUrl, sListId, iItemId) {
  return execOp("DeleteItem", Object.assign(buildListContext(sSiteUrl, sListId), {
    id: requireItemId(iItemId),
  }));
}

// ═══════════════════════════════════════════════════════════════
//  TABLES / LISTS
// ═══════════════════════════════════════════════════════════════

// ── List Tables (Lists) ────────────────────────────────────────
export async function listTables(sSiteUrl) {
  return normalizeCollection(await execOp("GetTables", {
    siteUrl: encodeURIComponent(requireNonEmptyString(sSiteUrl, "site URL")),
  }));
}

// ── List Library (Document Libraries) ──────────────────────────
export async function listLibrary(sSiteUrl) {
  return execOp("GetDataSetsMetadata", {
    siteUrl: encodeURIComponent(requireNonEmptyString(sSiteUrl, "site URL")),
  });
}

// ═══════════════════════════════════════════════════════════════
//  FILES
// ═══════════════════════════════════════════════════════════════

// ── Create File ────────────────────────────────────────────────
export async function createFile(sSiteUrl, sLibraryName, sFileName, fileContent) {
  return execOp("CreateFile", {
    siteUrl: encodeURIComponent(requireNonEmptyString(sSiteUrl, "site URL")),
    folderPath: requireNonEmptyString(sLibraryName, "folder path"),
    name: requireNonEmptyString(sFileName, "file name"),
    body: fileContent,
  });
}

// ── Update File ────────────────────────────────────────────────
export async function updateFile(sSiteUrl, sFileId, fileContent) {
  return execOp("UpdateFile", {
    siteUrl: encodeURIComponent(requireNonEmptyString(sSiteUrl, "site URL")),
    id: requireNonEmptyString(String(sFileId || ""), "file ID"),
    body: fileContent,
  });
}

// ── Delete File ────────────────────────────────────────────────
export async function deleteFile(sSiteUrl, sFileId) {
  return execOp("DeleteFile", {
    siteUrl: encodeURIComponent(requireNonEmptyString(sSiteUrl, "site URL")),
    id: requireNonEmptyString(String(sFileId || ""), "file ID"),
  });
}

// ── Move File ──────────────────────────────────────────────────
export async function moveFile(sSiteUrl, sSourceFileId, sDestinationFolderPath, sNewFileName) {
  return execOp("MoveFile", {
    siteUrl: encodeURIComponent(requireNonEmptyString(sSiteUrl, "site URL")),
    id: requireNonEmptyString(String(sSourceFileId || ""), "source file ID"),
    destinationFolderPath: requireNonEmptyString(sDestinationFolderPath, "destination folder path"),
    newFileName: sNewFileName || "",
  });
}

// ── Get File Metadata ──────────────────────────────────────────
export async function getFileMetadata(sSiteUrl, sFileId) {
  return execOp("GetFileMetadata", {
    siteUrl: encodeURIComponent(requireNonEmptyString(sSiteUrl, "site URL")),
    id: requireNonEmptyString(String(sFileId || ""), "file ID"),
  });
}
