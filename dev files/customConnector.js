// Custom Connector Utility for Power Apps Code-First SDK
// This module provides generic functions to call any custom connector operation.
// Usage: import and use callCustomConnectorOperation or openCustomConnectorHttpRequest.

import { getClient } from "./power-apps-data.js";

// ── Data source name (set to your custom connector name) ──
const DATA_SOURCE_NAME = "<yourCustomConnectorName>"; // Replace with your connector name
const CUSTOM_CONNECTOR_APIS = {};

// ── Initialize SDK client for the custom connector ──
function initClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE_NAME]: {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: CUSTOM_CONNECTOR_APIS,
    },
  };
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
  try {
    const result = await client.executeAsync({
      connectorOperation: {
        tableName: DATA_SOURCE_NAME,
        operationName,
        parameters,
      },
    });
    return unwrapResult(result);
  } catch (oErr) {
    throw new Error(DATA_SOURCE_NAME + ": " + stringifyErrorDetails(oErr));
  }
}

// ── Call any custom connector operation by name ───────────────
export async function callCustomConnectorOperation(operationName, parameters = {}) {
  return execOp(operationName, parameters);
}

// ── Open HTTP Request (for advanced scenarios) ────────────────
export async function openCustomConnectorHttpRequest({ method = "GET", uri, headers, body }) {
  const client = await initClient();
  try {
    const result = await client.executeAsync({
      httpRequest: {
        tableName: DATA_SOURCE_NAME,
        method,
        uri,
        headers,
        body,
      },
    });
    return unwrapResult(result);
  } catch (oErr) {
    throw new Error(DATA_SOURCE_NAME + ": " + stringifyErrorDetails(oErr));
  }
}

// ── Example Usage ─────────────────────────────────────────────
// callCustomConnectorOperation("MyAction", { param1: "value" })
// openCustomConnectorHttpRequest({ method: "POST", uri: "/myapi", body: { ... } })
