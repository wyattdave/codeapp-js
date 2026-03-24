import { getClient } from "./power-apps-data.js";

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE = "office365users";

// ── Initialize SDK client for the Office 365 Users connector ───
function initClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE]: {
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
