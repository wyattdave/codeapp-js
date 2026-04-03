import { getClient } from "@microsoft/power-apps/data";

// ── Data source name (must match the generated connector data source name) ──
const DATA_SOURCE = "office365groups";

const GROUPS_APIS = {
  ListOwnedGroups: {
    path: "/{connectionId}/v1.0/me/memberOf/$/microsoft.graph.group",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
    ],
  },
  ListGroupMembers: {
    path: "/{connectionId}/v1.0/groups/{groupId}/members",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "groupId", in: "path", required: true },
      { name: "$top", in: "query", required: false },
    ],
  },
  HttpRequest: {
    path: "/{connectionId}/httprequest",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
    ],
  },
};

// ── Initialize SDK client for the Office 365 Groups connector ──
function initClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE]: {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: GROUPS_APIS,
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

  return Object.prototype.hasOwnProperty.call(result, "data") ? result.data : result;
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
