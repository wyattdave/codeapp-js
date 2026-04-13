---
name: office365-outlook
description: "Use when: building or debugging Outlook connector flows in a Power Apps Code App, including mail, calendar, contacts, rooms, mailbox settings, or the repo Outlook helpers."
---

# Office 365 Outlook Connector Guide

Use `codeApp/dist/connectors/office365outlook.js` as the repo source of truth.

Do not use CLI setup flows from chat. Use the built-in Auth, Sync Connections, and Deploy buttons.

## Core Rule

Prefer the exported helper layer instead of hard-coding raw operation names in app code.

The helper layer defaults to the latest action versions where the connector exposes them.

## Action Helper Surface

- Mail: `sendEmail`, `listEmails`, `getEmail`, `forwardEmail`, `replyToEmail`, `moveEmail`, `deleteEmail`, `draftEmail`, `updateDraftEmail`, `sendDraftEmail`, `markEmailAsRead`, `updateEmailFlag`, `getEmailAttachment`
- Categories: `listOutlookCategories`, `assignOutlookCategory`, `assignOutlookCategoryBulk`
- Shared mailbox: `sendFromSharedMailbox`
- Calendar: `createEvent`, `listEvents`, `editEvent`, `deleteEvent`, `listCalendars`, `getEvent`, `getCalendarView`, `respondToEventInvite`, `findMeetingTimes`, `setAutomaticReplies`, `getMailTips`, `listRoomLists`, `listRooms`, `listRoomsInRoomList`
- Contacts: `listContactFolders`, `listContacts`, `getContact`, `createContact`, `updateContact`, `deleteContact`
- Advanced: `callOutlookOperation`, `callOutlookHttpRequest`, `manageOutlookEmails`, `manageOutlookMeetings`, `manageOutlookContacts`

## Latest Action Defaults

- `sendEmail(...)` defaults to `SendEmailV2` and only falls back to plain-text `SendEmail` when `isHtml === false`.
- `listEmails(...)` defaults to `GetEmailsV3`, folder `Inbox`, and `top: 10`.
- `getEmail(...)` defaults to `GetEmailV2`.
- `replyToEmail(...)` defaults to `ReplyToV3` and only falls back to `ReplyToV2` for plain-text replies.
- `moveEmail(...)` uses `MoveV2`.
- `createEvent(...)`, `listEvents(...)`, and `editEvent(...)` use the V4 calendar actions.
- `deleteEvent(...)` uses `CalendarDeleteItem_V2`.
- `findMeetingTimes(...)` uses `FindMeetingTimes_V2`.
- `setAutomaticReplies(...)` defaults to `SetAutomaticRepliesSetting_V2`.
- `getMailTips(...)` defaults to `GetMailTips_V2` when a request body is supplied.
- Contact helpers use the V2 contact actions.

## HTTP Escape Hatch

`callOutlookHttpRequest(...)` maps friendly inputs to connector fields:

- `uri` -> `Uri`
- `method` -> `Method`
- `body` -> `Body`
- `contentType` -> `ContentType`
- `customHeaders[0..4]` -> `CustomHeader1..5`

Use this only when no helper exists for the action you need.

## Debugging

- If a mail helper behaves differently than expected, check its default version before changing the raw connector action.
- If HTTP calls fail, verify you are passing connector-style fields through `callOutlookHttpRequest(...)`, not fetch-style options.
- Keep helper names stable and widen alias support instead of introducing another parallel wrapper.