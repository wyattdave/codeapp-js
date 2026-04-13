---
name: sharepoint
description: "Use when: building or debugging SharePoint list, library, file, or HTTP-request flows in a Power Apps Code App, including list-id or environment-variable-based setup."
---

# SharePoint Connector Guide

Use `codeApp/dist/connectors/sharepoint.js` as the repo source of truth.

Do not use CLI setup flows from chat. Use the built-in Auth, Sync Connections, and Deploy buttons.

## Core Rule

Prefer list-ID helpers over raw HTTP when a dedicated action exists.

Preferred setup patterns:

- site URL + list ID
- environment variables that resolve site URL + list ID

If the user only knows a list name, call `listTables(...)` once to discover the table ID and then continue with list-ID helpers.

## Action Helper Surface

- Generic: `callSharePointOperation`, `sendHttpRequest`, `listTables`, `listLibrary`
- List ID CRUD: `getItems`, `getSpItem`, `createSpItem`, `updateSpItem`, `deleteSpItem`
- Files: `createFile`, `updateFile`, `deleteFile`, `moveFile`, `getFileMetadata`

## Important Behavior

- `getItems(...)` accepts `siteUrl`, `listId`, and optional `{ filter, orderBy, top, skip }`.
- Site URLs are encoded internally. Do not pre-encode them before passing them in.
- `sendHttpRequest(...)` expects `siteUrl` or `dataset` plus `method`, `uri`, `headers`, and `body`.
- `moveFile(...)` uses the connector move-file action and can rename after the move when `newFileName` is supplied.

## Debugging

- Keep using list IDs for CRUD instead of falling back to list names in app code.
- Use `sendHttpRequest(...)` only as an escape hatch when no dedicated helper exists.
- For environment-variable-based setups, read values through `getEnvironmentVariable(...)` from `./codeapp.js`.