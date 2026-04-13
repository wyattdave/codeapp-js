---
name: sharepoint
description: "Use when: building or debugging SharePoint list, library, file, or HTTP-request flows in a Power Apps Code App, including list-id or environment-variable-based setup."
---

# SharePoint App Builder Guide

Use this skill when an app needs SharePoint list CRUD, file operations, library metadata, or a last-resort SharePoint HTTP request through `./connectors/sharepoint.js`.

Use the working OG-style SharePoint wrapper pattern from this repo as the reference: siteUrl-based connector paths, wrapper-side site URL encoding, `GetTables` lookup for the connector table token, and standard CRUD after resolution.

Do not use CLI setup flows from chat. Use the built-in Auth, Sync Connections, and Deploy buttons.

## First Questions To Ask

Ask only the minimum needed to choose the right setup and write working code:

1. Is this app working with a SharePoint list, files in a document library, or a custom SharePoint HTTP endpoint?
2. What is the exact SharePoint site URL?
3. Do you already have the SharePoint list ID?
4. If not, do you at least know the list name for one-time resolution?
5. Should config come from hardcoded app config or Dataverse environment variables?
6. Does the current `power.config.json` already contain `connectionReferences.sharepointonline`?
7. Which operations are required: read, create, update, delete, file create/move/delete, or custom request only?
8. Are there complex SharePoint fields involved such as person, lookup, or multi-value choice columns?

Preferred configuration order:

- A: site URL + list ID
- B: environment variables that resolve site URL + list ID
- C: site URL + list name only, resolved once through `resolveSharePointList(...)`

Do not ask for a list name as the primary CRUD identifier. If the user only knows the list name, use it only as a lookup hint.

## power.config.json

Always read the current `power.config.json` before editing it.

Ensure `"id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"` exists and ` "dataSources": ["sharepointonline"]`.

```json
{
  "connectionReferences": {
    "sharepointonline": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline",
      "displayName": "SharePoint",
      "dataSources": ["sharepointonline"],
      "dataSets": {}
    }
  }
}
```

Rules for editing `power.config.json`:

- Preserve existing keys such as `sharedConnectionId`, `authenticationType`, and other working connection metadata.
- Do not rename the connection reference key or the data source name away from `sharepointonline`.
- No Dataverse tables are needed for basic SharePoint-only apps.
- If the app uses Dataverse environment variables, also load the environment-variables skill and add the two Dataverse environment-variable tables there.

## Core App Rules

- Prefer dedicated SharePoint helpers over raw HTTP.
- Keep SharePoint list discovery inside `sharepoint.js`, not in app pages or components.
- Do not pre-encode the site URL. Pass the raw URL string and let the wrapper encode it.
- If a list ID is known, still prefer resolving through `resolveSharePointList(...)` once at startup so the wrapper can match the connector table token.
- If the app only knows a list name, use `resolveSharePointList(...)` or a by-list helper and let the wrapper do `listTables(...)` lookup.

When generating or fixing a local `dist/connectors/sharepoint.js` wrapper:

- initialize the connector client with `getClient(dataSourcesInfo)`
- keep the working SharePoint action parameter names aligned with the OG contract: `siteUrl`, `table`, `item`, and the standard CRUD/query names
- keep reusable list-resolution helpers in the wrapper
- preserve `callSharePointOperation(...)` as the escape hatch for supported actions
- use `sendHttpRequest(...)` only when no dedicated helper exists

## Recommended Startup Pattern

For list-backed apps, resolve the list once during startup and keep the returned access object in app state.

```js
import {
  createSpItemByList,
  deleteSpItemByList,
  getItemsByList,
  resolveSharePointList,
  updateSpItemByList,
} from './connectors/sharepoint.js';

const oAppConfig = {
  sSiteUrl: 'https://tenant.sharepoint.com/sites/example',
  sListId: '00000000-0000-0000-0000-000000000000',
  sListName: 'Tasks',
};

const oListAccess = await resolveSharePointList(oAppConfig.sSiteUrl, {
  listId: oAppConfig.sListId,
  listName: oAppConfig.sListName,
});

const aItems = await getItemsByList(oListAccess.sSiteUrl, oListAccess, { top: 200 });
await createSpItemByList(oListAccess.sSiteUrl, oListAccess, { Title: 'New item' });
await updateSpItemByList(oListAccess.sSiteUrl, oListAccess, 1, { Title: 'Updated item' });
await deleteSpItemByList(oListAccess.sSiteUrl, oListAccess, 1);
```

Why this is the preferred pattern:

- it keeps list lookup and fallback logic inside the wrapper
- it works whether the connector resolves a table token or falls back to the configured list ID
- it matches the working SharePoint demo app in this repo

## Function Surface And Correct Usage

Generic helpers:

- `callSharePointOperation(operationName, parameters)`
- `sendHttpRequest({ method, uri, headers, body })`
- `listTables(siteUrl)`
- `listLibrary(siteUrl)`
- `resolveSharePointList(siteUrl, listReference)`

List-ID CRUD helpers:

- `getItems(siteUrl, listId, { filter, orderBy, top, skip })`
- `getSpItem(siteUrl, listId, itemId)`
- `createSpItem(siteUrl, listId, fields)`
- `updateSpItem(siteUrl, listId, itemId, changedFields)`
- `deleteSpItem(siteUrl, listId, itemId)`

By-list CRUD helpers:

- `getItemsByList(siteUrl, listReference, queryOptions)`
- `getSpItemByList(siteUrl, listReference, itemId)`
- `createSpItemByList(siteUrl, listReference, fields)`
- `updateSpItemByList(siteUrl, listReference, itemId, changedFields)`
- `deleteSpItemByList(siteUrl, listReference, itemId)`

File helpers:

- `createFile(siteUrl, folderPath, fileName, fileContent)`
- `updateFile(siteUrl, fileId, fileContent)`
- `deleteFile(siteUrl, fileId)`
- `moveFile(siteUrl, sourceFileId, destinationFolderPath, newFileName)`
- `getFileMetadata(siteUrl, fileId)`

Important behavior:

- `resolveSharePointList(...)` returns both generic keys and app-friendly aliases: `siteUrl`, `listId`, `listName`, `sSiteUrl`, `sListId`, `sListName`, plus `table` and lookup metadata.
- `getItemsByList(...)` and the other by-list helpers accept a list name, list ID object, or resolved access object.
- Create and update payloads must be plain objects.
- Item IDs can be strings or numbers.
- Query options such as `top` and `skip` must be numeric if supplied.
- `moveFile(...)` can rename during the move when `newFileName` is supplied.
- `sendHttpRequest(...)` expects `{ method, uri, headers, body }` on the OG SharePoint wrapper contract.

## Response Handling In App Code

SharePoint item reads may come back as an array or inside a nested result shape. Normalize collections in app code before rendering tables or computing counts.

```js
function normalizeCollection(oPayload) {
  if (Array.isArray(oPayload)) {
    return oPayload;
  }

  const aCandidates = [
    oPayload && oPayload.value,
    oPayload && oPayload.items,
    oPayload && oPayload.results,
    oPayload && oPayload.body,
    oPayload && oPayload.data,
    oPayload && oPayload.result,
    oPayload && oPayload.response,
    oPayload && oPayload.d && oPayload.d.results,
  ];

  return aCandidates.find(Array.isArray) || [];
}
```

## Environment Variable Pattern

If the app should not hardcode the site URL or list ID, load the environment-variables skill too.

Rules:

- Ask for the exact existing schema names.
- Read values through `getEnvironmentVariable(...)` from `./codeapp.js`.
- Update `power.config.json` with the Dataverse environment-variable tables only when the app actually uses them.
- If a Data Source environment variable stores JSON, parse it before extracting the site URL or list ID.

## Error Handling

The wrapper already converts many connector failures into readable errors such as `SharePoint GetItems failed: ...`, so app code should display those messages rather than swallowing them.

Keep separate loading and submit flags in UI state so refresh, create, update, and delete actions do not overlap silently.

## Debugging Checklist

- If the failure happens before any connector call, verify `initSharePointClient()` returns `getClient(dataSourcesInfo)` and the wrapper was not replaced with a stub.
- If SharePoint calls suddenly return 404 after switching wrapper style, fall back to the OG siteUrl-based contract instead of a generated dataset or OData-style surface.
- If you see `Provide a SharePoint listId or listName.`, the app never supplied startup list configuration.
- If you see `SharePoint item payload must be an object.`, the app passed a string, `FormData`, or another invalid payload.
- If you see `SharePoint site URL is required.`, the config source is empty or malformed.
- If list resolution fails, confirm the site URL and list ID belong to the same site.
- If the user only knows a list name, let the wrapper perform `listTables(...)` lookup instead of building lookup logic in the page.
- Do not manually call `encodeURIComponent(siteUrl)` before passing the site URL to the wrapper.
- Use `enableDebugger()` during app development so `_dbgWrap(...)` traces are available.
- Use `sendHttpRequest(...)` only as an escape hatch when there is no dedicated SharePoint helper.

## Summary Rules

- Ask for site URL and list ID first.
- Treat list name as a fallback lookup hint, not the primary identifier.
- Update `power.config.json` by merging in `connectionReferences.sharepointonline`, not by overwriting working connection metadata.
- Resolve the list once at startup and keep the resolved access object in app state.
- Prefer by-list helpers in app code and keep list lookup inside `sharepoint.js`.
- Show connector error messages directly in the UI.