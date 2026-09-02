---
name: start
aliases: new-codeapp-requirements
description: Start skill for new Code App project setup. Use this skill when starting a fresh app build or when the `root` div in index.html is empty. Owns theme/colour confirmation, the mockup offer, mockup creation, and mockup-to-production implementation.
---

# Start: New Code App Project Setup

Applies only when the project is a Code App and new (the decision log has no prior decisions). Gather style and colour direction, offer mockups, then implement.

## When to Skip

- The request is not a creative build (bug fix, add feature, deploy, refactor).
- The prompt already contains style guidance **and** the user explicitly declines mockups: build directly.
- Mockups already exist in `agent/`: skip the mockup offer only.

## Folder Setup

The current folder should contain `power.config.json` and a `dist/` folder. If not, run the `cap newApp` command with a given name or one you create.

If the `power.config.json` does not have all of the keys below, add them with empty values. The agent will fill them in during the setup process. 

```json
{
  "appDisplayName": "",
  "description": "",
  "environmentId": "<ENVIRONMENT_ID>",
  "buildPath": "./dist",
  "buildEntryPoint": "index.html",
  "logoPath": "./dist/icon-512.png",
  "localAppUrl": "http://localhost:3000",
  "region": "prod",
  "connectionReferences": {},
  "databaseReferences": {}
}
```

## Interactive Sessions

- When interactive user input is available, ask through the interactive question flow and continue in the same session after the user answers.
- Only stop and wait for a later run when interactive input is not available.
- After required setup questions are answered, continue with planning and implementation immediately. Do not ask optional open-ended follow-ups before producing the first concrete implementation unless still blocked.
- If the user asks how to view a mockup, point them to the generated files in `agent/`. Do not ask them to choose a framework; the project structure dictates the stack.

## TODO Checklist

If a TODO checklist exists in `dist/config/decision-log.md`, it must list these setup steps before any build tasks: theme/colour confirmation, mockup offer, optional mockup creation, then implementation.

## Style and Colour Direction

The agent must have colour and style direction before building any creative UI. Either the user provides it or you decide it.

1. Check if the user's message already includes colour, theme, or style direction.
2. If not, ask: _"What colours or overall theme do you want for this site or app? If you do not want to choose, tell me to proceed and I will decide the visual direction myself."_
3. If the user says to decide yourself, choose a bold and distinctive visual direction. Do **not** ask again.
4. Record the chosen direction in `dist/config/decision-log.md` under **Custom Requirements**.
5. Use the frontend-design skill for all UI work, including mockups.

## Mockup Offer

After style direction is established:

1. If no mockups exist in `agent/`, ask: _"Do you want me to create 5 creative and unique mockups in agent/ for you to pick from? Reply yes or no."_
2. If no, proceed directly to building in the same session.
3. If yes, create the mockups (below), then stop so the user can pick one.

## Mockup Creation

- Create 5 **CREATIVE** and **DISTINCT** options named `agent/mockup-1.html` through `agent/mockup-5.html`, using the frontend-design skill.
- Each mockup is a standalone, one-page HTML file that opens directly in a browser, shows the visual design, and includes lightweight interaction (search filtering, panel toggles, compose drawer open/close). It is a visual prototype, not a functional app. Include a lightweight navigation pill to navigate between mockups.
- Write files sequentially: fully complete `mockup-1.html` before starting `mockup-2.html`. Do not design all options first and write files at the end.
- Break large files across multiple tool calls (`createFile` for a skeleton, then `appendFile` for sections) to avoid truncation.
- Never say a mockup is ready unless the file actually exists in `agent/`.

## Implementing From a Selected Mockup

1. Read the chosen mockup.
2. Treat it as the primary implementation baseline.
3. Copy its structure, HTML, CSS, and JavaScript into the production files where possible (all application HTML inside `#root`, startup logic in the boot function).
4. Replace placeholder content with real integrations.
5. Record the chosen mockup in `dist/config/decision-log.md`.
