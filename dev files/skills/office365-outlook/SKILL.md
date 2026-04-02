---
name: office365-outlook
description: "Use when: building or debugging Outlook connector flows in a Power Apps Code App, including mail, calendar, contacts, rooms, mailbox settings, or the repo Outlook helpers."
---

# Office 365 Outlook Connector Guide

> Agent limitation: do not use CLI commands directly from chat for Outlook setup. Use the built-in Sync Connections and Deploy buttons instead.

## Core Rule

The wrapper in `dev files/outlook.js` is the repo-local source of truth, and `dev files/outlook-helper-reference.md` documents its accepted aliases.

- It retries `office365outlook`, `Office365Outlook`, and `office365`.
- It includes inline metadata for the operations the wrapper exposes.
- Many helpers choose the operation version automatically.

Prefer `office365` in `power.config.json`, while keeping the wrapper's candidate names intact.

## Public Helper Surface

The wrapper exports helpers for:

- Mail: `sendEmail`, `listEmails`, `getEmail`, `forwardEmail`, `replyToEmail`, `moveEmail`, `deleteEmail`, `draftEmail`, `updateDraftEmail`, `sendDraftEmail`, `markEmailAsRead`, `updateEmailFlag`, `getEmailAttachment`, `assignOutlookCategory`, `assignOutlookCategoryBulk`
- Shared mailbox: `sendFromSharedMailbox`
- Calendar: `createEvent`, `listEvents`, `editEvent`, `deleteEvent`, `listCalendars`, `getEvent`, `getCalendarView`, `respondToEventInvite`, `findMeetingTimes`, `listRoomLists`, `listRooms`, `listRoomsInRoomList`, `setAutomaticReplies`, `getMailTips`
- Contacts: `listContactFolders`, `listContacts`, `getContact`, `createContact`, `updateContact`, `deleteContact`
- Advanced: `callOutlookOperation`, `callOutlookHttpRequest`, `manageOutlookEmails`, `manageOutlookMeetings`, `manageOutlookContacts`

## Important Wrapper Defaults

- `sendEmail(...)` uses `SendEmailV2` unless `isHtml === false`, in which case it uses the legacy plain-text action.
- `listEmails(...)` defaults to version 3, folder `Inbox`, and `top: 10`.
- `replyToEmail(...)` uses `ReplyToV3` unless `isHtml === false`.
- `getEmail(...)` defaults to the V2 action.
- `createEvent(...)`, `listEvents(...)`, and `editEvent(...)` use the V4 calendar actions.
- `markEmailAsRead(...)` uses the V3 action unless the caller explicitly requests the older legacy pattern.

## Raw HTTP Calls

`callOutlookHttpRequest(...)` expects the connector-style field mapping used by the wrapper.

- Pass `uri`, `method`, `body`, `contentType`, and `customHeaders`.
- The wrapper maps them to `Uri`, `Method`, `Body`, `ContentType`, and `CustomHeader1..5`.

Do not reuse the SharePoint or Teams raw HTTP pattern here.

## Debugging

- If the failure mentions `Connection reference not found`, verify `power.config.json` exposes one of the wrapper's candidate data-source names.
- If a versioned mail or calendar call behaves unexpectedly, check the wrapper default before changing the raw operation name.
- For alias-heavy helpers, consult `dev files/outlook-helper-reference.md` before adding new parameter mapping logic.