---
name: codeapp-js
description: 'Build Power Apps Code Apps using codeapp.js. Use when: creating a code app, working with Dataverse tables, querying SharePoint lists, calling connectors, setting up power.config.json, using initDataSources, registerTable, listItems, getItem, createItem, updateItem, deleteItem, getEnvironmentVariable, whoAmI, or deploying with pac code push.'
---

# codeapp.js — Power Apps Code App Library

## Overview

codeapp.js is a wrapper around the `@microsoft/power-apps/data` SDK that simplifies Dataverse CRUD operations, SharePoint list access, and connector calls inside Power Apps Code Apps.

## Project Structure

```
dist/
  codeapp.js      # Library — import functions from here
  index.js        # App logic — your custom code
  index.html      # App UI
  styles.css      # App styles
power.config.json # App config, connections, data sources
```

## Setup

### 1. Configure power.config.json

Every Dataverse table your app uses must be declared in `databaseReferences.default.cds.dataSources`:

```json
{
  "databaseReferences": {
    "default.cds": {
      "dataSources": {
        "accounts": {
          "entitySetName": "accounts",
          "logicalName": "account",
          "isHidden": false
        },
        "contacts": {
          "entitySetName": "contacts",
          "logicalName": "contact",
          "isHidden": false
        }
      }
    }
  }
}
```

For SharePoint, add a connection reference:

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

### 2. Declare Data Sources in index.js

Call `initDataSources()` at the top of index.js before any API calls. The SDK caches the client on first use — tables not declared here will fail.

```js
import { initDataSources, listItems, getItem, createItem, updateItem, deleteItem } from './codeapp.js';

function dsEntry(sPrimaryKey) {
  return { tableId: '', version: '', primaryKey: sPrimaryKey, dataSourceType: 'Dataverse', apis: {} };
}

initDataSources({
  accounts: dsEntry('accountid'),
  contacts: dsEntry('contactid')
});
```

### 3. Deploy

```bash
pac code push
```

## Dataverse API

### initDataSources(oSources)

Declares all Dataverse tables upfront. Must be called before any other API function. Resets the internal SDK client.

```js
initDataSources({
  accounts: dsEntry('accountid'),
  contacts: dsEntry('contactid')
});
```

### registerTable(sTableName, sPrimaryKey)

Registers an additional table at runtime. Resets the cached SDK client so the new table is available on the next call.

```js
registerTable('incidents', 'incidentid');
```

### listItems(tableName, primaryKey, options)

Retrieves multiple records. Returns `{ entities: [...] }`.

Options: `filter`, `select`, `orderBy`, `top`, `skip`. The `select` and `orderBy` accept arrays or comma-separated strings.

```js
var oResult = await listItems('accounts', 'accountid', {
  filter: "statecode eq 0",
  select: ['name', 'accountid', 'emailaddress1'],
  orderBy: ['name asc'],
  top: 50
});
var aAccounts = oResult.entities;
```

### getItem(tableName, primaryKey, id, select)

Retrieves a single record by ID.

```js
var oAccount = await getItem('accounts', 'accountid', '00000000-0000-0000-0000-000000000001', ['name', 'emailaddress1']);
```

Omit `select` to return all columns:

```js
var oAccount = await getItem('accounts', 'accountid', sAccountId);
```

### createItem(tableName, primaryKey, record)

Creates a new record.

```js
var oNew = await createItem('accounts', 'accountid', {
  name: 'Contoso Ltd',
  emailaddress1: 'info@contoso.com'
});
```

### updateItem(tableName, primaryKey, id, changedFields)

Updates an existing record.

```js
await updateItem('accounts', 'accountid', sAccountId, {
  emailaddress1: 'new@contoso.com'
});
```

### deleteItem(tableName, primaryKey, id)

Deletes a record.

```js
await deleteItem('accounts', 'accountid', sAccountId);
```

### callUnboundAction(tableName, primaryKey, actionName, params)

Calls an unbound Dataverse action.

```js
var oResult = await callUnboundAction('', '', 'WhoAmI', {});
```

### whoAmI()

Returns the current user's system user ID.

```js
var sUserId = await whoAmI();
```

### getEnvironmentVariable(sSchemaName)

Retrieves an environment variable value by schema name. Falls back to the default value if no override exists. Requires `environmentvariabledefinitions` and `environmentvariablevalues` in your data sources.

```js
var sApiUrl = await getEnvironmentVariable('contoso_ApiBaseUrl');
```

## SharePoint API

Requires the `sharepointonline` connection reference in power.config.json.

### By List ID

```js
import { getItems, getSpItem, createSpItem, updateSpItem, deleteSpItem } from './codeapp.js';

// List items
var aItems = await getItems('https://contoso.sharepoint.com/sites/mysite', '{list-guid}', {
  filter: "Title eq 'Test'",
  top: 10
});

// Single item
var oItem = await getSpItem('https://contoso.sharepoint.com/sites/mysite', '{list-guid}', 42);

// Create
await createSpItem('https://contoso.sharepoint.com/sites/mysite', '{list-guid}', { Title: 'New Item' });

// Update
await updateSpItem('https://contoso.sharepoint.com/sites/mysite', '{list-guid}', 42, { Title: 'Updated' });

// Delete
await deleteSpItem('https://contoso.sharepoint.com/sites/mysite', '{list-guid}', 42);
```

### By List Name

```js
import { getItemsByName, getItemByName, createItemByName, updateItemByName, deleteItemByName } from './codeapp.js';

var aItems = await getItemsByName('https://contoso.sharepoint.com/sites/mysite', 'My List', { top: 25 });
var oItem = await getItemByName('https://contoso.sharepoint.com/sites/mysite', 'My List', 42);
```

### Raw HTTP Request

For advanced operations not covered by the standard API:

```js
import { sendHttpRequest } from './codeapp.js';

var oResult = await sendHttpRequest({
  method: 'GET',
  uri: "https://contoso.sharepoint.com/sites/mysite/_api/web/lists/getbytitle('My List')/items"
});
```

## Gotchas

- **Tables must be in power.config.json AND initDataSources.** Missing from either will cause "data source not found" errors.
- **initDataSources must be called before any API call.** The SDK caches the client internally on first use.
- **registerTable resets the SDK client.** Batch all registerTable calls before making API requests when possible.
- **Some Dataverse tables do not support single-record Retrieve.** The `entities` table is one example — use `listItems` with a filter instead of `getItem`.
- **The `entitySetName` in power.config.json is the plural OData collection name** (e.g. `webresourceset` not `webresources`).
- **select/orderBy accept arrays or comma-separated strings.** Both `['name', 'accountid']` and `'name,accountid'` work.
- **Environment variables require two tables** in your data sources: `environmentvariabledefinitions` and `environmentvariablevalues`.
