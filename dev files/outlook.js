import { getClient } from "@microsoft/power-apps/data";

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

// ── Initialize SDK client for the Office 365 Outlook connector ──
function initClient() {
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

function stringifyErrorDetails(oError) {
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

function unwrapResult(oResult) {
  if (oResult && oResult.success === false) {
    var sMessage = stringifyErrorDetails(oResult.error);
    if (oResult.data !== undefined) {
      sMessage += " | data: " + stringifyErrorDetails(oResult.data);
    }
    throw new Error(sMessage);
  }

  if (oResult && Object.prototype.hasOwnProperty.call(oResult, "data")) {
    return oResult.data;
  }

  return oResult;
}

// ── Internal: execute a connector operation ────────────────────
async function execOp(sOperationName, oParameters) {
  const client = await initClient();
  const aErrors = [];

  for (let iIndex = 0; iIndex < DATA_SOURCE_CANDIDATES.length; iIndex += 1) {
    const sDataSourceName = DATA_SOURCE_CANDIDATES[iIndex];

    try {
      const oResult = await client.executeAsync({
        connectorOperation: {
          tableName: sDataSourceName,
          operationName: sOperationName,
          parameters: oParameters,
        },
      });

      return unwrapResult(oResult);
    } catch (oErr) {
      const sMessage = stringifyErrorDetails(oErr);
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
  return execOp(sOperationName, oParameters);
}

// ── Send Email ─────────────────────────────────────────────────
export async function sendEmail({ to, cc, bcc, subject, body, isHtml, importance, attachments } = {}) {
  var oMessage = {
    To: to,
    Subject: subject,
    Body: body,
  };
  if (cc) oMessage.Cc = cc;
  if (bcc) oMessage.Bcc = bcc;
  if (importance) oMessage.Importance = importance;
  if (attachments) oMessage.Attachments = attachments;
  if (isHtml === false) oMessage.IsHtml = false;

  return execOp("SendEmailV2", { emailMessage: oMessage });
}

// ── Forward Email ──────────────────────────────────────────────
export async function forwardEmail(sMessageId, { to, comment } = {}) {
  return execOp("ForwardEmail", {
    message_id: sMessageId,
    body: { ToRecipients: to, Comment: comment },
  });
}

// ── Reply to Email ─────────────────────────────────────────────
export async function replyToEmail(sMessageId, { comment, replyAll } = {}) {
  return execOp("ReplyToV3", {
    messageId: sMessageId,
    replyParameters: { Body: comment, ReplyAll: replyAll === true },
  });
}

// ── List Emails ────────────────────────────────────────────────
export async function listEmails({ folderId = "Inbox", fetchOnlyUnread, searchQuery, top, skip } = {}) {
  return execOp("GetEmailsV3", {
    folderPath: folderId,
    fetchOnlyUnread: fetchOnlyUnread,
    searchQuery: searchQuery,
    top: top != null ? top : 10,
    skip: skip,
  });
}

// ── Send from Shared Mailbox ───────────────────────────────────
export async function sendFromSharedMailbox(sSharedMailbox, { to, cc, bcc, subject, body, importance, attachments } = {}) {
  var oMessage = {
    MailboxAddress: sSharedMailbox,
    To: to,
    Subject: subject,
    Body: body,
  };
  if (cc) oMessage.Cc = cc;
  if (bcc) oMessage.Bcc = bcc;
  if (importance) oMessage.Importance = importance;
  if (attachments) oMessage.Attachments = attachments;

  return execOp("SharedMailboxSendEmailV2", { emailMessage: oMessage });
}

// ── Move Email ─────────────────────────────────────────────────
export async function moveEmail(sMessageId, sDestinationFolderId) {
  return execOp("MoveV2", {
    messageId: sMessageId,
    folderPath: sDestinationFolderId,
  });
}

// ── Delete Email ───────────────────────────────────────────────
export async function deleteEmail(sMessageId) {
  return execOp("DeleteEmail", { messageId: sMessageId });
}

// ── Create Event ───────────────────────────────────────────────
export async function createEvent({ subject, start, end, attendees, body, location, importance, isAllDay, timeZone, calendarId } = {}) {
  var sAttendees = Array.isArray(attendees) ? attendees.join(";") : attendees;
  var oItem = {
    subject: subject,
    start: start,
    end: end,
    timeZone: timeZone || "",
  };
  if (sAttendees) oItem.requiredAttendees = sAttendees;
  if (body) oItem.body = body;
  if (location) oItem.location = location;
  if (importance) oItem.importance = importance;
  if (isAllDay) oItem.isAllDay = true;

  return execOp("V4CalendarPostItem", {
    table: calendarId || "Calendar",
    item: oItem,
  });
}

// ── List Events ────────────────────────────────────────────────
export async function listEvents({ calendarId = "Calendar", filter, orderBy, top, skip } = {}) {
  return execOp("V4CalendarGetItems", {
    table: calendarId,
    $filter: filter,
    $orderby: orderBy,
    $top: top,
    $skip: skip,
  });
}

// ── Edit Event ─────────────────────────────────────────────────
export async function editEvent(sEventId, oChangedFields, sCalendarId) {
  return execOp("V4CalendarPatchItem", {
    table: sCalendarId || "Calendar",
    id: sEventId,
    item: oChangedFields,
  });
}

// ── Delete Event ───────────────────────────────────────────────
export async function deleteEvent(sEventId, sCalendarId) {
  return execOp("CalendarDeleteItem", {
    table: sCalendarId || "Calendar",
    id: sEventId,
  });
}
