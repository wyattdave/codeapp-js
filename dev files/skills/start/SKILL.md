---
name: start
description: "Use when: starting a new app build or new UI build in this repo so visual direction and mockup choices are settled before implementation."
---

# Start Guide

This skill applies when the project is new and there is no prior decision log to follow.

## Folder Setup

The working app folder should already contain `power.config.json` and the normal app source structure for this repo.

If it does not, use the repo's standard code app scaffolding flow before starting the build rather than inventing files by hand.

## Style and Color Direction

Before building any creative UI:

1. Check whether the user already gave style, theme, or colour direction.
2. If not, ask for it. If the user wants you to decide, choose a bold direction and move forward.
3. Record the chosen direction in `agent/decision-log.md` under custom requirements.

Never start the creative build without a style direction from either the user or the agent.

## Mockup Offer

After style direction is settled:

1. Check whether mockup files already exist under `agent/`.
2. If not, ask whether the user wants five distinct mockups.
3. If yes, create five real HTML mockups in `agent/` and stop for selection.
4. If no, continue straight to implementation.

Each mockup must be a self-contained HTML file with real visual behavior, not a placeholder.

## Interactive Sessions

- Use interactive questions when the runtime supports them.
- Continue in the same session after the user answers required setup questions.
- Do not ask optional follow-ups before the first concrete implementation unless the task is blocked.

## When To Skip

- Skip this skill for bug fixes, refactors, deploy tasks, or other non-creative work.
- Skip the mockup offer when mockups already exist.