---
name: office365-groups
description: "Use when: building or debugging Office 365 Groups connector flows in a Power Apps Code App, including group listing, membership, events, or openGroupsHttpRequest."
---

# Office 365 Groups Connector Guide

Use `codeApp/dist/connectors/office365groups.js` as the repo source of truth.

Do not use CLI setup flows from chat. Use the built-in Auth, Sync Connections, and Deploy buttons.

## Core Rule

Prefer the exported helper layer instead of wiring raw connector operations directly in app code.

## Action Helper Surface

- `callGroupsOperation(operationName, parameters)`
- `openGroupsHttpRequest(options)`
- `listMyGroups(options)`
- `listOwnedGroups(options)`
- `listGroups(options)`
- `listGroupMembers(groupId, options)`
- `addMemberToGroup(userUpn, groupId)`
- `removeMemberFromGroup(userUpn, groupId)`
- `createGroupEvent(groupId, options)`
- `updateGroupEvent(eventId, options, groupId)`
- `deleteGroupEvent(eventId, groupId)`
- `listDeletedGroups()`
- `restoreDeletedGroup(groupId)`
- `listDeletedGroupsByOwner(userId)`

## Latest Action Defaults

- `listMyGroups({ version: 1|2|3 })` routes to `ListOwnedGroups`, `ListOwnedGroups_V2`, or `ListOwnedGroups_V3`.
- `listGroups(...)` supports `$filter`, `$top`, `skipToken`, `nextLink`, and `skip` aliases.
- `createGroupEvent(...)` defaults to `CreateCalendarEventV2`.
- `deleteGroupEvent(...)` uses `CalendarDeleteItem_V2`.
- `openGroupsHttpRequest(...)` can target `HttpRequest` or `HttpRequestV2` through `version`, `useV2`, or `operationName`.

## HTTP Escape Hatch

`openGroupsHttpRequest(...)` maps friendly inputs to connector fields:

- `uri` -> `Uri`
- `method` -> `Method`
- `body` -> `Body`
- `contentType` -> `ContentType`
- `customHeaders[0..4]` -> `CustomHeader1..5`

Use this only when no helper exists for the action you need.

## Debugging

- Keep helper names stable and widen alias support instead of adding another parallel wrapper.
- If group pagination fails, pass `skipToken` or `nextLink`, not a raw `$skip` query.
- If HTTP requests fail, verify you are sending connector-style fields through `openGroupsHttpRequest(...)`.