# Power Apps Code-First App

Demo to show how to use Office 365 User connector

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

1. Copy the `Skills/office365UsersCodeApp/SKILL.md` file to your VS Code Copilot skills directory:
   ```
   ~/.copilot/skills/office365UsersCodeApp/SKILL.md
   ```


Once in place, Copilot will automatically use these skills when you ask it to build the code app

---

## 4. Deploy the App

Update the power.config.json file with the target environments id (it should be the same environment you have used in cli auth)
Once your app code is ready, push the app to your environment:

```bash
pac code push --solutionName MyProfile
```

This packages the build output from `./dist` and deploys it as a code component inside the specified solution.
