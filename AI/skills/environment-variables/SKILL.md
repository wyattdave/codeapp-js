---
name: environment-variables
description: "Use when: wiring Dataverse environment variables into a Power Apps Code App, asking for schema names, updating power.config.json table references, or reading values with getEnvironmentVariable from codeapp.js."
---

# Environment Variables Guide

> If there is a tool to create the environment variables, use it to create the definition and value. If not, ask the user for the schema name of the environment variable and add it to the app. All environment variable code should be in the config.js file.

## Workflow

1. Ask the user for the exact schema names that already exist in the maker portal.
2. Read `power.config.json` before editing it.
3. Add the two Dataverse tables used by environment variables.
4. Wire `getEnvironmentVariable(...)` into the app startup code.
5. Check `dist/config/` for any files with environment variable schemas, values, or examples.
6. Use the config.js file to get the values and parse them before use. This should allow environment variables and hard-coded values to be used interchangeably.

## power.config.json

Add both tables under `databaseReferences.default.cds.dataSources`.

```json
{
  "databaseReferences": {
    "default.cds": {
      "dataSources": {
        "environmentvariabledefinitions": {
          "entitySetName": "environmentvariabledefinitions",
          "logicalName": "environmentvariabledefinition",
          "isHidden": false
        },
        "environmentvariablevalues": {
          "entitySetName": "environmentvariablevalues",
          "logicalName": "environmentvariablevalue",
          "isHidden": false
        }
      }
    }
  }
}
```

Do not add a custom `environmentVariables` key to `power.config.json`.

## Helper Surface

The repo reads environment variables through `getEnvironmentVariable(...)` in `codeapp.js` / `codeapp-helper.js`.

There is no separate `environmentVar.js` helper in `dev files/`.

If the app already uses `initDataSources(...)`, add both environment-variable tables there.

```js
import { initDataSources, getEnvironmentVariable } from './codeapp.js';

function dsEntry(sPrimaryKey) {
  return { tableId: '', version: '', primaryKey: sPrimaryKey, dataSourceType: 'Dataverse', apis: {} };
}

initDataSources({
  environmentvariabledefinitions: dsEntry('environmentvariabledefinitionid'),
  environmentvariablevalues: dsEntry('environmentvariablevalueid')
});
```

If the app does not use `initDataSources(...)`, register both tables before the first `getEnvironmentVariable(...)` call.

## Value Formats
A single object type environment variable should be used, using the type: 100000003

```js
const sSiteJson = await getEnvironmentVariable('wd_sharepointsite');
const oSite = JSON.parse(sSiteJson);
const sSiteUrl = oSite.SiteUrl;
```

## Summary Rules

- Ask for schema name; do not invent them, and inform the user it should be a single object type variable.
- Keep the env-var tables in the same Dataverse table setup as the rest of the app.
- Import `getEnvironmentVariable(...)` from `./codeapp.js`.
- Parse Data Source values before using them.

## Common Failures

- `Data source not found ... environmentvariabledefinitions`: the two Dataverse tables are missing from `power.config.json` or the helper registration.
- `Environment variable not found: xyz`: the schema name is wrong or missing in Dataverse.
- Empty string: neither a current value nor a default value exists.