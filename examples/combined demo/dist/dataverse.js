import { getClient } from "@microsoft/power-apps/data";

// ── All Table Definitions ──────────────────────────────────────
const ALL_DATA_SOURCES = {
  wd_pokersessions:     { tableId: '', version: '', primaryKey: 'wd_pokersessionid',     dataSourceType: 'Dataverse', apis: {} },
  wd_pokerparticipants: { tableId: '', version: '', primaryKey: 'wd_pokerparticipantid', dataSourceType: 'Dataverse', apis: {} },
  wd_pokerrounds:       { tableId: '', version: '', primaryKey: 'wd_pokerroundid',       dataSourceType: 'Dataverse', apis: {} },
  wd_pokervotes:        { tableId: '', version: '', primaryKey: 'wd_pokervoteid',        dataSourceType: 'Dataverse', apis: {} },
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
