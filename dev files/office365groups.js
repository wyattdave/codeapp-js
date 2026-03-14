import { getClient } from "@microsoft/power-apps/data";

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE = "Office365Groups";

// ── Initialize SDK client for the Office 365 Groups connector ──
function initClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE]: {
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
      tableName: DATA_SOURCE,
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
