---
name: office365-users
description: "Use when: building or debugging Office 365 Users connector flows in a Power Apps Code App, including profiles, managers, direct reports, photos, searchForUsers, or openUsersHttpRequest."
---

# Office 365 Users Connector Guide

> Agent limitation: do not use CLI commands directly from chat for Office 365 Users setup. Use the built-in Sync Connections and Deploy buttons instead.

## Core Rule

The wrapper in `dev files/office365users.js` is the repo-local source of truth.

- It uses `office365users` as the connector data-source name.
- It includes inline metadata for the supported operations.
- It preserves older naming compatibility, but the main search operation used by the wrapper is `SearchUserV2`.

## power.config.json

Expose `office365users` in the connection reference `dataSources` array.

```json
{
  "connectionReferences": {
    "usersConnection": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_office365users",
      "displayName": "Office 365 Users",
      "dataSources": ["office365users"],
      "dataSets": {}
    }
  }
}
```

## Public Helper Surface

The wrapper exports:

- `getMyProfile(options)`
- `getUserProfile(userId, options)`
- `getManager(userId, options)`
- `getDirectReports(userId, options)`
- `getMyTrendingDocuments(options)`
- `getTrendingDocuments(userId, options)`
- `getRelevantPeople(userId)`
- `updateMyProfile(profile)`
- `updateMyPhoto(bodyOrOptions, contentType)`
- `getUserPhotoMetadata(userId)`
- `getUserPhoto(userId)`
- `searchForUsers(options)`
- `openUsersHttpRequest(options)`
- `callUsersOperation(operationName, parameters)`

## Important Wrapper Behavior

- `select` can be an array or a comma-separated string.
- `getDirectReports(...)` supports `top` and select options.
- `searchForUsers(...)` uses `searchTerm`, `top`, `isSearchTermRequired`, and `skipToken`.
- `searchForUsers(...)` accepts `nextLink` and legacy `skip` as compatibility inputs that the wrapper converts into `skipToken`.
- `UserPhoto_V2` returns `image/jpeg`.

## Raw HTTP Calls

`openUsersHttpRequest(...)` does not use the simple `headers` object shape directly.

The wrapper maps friendly inputs into connector fields:

- `Uri`
- `Method`
- `Body`
- `ContentType`
- `CustomHeader1..5`

## Debugging

- If search pagination is broken, verify the code is passing `skipToken` or `nextLink`, not `$skip`.
- If HTTP requests fail, check whether the wrapper is being fed connector-style fields through `openUsersHttpRequest(...)` rather than raw fetch options.
- Keep the existing helper names stable and widen input support instead of replacing them.