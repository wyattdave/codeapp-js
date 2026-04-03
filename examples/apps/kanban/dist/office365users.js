import { getClient } from "@microsoft/power-apps/data";

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE = "office365users";

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
function initClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE]: {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: USERS_APIS,
    },
  };
  return getClient(dataSourcesInfo);
}

function unwrapResult(result) {
  if (result && result.success === false) {
    throw new Error(result.error?.message || "Operation failed");
  }

  return result && Object.prototype.hasOwnProperty.call(result, "data") ? result.data : result;
}

function isUsersObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function pickUsersValue() {
  for (let iIndex = 0; iIndex < arguments.length; iIndex += 1) {
    const value = arguments[iIndex];
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

function setUsersIfDefined(target, key, value) {
  if (value !== undefined && value !== null) {
    target[key] = value;
  }
}

function normalizeUsersSelect(value) {
  if (Array.isArray(value)) return value.join(",");
  return value;
}

function normalizeUsersSelectOptions(options) {
  if (isUsersObject(options)) return options;
  if (options === undefined || options === null) return {};
  return { select: options };
}

function normalizeUsersDirectReportsOptions(options) {
  if (isUsersObject(options)) return options;
  if (typeof options === "number") return { top: options };
  if (options === undefined || options === null) return {};
  return { select: options };
}

function normalizeUsersSearchOptions(options) {
  if (typeof options === "string") return { searchTerm: options };
  return isUsersObject(options) ? options : {};
}

function normalizeUsersTrendingOptions(options) {
  if (typeof options === "string") return { filter: options };
  return isUsersObject(options) ? options : {};
}

function extractUsersSkipToken(nextLink) {
  if (!nextLink || typeof nextLink !== "string") return undefined;

  try {
    const url = new URL(nextLink);
    return pickUsersValue(
      url.searchParams.get("skipToken"),
      url.searchParams.get("$skiptoken"),
      url.searchParams.get("$skipToken"),
      url.searchParams.get("skiptoken")
    );
  } catch {
    return undefined;
  }
}

function getUsersHeaderValue(headers, name) {
  if (!isUsersObject(headers)) return undefined;

  const headerName = String(name).toLowerCase();
  const entries = Object.entries(headers);
  for (let iIndex = 0; iIndex < entries.length; iIndex += 1) {
    const [currentName, value] = entries[iIndex];
    if (String(currentName).toLowerCase() === headerName) {
      return value;
    }
  }

  return undefined;
}

function normalizeUsersCustomHeaders(headers, customHeaders) {
  const resolved = Array.isArray(customHeaders) ? customHeaders.filter((value) => value != null) : [];

  if (!isUsersObject(headers)) return resolved.slice(0, 5);

  const entries = Object.entries(headers);
  for (let iIndex = 0; iIndex < entries.length; iIndex += 1) {
    const [headerName, value] = entries[iIndex];
    if (value === undefined || value === null) continue;
    if (String(headerName).toLowerCase() === "content-type") continue;
    resolved.push(String(headerName) + ": " + String(value));
    if (resolved.length >= 5) break;
  }

  return resolved.slice(0, 5);
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
  return unwrapResult(result);
}

// ═══════════════════════════════════════════════════════════════
//  GENERIC
// ═══════════════════════════════════════════════════════════════

// ── Call any Office 365 Users operation by name ────────────────
export async function callUsersOperation(operationName, parameters = {}) {
  return execOp(operationName, parameters);
}

// ── Open HTTP Request ──────────────────────────────────────────
export async function openHttpRequest({ method = "GET", uri, headers, body, contentType, customHeaders } = {}) {
  const resolvedHeaders = normalizeUsersCustomHeaders(headers, customHeaders);
  return execOp("HttpRequest", {
    Uri: uri,
    Method: method,
    Body: body,
    ContentType: pickUsersValue(contentType, getUsersHeaderValue(headers, "Content-Type")),
    CustomHeader1: resolvedHeaders[0],
    CustomHeader2: resolvedHeaders[1],
    CustomHeader3: resolvedHeaders[2],
    CustomHeader4: resolvedHeaders[3],
    CustomHeader5: resolvedHeaders[4],
  });
}

export async function updateMyProfile(profile = {}) {
  const body = isUsersObject(profile) && "body" in profile ? profile.body : profile;
  return execOp("UpdateMyProfile", { body });
}

// ═══════════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════════

// ── Get My Profile ─────────────────────────────────────────────
export async function getMyProfile(options) {
  const resolvedOptions = normalizeUsersSelectOptions(options);
  const params = {};
  setUsersIfDefined(params, "$select", normalizeUsersSelect(pickUsersValue(resolvedOptions.select, resolvedOptions.$select)));
  return execOp("MyProfile_V2", params);
}

// ── Get User Profile ───────────────────────────────────────────
export async function getUserProfile(userId, options) {
  if (isUsersObject(userId)) {
    options = userId;
    userId = pickUsersValue(options.userId, options.id);
  }

  const resolvedOptions = normalizeUsersSelectOptions(options);
  const params = { id: userId };
  setUsersIfDefined(params, "$select", normalizeUsersSelect(pickUsersValue(resolvedOptions.select, resolvedOptions.$select)));
  return execOp("UserProfile_V2", params);
}

// ═══════════════════════════════════════════════════════════════
//  MANAGER & REPORTS
// ═══════════════════════════════════════════════════════════════

// ── Get Manager ────────────────────────────────────────────────
export async function getManager(userId, options) {
  if (isUsersObject(userId)) {
    options = userId;
    userId = pickUsersValue(options.userId, options.id);
  }

  const resolvedOptions = normalizeUsersSelectOptions(options);
  const params = { id: userId };
  setUsersIfDefined(params, "$select", normalizeUsersSelect(pickUsersValue(resolvedOptions.select, resolvedOptions.$select)));
  return execOp("Manager_V2", params);
}

// ── Get Direct Reports ─────────────────────────────────────────
export async function getDirectReports(userId, options) {
  if (isUsersObject(userId)) {
    options = userId;
    userId = pickUsersValue(options.userId, options.id);
  }

  const resolvedOptions = normalizeUsersDirectReportsOptions(options);
  const params = { id: userId };
  setUsersIfDefined(params, "$select", normalizeUsersSelect(pickUsersValue(resolvedOptions.select, resolvedOptions.$select)));
  setUsersIfDefined(params, "$top", pickUsersValue(resolvedOptions.top, resolvedOptions.$top));
  return execOp("DirectReports_V2", params);
}

export async function getMyTrendingDocuments(options = {}) {
  const resolvedOptions = normalizeUsersTrendingOptions(options);
  const params = {};
  setUsersIfDefined(params, "$filter", pickUsersValue(resolvedOptions.filter, resolvedOptions.$filter));
  setUsersIfDefined(params, "extractSensitivityLabel", resolvedOptions.extractSensitivityLabel);
  setUsersIfDefined(params, "fetchSensitivityLabelMetadata", resolvedOptions.fetchSensitivityLabelMetadata);
  return execOp("MyTrendingDocuments", params);
}

export async function getRelevantPeople(userId) {
  if (isUsersObject(userId)) {
    userId = pickUsersValue(userId.userId, userId.id);
  }

  return execOp("RelevantPeople", { userId });
}

// ═══════════════════════════════════════════════════════════════
//  PHOTO
// ═══════════════════════════════════════════════════════════════

// ── Get User Photo ─────────────────────────────────────────────
export async function updateMyPhoto(bodyOrOptions, contentType) {
  if (isUsersObject(bodyOrOptions)) {
    contentType = pickUsersValue(bodyOrOptions.contentType, bodyOrOptions.Content_Type, bodyOrOptions.mimeType);
    bodyOrOptions = pickUsersValue(bodyOrOptions.body, bodyOrOptions.content, bodyOrOptions.photo, bodyOrOptions.fileContent);
  }

  return execOp("UpdateMyPhoto", {
    body: bodyOrOptions,
    Content_Type: contentType,
  });
}

export async function getUserPhotoMetadata(userId) {
  if (isUsersObject(userId)) {
    userId = pickUsersValue(userId.userId, userId.id);
  }

  return execOp("UserPhotoMetadata", { userId });
}

export async function getUserPhoto(userId) {
  if (isUsersObject(userId)) {
    userId = pickUsersValue(userId.userId, userId.id);
  }

  return execOp("UserPhoto_V2", { id: userId });
}

export async function getTrendingDocuments(userId, options = {}) {
  if (isUsersObject(userId)) {
    options = userId;
    userId = pickUsersValue(options.userId, options.id);
  }

  const resolvedOptions = normalizeUsersTrendingOptions(options);
  const params = { id: userId };
  setUsersIfDefined(params, "$filter", pickUsersValue(resolvedOptions.filter, resolvedOptions.$filter));
  setUsersIfDefined(params, "extractSensitivityLabel", resolvedOptions.extractSensitivityLabel);
  setUsersIfDefined(params, "fetchSensitivityLabelMetadata", resolvedOptions.fetchSensitivityLabelMetadata);
  return execOp("TrendingDocuments", params);
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════

// ── Search for Users ───────────────────────────────────────────
export async function searchForUsers(options = {}) {
  const resolvedOptions = normalizeUsersSearchOptions(options);
  const params = {};
  setUsersIfDefined(params, "searchTerm", resolvedOptions.searchTerm);
  setUsersIfDefined(params, "top", pickUsersValue(resolvedOptions.top, resolvedOptions.$top));
  setUsersIfDefined(params, "isSearchTermRequired", resolvedOptions.isSearchTermRequired);

  const skipToken = pickUsersValue(
    resolvedOptions.skipToken,
    resolvedOptions.$skipToken,
    resolvedOptions.$skiptoken,
    extractUsersSkipToken(resolvedOptions.nextLink),
    resolvedOptions.skip
  );

  if (skipToken !== undefined && skipToken !== null) {
    params.skipToken = String(skipToken);
  }

  return execOp("SearchUserV2", params);
}
