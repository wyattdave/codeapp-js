# Outlook Inbox Demo

Demo to show how to use the Office 365 Outlook connector to list inbox emails.

---

## Prerequisites

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

## 3. Add the Outlook Skill File to VS Code

This repo includes a skill file that gives Copilot the knowledge to build Outlook code apps:

1. Copy the `Skills/outlookCodeApp/SKILL.md` file to your VS Code Copilot skills directory:
   ```
   ~/.copilot/skills/outlookCodeApp/SKILL.md
   ```

Once in place, Copilot will automatically use this skill when you ask it to build the code app.

---

## 4. Setup

Copy the contents of `dist copy` into a `dist` folder, then copy the `index.html` and `index.js` from this examples folder into `dist`, replacing the defaults.

---

## 5. Deploy the App

Update the power.config.json file with the target environment's id (it should be the same environment you have used in CLI auth).

```bash
pac code push --solutionName OutlookInbox
```

This packages the build output from `./dist` and deploys it as a code component inside the specified solution.
