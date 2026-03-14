import { getClient } from "@microsoft/power-apps/data";

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE = "Office365Outlook";

// ── Initialize SDK client for the Office 365 Outlook connector ──
function initClient() {
  const dataSourcesInfo = {
    [DATA_SOURCE]: {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: {},
    },
  };
  return getClient(dataSourcesInfo);
}

// ── Internal: execute a connector operation ────────────────────
async function execOp(operationName, parameters) {
  const client = await initClient();
  return client.executeAsync({
    connectorOperation: {
      tableName: DATA_SOURCE,
      operationName,
      parameters,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
//  GENERIC
// ═══════════════════════════════════════════════════════════════

// ── Call any Outlook connector operation by name ───────────────
export async function callOutlookOperation(operationName, parameters = {}) {
  return execOp(operationName, parameters);
}

// ═══════════════════════════════════════════════════════════════
//  MAIL
// ═══════════════════════════════════════════════════════════════

// ── Send Email ─────────────────────────────────────────────────
export async function sendEmail({ to, cc, bcc, subject, body, isHtml = true, importance = "Normal", attachments }) {
  return execOp("SendEmailV2", {
    "emailMessage/To": to,
    "emailMessage/Subject": subject,
    "emailMessage/Body": body,
    "emailMessage/Cc": cc || "",
    "emailMessage/Bcc": bcc || "",
    "emailMessage/Importance": importance,
    "emailMessage/IsHtml": isHtml,
    "emailMessage/Attachments": attachments || [],
  });
}

// ── Forward Email ──────────────────────────────────────────────
export async function forwardEmail(messageId, { to, comment = "" }) {
  return execOp("ForwardEmailV2", {
    message_id: messageId,
    "emailMessage/To": to,
    "emailMessage/Comment": comment,
  });
}

// ── Reply to Email ─────────────────────────────────────────────
export async function replyToEmail(messageId, { comment, replyAll = false }) {
  return execOp(replyAll ? "ReplyAllToV3" : "ReplyToV3", {
    message_id: messageId,
    comment,
  });
}

// ── List Emails ────────────────────────────────────────────────
export async function listEmails({ folderId = "Inbox", fetchOnlyUnread, searchQuery, top, skip } = {}) {
  const params = { folderPath: folderId };
  if (fetchOnlyUnread != null) params.fetchOnlyUnread = fetchOnlyUnread;
  if (searchQuery) params.searchQuery = searchQuery;
  if (top != null)  params.top = top;
  if (skip != null) params.skip = skip;
  return execOp("GetEmailsV3", params);
}

// ── Send from Shared Mailbox ───────────────────────────────────
export async function sendFromSharedMailbox(sharedMailbox, { to, cc, bcc, subject, body, isHtml = true, importance = "Normal", attachments }) {
  return execOp("SharedMailboxSendEmailV2", {
    "emailMessage/To": to,
    "emailMessage/Subject": subject,
    "emailMessage/Body": body,
    "emailMessage/Cc": cc || "",
    "emailMessage/Bcc": bcc || "",
    "emailMessage/Importance": importance,
    "emailMessage/IsHtml": isHtml,
    "emailMessage/Attachments": attachments || [],
    mailboxAddress: sharedMailbox,
  });
}

// ── Move Email ─────────────────────────────────────────────────
export async function moveEmail(messageId, destinationFolderId) {
  return execOp("MoveEmailV2", {
    message_id: messageId,
    folderPath: destinationFolderId,
  });
}

// ── Delete Email ───────────────────────────────────────────────
export async function deleteEmail(messageId) {
  return execOp("DeleteEmailV2", {
    message_id: messageId,
  });
}

// ═══════════════════════════════════════════════════════════════
//  CALENDAR
// ═══════════════════════════════════════════════════════════════

// ── Create Event ───────────────────────────────────────────────
export async function createEvent({ calendarId = "Calendar", subject, body, start, end, location, attendees, isAllDay = false, importance = "Normal", isHtml = true, timeZone = "UTC" }) {
  return execOp("V4CalendarPostItem", {
    table: calendarId,
    "item/subject": subject,
    "item/body": body || "",
    "item/start": start,
    "item/end": end,
    "item/timeZone": timeZone,
    "item/location": location || "",
    "item/requiredAttendees": Array.isArray(attendees) ? attendees.join(";") : (attendees || ""),
    "item/isAllDay": isAllDay,
    "item/importance": importance,
    "item/isHtml": isHtml,
  });
}

// ── List Events ────────────────────────────────────────────────
export async function listEvents({ calendarId = "Calendar", filter, orderBy, top, skip } = {}) {
  const params = { table: calendarId };
  if (filter)  params.$filter = filter;
  if (orderBy) params.$orderby = orderBy;
  if (top != null)  params.$top = top;
  if (skip != null) params.$skip = skip;
  return execOp("V2CalendarGetItems", params);
}

// ── Edit Event ─────────────────────────────────────────────────
export async function editEvent(eventId, changedFields, calendarId = "Calendar") {
  return execOp("V4CalendarPatchItem", {
    table: calendarId,
    id: eventId,
    ...changedFields,
  });
}

// ── Delete Event ───────────────────────────────────────────────
export async function deleteEvent(eventId, calendarId = "Calendar") {
  return execOp("V2CalendarDeleteItem", {
    table: calendarId,
    id: eventId,
  });
}
