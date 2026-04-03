import { getClient } from "@microsoft/power-apps/data";

// ── Initialize SDK & Client ────────────────────────────────────
function initClient(tableName, primaryKey) {
  const dataSourcesInfo = {
    [tableName]: {
      tableId: "",
      version: "",
      primaryKey,
      dataSourceType: "Dataverse",
      apis: {},
    },
  };
  return getClient(dataSourcesInfo);
}

// ── Create ─────────────────────────────────────────────────────
export async function createItem(tableName, primaryKey, record) {
  const client = await initClient(tableName, primaryKey);
  const result = await client.createRecordAsync(tableName, record);
  return result;
}

// ── Read (single) ──────────────────────────────────────────────
export async function getItem(tableName, primaryKey, id, select) {
  const client = await initClient(tableName, primaryKey);
  const options = select ? { select } : undefined;
  const result = await client.retrieveRecordAsync(tableName, id, options);
  return result;
}

// ── List (multiple) ────────────────────────────────────────────
export async function listItems(tableName, primaryKey, { filter, select, orderBy, top, skip } = {}) {
  const client = await initClient(tableName, primaryKey);
  const result = await client.retrieveMultipleRecordsAsync(tableName, {
    filter,
    select,
    orderBy,
    top,
    skip,
  });
  return result;
}

// ── Update ─────────────────────────────────────────────────────
export async function updateItem(tableName, primaryKey, id, changedFields) {
  const client = await initClient(tableName, primaryKey);
  const result = await client.updateRecordAsync(tableName, id, changedFields);
  return result;
}

// ── Delete ─────────────────────────────────────────────────────
export async function deleteItem(tableName, primaryKey, id) {
  const client = await initClient(tableName, primaryKey);
  const result = await client.deleteRecordAsync(tableName, id);
  return result;
}

// ── Unbound Action ─────────────────────────────────────────────
export async function callUnboundAction(tableName, primaryKey, actionName, params) {
  const client = await initClient(tableName, primaryKey);
  const result = await client.invokeActionAsync(tableName, actionName, params);
  return result;
}
