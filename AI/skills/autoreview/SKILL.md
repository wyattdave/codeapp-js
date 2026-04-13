---
name: autoreview
description: "Use when: reviewing Power Automate flows with the AutoReview connector, including metadata, JSON review output, file-based review output, diagrams, or the raw AutoReview HTTP endpoint."
---

# AutoReview Connector Guide

Use `codeApp/dist/connectors/autoreview.js` as the repo source of truth.

Do not use CLI setup flows from chat. Use the built-in Auth, Sync Connections, and Deploy buttons.

## Core Rule

Prefer the latest exported actions and avoid older superseded variants.

## Action Surface

- `GET_info()`
- `POST_http(path, body)`
- `POST_json(flowProperties, configs)`
- `POST_file_V2(flowProperties, configs)`
- `POST_diagram(flowProperties, configs)`

## When To Use Each Action

- `GET_info()` returns connector metadata, version details, and service information.
- `POST_http(...)` is the raw escape hatch for AutoReview endpoints.
- `POST_json(...)` returns structured JSON review output for a flow.
- `POST_file_V2(...)` returns generated review/report files using the newer file action.
- `POST_diagram(...)` returns a rendered flow diagram artifact.

## Practical Guidance

- Prefer `POST_json(...)` when the app needs machine-readable review output.
- Prefer `POST_file_V2(...)` instead of the older file action.
- Use `POST_diagram(...)` when the user explicitly wants a visual flow representation.
- Only fall back to `POST_http(...)` when there is no dedicated action for the output you need.

## Debugging

- If review output looks incomplete, confirm the flow properties payload includes the definition, owner, environment, and flow ID fields the connector expects.
- If you need a file artifact, use `POST_file_V2(...)`, not the legacy file action.
- Treat `POST_http(...)` as an escape hatch, not the default integration path.