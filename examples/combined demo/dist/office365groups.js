// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────── O365 Groups──────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────
import { getClient } from "./power-apps-data.js";
import {_dbgWrap,unwrapResult  } from "./codeapp.js";
// ── Data source names (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_GROUPS_CANDIDATES = ["office365groups", "Office365Groups"];

function initGroupsClient() {
  const dataSourcesInfo = {};

  DATA_SOURCE_GROUPS_CANDIDATES.forEach(function(sDataSourceName) {
    dataSourcesInfo[sDataSourceName] = {
      tableId: "",
      version: "",
      primaryKey: "",
      dataSourceType: "Connector",
      apis: {},
    };
  });

  return getClient(dataSourcesInfo);
}

function isGroupsObject(oValue) {
  return !!oValue && typeof oValue === "object" && !Array.isArray(oValue);
}

function pickGroupsValue() {
  for (let iIndex = 0; iIndex < arguments.length; iIndex += 1) {
    const oValue = arguments[iIndex];
    if (oValue !== undefined && oValue !== null) return oValue;
  }
  return undefined;
}

function setGroupsIfDefined(oTarget, sKey, oValue) {
  if (oValue !== undefined && oValue !== null) {
    oTarget[sKey] = oValue;
  }
}

function stringifyGroupsError(oError) {
  if (!oError) return "Unknown error";
  if (typeof oError === "string") return oError;
  if (typeof oError.message === "string" && oError.message) return oError.message;

  try {
    return JSON.stringify(oError);
  } catch (oErr) {
    return String(oError);
  }
}

function normalizeGroupsSelect(oValue) {
  if (Array.isArray(oValue)) return oValue.join(",");
  return oValue;
}

function extractGroupsSkipToken(sNextLink) {
  if (!sNextLink || typeof sNextLink !== "string") return undefined;

  try {
    const oUrl = new URL(sNextLink);
    return pickGroupsValue(
      oUrl.searchParams.get("$skiptoken"),
      oUrl.searchParams.get("$skipToken"),
      oUrl.searchParams.get("skiptoken"),
      oUrl.searchParams.get("skipToken")
    );
  } catch (oError) {
    return undefined;
  }
}

function getGroupsHeaderValue(oHeaders, sName) {
  if (!isGroupsObject(oHeaders)) return undefined;

  const sMatch = String(sName).toLowerCase();
  const aEntries = Object.entries(oHeaders);
  for (let iIndex = 0; iIndex < aEntries.length; iIndex += 1) {
    const [sHeaderName, oValue] = aEntries[iIndex];
    if (String(sHeaderName).toLowerCase() === sMatch) {
      return oValue;
    }
  }

  return undefined;
}

function normalizeGroupsCustomHeaders(oHeaders, aCustomHeaders) {
  const aResolved = Array.isArray(aCustomHeaders) ? aCustomHeaders.filter((oValue) => oValue != null) : [];

  if (!isGroupsObject(oHeaders)) return aResolved.slice(0, 5);

  const aEntries = Object.entries(oHeaders);
  for (let iIndex = 0; iIndex < aEntries.length; iIndex += 1) {
    const [sHeaderName, oValue] = aEntries[iIndex];
    if (oValue === undefined || oValue === null) continue;
    if (String(sHeaderName).toLowerCase() === "content-type") continue;
    aResolved.push(String(sHeaderName) + ": " + String(oValue));
    if (aResolved.length >= 5) break;
  }

  return aResolved.slice(0, 5);
}

function normalizeGroupsStartEnd(oSource, sKey) {
  const oValue = pickGroupsValue(oSource[sKey], oSource[sKey.charAt(0).toUpperCase() + sKey.slice(1)]);

  if (isGroupsObject(oValue)) {
    return {
      dateTime: pickGroupsValue(oValue.dateTime, oValue.DateTime),
      timeZone: pickGroupsValue(oValue.timeZone, oValue.TimeZone, oSource.timeZone, oSource.TimeZone, oSource.timezone),
    };
  }

  const sDateTime = pickGroupsValue(
    oSource[sKey + "DateTime"],
    oSource[sKey + "At"],
    oSource[sKey],
    oSource[sKey.charAt(0).toUpperCase() + sKey.slice(1) + "DateTime"],
    oSource[sKey.charAt(0).toUpperCase() + sKey.slice(1) + "At"]
  );

  if (sDateTime === undefined || sDateTime === null) return undefined;

  return {
    dateTime: sDateTime,
    timeZone: pickGroupsValue(oSource.timeZone, oSource.TimeZone, oSource.timezone),
  };
}

function normalizeGroupsEventBody(oSource) {
  const oBodySource = isGroupsObject(oSource.body) ? oSource.body : (isGroupsObject(oSource.Body) ? oSource.Body : null);

  if (oBodySource) {
    const oBody = {};
    setGroupsIfDefined(oBody, "content", pickGroupsValue(oBodySource.content, oBodySource.Content, oBodySource.body, oBodySource.Body));
    setGroupsIfDefined(oBody, "contentType", pickGroupsValue(oBodySource.contentType, oBodySource.ContentType, oSource.contentType, oSource.ContentType, oSource.isHtml === false ? "Text" : undefined));
    return Object.keys(oBody).length > 0 ? oBody : undefined;
  }

  const sContent = pickGroupsValue(oSource.bodyContent, oSource.description, oSource.content);
  if (sContent === undefined || sContent === null) return undefined;

  return {
    content: sContent,
    contentType: pickGroupsValue(oSource.contentType, oSource.ContentType, oSource.isHtml === false ? "Text" : "Html"),
  };
}

function normalizeGroupsEventLocation(oSource) {
  const oLocation = pickGroupsValue(oSource.location, oSource.Location);
  if (typeof oLocation === "string") {
    return { displayName: oLocation };
  }

  if (isGroupsObject(oLocation)) {
    return { displayName: pickGroupsValue(oLocation.displayName, oLocation.DisplayName) };
  }

  return undefined;
}

function normalizeGroupsEventPayload(oOptions) {
  const oSource = isGroupsObject(oOptions && oOptions.body) && pickGroupsValue(oOptions.body.subject, oOptions.body.Subject, oOptions.body.start, oOptions.body.Start)
    ? oOptions.body
    : (isGroupsObject(oOptions) ? oOptions : {});

  const oPayload = {};
  setGroupsIfDefined(oPayload, "subject", pickGroupsValue(oSource.subject, oSource.Subject, oSource.title));
  setGroupsIfDefined(oPayload, "start", normalizeGroupsStartEnd(oSource, "start"));
  setGroupsIfDefined(oPayload, "end", normalizeGroupsStartEnd(oSource, "end"));
  setGroupsIfDefined(oPayload, "body", normalizeGroupsEventBody(oSource));
  setGroupsIfDefined(oPayload, "location", normalizeGroupsEventLocation(oSource));
  setGroupsIfDefined(oPayload, "importance", pickGroupsValue(oSource.importance, oSource.Importance));
  setGroupsIfDefined(oPayload, "isAllDay", pickGroupsValue(oSource.isAllDay, oSource.IsAllDay));
  setGroupsIfDefined(oPayload, "isReminderOn", pickGroupsValue(oSource.isReminderOn, oSource.IsReminderOn));
  setGroupsIfDefined(oPayload, "reminderMinutesBeforeStart", pickGroupsValue(oSource.reminderMinutesBeforeStart, oSource.ReminderMinutesBeforeStart, oSource.reminderMinutes, oSource.reminder));
  setGroupsIfDefined(oPayload, "showAs", pickGroupsValue(oSource.showAs, oSource.ShowAs));
  setGroupsIfDefined(oPayload, "responseRequested", pickGroupsValue(oSource.responseRequested, oSource.ResponseRequested));
  return oPayload;
}

// ── Internal: execute a connector operation ────────────────────
async function execGroupsOp(operationName, parameters) {
  const client = await initGroupsClient();
  const aErrors = [];

  for (let iIndex = 0; iIndex < DATA_SOURCE_GROUPS_CANDIDATES.length; iIndex += 1) {
    const sDataSourceName = DATA_SOURCE_GROUPS_CANDIDATES[iIndex];

    try {
      const result = await client.executeAsync({
        connectorOperation: {
          tableName: sDataSourceName,
          operationName,
          parameters,
        },
      });

      return unwrapResult(result);
    } catch (oErr) {
      const sMessage = stringifyGroupsError(oErr);
      aErrors.push(sDataSourceName + ": " + sMessage);

      if (sMessage.indexOf("Connection reference not found") === -1) {
        throw oErr;
      }
    }
  }

  throw new Error("No Office 365 Groups connection reference matched. Tried: " + aErrors.join(" || "));
}

// ═══════════════════════════════════════════════════════════════
//  GENERIC
// ═══════════════════════════════════════════════════════════════

// ── Call any Office 365 Groups operation by name ───────────────
export async function callGroupsOperation(operationName, parameters = {}) {
  return _dbgWrap('callGroupsOperation', [operationName, parameters], async function() {
  return execGroupsOp(operationName, parameters);
  });
}

// ── Open HTTP Request ──────────────────────────────────────────
export async function openGroupsHttpRequest({ method = "GET", uri, headers, body, contentType, customHeaders, version, useV2, operationName } = {}) {
  return _dbgWrap('openGroupsHttpRequest', [{ method, uri, headers, body, contentType, customHeaders, version, useV2, operationName }], async function() {
  const aHeaders = normalizeGroupsCustomHeaders(headers, customHeaders);
  const sOperationName = operationName || (pickGroupsValue(version, useV2 ? 2 : undefined) === 2 ? "HttpRequestV2" : "HttpRequest");
  return execGroupsOp(sOperationName, {
    Uri: uri,
    Method: method,
    Body: body,
    ContentType: pickGroupsValue(contentType, getGroupsHeaderValue(headers, "Content-Type")),
    CustomHeader1: aHeaders[0],
    CustomHeader2: aHeaders[1],
    CustomHeader3: aHeaders[2],
    CustomHeader4: aHeaders[3],
    CustomHeader5: aHeaders[4],
  });
  });
}

// ═══════════════════════════════════════════════════════════════
//  GROUPS
// ═══════════════════════════════════════════════════════════════

// ── List My Groups ─────────────────────────────────────────────
export async function listMyGroups(oOptions = {}) {
  return _dbgWrap('listMyGroups', [oOptions], async function() {
  if (!isGroupsObject(oOptions)) {
    oOptions = {};
  }

  const iVersion = pickGroupsValue(oOptions.version, oOptions.v, 1);
  const sOperationName = iVersion === 3 ? "ListOwnedGroups_V3" : (iVersion === 2 ? "ListOwnedGroups_V2" : "ListOwnedGroups");
  const params = {};
  setGroupsIfDefined(params, "extractSensitivityLabel", oOptions.extractSensitivityLabel);
  setGroupsIfDefined(params, "fetchSensitivityLabelMetadata", oOptions.fetchSensitivityLabelMetadata);
  return execGroupsOp(sOperationName, params);
  });
}

// ── List Members of a Group ────────────────────────────────────
export async function listGroupMembers(groupId, oOptions) {
  return _dbgWrap('listGroupMembers', [groupId, oOptions], async function() {
  if (isGroupsObject(groupId)) {
    oOptions = groupId;
    groupId = pickGroupsValue(oOptions.groupId, oOptions.id);
  }

  oOptions = isGroupsObject(oOptions) ? oOptions : {};
  const params = { groupId };
  setGroupsIfDefined(params, "$top", pickGroupsValue(oOptions.top, oOptions.$top));
  return execGroupsOp("ListGroupMembers", params);
  });
}

export async function listOwnedGroups(oOptions = {}) {
  return _dbgWrap('listOwnedGroups', [oOptions], async function() {
  return listMyGroups(oOptions);
  });
}

export async function listGroups(oOptions = {}) {
  return _dbgWrap('listGroups', [oOptions], async function() {
  oOptions = isGroupsObject(oOptions) ? oOptions : {};
  const params = {};
  setGroupsIfDefined(params, "extractSensitivityLabel", oOptions.extractSensitivityLabel);
  setGroupsIfDefined(params, "fetchSensitivityLabelMetadata", oOptions.fetchSensitivityLabelMetadata);
  setGroupsIfDefined(params, "$filter", pickGroupsValue(oOptions.filter, oOptions.$filter));
  setGroupsIfDefined(params, "$top", pickGroupsValue(oOptions.top, oOptions.$top));

  const oSkipToken = pickGroupsValue(
    oOptions.skipToken,
    oOptions.$skipToken,
    oOptions.$skiptoken,
    extractGroupsSkipToken(oOptions.nextLink),
    oOptions.skip
  );

  if (oSkipToken !== undefined && oSkipToken !== null) {
    params.$skiptoken = String(oSkipToken);
  }

  return execGroupsOp("ListGroups", params);
  });
}

export async function onGroupMembershipChange(groupId, oOptions = {}) {
  return _dbgWrap('onGroupMembershipChange', [groupId, oOptions], async function() {
  if (isGroupsObject(groupId)) {
    oOptions = groupId;
    groupId = pickGroupsValue(oOptions.groupId, oOptions.id);
  }

  oOptions = isGroupsObject(oOptions) ? oOptions : {};
  return execGroupsOp("OnGroupMembershipChange", {
    groupId,
    $select: normalizeGroupsSelect(pickGroupsValue(oOptions.select, oOptions.$select)),
  });
  });
}

export async function addMemberToGroup(userUpn, groupId) {
  return _dbgWrap('addMemberToGroup', [userUpn, groupId], async function() {
  if (isGroupsObject(userUpn)) {
    groupId = pickGroupsValue(userUpn.groupId, userUpn.id);
    userUpn = pickGroupsValue(userUpn.userUpn, userUpn.upn, userUpn.userPrincipalName, userUpn.email, userUpn.mail);
  }

  return execGroupsOp("AddMemberToGroup", {
    userUpn,
    groupId,
  });
  });
}

export async function removeMemberFromGroup(userUpn, groupId) {
  return _dbgWrap('removeMemberFromGroup', [userUpn, groupId], async function() {
  if (isGroupsObject(userUpn)) {
    groupId = pickGroupsValue(userUpn.groupId, userUpn.id);
    userUpn = pickGroupsValue(userUpn.userUpn, userUpn.upn, userUpn.userPrincipalName, userUpn.email, userUpn.mail);
  }

  return execGroupsOp("RemoveMemberFromGroup", {
    userUpn,
    groupId,
  });
  });
}

export async function createGroupEvent(groupId, oBodyOrOptions) {
  return _dbgWrap('createGroupEvent', [groupId, oBodyOrOptions], async function() {
  let oOptions = isGroupsObject(oBodyOrOptions) ? oBodyOrOptions : {};

  if (isGroupsObject(groupId)) {
    oOptions = groupId;
    groupId = pickGroupsValue(oOptions.groupId, oOptions.id);
  }

  const iVersion = pickGroupsValue(oOptions.version, oOptions.v, 2);
  return execGroupsOp(iVersion === 1 ? "CreateCalendarEvent" : "CreateCalendarEventV2", {
    groupId,
    body: normalizeGroupsEventPayload(oOptions),
  });
  });
}

export async function updateGroupEvent(sEventId, oBodyOrOptions, sGroupId) {
  return _dbgWrap('updateGroupEvent', [sEventId, oBodyOrOptions, sGroupId], async function() {
  let oOptions = isGroupsObject(oBodyOrOptions) ? oBodyOrOptions : {};

  if (isGroupsObject(sEventId)) {
    oOptions = sEventId;
    sEventId = pickGroupsValue(oOptions.eventId, oOptions.id, oOptions.event);
    sGroupId = pickGroupsValue(oOptions.groupId, oOptions.group, oOptions.ownerGroupId);
  }

  return execGroupsOp("UpdateCalendarEvent", {
    event: sEventId,
    groupId: pickGroupsValue(oOptions.groupId, sGroupId),
    body: normalizeGroupsEventPayload(oOptions),
  });
  });
}

export async function deleteGroupEvent(sEventId, sGroupId) {
  return _dbgWrap('deleteGroupEvent', [sEventId, sGroupId], async function() {
  if (isGroupsObject(sEventId)) {
    sGroupId = pickGroupsValue(sEventId.groupId, sEventId.group, sEventId.ownerGroupId);
    sEventId = pickGroupsValue(sEventId.eventId, sEventId.id, sEventId.event);
  }

  return execGroupsOp("CalendarDeleteItem_V2", {
    event: sEventId,
    groupId: sGroupId,
  });
  });
}

export async function onNewGroupEvent(groupId) {
  return _dbgWrap('onNewGroupEvent', [groupId], async function() {
  if (isGroupsObject(groupId)) {
    groupId = pickGroupsValue(groupId.groupId, groupId.id);
  }

  return execGroupsOp("OnNewEvent", {
    groupId,
  });
  });
}

export async function listDeletedGroups() {
  return _dbgWrap('listDeletedGroups', [], async function() {
  return execGroupsOp("ListDeletedGroups", {});
  });
}

export async function restoreDeletedGroup(groupId) {
  return _dbgWrap('restoreDeletedGroup', [groupId], async function() {
  if (isGroupsObject(groupId)) {
    groupId = pickGroupsValue(groupId.groupId, groupId.id);
  }

  return execGroupsOp("RestoreDeletedGroup", {
    groupId,
  });
  });
}

export async function listDeletedGroupsByOwner(userId) {
  return _dbgWrap('listDeletedGroupsByOwner', [userId], async function() {
  if (isGroupsObject(userId)) {
    userId = pickGroupsValue(userId.userId, userId.id, userId.ownerId);
  }

  return execGroupsOp("ListDeletedGroupsByOwner", {
    userId,
  });
  });
}