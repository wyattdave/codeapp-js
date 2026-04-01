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
