# CodeApp js
A simplified JavaScript version of Microsofts Power Apps Code Apps.
The project using the `@microsoft/power-apps/data` SDK. It includes generated Dataverse services and connector libraries for Outlook, SharePoint, Office 365 Groups, and Office 365 Users (more to follow soon).

---

## Project Structure

```
dist/
  codeapp.js            # bridging functions to the sdk
  power-apps-data.js    # JavaScript version of SDK
  index.js              # Custom JavaScript for your app
  index.html            # Web page for App
src/
  generated/           # Auto-generated connection services & models
    services/
      AccountsService.ts
    models/
      AccountsModel.ts
      CommonModels.ts
power.config.json      # App configuration, connections, and data sources
```

---

## Requirements

- Microsoft Power Platform CLI (`pac`) must be installed before using this project.
- Node.js and npm must be installed to use the local npm workflow.
- Verify the CLI is available by running `pac` or `Get-Command pac | Format-List` in PowerShell.

---

## npm Setup

From the repository root:

```bash
npm install
```

This installs the npm dependencies and rebuilds every local `power-apps-data.js` file from the published `@microsoft/power-apps` package so the samples stay in sync with npm.

To serve the repository locally:

```bash
npm start
```

The server runs from the repo root on port `4173`, so you can open any sample directly, for example:

- `http://localhost:4173/codeApp/dist/`
- `http://localhost:4173/examples/todo/dist/`
- `http://localhost:4173/examples/outlook%20Demo/dist/`

To jump straight to the starter app:

```bash
npm run start:codeapp
```

---

## CLI Commands

```bash
# Authenticate and create a local auth profile
pac auth create

# Authenticate directly to a specific environment
pac auth create --environment "<environment-id-or-url>"

# List saved auth profiles
pac auth list

# Select the active environment for the current auth profile
pac env select --environment "<environment-id-or-url>"

# List Dataverse connections in the selected environment
pac connection list

# Create a Dataverse connection
pac connection create --name "<connection-name>" --application-id "<app-id>" --client-secret "<client-secret>" --tenant-id "<tenant-id>"

# Add datasource files
pac code add-data-source -a "<connection-name>" -c "<connection-id"

# Push the app to your Power Platform environment
pac code push --solutionName <YourSolutionName>
```

---

## Configuring `power.config.json`

### Adding a Dataverse Table

To add a new Dataverse table (e.g. **contacts**), add an entry under `databaseReferences.default.cds.dataSources`:

```jsonc
{
  // ... other config ...
  "databaseReferences": {
    "default.cds": {
      "dataSources": {
        "accounts": {
          "entitySetName": "accounts",
          "logicalName": "account"
        },
        "contacts": {
          "entitySetName": "contacts",
          "logicalName": "contact"
        }
      },
      "environmentVariableName": ""
    }
  }
}
```

After adding the table, run `pac code push` — the SDK will auto-generate a service class (like `AccountsService`) that you can import and use.

### Adding a Connection Reference

Each connector library needs a matching entry in `connectionReferences`. 


```jsonc
{
  "connectionReferences": {
    // Dataverse
    "Dataverse": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
      "displayName": "Microsoft Dataverse",
      "dataSources": ["commondataserviceforapps"],
      "dataSets": {}
    },
    
    // Office 365 Outlook  
    "office365outlook": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_office365",
      "displayName": "Office 365 Outlook",
      "dataSources": ["office365"],
      "dataSets": {}
    },
    // SharePoint Online 
    "sharepointonline": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline",
      "displayName": "SharePoint",
      "dataSources": ["sharepointonline"],
      "dataSets": {}
    },
    // Office 365 Groups 
    "office365groups": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_office365groups",
      "displayName": "Office 365 Groups",
      "dataSources": ["office365groups"],
      "dataSets": {}
    },
    // Office 365 Users  
    "office365users": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_office365users",
      "displayName": "Office 365 Users",
      "dataSources": ["office365users"],
      "dataSets": {}
    },
    /// MS Teams
    "ef348778-cc4f-4444-9f78-fcfdb4a45544": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_teams",
      "displayName": "Microsoft Teams",
      "dataSources": [
        "teams"
      ],
      "dataSets": {}
    },
    // Jira
    "e050e705-9ee9-4461-4444-4de4ed5904ea": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_jira",
      "displayName": "Jira",
      "dataSources": [
        "jira"
      ],
      "authenticationType": "APIToken",
      "dataSets": {}
    },
    // Azure keyvault
    "85039b8d-b6fe-4444-b9db-6008338ec987": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_keyvault",
      "displayName": "Azure Key Vault",
      "dataSources": [
        "keyvault"
      ],
      "authenticationType": "oauthDefault",
      "dataSets": {}
    }
  }
}
```

---

## Office 365 Groups Helpers

The Groups helpers in [codeApp/dist/codeapp.js](codeApp/dist/codeapp.js) are now aligned to the generated connector surface in [codeApp/src/generated/services/Office365GroupsService.ts](codeApp/src/generated/services/Office365GroupsService.ts) and [codeApp/src/generated/models/Office365GroupsModel.ts](codeApp/src/generated/models/Office365GroupsModel.ts), while keeping the existing helper names and positional calls usable.

Available helpers:

- `listMyGroups(options)`
- `listOwnedGroups(options)`
- `listGroups(options)`
- `listGroupMembers(groupId, options)`
- `onGroupMembershipChange(groupId, options)`
- `addMemberToGroup(userUpn, groupId)`
- `removeMemberFromGroup(userUpn, groupId)`
- `createGroupEvent(groupId, options)`
- `updateGroupEvent(eventId, options, groupId)`
- `deleteGroupEvent(eventId, groupId)`
- `onNewGroupEvent(groupId)`
- `listDeletedGroups()`
- `restoreDeletedGroup(groupId)`
- `listDeletedGroupsByOwner(userId)`
- `openGroupsHttpRequest(options)`

Examples:

```js
const myGroups = await listMyGroups({ version: 3, extractSensitivityLabel: true });

const members = await listGroupMembers('00000000-0000-0000-0000-000000000001', { top: 25 });

const allGroups = await listGroups({ filter: "startsWith(displayName,'Finance')", top: 50 });

await addMemberToGroup('user@contoso.com', '00000000-0000-0000-0000-000000000001');

await createGroupEvent('00000000-0000-0000-0000-000000000001', {
  subject: 'Monthly review',
  start: { dateTime: '2026-04-15T09:00:00', timeZone: 'Pacific Standard Time' },
  end: { dateTime: '2026-04-15T10:00:00', timeZone: 'Pacific Standard Time' },
  body: { content: '<p>Status review</p>', contentType: 'Html' },
  location: 'Conference Room A'
});

const response = await openGroupsHttpRequest({
  method: 'GET',
  uri: '/groups',
  version: 2,
  headers: { ConsistencyLevel: 'eventual' }
});
```

Compatibility notes:

- Existing calls like `listMyGroups()` and `listGroupMembers(groupId)` still work.
- `listMyGroups(options)` now accepts `version: 1 | 2 | 3` so apps can opt into `ListOwnedGroups_V2` or `ListOwnedGroups_V3` without changing helper names.
- `listGroupMembers`, `onGroupMembershipChange`, `addMemberToGroup`, `removeMemberFromGroup`, `restoreDeletedGroup`, and `listDeletedGroupsByOwner` also accept a single options object with IDs and related properties.
- `listGroups` accepts `filter`, `top`, `skipToken`, `$skiptoken`, `nextLink`, and the sensitivity label flags. `skip` is treated as a compatibility alias for `skipToken`.
- `openGroupsHttpRequest` now maps friendly inputs like `uri`, `method`, `headers`, `body`, `contentType`, and `customHeaders` to the connector's expected `Uri`, `Method`, `Body`, `ContentType`, and `CustomHeader1..5` fields. By default it keeps using the legacy `HttpRequest` action; set `version: 2` to use `HttpRequestV2`.
- Group helper results are now unwrapped to the connector payload, matching the behavior of the Users and Outlook helpers.

When you need the raw generated action, `callGroupsOperation(operationName, parameters)` remains available.

---

## Office 365 Users Helpers

The Users helpers in [codeApp/dist/codeapp.js](codeApp/dist/codeapp.js) are now aligned to the generated connector surface in [codeApp/src/generated/services/Office365UsersService.ts](codeApp/src/generated/services/Office365UsersService.ts) while keeping the older positional calls working.

Available helpers:

- `getMyProfile(options)`
- `getUserProfile(userId, options)`
- `getManager(userId, options)`
- `getDirectReports(userId, options)`
- `getUserPhoto(userId)`
- `getUserPhotoMetadata(userId)`
- `searchForUsers(options)`
- `updateMyProfile(profile)`
- `updateMyPhoto(bodyOrOptions, contentType)`
- `getMyTrendingDocuments(options)`
- `getTrendingDocuments(userId, options)`
- `getRelevantPeople(userId)`
- `openUsersHttpRequest(options)`

Examples:

```js
const me = await getMyProfile({ select: ['displayName', 'mail', 'jobTitle'] });

const manager = await getManager('user@contoso.com', { select: 'displayName,mail' });

const reports = await getDirectReports('user@contoso.com', { select: ['displayName', 'mail'], top: 25 });

const firstPage = await searchForUsers({ searchTerm: 'alex', top: 25 });
const nextPage = await searchForUsers({
  searchTerm: 'alex',
  nextLink: firstPage && firstPage['@odata.nextLink']
});

await updateMyProfile({ aboutMe: 'Builder', skills: ['Power Apps', 'JavaScript'] });
```

Compatibility notes:

- Existing positional calls like `getUserProfile(userId)` and `getDirectReports(userId)` still work.
- `select` can be either an array or a comma-separated string.
- `searchForUsers` still accepts `skip`, but it is treated as `skipToken` for compatibility with the generated `SearchUserV2` action.
- `openUsersHttpRequest` expects Graph-style connector inputs: `Uri`, `Method`, optional `Body`, `ContentType`, and up to five custom headers. The helper accepts friendly inputs like `uri`, `method`, `headers`, `body`, `contentType`, and `customHeaders` and maps them for you.

When you need the raw generated action, `callUsersOperation(operationName, parameters)` remains available.

---

## Azure Key Vault Helpers

The Azure Key Vault helpers in [codeApp/dist/codeapp.js](codeApp/dist/codeapp.js) are now aligned to the generated connector surface in [codeApp/src/generated/services/AzureKeyVaultService.ts](codeApp/src/generated/services/AzureKeyVaultService.ts) and [codeApp/src/generated/models/AzureKeyVaultModel.ts](codeApp/src/generated/models/AzureKeyVaultModel.ts), while keeping the existing secret helper signatures usable.

Available helpers:

- `listKeys(options)`
- `listKeyVersions(keyName)`
- `getKeyMetadata(keyName)`
- `getKeyVersionMetadata(keyName, keyVersion)`
- `encryptData(keyName, input)`
- `encryptDataWithVersion(keyName, keyVersion, input)`
- `decryptData(keyName, input)`
- `decryptDataWithVersion(keyName, keyVersion, input)`
- `listSecrets(options)`
- `listSecretVersions(secretName)`
- `getSecret(secretName, apiVersion)`
- `getSecretMetadata(secretName)`
- `getSecretVersion(secretName, secretVersion)`
- `getSecretVersionMetadata(secretName, secretVersion)`
- `callKeyVaultOperation(operationName, parameters)`

Examples:

```js
const secrets = await listSecrets();

const secret = await getSecret('ContosoApiKey');

const versions = await listSecretVersions('ContosoApiKey');

const encrypted = await encryptData('contoso-encryption-key', {
  algorithm: 'RSA-OAEP-256',
  rawData: 'hello world'
});

const encryptedWithVersion = await encryptData({
  keyName: 'contoso-encryption-key',
  keyVersion: '8b9d2c7f0d2743f0a0a9a8e4e10abcde',
  rawData: 'hello world'
});

const decrypted = await decryptData('contoso-encryption-key', {
  encryptedData: encrypted && encrypted.encryptedData
});

const keyMetadata = await getKeyMetadata('contoso-encryption-key');
```

Compatibility notes:

- Existing calls like `getSecret('ContosoApiKey')` and `listSecrets({ maxresults: 25, apiVersion: '7.4' })` still work. The extra options are preserved as accepted inputs even though the current connector action does not use them.
- The new Key Vault helpers accept either positional arguments or a single options object. For example, `getKeyVersionMetadata({ keyName, keyVersion })` and `getSecretVersion({ secretName, secretVersion })` are both supported.
- `encryptData` and `decryptData` accept either the generated `operationInput` shape or flatter inputs like `{ keyName, rawData, algorithm }` and `{ keyName, encryptedData, algorithm }`. If `algorithm` is omitted, the helper defaults it to `RSA-OAEP-256`, which matches the connector schema default.
- `encryptData` and `decryptData` also honor `keyVersion` when supplied in the options object, so apps can opt into the version-specific connector actions without changing helper names.

When you need the raw generated action, `callKeyVaultOperation(operationName, parameters)` remains available.

---
