// ────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────── O365 User ──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────

// ── Data source name (must match connectionReferences in power.config.json) ──
import {unwrapResult,_dbgWrap  } from "../codeapp.js";
import {getClient } from "../power-apps-data.js";
const DATA_SOURCE_USERS = "office365users";

const USERS_APIS = {
  UpdateMyProfile: {
    path: "/{connectionId}/codeless/v1.0/me",
    method: "PATCH",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "body", in: "body", required: false },
    ],
  },
  MyProfile_V2: {
    path: "/{connectionId}/codeless/v1.0/me",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "$select", in: "query", required: false },
    ],
  },
  UpdateMyPhoto: {
    path: "/{connectionId}/codeless/v1.0/me/photo/$value",
    method: "PUT",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "body", in: "body", required: true },
      { name: "Content_Type", in: "header", required: true },
    ],
  },
  MyTrendingDocuments: {
    path: "/{connectionId}/codeless/v1.0/me/insights/trending",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "$filter", in: "query", required: false },
      { name: "extractSensitivityLabel", in: "query", required: false },
      { name: "fetchSensitivityLabelMetadata", in: "query", required: false },
    ],
  },
  RelevantPeople: {
    path: "/{connectionId}/codeless/v1.0/users/{userId}/people",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "userId", in: "path", required: true },
    ],
  },
  UserProfile_V2: {
    path: "/{connectionId}/codeless/v1.0/users/{id}",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "id", in: "path", required: true },
      { name: "$select", in: "query", required: false },
    ],
  },
  UserPhotoMetadata: {
    path: "/{connectionId}/codeless/v1.0/users/{userId}/photo",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "userId", in: "path", required: true },
    ],
  },
  Manager_V2: {
    path: "/{connectionId}/codeless/v1.0/users/{id}/manager",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "id", in: "path", required: true },
      { name: "$select", in: "query", required: false },
    ],
  },
  DirectReports_V2: {
    path: "/{connectionId}/codeless/v1.0/users/{id}/directReports",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "id", in: "path", required: true },
      { name: "$select", in: "query", required: false },
      { name: "$top", in: "query", required: false },
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
  TrendingDocuments: {
    path: "/{connectionId}/codeless/v1.0/users/{id}/insights/trending",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "id", in: "path", required: true },
      { name: "$filter", in: "query", required: false },
      { name: "extractSensitivityLabel", in: "query", required: false },
      { name: "fetchSensitivityLabelMetadata", in: "query", required: false },
    ],
  },
  SearchUserV2: {
    path: "/{connectionId}/codeless/v1.0/users",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "searchTerm", in: "query", required: false },
      { name: "top", in: "query", required: false },
      { name: "isSearchTermRequired", in: "query", required: false },
      { name: "skipToken", in: "query", required: false },
    ],
  },
  SearchUser_V2: {
    path: "/{connectionId}/codeless/v1.0/users",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "searchTerm", in: "query", required: false },
      { name: "top", in: "query", required: false },
      { name: "isSearchTermRequired", in: "query", required: false },
      { name: "skipToken", in: "query", required: false },
    ],
  },
  HttpRequest: {
    path: "/{connectionId}/codeless/v1.0/httprequest",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "Uri", in: "header", required: true },
      { name: "Method", in: "header", required: true },
      { name: "Body", in: "body", required: false },
      { name: "ContentType", in: "header", required: false },
      { name: "CustomHeader1", in: "header", required: false },
      { name: "CustomHeader2", in: "header", required: false },
      { name: "CustomHeader3", in: "header", required: false },
      { name: "CustomHeader4", in: "header", required: false },
      { name: "CustomHeader5", in: "header", required: false },
    ],
  },
};

// ── Initialize SDK client for the Office 365 Users connector ───
function initUsersClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE_USERS]: {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: USERS_APIS,
    },
  };
  return getClient(dataSourcesInfo);
}

function isUsersObject(oValue) {
  return !!oValue && typeof oValue === "object" && !Array.isArray(oValue);
}

function pickUsersValue() {
  for (let iIndex = 0; iIndex < arguments.length; iIndex += 1) {
    const oValue = arguments[iIndex];
    if (oValue !== undefined && oValue !== null) return oValue;
  }
  return undefined;
}

function setUsersIfDefined(oTarget, sKey, oValue) {
  if (oValue !== undefined && oValue !== null) {
    oTarget[sKey] = oValue;
  }
}

function normalizeUsersSelect(oValue) {
  if (Array.isArray(oValue)) return oValue.join(",");
  return oValue;
}

function normalizeUsersSelectOptions(oOptions) {
  if (isUsersObject(oOptions)) return oOptions;
  if (oOptions === undefined || oOptions === null) return {};
  return { select: oOptions };
}

function normalizeUsersDirectReportsOptions(oOptions) {
  if (isUsersObject(oOptions)) return oOptions;
  if (typeof oOptions === "number") return { top: oOptions };
  if (oOptions === undefined || oOptions === null) return {};
  return { select: oOptions };
}

function normalizeUsersSearchOptions(oOptions) {
  if (typeof oOptions === "string") return { searchTerm: oOptions };
  return isUsersObject(oOptions) ? oOptions : {};
}

function normalizeUsersTrendingOptions(oOptions) {
  if (typeof oOptions === "string") return { filter: oOptions };
  return isUsersObject(oOptions) ? oOptions : {};
}

function extractUsersSkipToken(sNextLink) {
  if (!sNextLink || typeof sNextLink !== "string") return undefined;

  try {
    const oUrl = new URL(sNextLink);
    return pickUsersValue(
      oUrl.searchParams.get("skipToken"),
      oUrl.searchParams.get("$skiptoken"),
      oUrl.searchParams.get("$skipToken"),
      oUrl.searchParams.get("skiptoken")
    );
  } catch (oError) {
    return undefined;
  }
}

function getUsersHeaderValue(oHeaders, sName) {
  if (!isUsersObject(oHeaders)) return undefined;

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

function normalizeUsersCustomHeaders(oHeaders, aCustomHeaders) {
  const aResolved = Array.isArray(aCustomHeaders) ? aCustomHeaders.filter((oValue) => oValue != null) : [];

  if (!isUsersObject(oHeaders)) return aResolved.slice(0, 5);

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
  return unwrapResult(result);
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
export async function openUsersHttpRequest({ method = "GET", uri, headers, body, contentType, customHeaders } = {}) {
  return _dbgWrap('openUsersHttpRequest', [{ method, uri, headers, body, contentType, customHeaders }], async function() {
  const aHeaders = normalizeUsersCustomHeaders(headers, customHeaders);
  return execUsersOp("HttpRequest", {
    Uri: uri,
    Method: method,
    Body: body,
    ContentType: pickUsersValue(contentType, getUsersHeaderValue(headers, "Content-Type")),
    CustomHeader1: aHeaders[0],
    CustomHeader2: aHeaders[1],
    CustomHeader3: aHeaders[2],
    CustomHeader4: aHeaders[3],
    CustomHeader5: aHeaders[4],
  });
  });
}

// ── Update My Profile ──────────────────────────────────────────
export async function updateMyProfile(oProfile = {}) {
  return _dbgWrap('updateMyProfile', [oProfile], async function() {
  const oBody = isUsersObject(oProfile) && "body" in oProfile ? oProfile.body : oProfile;
  return execUsersOp("UpdateMyProfile", {
    body: oBody,
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════════

// ── Get My Profile ─────────────────────────────────────────────
export async function getMyProfile(oOptions) {
  return _dbgWrap('getMyProfile', [oOptions], async function() {
  const oResolvedOptions = normalizeUsersSelectOptions(oOptions);
  const params = {};
  setUsersIfDefined(params, "$select", normalizeUsersSelect(pickUsersValue(oResolvedOptions.select, oResolvedOptions.$select)));
  return execUsersOp("MyProfile_V2", params);
  });
}

// ── Get User Profile ───────────────────────────────────────────
export async function getUserProfile(userId, oOptions) {
  return _dbgWrap('getUserProfile', [userId, oOptions], async function() {
  if (isUsersObject(userId)) {
    oOptions = userId;
    userId = pickUsersValue(oOptions.userId, oOptions.id);
  }

  const oResolvedOptions = normalizeUsersSelectOptions(oOptions);
  const params = {
    id: userId,
  };
  setUsersIfDefined(params, "$select", normalizeUsersSelect(pickUsersValue(oResolvedOptions.select, oResolvedOptions.$select)));

  return execUsersOp("UserProfile_V2", {
    ...params,
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  MANAGER & REPORTS
// ═══════════════════════════════════════════════════════════════

// ── Get Manager ────────────────────────────────────────────────
export async function getManager(userId, oOptions) {
  return _dbgWrap('getManager', [userId, oOptions], async function() {
  if (isUsersObject(userId)) {
    oOptions = userId;
    userId = pickUsersValue(oOptions.userId, oOptions.id);
  }

  const oResolvedOptions = normalizeUsersSelectOptions(oOptions);
  const params = {
    id: userId,
  };
  setUsersIfDefined(params, "$select", normalizeUsersSelect(pickUsersValue(oResolvedOptions.select, oResolvedOptions.$select)));

  return execUsersOp("Manager_V2", {
    ...params,
  });
  });
}

// ── Get Direct Reports ─────────────────────────────────────────
export async function getDirectReports(userId, oOptions) {
  return _dbgWrap('getDirectReports', [userId, oOptions], async function() {
  if (isUsersObject(userId)) {
    oOptions = userId;
    userId = pickUsersValue(oOptions.userId, oOptions.id);
  }

  const oResolvedOptions = normalizeUsersDirectReportsOptions(oOptions);
  const params = {
    id: userId,
  };
  setUsersIfDefined(params, "$select", normalizeUsersSelect(pickUsersValue(oResolvedOptions.select, oResolvedOptions.$select)));
  setUsersIfDefined(params, "$top", pickUsersValue(oResolvedOptions.top, oResolvedOptions.$top));

  return execUsersOp("DirectReports_V2", {
    ...params,
  });
  });
}

// ── Get My Trending Documents ──────────────────────────────────
export async function getMyTrendingDocuments(oOptions = {}) {
  return _dbgWrap('getMyTrendingDocuments', [oOptions], async function() {
  const oResolvedOptions = normalizeUsersTrendingOptions(oOptions);
  const params = {};
  setUsersIfDefined(params, "$filter", pickUsersValue(oResolvedOptions.filter, oResolvedOptions.$filter));
  setUsersIfDefined(params, "extractSensitivityLabel", oResolvedOptions.extractSensitivityLabel);
  setUsersIfDefined(params, "fetchSensitivityLabelMetadata", oResolvedOptions.fetchSensitivityLabelMetadata);
  return execUsersOp("MyTrendingDocuments", params);
  });
}

// ── Get Relevant People ────────────────────────────────────────
export async function getRelevantPeople(userId) {
  return _dbgWrap('getRelevantPeople', [userId], async function() {
  if (isUsersObject(userId)) {
    userId = pickUsersValue(userId.userId, userId.id);
  }

  return execUsersOp("RelevantPeople", {
    userId,
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  PHOTO
// ═══════════════════════════════════════════════════════════════

// ── Update My Photo ────────────────────────────────────────────
export async function updateMyPhoto(oBodyOrOptions, sContentType) {
  return _dbgWrap('updateMyPhoto', [oBodyOrOptions, sContentType], async function() {
  if (isUsersObject(oBodyOrOptions)) {
    sContentType = pickUsersValue(
      oBodyOrOptions.contentType,
      oBodyOrOptions.Content_Type,
      oBodyOrOptions.mimeType
    );
    oBodyOrOptions = pickUsersValue(
      oBodyOrOptions.body,
      oBodyOrOptions.content,
      oBodyOrOptions.photo,
      oBodyOrOptions.fileContent
    );
  }

  return execUsersOp("UpdateMyPhoto", {
    body: oBodyOrOptions,
    Content_Type: sContentType,
  });
  });
}

// ── Get User Photo Metadata ────────────────────────────────────
export async function getUserPhotoMetadata(userId) {
  return _dbgWrap('getUserPhotoMetadata', [userId], async function() {
  if (isUsersObject(userId)) {
    userId = pickUsersValue(userId.userId, userId.id);
  }

  return execUsersOp("UserPhotoMetadata", {
    userId,
  });
  });
}

// ── Get User Photo ─────────────────────────────────────────────
export async function getUserPhoto(userId) {
  return _dbgWrap('getUserPhoto', [userId], async function() {
  if (isUsersObject(userId)) {
    userId = pickUsersValue(userId.userId, userId.id);
  }

  return execUsersOp("UserPhoto_V2", {
    id: userId,
  });
  });
}

// ── Get Trending Documents ─────────────────────────────────────
export async function getTrendingDocuments(userId, oOptions = {}) {
  return _dbgWrap('getTrendingDocuments', [userId, oOptions], async function() {
  if (isUsersObject(userId)) {
    oOptions = userId;
    userId = pickUsersValue(oOptions.userId, oOptions.id);
  }

  const oResolvedOptions = normalizeUsersTrendingOptions(oOptions);
  const params = {
    id: userId,
  };
  setUsersIfDefined(params, "$filter", pickUsersValue(oResolvedOptions.filter, oResolvedOptions.$filter));
  setUsersIfDefined(params, "extractSensitivityLabel", oResolvedOptions.extractSensitivityLabel);
  setUsersIfDefined(params, "fetchSensitivityLabelMetadata", oResolvedOptions.fetchSensitivityLabelMetadata);
  return execUsersOp("TrendingDocuments", params);
  });
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════

// ── Search for Users ───────────────────────────────────────────
export async function searchForUsers(oOptions = {}) {
  return _dbgWrap('searchForUsers', [oOptions], async function() {
  const oResolvedOptions = normalizeUsersSearchOptions(oOptions);
  const params = {};
  setUsersIfDefined(params, "searchTerm", oResolvedOptions.searchTerm);
  setUsersIfDefined(params, "top", pickUsersValue(oResolvedOptions.top, oResolvedOptions.$top));
  setUsersIfDefined(params, "isSearchTermRequired", oResolvedOptions.isSearchTermRequired);

  const oSkipToken = pickUsersValue(
    oResolvedOptions.skipToken,
    oResolvedOptions.$skipToken,
    oResolvedOptions.$skiptoken,
    extractUsersSkipToken(oResolvedOptions.nextLink),
    oResolvedOptions.skip
  );

  if (oSkipToken !== undefined && oSkipToken !== null) {
    params.skipToken = String(oSkipToken);
  }

  return execUsersOp("SearchUserV2", params);
  });
}
