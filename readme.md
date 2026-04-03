# CodeApp JS

A JavaScript-first Power Apps Code Apps workspace built around the `@microsoft/power-apps/data` runtime, generated Dataverse services, and handwritten connector wrappers for common Microsoft and third-party services.

The repo currently ships connector wrappers for Outlook, SharePoint, Office 365 Groups, Office 365 Users, Teams, Jira, Azure Key Vault, and SQL Server.

## Repository Layout

```text
AI/
  codeapp.agent.md      # Custom agent definition for repo-specific Code App workflows
  skills/               # Reusable skill documents for connectors and app-building guidance
codeApp/
  dist/
    codeapp.js          # Shared helper bridge for app code
    power-apps-data.js  # Bundled Power Apps data runtime
    connectors/         # Handwritten connector wrappers used by apps in this repo
    index.html          # Starter app shell
    index.js            # Starter app logic
  src/
    generated/          # Generated Dataverse and connector models/services
  power.config.json     # App configuration, Dataverse tables, and connection references
examples/
  ...                   # Sample apps showing different connector and Dataverse patterns
agent/
  decision-log.md       # Durable repo-level decisions for AI-assisted work
```

## Requirements

- Microsoft Power Platform CLI (`pac`)
- Node.js and npm
- A Power Platform environment with the connectors you want to use

Verify the CLI from PowerShell:

```powershell
Get-Command pac | Format-List
```

## npm Setup

From the repository root:

```bash
npm install
```

This installs dependencies and refreshes the checked-in `power-apps-data.js` copies from the published SDK package.

To serve the repo locally:

```bash
npm start
```

The local server runs from the repo root on port `4173`. Useful sample URLs include:

- `http://localhost:4173/codeApp/dist/`
- `http://localhost:4173/examples/apps/todo/dist/`
- `http://localhost:4173/examples/outlook%20Demo/dist/`

To jump straight to the starter app:

```bash
npm run start:codeapp
```

## PAC CLI Reference

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
pac code add-data-source -a "<connection-name>" -c "<connection-id>"

# Push the app to your Power Platform environment
pac code push --solutionName <YourSolutionName>
```

## codeApp Files

The starter app in `codeApp/` is the reference implementation for repo conventions.

- `codeApp/dist/index.html`: the single-page shell loaded by the Power Apps host.
- `codeApp/dist/index.js`: user-authored app logic and startup orchestration.
- `codeApp/dist/codeapp.js`: shared helper layer for Dataverse and app runtime integration.
- `codeApp/dist/power-apps-data.js`: bundled SDK runtime used by the wrappers.
- `codeApp/dist/connectors/*.js`: stable handwritten wrappers for connector-backed operations.
- `codeApp/src/generated/services/*.ts`: generated service classes for Dataverse and generated connector metadata.
- `codeApp/src/generated/models/*.ts`: generated models used by the service layer.
- `codeApp/power.config.json`: Dataverse table registration plus connection references for managed connectors.

## Configuring power.config.json

### Dataverse Tables

Add Dataverse tables under `databaseReferences.default.cds.dataSources`:

```jsonc
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
      },
      "environmentVariableName": ""
    }
  }
}
```

After adding the table, run `pac code push` to regenerate the corresponding service classes.

### Connection References

Each connector wrapper expects a matching `connectionReferences` entry. The object key can vary by environment, but the `dataSources` value should stay aligned with the wrapper.

```jsonc
{
  "connectionReferences": {
    "office365outlook": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_office365",
      "displayName": "Office 365 Outlook",
      "dataSources": ["office365"],
      "dataSets": {}
    },
    "sharepointonline": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline",
      "displayName": "SharePoint",
      "dataSources": ["sharepointonline"],
      "dataSets": {}
    },
    "office365groups": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_office365groups",
      "displayName": "Office 365 Groups",
      "dataSources": ["office365groups"],
      "dataSets": {}
    },
    "office365users": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_office365users",
      "displayName": "Office 365 Users",
      "dataSources": ["office365users"],
      "dataSets": {}
    },
    "teamsConnection": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_teams",
      "displayName": "Microsoft Teams",
      "dataSources": ["teams"],
      "dataSets": {}
    },
    "jiraConnection": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_jira",
      "displayName": "Jira",
      "dataSources": ["jira"],
      "authenticationType": "APIToken",
      "dataSets": {}
    },
    "keyVaultConnection": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_keyvault",
      "displayName": "Azure Key Vault",
      "dataSources": ["keyvault"],
      "authenticationType": "oauthDefault",
      "dataSets": {}
    },
    "sqlConnection": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_sql",
      "displayName": "SQL Server",
      "dataSources": ["sql"],
      "dataSets": {}
    }
  }
}
```

## Connector Coverage

The handwritten connector wrappers live in `codeApp/dist/connectors/` and are the public API surface for app code in this repo.

| Connector | Wrapper file | Preferred data source | AI skill |
| --- | --- | --- | --- |
| Azure Key Vault | `codeApp/dist/connectors/azureKeyvault.js` | `keyvault` | `AI/skills/keyvault/SKILL.md` |
| Jira | `codeApp/dist/connectors/jira.js` | `jira` | `AI/skills/jira/SKILL.md` |
| Office 365 Groups | `codeApp/dist/connectors/office365groups.js` | `office365groups` | `AI/skills/office365-groups/SKILL.md` |
| Office 365 Users | `codeApp/dist/connectors/office365users.js` | `office365users` | `AI/skills/office365-users/SKILL.md` |
| Office 365 Outlook | `codeApp/dist/connectors/outlook.js` | `office365` | `AI/skills/office365-outlook/SKILL.md` |
| SharePoint | `codeApp/dist/connectors/sharepoint.js` | `sharepointonline` | `AI/skills/sharepoint/SKILL.md` |
| SQL Server | `codeApp/dist/connectors/sql.js` | `sql` | `AI/skills/sql/SKILL.md` |
| Teams | `codeApp/dist/connectors/teams.js` | `teams` | `AI/skills/teams/SKILL.md` |

### Azure Key Vault

Public helpers:

- `callKeyVaultOperation(operationName, parameters)`
- `listKeys(options)`
- `listKeyVersions(keyName)`
- `getKeyMetadata(keyName)`
- `getKeyVersionMetadata(keyName, keyVersion)`
- `encryptData(keyName, input)`
- `encryptDataWithVersion(keyName, keyVersion, input)`
- `decryptData(keyName, input)`
- `decryptDataWithVersion(keyName, keyVersion, input)`
- `getSecret(secretName, apiVersion)`
- `listSecrets(options)`
- `listSecretVersions(secretName, apiVersion)`
- `getSecretMetadata(secretName, apiVersion)`
- `getSecretVersionMetadata(secretName, secretVersion, apiVersion)`
- `getSecretVersion(secretName, secretVersion, apiVersion)`

### Jira

Public helpers:

- `callJiraOperation(operationName, parameters)`
- `addJiraComment(issueKey, body, jiraInstance)`
- `cancelJiraTask(taskId, jiraInstance, token)`
- `createJiraIssueV3(options)`
- `editJiraIssueV2(issueIdOrKey, options)`
- `getCurrentJiraUser({ jiraInstance, expand })`
- `getJiraIssueByKey(issueKey, jiraInstance)`
- `listJiraFilters(jiraInstance)`
- `listJiraIssues({ jiraInstance, jql, fields, expand })`
- `listJiraProjects(options)`
- `getJiraTask(taskId, jiraInstance)`
- `getJiraUser(accountId, options)`
- `editJiraIssue(issueIdOrKey, options)`
- `createJiraIssue(options)`
- `updateJiraIssue(issueKey, options)`
- `listJiraIssueTypes(options)`
- `listJiraIssueTypeFields(options)`
- `createJiraProject(options)`
- `updateJiraProject(projectIdOrKey, options)`
- `deleteJiraProject(projectIdOrKey, options)`
- `listJiraProjectCategories(options)`
- `createJiraProjectCategory(options)`
- `removeJiraProjectCategory(id, options)`
- `listJiraStatuses(options)`
- `listJiraProjectUsers(options)`
- `listJiraAssignableUsers(options)`
- `listJiraPriorityTypes(options)`
- `listJiraResources()`
- `listJiraIssuesDatacenter(options)`
- `listJiraTransitions(issueIdOrKey, options)`
- `transitionJiraIssue(issueIdOrKey, options)`
- `onNewJiraIssue(options)`
- `onClosedJiraIssue(options)`
- `onUpdatedJiraIssue(options)`
- `onNewJiraIssueFromJql(options)`
- `manageJiraIssues(queryRequest, sessionId)`

### Office 365 Groups

Public helpers:

- `callGroupsOperation(operationName, parameters)`
- `openGroupsHttpRequest(options)`
- `listMyGroups(options)`
- `listGroupMembers(groupId, options)`
- `listOwnedGroups(options)`
- `listGroups(options)`
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

### Office 365 Users

Public helpers:

- `callUsersOperation(operationName, parameters)`
- `openUsersHttpRequest(options)`
- `updateMyProfile(profile)`
- `getMyProfile(options)`
- `getUserProfile(userId, options)`
- `getManager(userId, options)`
- `getDirectReports(userId, options)`
- `getMyTrendingDocuments(options)`
- `getRelevantPeople(userId)`
- `updateMyPhoto(bodyOrOptions, contentType)`
- `getUserPhotoMetadata(userId)`
- `getUserPhoto(userId)`
- `getTrendingDocuments(userId, options)`
- `searchForUsers(options)`

### Office 365 Outlook

Public helpers:

- `callOutlookOperation(operationName, parameters)`
- `sendEmail(options)`
- `forwardEmail(messageId, options)`
- `replyToEmail(messageId, options)`
- `listEmails(options)`
- `sendFromSharedMailbox(sharedMailbox, options)`
- `moveEmail(messageId, destinationFolderId, options)`
- `deleteEmail(messageId, options)`
- `createEvent(options)`
- `listEvents(options)`
- `editEvent(eventId, changedFields, calendarId)`
- `deleteEvent(eventId, calendarId, options)`
- `getEmail(messageId, options)`
- `draftEmail(options)`
- `updateDraftEmail(messageId, options)`
- `sendDraftEmail(messageId)`
- `markEmailAsRead(messageId, options)`
- `updateEmailFlag(messageId, options)`
- `getEmailAttachment(messageId, attachmentId, options)`
- `listOutlookCategories()`
- `assignOutlookCategory(messageId, category)`
- `assignOutlookCategoryBulk(messageIds, categoryName)`
- `listCalendars(options)`
- `getEvent(eventId, calendarId, options)`
- `getCalendarView(options)`
- `respondToEventInvite(eventId, response, options)`
- `listRoomLists()`
- `listRooms()`
- `listRoomsInRoomList(roomList)`
- `findMeetingTimes(request)`
- `setAutomaticReplies(settings)`
- `getMailTips(request)`
- `listContactFolders()`
- `listContacts(folderId, options)`
- `getContact(folderId, contactId, options)`
- `createContact(folderId, contact)`
- `updateContact(folderId, contactId, contact)`
- `deleteContact(folderId, contactId, options)`
- `callOutlookHttpRequest(options)`
- `manageOutlookEmails(queryRequest, sessionId)`
- `manageOutlookMeetings(queryRequest, sessionId)`
- `manageOutlookContacts(queryRequest, sessionId)`

### SharePoint

Public helpers:

- `callSharePointOperation(operationName, parameters)`
- `sendHttpRequest(options)`
- `getItems(siteUrl, listId, options)`
- `getSpItem(siteUrl, listId, itemId)`
- `createSpItem(siteUrl, listId, fields)`
- `updateSpItem(siteUrl, listId, itemId, changedFields)`
- `deleteSpItem(siteUrl, listId, itemId)`
- `listTables(siteUrl)`
- `listLibrary(siteUrl)`
- `createFile(siteUrl, libraryName, fileName, fileContent)`
- `updateFile(siteUrl, fileId, fileContent)`
- `deleteFile(siteUrl, fileId)`
- `moveFile(siteUrl, sourceFileId, destinationFolderPath, newFileName)`
- `getFileMetadata(siteUrl, fileId)`

### SQL Server

Public helpers:

- `callSqlOperation(operationName, parameters)`
- `getSqlTables({ server, database })`
- `getSqlRows({ server, database, table, apply, filter, orderBy, skip, top, select })`
- `getSqlRow({ server, database, table, id })`
- `insertSqlRow({ server, database, table, item })`
- `updateSqlRow({ server, database, table, id, item })`
- `deleteSqlRow({ server, database, table, id })`
- `executeSqlQuery({ server, database, query })`
- `executeSqlStoredProcedure({ server, database, procedure, parameters })`

Raw SQL connector actions used by the wrapper:

- `GetTables_V2`
- `GetItems_V2`
- `GetItem_V2`
- `PostItem_V2`
- `PatchItem_V2`
- `DeleteItem_V2`
- `ExecutePassThroughNativeQuery_V2`
- `ExecuteProcedure_V2`

### Teams

Public helpers:

- `callTeamsOperation(operationName, parameters)`
- `sendTeamsGraphHttpRequest(options)`
- `listTeams()`
- `listChannels(teamId)`
- `getTeam(teamId)`
- `getChannelDetails(teamId, channelId)`
- `addMemberToTeam(teamId, body)`
- `addMemberToChannel(teamId, channelId, body)`
- `getUserMentionToken(userId)`
- `getTeamTagMentionToken(teamId, tagId)`
- `listChats({ top, skip })`
- `listMembers(teamId, channelId)`
- `postFeedNotification({ groupId, body })`
- `postCardInChatOrChannel({ poster, location, body })`
- `postMessageInChatOrChannel({ poster, location, body })`

## AI Folder

The `AI/` folder holds the repo's agent customization assets.

### AI/codeapp.agent.md

This file defines the custom `codeapp` agent mode used for Power Apps code-first work in this repo. It captures repo-specific behavior such as:

- preferring direct file creation and edits over advisory-only answers
- reading connector skill files before wiring managed connectors
- keeping durable notes in `agent/decision-log.md`
- steering work toward `dist/`, `power.config.json`, and the repo wrappers instead of ad hoc runtime code

### AI/skills

Each skill folder contains a `SKILL.md` file that gives the agent focused guidance for a connector, runtime pattern, or build workflow.

| Skill folder | Purpose |
| --- | --- |
| `AI/skills/connections` | Shared rules for connector-backed apps, connection references, and wrapper conventions |
| `AI/skills/dataverse` | Dataverse CRUD, table registration, unbound actions, and helper usage |
| `AI/skills/environment-variables` | Reading Dataverse-backed environment variables through the repo helper layer |
| `AI/skills/frontend-design` | UI and visual-direction guidance for distinctive Code App frontends |
| `AI/skills/jira` | Jira helper behavior, instance-aware flows, and raw operation guidance |
| `AI/skills/keyvault` | Azure Key Vault helper usage and secret-handling rules |
| `AI/skills/office365-groups` | Group listing, membership, events, and raw HTTP group calls |
| `AI/skills/office365-outlook` | Mail, calendar, contacts, rooms, mailbox settings, and Outlook MCP helpers |
| `AI/skills/office365-users` | Profiles, managers, reports, photos, search, and raw HTTP user calls |
| `AI/skills/sharepoint` | List CRUD, libraries, files, and SharePoint HTTP request flows |
| `AI/skills/sql` | SQL Server table, row, query, and stored procedure helper guidance |
| `AI/skills/start` | Startup skill entry used during guided app bootstrapping workflows |
| `AI/skills/teams` | Teams, channels, chats, mentions, notifications, and Teams HTTP calls |

In practice, the connector skill files should be treated as the documentation companion to the wrapper files in `codeApp/dist/connectors/`.
