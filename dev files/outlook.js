import { getClient } from "./power-apps-data.js";

// ── Data source name (must match connectionReferences in power.config.json) ──
const DATA_SOURCE_CANDIDATES = ["office365outlook", "Office365Outlook", "office365"];
const OUTLOOK_APIS = {
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
async function execOp(operationName, parameters) {
  const client = await initClient();
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

      return unwrapResult(result);
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

// ── List Emails ────────────────────────────────────────────────
export async function listEmails({ folderId = "Inbox", fetchOnlyUnread, searchQuery, top, skip } = {}) {
  void skip;

  return execOp("GetEmailsV3", {
    folderPath: folderId,
    fetchOnlyUnread,
    searchQuery,
    top: top != null ? top : 10,
  });
}
