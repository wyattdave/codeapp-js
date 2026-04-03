// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────── Outlook365 ──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────
import {_dbgWrap  } from "./codeapp.js";
import { getClient} from "./power-apps-data.js";
// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_CANDIDATES = ["office365outlook", "Office365Outlook", "office365"];
const OUTLOOK_APIS = {
  // ── Email operations ──
  GetEmailsV3: {
    path: "/{connectionId}/v3/Mail",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "folderPath", in: "query", required: false },
      { name: "to", in: "query", required: false },
      { name: "cc", in: "query", required: false },
      { name: "toOrCc", in: "query", required: false },
      { name: "from", in: "query", required: false },
      { name: "importance", in: "query", required: false },
      { name: "fetchOnlyWithAttachment", in: "query", required: false },
      { name: "subjectFilter", in: "query", required: false },
      { name: "fetchOnlyUnread", in: "query", required: false },
      { name: "fetchOnlyFlagged", in: "query", required: false },
      { name: "mailboxAddress", in: "query", required: false },
      { name: "includeAttachments", in: "query", required: false },
      { name: "searchQuery", in: "query", required: false },
      { name: "top", in: "query", required: false },
    ],
  },
  SendEmailV2: {
    path: "/{connectionId}/v2/Mail",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "emailMessage", in: "body", required: true },
    ],
  },
  ForwardEmail: {
    path: "/{connectionId}/codeless/api/v2.0/me/messages/{message_id}/forward",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "message_id", in: "path", required: true },
      { name: "body", in: "body", required: true },
    ],
  },
  ReplyToV3: {
    path: "/{connectionId}/v3/Mail/ReplyTo/{messageId}",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "messageId", in: "path", required: true },
      { name: "replyParameters", in: "body", required: true },
      { name: "mailboxAddress", in: "query", required: false },
    ],
  },
  MoveV2: {
    path: "/{connectionId}/v2/Mail/Move/{messageId}",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "messageId", in: "path", required: true },
      { name: "folderPath", in: "query", required: true },
      { name: "mailboxAddress", in: "query", required: false },
    ],
  },
  DeleteEmail: {
    path: "/{connectionId}/Mail/{messageId}",
    method: "DELETE",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "messageId", in: "path", required: true },
    ],
  },
  SharedMailboxSendEmailV2: {
    path: "/{connectionId}/v2/SharedMailbox/Mail",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "emailMessage", in: "body", required: true },
    ],
  },
  // ── Calendar operations ──
  V4CalendarGetItems: {
    path: "/{connectionId}/datasets/calendars/v4/tables/{table}/items",
    method: "GET",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "table", in: "path", required: true },
      { name: "$filter", in: "query", required: false },
      { name: "$orderby", in: "query", required: false },
      { name: "$top", in: "query", required: false },
      { name: "$skip", in: "query", required: false },
    ],
  },
  V4CalendarPostItem: {
    path: "/{connectionId}/datasets/calendars/v4/tables/{table}/items",
    method: "POST",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "table", in: "path", required: true },
      { name: "item", in: "body", required: true },
    ],
  },
  V4CalendarPatchItem: {
    path: "/{connectionId}/datasets/calendars/v4/tables/{table}/items/{id}",
    method: "PATCH",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "table", in: "path", required: true },
      { name: "id", in: "path", required: true },
      { name: "item", in: "body", required: true },
    ],
  },
  CalendarDeleteItem: {
    path: "/{connectionId}/datasets/calendars/tables/{table}/items/{id}",
    method: "DELETE",
    parameters: [
      { name: "connectionId", in: "path", required: true },
      { name: "table", in: "path", required: true },
      { name: "id", in: "path", required: true },
    ],
  },
};

Object.assign(OUTLOOK_APIS, JSON.parse(String.raw`{
  "GetEmailsV2": {
    "path": "/{connectionId}/v2/Mail",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folderPath", "in": "query", "required": false, "type": "string" },
      { "name": "to", "in": "query", "required": false, "type": "string" },
      { "name": "cc", "in": "query", "required": false, "type": "string" },
      { "name": "toOrCc", "in": "query", "required": false, "type": "string" },
      { "name": "from", "in": "query", "required": false, "type": "string" },
      { "name": "importance", "in": "query", "required": false, "type": "string" },
      { "name": "fetchOnlyWithAttachment", "in": "query", "required": false, "type": "boolean" },
      { "name": "subjectFilter", "in": "query", "required": false, "type": "string" },
      { "name": "fetchOnlyUnread", "in": "query", "required": false, "type": "boolean" },
      { "name": "fetchOnlyFlagged", "in": "query", "required": false, "type": "boolean" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "includeAttachments", "in": "query", "required": false, "type": "boolean" },
      { "name": "searchQuery", "in": "query", "required": false, "type": "string" },
      { "name": "top", "in": "query", "required": false, "type": "integer" }
    ]
  },
  "GetEmail": {
    "path": "/{connectionId}/Mail/{messageId}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "includeAttachments", "in": "query", "required": false, "type": "boolean" },
      { "name": "internetMessageId", "in": "query", "required": false, "type": "string" }
    ]
  },
  "GetEmailV2": {
    "path": "/{connectionId}/v2/Mail/{messageId}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "includeAttachments", "in": "query", "required": false, "type": "boolean" },
      { "name": "internetMessageId", "in": "query", "required": false, "type": "string" },
      { "name": "extractSensitivityLabel", "in": "query", "required": false, "type": "boolean" },
      { "name": "fetchSensitivityLabelMetadata", "in": "query", "required": false, "type": "boolean" }
    ]
  },
  "SendEmail": {
    "path": "/{connectionId}/Mail",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "emailMessage", "in": "body", "required": true, "type": "object" }
    ]
  },
  "DraftEmail": {
    "path": "/{connectionId}/Draft",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "draftMessage", "in": "body", "required": true, "type": "object" },
      { "name": "messageId", "in": "query", "required": false, "type": "string" },
      { "name": "draftType", "in": "query", "required": false, "type": "string" },
      { "name": "comment", "in": "query", "required": false, "type": "string" }
    ]
  },
  "UpdateDraftEmail": {
    "path": "/{connectionId}/Draft",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "draftMessage", "in": "body", "required": true, "type": "object" },
      { "name": "messageId", "in": "query", "required": true, "type": "string" }
    ]
  },
  "SendDraftEmail": {
    "path": "/{connectionId}/Draft/Send/{messageId}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "DeleteEmail_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/messages/{messageId}",
    "method": "DELETE",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" }
    ]
  },
  "ForwardEmail_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/messages/{message_id}/forward",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "message_id", "in": "path", "required": true, "type": "string" },
      { "name": "body", "in": "body", "required": true, "type": "object" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" }
    ]
  },
  "ReplyToV2": {
    "path": "/{connectionId}/v2/Mail/ReplyTo/{messageId}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "replyParameters", "in": "body", "required": true, "type": "object" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" }
    ]
  },
  "Flag": {
    "path": "/{connectionId}/Mail/Flag/{messageId}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "Flag_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/messages/{messageId}/flag",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "body", "in": "body", "required": false, "type": "object" }
    ]
  },
  "MarkAsRead": {
    "path": "/{connectionId}/Mail/MarkAsRead/{messageId}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "MarkAsRead_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/messages/{messageId}/markAsRead",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "body", "in": "body", "required": false, "type": "object" }
    ]
  },
  "MarkAsRead_V3": {
    "path": "/{connectionId}/codeless/v3/v1.0/me/messages/{messageId}/markAsRead",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "body", "in": "body", "required": false, "type": "object" }
    ]
  },
  "GetAttachment": {
    "path": "/{connectionId}/Mail/{messageId}/Attachments/{attachmentId}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "attachmentId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetAttachment_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/messages/{messageId}/attachments/{attachmentId}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "path", "required": true, "type": "string" },
      { "name": "attachmentId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": false, "type": "string" },
      { "name": "extractSensitivityLabel", "in": "query", "required": false, "type": "boolean" },
      { "name": "fetchSensitivityLabelMetadata", "in": "query", "required": false, "type": "boolean" }
    ]
  },
  "AssignCategory": {
    "path": "/{connectionId}/Mail/Category",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageId", "in": "query", "required": true, "type": "string" },
      { "name": "category", "in": "query", "required": true, "type": "string" }
    ]
  },
  "AssignCategoryBulk": {
    "path": "/{connectionId}/Mail/Category/Bulk/{categoryName}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "messageIds", "in": "body", "required": true, "type": "object" },
      { "name": "categoryName", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetOutlookCategoryNames": {
    "path": "/{connectionId}/Categories",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "SharedMailboxSendEmail": {
    "path": "/{connectionId}/SharedMailbox/Mail",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "emailMessage", "in": "body", "required": true, "type": "object" }
    ]
  },
  "V3CalendarGetItem": {
    "path": "/{connectionId}/datasets/calendars/v3/tables/{table}/items/{id}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "table", "in": "path", "required": true, "type": "string" },
      { "name": "id", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetEventsCalendarViewV3": {
    "path": "/{connectionId}/datasets/calendars/v3/tables/items/calendarview",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "calendarId", "in": "query", "required": true, "type": "string" },
      { "name": "startDateTimeUtc", "in": "query", "required": true, "type": "string" },
      { "name": "endDateTimeUtc", "in": "query", "required": true, "type": "string" },
      { "name": "$filter", "in": "query", "required": false, "type": "string" },
      { "name": "$orderby", "in": "query", "required": false, "type": "string" },
      { "name": "$top", "in": "query", "required": false, "type": "integer" },
      { "name": "$skip", "in": "query", "required": false, "type": "integer" },
      { "name": "search", "in": "query", "required": false, "type": "string" }
    ]
  },
  "RespondToEvent_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/events/{event_id}/{response}",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "event_id", "in": "path", "required": true, "type": "string" },
      { "name": "response", "in": "path", "required": true, "type": "string" },
      { "name": "body", "in": "body", "required": false, "type": "object" }
    ]
  },
  "CalendarGetTables_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/calendars",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "skip", "in": "query", "required": false, "type": "integer" },
      { "name": "top", "in": "query", "required": false, "type": "integer" },
      { "name": "orderBy", "in": "query", "required": false, "type": "string" }
    ]
  },
  "ContactGetTablesV2": {
    "path": "/{connectionId}/v2/datasets/contacts/tables",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "ContactGetItems_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folder", "in": "path", "required": true, "type": "string" },
      { "name": "$filter", "in": "query", "required": false, "type": "string" },
      { "name": "$orderby", "in": "query", "required": false, "type": "string" },
      { "name": "$top", "in": "query", "required": false, "type": "integer" },
      { "name": "$skip", "in": "query", "required": false, "type": "integer" }
    ]
  },
  "ContactGetItem_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts/{id}",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folder", "in": "path", "required": true, "type": "string" },
      { "name": "id", "in": "path", "required": true, "type": "string" }
    ]
  },
  "ContactPostItem_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folder", "in": "path", "required": true, "type": "string" },
      { "name": "item", "in": "body", "required": true, "type": "object" }
    ]
  },
  "ContactPatchItem_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts/{id}",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folder", "in": "path", "required": true, "type": "string" },
      { "name": "id", "in": "path", "required": true, "type": "string" },
      { "name": "item", "in": "body", "required": true, "type": "object" }
    ]
  },
  "ContactDeleteItem_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts/{id}",
    "method": "DELETE",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "folder", "in": "path", "required": true, "type": "string" },
      { "name": "id", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetRoomLists_V2": {
    "path": "/{connectionId}/codeless/beta/me/findRoomLists",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetRooms_V2": {
    "path": "/{connectionId}/codeless/beta/me/findRooms",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" }
    ]
  },
  "GetRoomsInRoomList_V2": {
    "path": "/{connectionId}/codeless/beta/me/findRooms(RoomList='{room_list}')",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "room_list", "in": "path", "required": true, "type": "string" }
    ]
  },
  "FindMeetingTimes_V2": {
    "path": "/{connectionId}/codeless/beta/me/findMeetingTimes",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "body", "in": "body", "required": true, "type": "object" }
    ]
  },
  "SetAutomaticRepliesSetting": {
    "path": "/{connectionId}/AutomaticRepliesSetting",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "clientSetting", "in": "body", "required": true, "type": "object" }
    ]
  },
  "SetAutomaticRepliesSetting_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/mailboxSettings",
    "method": "PATCH",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "body", "in": "body", "required": true, "type": "object" }
    ]
  },
  "GetMailTips": {
    "path": "/{connectionId}/MailTips",
    "method": "GET",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "mailboxAddress", "in": "query", "required": true, "type": "string" }
    ]
  },
  "GetMailTips_V2": {
    "path": "/{connectionId}/codeless/v1.0/me/getMailTips",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "body", "in": "body", "required": true, "type": "object" }
    ]
  },
  "HttpRequest": {
    "path": "/{connectionId}/codeless/httprequest",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "Uri", "in": "header", "required": true, "type": "string" },
      { "name": "Method", "in": "header", "required": true, "type": "string" },
      { "name": "Body", "in": "body", "required": false, "type": "object" },
      { "name": "ContentType", "in": "header", "required": false, "type": "string" },
      { "name": "CustomHeader1", "in": "header", "required": false, "type": "string" },
      { "name": "CustomHeader2", "in": "header", "required": false, "type": "string" },
      { "name": "CustomHeader3", "in": "header", "required": false, "type": "string" },
      { "name": "CustomHeader4", "in": "header", "required": false, "type": "string" },
      { "name": "CustomHeader5", "in": "header", "required": false, "type": "string" }
    ]
  },
  "mcp_EmailsManagement": {
    "path": "/{connectionId}/mcp/EmailsManagement",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "queryRequest", "in": "body", "required": false, "type": "object" },
      { "name": "sessionId", "in": "query", "required": false, "type": "string" }
    ]
  },
  "mcp_MeetingManagement": {
    "path": "/{connectionId}/mcp/MeetingManagement",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "queryRequest", "in": "body", "required": false, "type": "object" },
      { "name": "sessionId", "in": "query", "required": false, "type": "string" }
    ]
  },
  "mcp_ContactsManagement": {
    "path": "/{connectionId}/mcp/ContactsManagement",
    "method": "POST",
    "parameters": [
      { "name": "connectionId", "in": "path", "required": true, "type": "string" },
      { "name": "queryRequest", "in": "body", "required": false, "type": "object" },
      { "name": "sessionId", "in": "query", "required": false, "type": "string" }
    ]
  }
}`));

// ── Initialize SDK client for the Office 365 Outlook connector ──
function initOutlookClient() {
  const dataSourcesInfo = {};

  DATA_SOURCE_CANDIDATES.forEach((sDataSourceName) => {
    dataSourcesInfo[sDataSourceName] = {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: OUTLOOK_APIS,
    };
  });

  return getClient(dataSourcesInfo);
}

function stringifyOutlookError(oError) {
  if (!oError) return "Operation failed";
  if (typeof oError === "string") return oError;
  if (oError instanceof Error) return oError.message || "Operation failed";

  var aPropertyNames = Object.getOwnPropertyNames(oError);
  var oSerializable = {};
  aPropertyNames.forEach((sName) => {
    oSerializable[sName] = oError[sName];
  });

  try {
    return JSON.stringify(oSerializable);
  } catch {
    return String(oError);
  }
}

function unwrapOutlookResult(oResult) {
  if (oResult && oResult.success === false) {
    var sMessage = stringifyOutlookError(oResult.error);
    if (oResult.data !== undefined) {
      sMessage += " | data: " + stringifyOutlookError(oResult.data);
    }
    throw new Error(sMessage);
  }

  if (oResult && Object.prototype.hasOwnProperty.call(oResult, "data")) {
    return oResult.data;
  }

  return oResult;
}

function isOutlookObject(oValue) {
  return !!oValue && typeof oValue === "object" && !Array.isArray(oValue);
}

function pickOutlookValue() {
  for (let iIndex = 0; iIndex < arguments.length; iIndex += 1) {
    if (arguments[iIndex] !== undefined && arguments[iIndex] !== null) {
      return arguments[iIndex];
    }
  }

  return undefined;
}

function setOutlookIfDefined(oTarget, sKey, oValue) {
  if (oValue !== undefined && oValue !== null) {
    oTarget[sKey] = oValue;
  }

  return oTarget;
}

function normalizeOutlookList(value) {
  if (Array.isArray(value)) {
    return value.map(function(item) {
      if (typeof item === "string") {
        return item;
      }

      if (isOutlookObject(item)) {
        return pickOutlookValue(
          item.Address,
          item.address,
          item.EmailAddress && item.EmailAddress.Address,
          item.EmailAddress && item.EmailAddress.address
        );
      }

      return item;
    }).filter(Boolean).join(";");
  }

  return value;
}

function normalizeOutlookAttachments(aAttachments) {
  if (!Array.isArray(aAttachments)) {
    return aAttachments;
  }

  return aAttachments.map(function(oAttachment) {
    if (!isOutlookObject(oAttachment)) {
      return oAttachment;
    }

    const oNormalized = Object.assign({}, oAttachment);
    setOutlookIfDefined(oNormalized, "Name", pickOutlookValue(oAttachment.Name, oAttachment.name));
    setOutlookIfDefined(oNormalized, "ContentBytes", pickOutlookValue(oAttachment.ContentBytes, oAttachment.contentBytes));
    return oNormalized;
  });
}

function normalizeEmailMessage(oOptions, bSupportsPlainText) {
  const oSource = isOutlookObject(oOptions && oOptions.emailMessage) ? oOptions.emailMessage : (isOutlookObject(oOptions) ? oOptions : {});
  const oMessage = Object.assign({}, oSource);

  setOutlookIfDefined(oMessage, "To", normalizeOutlookList(pickOutlookValue(oSource.To, oSource.to)));
  setOutlookIfDefined(oMessage, "Cc", normalizeOutlookList(pickOutlookValue(oSource.Cc, oSource.cc)));
  setOutlookIfDefined(oMessage, "Bcc", normalizeOutlookList(pickOutlookValue(oSource.Bcc, oSource.bcc)));
  setOutlookIfDefined(oMessage, "ReplyTo", normalizeOutlookList(pickOutlookValue(oSource.ReplyTo, oSource.replyTo)));
  setOutlookIfDefined(oMessage, "From", pickOutlookValue(oSource.From, oSource.from));
  setOutlookIfDefined(oMessage, "Subject", pickOutlookValue(oSource.Subject, oSource.subject));
  setOutlookIfDefined(oMessage, "Body", pickOutlookValue(oSource.Body, oSource.body));
  setOutlookIfDefined(oMessage, "Sensitivity", pickOutlookValue(oSource.Sensitivity, oSource.sensitivity));
  setOutlookIfDefined(oMessage, "Importance", pickOutlookValue(oSource.Importance, oSource.importance));
  setOutlookIfDefined(oMessage, "Attachments", normalizeOutlookAttachments(pickOutlookValue(oSource.Attachments, oSource.attachments)));

  if (bSupportsPlainText) {
    setOutlookIfDefined(oMessage, "IsHtml", pickOutlookValue(oSource.IsHtml, oSource.isHtml));
  }

  return oMessage;
}

function normalizeSharedMailboxMessage(sSharedMailbox, oOptions, bSupportsPlainText) {
  const oSource = isOutlookObject(oOptions && oOptions.emailMessage) ? oOptions.emailMessage : (isOutlookObject(oOptions) ? oOptions : {});
  const oMessage = normalizeEmailMessage(oOptions, bSupportsPlainText);
  setOutlookIfDefined(oMessage, "MailboxAddress", pickOutlookValue(oSource.MailboxAddress, oSource.mailboxAddress, sSharedMailbox));
  return oMessage;
}

function normalizeReplyParameters(oOptions, bSupportsPlainText) {
  const oSource = isOutlookObject(oOptions && oOptions.replyParameters) ? oOptions.replyParameters : (isOutlookObject(oOptions) ? oOptions : {});
  const oReply = Object.assign({}, oSource);

  setOutlookIfDefined(oReply, "To", normalizeOutlookList(pickOutlookValue(oSource.To, oSource.to)));
  setOutlookIfDefined(oReply, "Cc", normalizeOutlookList(pickOutlookValue(oSource.Cc, oSource.cc)));
  setOutlookIfDefined(oReply, "Bcc", normalizeOutlookList(pickOutlookValue(oSource.Bcc, oSource.bcc)));
  setOutlookIfDefined(oReply, "Subject", pickOutlookValue(oSource.Subject, oSource.subject));
  setOutlookIfDefined(oReply, "Body", pickOutlookValue(oSource.Body, oSource.body, oSource.comment));
  setOutlookIfDefined(oReply, "ReplyAll", pickOutlookValue(oSource.ReplyAll, oSource.replyAll));
  setOutlookIfDefined(oReply, "Importance", pickOutlookValue(oSource.Importance, oSource.importance));
  setOutlookIfDefined(oReply, "Attachments", normalizeOutlookAttachments(pickOutlookValue(oSource.Attachments, oSource.attachments)));

  if (bSupportsPlainText) {
    setOutlookIfDefined(oReply, "IsHtml", pickOutlookValue(oSource.IsHtml, oSource.isHtml));
  }

  return oReply;
}

function normalizeForwardBody(oOptions) {
  const oSource = isOutlookObject(oOptions && oOptions.body) ? oOptions.body : (isOutlookObject(oOptions) ? oOptions : {});
  const oBody = Object.assign({}, oSource);
  setOutlookIfDefined(oBody, "ToRecipients", normalizeOutlookList(pickOutlookValue(oSource.ToRecipients, oSource.toRecipients, oSource.To, oSource.to)));
  setOutlookIfDefined(oBody, "Comment", pickOutlookValue(oSource.Comment, oSource.comment));
  return oBody;
}

function normalizeEventItem(oOptions, bApplyDefaults) {
  const oSource = isOutlookObject(oOptions && oOptions.item) ? oOptions.item : (isOutlookObject(oOptions) ? oOptions : {});
  const oItem = Object.assign({}, oSource);

  setOutlookIfDefined(oItem, "subject", pickOutlookValue(oSource.subject, oSource.Subject, oSource.title));
  setOutlookIfDefined(oItem, "start", pickOutlookValue(oSource.start, oSource.Start, oSource.startWithTimeZone));
  setOutlookIfDefined(oItem, "end", pickOutlookValue(oSource.end, oSource.End, oSource.endWithTimeZone));
  setOutlookIfDefined(oItem, "timeZone", pickOutlookValue(oSource.timeZone, oSource.TimeZone, oSource.timezone, oSource.StartTimeZone, oSource.EndTimeZone));
  setOutlookIfDefined(oItem, "requiredAttendees", normalizeOutlookList(pickOutlookValue(oSource.requiredAttendees, oSource.RequiredAttendees, oSource.attendees)));
  setOutlookIfDefined(oItem, "optionalAttendees", normalizeOutlookList(pickOutlookValue(oSource.optionalAttendees, oSource.OptionalAttendees)));
  setOutlookIfDefined(oItem, "resourceAttendees", normalizeOutlookList(pickOutlookValue(oSource.resourceAttendees, oSource.ResourceAttendees)));
  setOutlookIfDefined(oItem, "body", pickOutlookValue(oSource.body, oSource.Body));
  setOutlookIfDefined(oItem, "categories", pickOutlookValue(oSource.categories, oSource.Categories));
  setOutlookIfDefined(oItem, "location", pickOutlookValue(oSource.location, oSource.Location));
  setOutlookIfDefined(oItem, "importance", pickOutlookValue(oSource.importance, oSource.Importance));
  setOutlookIfDefined(oItem, "isAllDay", pickOutlookValue(oSource.isAllDay, oSource.IsAllDay));
  setOutlookIfDefined(oItem, "recurrence", pickOutlookValue(oSource.recurrence, oSource.Recurrence));
  setOutlookIfDefined(oItem, "selectedDaysOfWeek", pickOutlookValue(oSource.selectedDaysOfWeek, oSource.SelectedDaysOfWeek));
  setOutlookIfDefined(oItem, "recurrenceEnd", pickOutlookValue(oSource.recurrenceEnd, oSource.RecurrenceEnd));
  setOutlookIfDefined(oItem, "numberOfOccurences", pickOutlookValue(oSource.numberOfOccurences, oSource.numberOfOccurrences, oSource.NumberOfOccurrences));
  setOutlookIfDefined(oItem, "reminderMinutesBeforeStart", pickOutlookValue(oSource.reminderMinutesBeforeStart, oSource.Reminder, oSource.reminder));
  setOutlookIfDefined(oItem, "isReminderOn", pickOutlookValue(oSource.isReminderOn, oSource.IsReminderOn));
  setOutlookIfDefined(oItem, "showAs", pickOutlookValue(oSource.showAs, oSource.ShowAs));
  setOutlookIfDefined(oItem, "responseRequested", pickOutlookValue(oSource.responseRequested, oSource.ResponseRequested));
  setOutlookIfDefined(oItem, "sensitivity", pickOutlookValue(oSource.sensitivity, oSource.Sensitivity));

  if (bApplyDefaults && oItem.timeZone === undefined) {
    oItem.timeZone = "";
  }

  return oItem;
}

function normalizeEmailQuery(oOptions) {
  const oSource = isOutlookObject(oOptions) ? oOptions : {};
  const oQuery = {};

  setOutlookIfDefined(oQuery, "folderPath", pickOutlookValue(oSource.folderPath, oSource.folderId));
  setOutlookIfDefined(oQuery, "to", normalizeOutlookList(pickOutlookValue(oSource.to, oSource.To)));
  setOutlookIfDefined(oQuery, "cc", normalizeOutlookList(pickOutlookValue(oSource.cc, oSource.Cc)));
  setOutlookIfDefined(oQuery, "toOrCc", normalizeOutlookList(pickOutlookValue(oSource.toOrCc, oSource.ToOrCc)));
  setOutlookIfDefined(oQuery, "from", pickOutlookValue(oSource.from, oSource.From));
  setOutlookIfDefined(oQuery, "importance", pickOutlookValue(oSource.importance, oSource.Importance));
  setOutlookIfDefined(oQuery, "fetchOnlyWithAttachment", pickOutlookValue(oSource.fetchOnlyWithAttachment, oSource.hasAttachment));
  setOutlookIfDefined(oQuery, "subjectFilter", pickOutlookValue(oSource.subjectFilter, oSource.subject));
  setOutlookIfDefined(oQuery, "fetchOnlyUnread", pickOutlookValue(oSource.fetchOnlyUnread, oSource.unreadOnly));
  setOutlookIfDefined(oQuery, "fetchOnlyFlagged", pickOutlookValue(oSource.fetchOnlyFlagged, oSource.flaggedOnly));
  setOutlookIfDefined(oQuery, "mailboxAddress", pickOutlookValue(oSource.mailboxAddress, oSource.MailboxAddress));
  setOutlookIfDefined(oQuery, "includeAttachments", pickOutlookValue(oSource.includeAttachments, oSource.IncludeAttachments));
  setOutlookIfDefined(oQuery, "searchQuery", pickOutlookValue(oSource.searchQuery, oSource.search, oSource.SearchQuery));
  setOutlookIfDefined(oQuery, "top", pickOutlookValue(oSource.top, oSource.Top));
  return oQuery;
}

function normalizeFlagBody(oOptions) {
  const oSource = isOutlookObject(oOptions) ? oOptions : {};
  if (isOutlookObject(oSource.body)) {
    return oSource.body;
  }

  if (isOutlookObject(oSource.flag)) {
    return { flag: oSource.flag };
  }

  const sFlagStatus = pickOutlookValue(oSource.flagStatus, oSource.status);
  if (sFlagStatus) {
    return { flag: { flagStatus: sFlagStatus } };
  }

  return undefined;
}

function normalizeMarkAsReadBody(oOptions) {
  const oSource = isOutlookObject(oOptions) ? oOptions : {};
  if (isOutlookObject(oSource.body)) {
    return oSource.body;
  }

  return { isRead: pickOutlookValue(oSource.isRead, true) };
}

// ── Internal: execute a connector operation ────────────────────
async function execOutlookOp(operationName, parameters) {
  const client = await initOutlookClient();
  const aErrors = [];

  for (let iIndex = 0; iIndex < DATA_SOURCE_CANDIDATES.length; iIndex += 1) {
    const sDataSourceName = DATA_SOURCE_CANDIDATES[iIndex];

    try {
      const result = await client.executeAsync({
        connectorOperation: {
          tableName: sDataSourceName,
          operationName,
          parameters,
        },
      });

      return unwrapOutlookResult(result);
    } catch (oErr) {
      const sMessage = stringifyOutlookError(oErr);
      aErrors.push(sDataSourceName + ": " + sMessage);

      if (sMessage.indexOf("Connection reference not found") === -1) {
        throw oErr;
      }
    }
  }

  throw new Error("No Outlook connection reference matched. Tried: " + aErrors.join(" || "));
}

// ── Generic: call any Outlook connector operation ──────────────
export async function callOutlookOperation(sOperationName, oParameters) {
  return _dbgWrap('callOutlookOperation', [sOperationName, oParameters], async function() {
  return execOutlookOp(sOperationName, oParameters);
  });
}

// ── Send Email ─────────────────────────────────────────────────
export async function sendEmail(oOptions = {}) {
  return _dbgWrap('sendEmail', [oOptions], async function() {
  const bUsePlainText = pickOutlookValue(oOptions.isHtml, oOptions.emailMessage && oOptions.emailMessage.IsHtml) === false;
  const oMessage = normalizeEmailMessage(oOptions, bUsePlainText);
  return execOutlookOp(bUsePlainText ? "SendEmail" : "SendEmailV2", { emailMessage: oMessage });
  });
}

// ── Forward Email ──────────────────────────────────────────────
export async function forwardEmail(sMessageId, oOptions = {}) {
  return _dbgWrap('forwardEmail', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  const sMailboxAddress = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  const sOperationName = sMailboxAddress ? "ForwardEmail_V2" : "ForwardEmail";
  const oParameters = {
    message_id: sMessageId,
    body: normalizeForwardBody(oOptions),
  };
  setOutlookIfDefined(oParameters, "mailboxAddress", sMailboxAddress);
  return execOutlookOp(sOperationName, oParameters);
  });
}

// ── Reply to Email ─────────────────────────────────────────────
export async function replyToEmail(sMessageId, oOptions = {}) {
  return _dbgWrap('replyToEmail', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  const bUsePlainText = pickOutlookValue(oOptions.isHtml, oOptions.replyParameters && oOptions.replyParameters.IsHtml) === false;
  const oParameters = {
    messageId: sMessageId,
    replyParameters: normalizeReplyParameters(oOptions, bUsePlainText),
  };
  setOutlookIfDefined(oParameters, "mailboxAddress", pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress));
  return execOutlookOp(bUsePlainText ? "ReplyToV2" : "ReplyToV3", oParameters);
  });
}

// ── List Emails ────────────────────────────────────────────────
export async function listEmails(oOptions = {}) {
  return _dbgWrap('listEmails', [oOptions], async function() {
  const iVersion = pickOutlookValue(oOptions.version, 3);
  const oParameters = normalizeEmailQuery(Object.assign({}, oOptions, { folderId: pickOutlookValue(oOptions.folderId, "Inbox") }));
  if (oParameters.top === undefined) {
    oParameters.top = 10;
  }
  void oOptions.skip;
  return execOutlookOp(iVersion === 2 ? "GetEmailsV2" : "GetEmailsV3", oParameters);
  });
}

// ── Send from Shared Mailbox ───────────────────────────────────
export async function sendFromSharedMailbox(sSharedMailbox, oOptions = {}) {
  return _dbgWrap('sendFromSharedMailbox', [sSharedMailbox, oOptions], async function() {
  if (isOutlookObject(sSharedMailbox)) {
    oOptions = sSharedMailbox;
    sSharedMailbox = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  }

  const bUsePlainText = pickOutlookValue(oOptions.isHtml, oOptions.emailMessage && oOptions.emailMessage.IsHtml) === false;
  const oMessage = normalizeSharedMailboxMessage(sSharedMailbox, oOptions, bUsePlainText);
  return execOutlookOp(bUsePlainText ? "SharedMailboxSendEmail" : "SharedMailboxSendEmailV2", { emailMessage: oMessage });
  });
}

// ── Move Email ─────────────────────────────────────────────────
export async function moveEmail(sMessageId, sDestinationFolderId, oOptions) {
  return _dbgWrap('moveEmail', [sMessageId, sDestinationFolderId, oOptions], async function() {
  if (isOutlookObject(sDestinationFolderId)) {
    oOptions = sDestinationFolderId;
    sDestinationFolderId = pickOutlookValue(oOptions.folderPath, oOptions.folderId, oOptions.destinationFolderId);
  }

  oOptions = isOutlookObject(oOptions) ? oOptions : {};
  return execOutlookOp("MoveV2", {
    messageId: sMessageId,
    folderPath: sDestinationFolderId,
    mailboxAddress: pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress),
  });
  });
}

// ── Delete Email ───────────────────────────────────────────────
export async function deleteEmail(sMessageId, oOptions) {
  return _dbgWrap('deleteEmail', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  oOptions = isOutlookObject(oOptions) ? oOptions : {};
  const sMailboxAddress = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  const sOperationName = sMailboxAddress ? "DeleteEmail_V2" : "DeleteEmail";
  const oParameters = { messageId: sMessageId };
  setOutlookIfDefined(oParameters, "mailboxAddress", sMailboxAddress);
  return execOutlookOp(sOperationName, oParameters);
  });
}

// ── Create Event ───────────────────────────────────────────────
export async function createEvent(oOptions = {}) {
  return _dbgWrap('createEvent', [oOptions], async function() {
  const oItem = normalizeEventItem(oOptions, true);

  return execOutlookOp("V4CalendarPostItem", {
    table: pickOutlookValue(oOptions.calendarId, oOptions.table, "Calendar"),
    item: oItem,
  });
  });
}

// ── List Events ────────────────────────────────────────────────
export async function listEvents(oOptions = {}) {
  return _dbgWrap('listEvents', [oOptions], async function() {
  return execOutlookOp("V4CalendarGetItems", {
    table: pickOutlookValue(oOptions.calendarId, oOptions.table, "Calendar"),
    $filter: pickOutlookValue(oOptions.filter, oOptions.$filter),
    $orderby: pickOutlookValue(oOptions.orderBy, oOptions.$orderby),
    $top: pickOutlookValue(oOptions.top, oOptions.$top),
    $skip: pickOutlookValue(oOptions.skip, oOptions.$skip),
  });
  });
}

// ── Edit Event ─────────────────────────────────────────────────
export async function editEvent(sEventId, oChangedFields, sCalendarId) {
  return _dbgWrap('editEvent', [sEventId, oChangedFields, sCalendarId], async function() {
  let oOptions = isOutlookObject(oChangedFields) ? oChangedFields : {};
  if (isOutlookObject(sEventId)) {
    oOptions = sEventId;
    sEventId = pickOutlookValue(oOptions.eventId, oOptions.id);
  }

  return execOutlookOp("V4CalendarPatchItem", {
    table: pickOutlookValue(oOptions.calendarId, oOptions.table, sCalendarId, "Calendar"),
    id: sEventId,
    item: normalizeEventItem(oOptions, false),
  });
  });
}

// ── Delete Event ───────────────────────────────────────────────
export async function deleteEvent(sEventId, sCalendarId, oOptions) {
  return _dbgWrap('deleteEvent', [sEventId, sCalendarId, oOptions], async function() {
  if (isOutlookObject(sCalendarId)) {
    oOptions = sCalendarId;
    sCalendarId = pickOutlookValue(oOptions.calendarId, oOptions.table);
  }

  return execOutlookOp("CalendarDeleteItem", {
    table: pickOutlookValue(sCalendarId, oOptions && oOptions.calendarId, oOptions && oOptions.table, "Calendar"),
    id: sEventId,
  });
  });
}

export async function getEmail(sMessageId, oOptions = {}) {
  return _dbgWrap('getEmail', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  const bUseV2 = pickOutlookValue(oOptions.version, 2) !== 1;
  const oParameters = {
    messageId: sMessageId,
    mailboxAddress: pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress),
    includeAttachments: pickOutlookValue(oOptions.includeAttachments, oOptions.IncludeAttachments),
    internetMessageId: pickOutlookValue(oOptions.internetMessageId, oOptions.InternetMessageId),
  };
  if (bUseV2) {
    setOutlookIfDefined(oParameters, "extractSensitivityLabel", oOptions.extractSensitivityLabel);
    setOutlookIfDefined(oParameters, "fetchSensitivityLabelMetadata", oOptions.fetchSensitivityLabelMetadata);
  }

  return execOutlookOp(bUseV2 ? "GetEmailV2" : "GetEmail", oParameters);
  });
}

export async function draftEmail(oOptions = {}) {
  return _dbgWrap('draftEmail', [oOptions], async function() {
  return execOutlookOp("DraftEmail", {
    draftMessage: normalizeEmailMessage(oOptions, false),
    messageId: pickOutlookValue(oOptions.messageId, oOptions.id),
    draftType: pickOutlookValue(oOptions.draftType, oOptions.type),
    comment: pickOutlookValue(oOptions.comment, oOptions.Comment),
  });
  });
}

export async function updateDraftEmail(sMessageId, oOptions = {}) {
  return _dbgWrap('updateDraftEmail', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  return execOutlookOp("UpdateDraftEmail", {
    messageId: sMessageId,
    draftMessage: normalizeEmailMessage(oOptions, false),
  });
  });
}

export async function sendDraftEmail(sMessageId) {
  return _dbgWrap('sendDraftEmail', [sMessageId], async function() {
  if (isOutlookObject(sMessageId)) {
    sMessageId = pickOutlookValue(sMessageId.messageId, sMessageId.id);
  }

  return execOutlookOp("SendDraftEmail", { messageId: sMessageId });
  });
}

export async function markEmailAsRead(sMessageId, oOptions = {}) {
  return _dbgWrap('markEmailAsRead', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  const sMailboxAddress = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  const bUseLegacy = pickOutlookValue(oOptions.version, 3) === 1 && !sMailboxAddress && !oOptions.body && oOptions.isRead === undefined;
  if (bUseLegacy) {
    return execOutlookOp("MarkAsRead", { messageId: sMessageId });
  }

  return execOutlookOp("MarkAsRead_V3", {
    messageId: sMessageId,
    mailboxAddress: sMailboxAddress,
    body: normalizeMarkAsReadBody(oOptions),
  });
  });
}

export async function updateEmailFlag(sMessageId, oOptions = {}) {
  return _dbgWrap('updateEmailFlag', [sMessageId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
  }

  const sMailboxAddress = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  const oBody = normalizeFlagBody(oOptions);
  if (!sMailboxAddress && !oBody) {
    return execOutlookOp("Flag", { messageId: sMessageId });
  }

  return execOutlookOp("Flag_V2", {
    messageId: sMessageId,
    mailboxAddress: sMailboxAddress,
    body: oBody,
  });
  });
}

export async function getEmailAttachment(sMessageId, sAttachmentId, oOptions = {}) {
  return _dbgWrap('getEmailAttachment', [sMessageId, sAttachmentId, oOptions], async function() {
  if (isOutlookObject(sMessageId)) {
    oOptions = sMessageId;
    sMessageId = pickOutlookValue(oOptions.messageId, oOptions.id);
    sAttachmentId = pickOutlookValue(oOptions.attachmentId, oOptions.AttachmentId);
  } else if (isOutlookObject(sAttachmentId)) {
    oOptions = sAttachmentId;
    sAttachmentId = pickOutlookValue(oOptions.attachmentId, oOptions.AttachmentId);
  }

  const sMailboxAddress = pickOutlookValue(oOptions.mailboxAddress, oOptions.MailboxAddress);
  const bUseV2 = !!sMailboxAddress || oOptions.extractSensitivityLabel === true || oOptions.fetchSensitivityLabelMetadata === true;
  const oParameters = {
    messageId: sMessageId,
    attachmentId: sAttachmentId,
  };
  if (bUseV2) {
    setOutlookIfDefined(oParameters, "mailboxAddress", sMailboxAddress);
    setOutlookIfDefined(oParameters, "extractSensitivityLabel", oOptions.extractSensitivityLabel);
    setOutlookIfDefined(oParameters, "fetchSensitivityLabelMetadata", oOptions.fetchSensitivityLabelMetadata);
  }

  return execOutlookOp(bUseV2 ? "GetAttachment_V2" : "GetAttachment", oParameters);
  });
}

export async function listOutlookCategories() {
  return _dbgWrap('listOutlookCategories', [], async function() {
  return execOutlookOp("GetOutlookCategoryNames");
  });
}

export async function assignOutlookCategory(sMessageId, sCategory) {
  return _dbgWrap('assignOutlookCategory', [sMessageId, sCategory], async function() {
  if (isOutlookObject(sMessageId)) {
    sCategory = pickOutlookValue(sMessageId.category, sMessageId.categoryName);
    sMessageId = pickOutlookValue(sMessageId.messageId, sMessageId.id);
  }

  return execOutlookOp("AssignCategory", { messageId: sMessageId, category: sCategory });
  });
}

export async function assignOutlookCategoryBulk(aMessageIds, sCategoryName) {
  return _dbgWrap('assignOutlookCategoryBulk', [aMessageIds, sCategoryName], async function() {
  if (isOutlookObject(aMessageIds)) {
    sCategoryName = pickOutlookValue(aMessageIds.categoryName, aMessageIds.category);
    aMessageIds = pickOutlookValue(aMessageIds.messageIds, aMessageIds.ids);
  }

  return execOutlookOp("AssignCategoryBulk", { messageIds: aMessageIds, categoryName: sCategoryName });
  });
}

export async function listCalendars(oOptions = {}) {
  return _dbgWrap('listCalendars', [oOptions], async function() {
  return execOutlookOp("CalendarGetTables_V2", {
    skip: oOptions.skip,
    top: oOptions.top,
    orderBy: pickOutlookValue(oOptions.orderBy, oOptions.$orderby),
  });
  });
}

export async function getEvent(sEventId, sCalendarId, oOptions) {
  return _dbgWrap('getEvent', [sEventId, sCalendarId, oOptions], async function() {
  if (isOutlookObject(sEventId)) {
    oOptions = sEventId;
    sEventId = pickOutlookValue(oOptions.eventId, oOptions.id);
    sCalendarId = pickOutlookValue(oOptions.calendarId, oOptions.table);
  } else if (isOutlookObject(sCalendarId)) {
    oOptions = sCalendarId;
    sCalendarId = pickOutlookValue(oOptions.calendarId, oOptions.table);
  }

  return execOutlookOp("V3CalendarGetItem", {
    table: pickOutlookValue(sCalendarId, oOptions && oOptions.calendarId, oOptions && oOptions.table, "Calendar"),
    id: sEventId,
  });
  });
}

export async function getCalendarView(oOptions = {}) {
  return _dbgWrap('getCalendarView', [oOptions], async function() {
  return execOutlookOp("GetEventsCalendarViewV3", {
    calendarId: pickOutlookValue(oOptions.calendarId, oOptions.table, "Calendar"),
    startDateTimeUtc: pickOutlookValue(oOptions.startDateTimeUtc, oOptions.start, oOptions.startDateTime),
    endDateTimeUtc: pickOutlookValue(oOptions.endDateTimeUtc, oOptions.end, oOptions.endDateTime),
    $filter: pickOutlookValue(oOptions.filter, oOptions.$filter),
    $orderby: pickOutlookValue(oOptions.orderBy, oOptions.$orderby),
    $top: pickOutlookValue(oOptions.top, oOptions.$top),
    $skip: pickOutlookValue(oOptions.skip, oOptions.$skip),
    search: oOptions.search,
  });
  });
}

export async function respondToEventInvite(sEventId, sResponse, oOptions = {}) {
  return _dbgWrap('respondToEventInvite', [sEventId, sResponse, oOptions], async function() {
  if (isOutlookObject(sEventId)) {
    oOptions = sEventId;
    sEventId = pickOutlookValue(oOptions.eventId, oOptions.id);
    sResponse = pickOutlookValue(oOptions.response, oOptions.action);
  }

  return execOutlookOp("RespondToEvent_V2", {
    event_id: sEventId,
    response: sResponse,
    body: isOutlookObject(oOptions.body) ? oOptions.body : {
      Comment: pickOutlookValue(oOptions.comment, oOptions.Comment),
      SendResponse: pickOutlookValue(oOptions.sendResponse, oOptions.SendResponse),
    },
  });
  });
}

export async function listRoomLists() {
  return _dbgWrap('listRoomLists', [], async function() {
  return execOutlookOp("GetRoomLists_V2");
  });
}

export async function listRooms() {
  return _dbgWrap('listRooms', [], async function() {
  return execOutlookOp("GetRooms_V2");
  });
}

export async function listRoomsInRoomList(sRoomList) {
  return _dbgWrap('listRoomsInRoomList', [sRoomList], async function() {
  if (isOutlookObject(sRoomList)) {
    sRoomList = pickOutlookValue(sRoomList.roomList, sRoomList.id, sRoomList.name);
  }

  return execOutlookOp("GetRoomsInRoomList_V2", { room_list: sRoomList });
  });
}

export async function findMeetingTimes(oRequest = {}) {
  return _dbgWrap('findMeetingTimes', [oRequest], async function() {
  return execOutlookOp("FindMeetingTimes_V2", {
    body: isOutlookObject(oRequest.body) ? oRequest.body : oRequest,
  });
  });
}

export async function setAutomaticReplies(oSettings = {}) {
  return _dbgWrap('setAutomaticReplies', [oSettings], async function() {
  const bUseLegacy = oSettings.version === 1 || oSettings.clientSetting || oSettings.Status || oSettings.ExternalAudience;
  return execOutlookOp(bUseLegacy ? "SetAutomaticRepliesSetting" : "SetAutomaticRepliesSetting_V2", bUseLegacy ? {
    clientSetting: isOutlookObject(oSettings.clientSetting) ? oSettings.clientSetting : oSettings,
  } : {
    body: isOutlookObject(oSettings.body) ? oSettings.body : oSettings,
  });
  });
}

export async function getMailTips(oRequest) {
  return _dbgWrap('getMailTips', [oRequest], async function() {
  if (typeof oRequest === "string") {
    return execOutlookOp("GetMailTips", { mailboxAddress: oRequest });
  }

  const oOptions = isOutlookObject(oRequest) ? oRequest : {};
  if (oOptions.body || !oOptions.mailboxAddress) {
    return execOutlookOp("GetMailTips_V2", {
      body: isOutlookObject(oOptions.body) ? oOptions.body : oOptions,
    });
  }

  return execOutlookOp("GetMailTips", { mailboxAddress: oOptions.mailboxAddress });
  });
}

export async function listContactFolders() {
  return _dbgWrap('listContactFolders', [], async function() {
  return execOutlookOp("ContactGetTablesV2");
  });
}

export async function listContacts(sFolderId, oOptions) {
  return _dbgWrap('listContacts', [sFolderId, oOptions], async function() {
  if (isOutlookObject(sFolderId)) {
    oOptions = sFolderId;
    sFolderId = pickOutlookValue(oOptions.folderId, oOptions.folder, oOptions.table);
  }

  oOptions = isOutlookObject(oOptions) ? oOptions : {};
  return execOutlookOp("ContactGetItems_V2", {
    folder: sFolderId,
    $filter: pickOutlookValue(oOptions.filter, oOptions.$filter),
    $orderby: pickOutlookValue(oOptions.orderBy, oOptions.$orderby),
    $top: pickOutlookValue(oOptions.top, oOptions.$top),
    $skip: pickOutlookValue(oOptions.skip, oOptions.$skip),
  });
  });
}

export async function getContact(sFolderId, sContactId, oOptions) {
  return _dbgWrap('getContact', [sFolderId, sContactId, oOptions], async function() {
  if (isOutlookObject(sFolderId)) {
    oOptions = sFolderId;
    sFolderId = pickOutlookValue(oOptions.folderId, oOptions.folder, oOptions.table);
    sContactId = pickOutlookValue(oOptions.contactId, oOptions.id);
  } else if (isOutlookObject(sContactId)) {
    oOptions = sContactId;
    sContactId = pickOutlookValue(oOptions.contactId, oOptions.id);
  }

  return execOutlookOp("ContactGetItem_V2", { folder: sFolderId, id: sContactId });
  });
}

export async function createContact(sFolderId, oContact) {
  return _dbgWrap('createContact', [sFolderId, oContact], async function() {
  if (isOutlookObject(sFolderId)) {
    oContact = sFolderId;
    sFolderId = pickOutlookValue(oContact.folderId, oContact.folder, oContact.table);
  }

  return execOutlookOp("ContactPostItem_V2", {
    folder: sFolderId,
    item: isOutlookObject(oContact && oContact.item) ? oContact.item : oContact,
  });
  });
}

export async function updateContact(sFolderId, sContactId, oContact) {
  return _dbgWrap('updateContact', [sFolderId, sContactId, oContact], async function() {
  if (isOutlookObject(sFolderId)) {
    oContact = sFolderId;
    sFolderId = pickOutlookValue(oContact.folderId, oContact.folder, oContact.table);
    sContactId = pickOutlookValue(oContact.contactId, oContact.id);
  } else if (isOutlookObject(sContactId)) {
    oContact = sContactId;
    sContactId = pickOutlookValue(oContact.contactId, oContact.id);
  }

  return execOutlookOp("ContactPatchItem_V2", {
    folder: sFolderId,
    id: sContactId,
    item: isOutlookObject(oContact && oContact.item) ? oContact.item : oContact,
  });
  });
}

export async function deleteContact(sFolderId, sContactId, oOptions) {
  return _dbgWrap('deleteContact', [sFolderId, sContactId, oOptions], async function() {
  if (isOutlookObject(sFolderId)) {
    oOptions = sFolderId;
    sFolderId = pickOutlookValue(oOptions.folderId, oOptions.folder, oOptions.table);
    sContactId = pickOutlookValue(oOptions.contactId, oOptions.id);
  } else if (isOutlookObject(sContactId)) {
    oOptions = sContactId;
    sContactId = pickOutlookValue(oOptions.contactId, oOptions.id);
  }

  return execOutlookOp("ContactDeleteItem_V2", { folder: sFolderId, id: sContactId });
  });
}

export async function callOutlookHttpRequest({ uri, method = "GET", body, contentType, customHeaders } = {}) {
  return _dbgWrap('callOutlookHttpRequest', [{ uri, method, body, contentType, customHeaders }], async function() {
  const aHeaders = Array.isArray(customHeaders) ? customHeaders : [];
  return execOutlookOp("HttpRequest", {
    Uri: uri,
    Method: method,
    Body: body,
    ContentType: contentType,
    CustomHeader1: aHeaders[0],
    CustomHeader2: aHeaders[1],
    CustomHeader3: aHeaders[2],
    CustomHeader4: aHeaders[3],
    CustomHeader5: aHeaders[4],
  });
  });
}

export async function manageOutlookEmails(queryRequest, sessionId) {
  return _dbgWrap('manageOutlookEmails', [queryRequest, sessionId], async function() {
  return execOutlookOp("mcp_EmailsManagement", { queryRequest: queryRequest, sessionId: sessionId });
  });
}

export async function manageOutlookMeetings(queryRequest, sessionId) {
  return _dbgWrap('manageOutlookMeetings', [queryRequest, sessionId], async function() {
  return execOutlookOp("mcp_MeetingManagement", { queryRequest: queryRequest, sessionId: sessionId });
  });
}

export async function manageOutlookContacts(queryRequest, sessionId) {
  return _dbgWrap('manageOutlookContacts', [queryRequest, sessionId], async function() {
  return execOutlookOp("mcp_ContactsManagement", { queryRequest: queryRequest, sessionId: sessionId });
  });
}