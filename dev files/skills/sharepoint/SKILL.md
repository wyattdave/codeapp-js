---
name: sharepoint
description: "Use when: building or debugging SharePoint list, library, file, or HTTP-request flows in a Power Apps Code App, including list-id, list-name, or environment-variable-based setup."
---

# SharePoint Connector Guide

> Agent limitation: do not use CLI commands directly from chat for SharePoint setup. Use the built-in Sync Connections and Deploy buttons instead.

## Workflow

Before writing code, ask which connection approach the user wants:

- A: site URL + list ID
- B: site URL + list name
- C: environment variables

Do not guess the approach when the app requirements are still ambiguous.

## power.config.json

Expose `sharepointonline` in `connectionReferences`.

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

No Dataverse tables are needed unless the app also uses environment variables.

## Helper Surface

The wrapper in `dev files/sharepoint.js` exports:

- List ID pattern: `getItems`, `getSpItem`, `createSpItem`, `updateSpItem`, `deleteSpItem`
- List name pattern: `getItemsByName`, `getItemByName`, `createItemByName`, `updateItemByName`, `deleteItemByName`
- Generic helpers: `callSharePointOperation`, `sendHttpRequest`, `listTables`, `listLibrary`
- File helpers: `createFile`, `updateFile`, `deleteFile`, `moveFile`, `getFileMetadata`

The list-ID helpers use the SharePoint connector table API. The list-name helpers build SharePoint REST URLs and send them through `HttpRequest`.

## Important Corrections

- The single-item and CRUD helpers for the list-ID path are `getSpItem`, `createSpItem`, `updateSpItem`, and `deleteSpItem` in this repo.
- `sharepoint.js` encodes `siteUrl` internally with `encodeURIComponent(...)`. Do not pre-encode the URL before passing it in.
- For environment-variable based setup, import `getEnvironmentVariable(...)` from `./codeapp.js`, not from a separate `environmentVar.js` helper.

## Example Imports

Approach A:

```js
import { getItems, getSpItem, createSpItem, updateSpItem, deleteSpItem } from './codeapp.js';
```

Approach B:

```js
import { getItemsByName, getItemByName, createItemByName, updateItemByName, deleteItemByName } from './codeapp.js';
```

Approach C:

```js
import { getItemsByName, getEnvironmentVariable } from './codeapp.js';
```

## Additional Build Nudge

When a SharePoint build introduces or depends on specific lists and columns, create an `agent/listSchema.json` artifact so the user can recreate the list structure correctly.