---
name: office365-groups
description: "Use when: building or debugging Office 365 Groups connector flows in a Power Apps Code App, including group listing, membership, events, or openGroupsHttpRequest."
---

# Office 365 Groups Connector Guide

> Agent limitation: do not use CLI commands directly from chat for Office 365 Groups setup. Use the built-in Sync Connections and Deploy buttons instead.

## Core Rule

The wrapper in `dev files/office365groups.js` is the repo-local source of truth.

- It retries both `office365groups` and `Office365Groups`.
- It keeps the public helper surface stable even though the raw connector operations are runtime-resolved.
- Do not replace it with made-up placeholder paths copied from generic examples.

## power.config.json

Prefer a connection reference whose `dataSources` array includes `office365groups`.

Older apps may still use `Office365Groups`; the wrapper retries both.

## Public Helper Surface

The wrapper exports:

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

## Important Wrapper Behavior

- `listMyGroups({ version: 1|2|3 })` switches between `ListOwnedGroups`, `ListOwnedGroups_V2`, and `ListOwnedGroups_V3`.
- `listGroups(...)` supports `$filter`, `$top`, `skipToken`, `nextLink`, and compatibility aliases like `skip`.
- Event helpers accept flexible options objects and normalize event payloads for the connector.
- `openGroupsHttpRequest(...)` maps friendly inputs to connector fields like `Uri`, `Method`, `Body`, `ContentType`, and `CustomHeader1..5`.
- `openGroupsHttpRequest(...)` can target `HttpRequest` or `HttpRequestV2` with `version` or `useV2`.

## Raw Calls

Use `callGroupsOperation(operationName, parameters)` only when a high-level helper does not exist.

Do not bypass the wrapper with direct Graph calls for operations already covered by the connector.

## Debugging

- If the failure is `Connection reference not found`, confirm the app exposes either `office365groups` or `Office365Groups` in `power.config.json`.
- If an HTTP request fails, verify the wrapper is sending connector-style fields rather than raw fetch-style headers.