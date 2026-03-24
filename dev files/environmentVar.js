import { getClient } from "./power-apps-data.js";

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
