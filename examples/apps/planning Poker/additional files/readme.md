# Planning Poker — Power Apps Code-First App

An agile planning poker app for sprint estimation sessions with team collaboration, built as a Power Apps code-first app with Dataverse backend.

---

## Prerequisites

- A Power Platform environment with Dataverse enabled
- A Power Platform environment with Code Apps enabled
- VS Code
- Recommend Copilot

---

## 1. Install Power Platform CLI

Install the PAC CLI via npm:

```bash
npm install -g microsoft.powerapps.cli
```

Or install through the [Power Platform Tools VS Code extension](https://marketplace.visualstudio.com/items?itemName=microsoft-IsvExpTools.powerplatform-vscode).

Verify the install:

```bash
pac --version
```

---

## 2. Authenticate and Select Environment

Create an auth profile and connect to your environment:

```bash
# Authenticate (opens browser for interactive login)
pac auth create --environment https://<yourorg>.crm.dynamics.com

# List auth profiles
pac auth list

# Select an existing profile (if you have multiple)
pac auth select --index <profile-index>

# Confirm you are connected to the correct environment
pac env who
```

Replace `<yourorg>` with your Dataverse org name.

---

## 3. Add the Dataverse Skill Files to VS Code

This repo includes two skill files that give Copilot the knowledge to set up Dataverse solutions and build code-first apps:

1. Copy the `Skills/dataverseSolutionSetup/SKILL.md` file to your VS Code Copilot skills directory:
   ```
   ~/.copilot/skills/dataverseSolutionSetup/SKILL.md
   ```
2. Copy the `Skills/dataverseCodeApp/SKILL.md` file to:
   ```
   ~/.copilot/skills/dataverseCodeApp/SKILL.md
   ```

Once in place, Copilot will automatically use these skills when you ask it to create Dataverse solutions, tables, or code-first app connections.

---

## 4. Create Publisher, Solution, and Tables with Copilot

Use the following prompt in VS Code Copilot chat to scaffold the Dataverse backend. Reference the `dataverse-tables.json` file so Copilot knows exactly which tables, columns, and relationships to create:

> **Prompt:**
> Using the dataverseSolutionSetup skill and the `dataverse-tables.json` file in this folder, create a new Dataverse publisher with prefix `wd`, a solution called `PlanningPoker`, and all the tables, columns, and lookup relationships defined in `dataverse-tables.json`. Provide the full PAC CLI and Web API PowerShell commands to run.

Copilot will generate the step-by-step PowerShell commands to:

- Create the publisher and solution
- Create the four tables: **Poker Session**, **Poker Participant**, **Poker Round**, **Poker Vote**
- Create all columns and lookup relationships
- Add components to the solution and publish

---

## 5. Deploy the App

Update the power.config.json file with the target environments id (it should be the same environment you have used in cli auth)
Once the Dataverse tables are created and your app code is ready, push the app to your environment:

```bash
pac code push --solutionName PlanningPoker
```

This packages the build output from `./dist` and deploys it as a code component inside the specified solution.

---

## Dataverse Schema Overview

The app uses four custom tables (prefix `wd_`):

| Table | Description |
|---|---|
| **Poker Session** | A planning session that participants join via a session code |
| **Poker Participant** | A person who has joined a session |
| **Poker Round** | A single estimation item within a session |
| **Poker Vote** | A participant's vote on a round |

**Relationships:**

```
wd_pokersession  1───N  wd_pokerparticipant  (via wd_session lookup)
wd_pokersession  1───N  wd_pokerround        (via wd_session lookup)
wd_pokerround    1───N  wd_pokervote          (via wd_round lookup)
wd_pokerparticipant 1───N  wd_pokervote      (via wd_participant lookup)
```

See `dataverse-tables.json` for the full column and relationship definitions.
