import { getClient } from '../power-apps-data.js';
import { _dbgTrack } from '../codeapp.js';

const DATA_SOURCE_NAME = 'sharepointonline';

const dataSourcesInfo = {
  [DATA_SOURCE_NAME]: {
    tableId: '',
    version: '',
    primaryKey: '',
    dataSourceType: 'Connector',
    apis: {
      GetItems: {
        path: '/{connectionId}/datasets/{siteUrl}/tables/{table}/items',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'table', in: 'path', required: true, type: 'string' },
          { name: '$filter', in: 'query', required: false, type: 'string' },
          { name: '$orderby', in: 'query', required: false, type: 'string' },
          { name: '$top', in: 'query', required: false, type: 'integer' },
          { name: '$skip', in: 'query', required: false, type: 'integer' },
        ],
      },
      GetItem: {
        path: '/{connectionId}/datasets/{siteUrl}/tables/{table}/items/{id}',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'table', in: 'path', required: true, type: 'string' },
          { name: 'id', in: 'path', required: true, type: 'string' },
        ],
      },
      PostItem: {
        path: '/{connectionId}/datasets/{siteUrl}/tables/{table}/items',
        method: 'POST',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'table', in: 'path', required: true, type: 'string' },
          { name: 'item', in: 'body', required: true, type: 'object' },
        ],
      },
      PatchItem: {
        path: '/{connectionId}/datasets/{siteUrl}/tables/{table}/items/{id}',
        method: 'PATCH',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'table', in: 'path', required: true, type: 'string' },
          { name: 'id', in: 'path', required: true, type: 'string' },
          { name: 'item', in: 'body', required: true, type: 'object' },
        ],
      },
      DeleteItem: {
        path: '/{connectionId}/datasets/{siteUrl}/tables/{table}/items/{id}',
        method: 'DELETE',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'table', in: 'path', required: true, type: 'string' },
          { name: 'id', in: 'path', required: true, type: 'string' },
        ],
      },
      GetItemAttachments: {
        path: '/{connectionId}/datasets/{siteUrl}/tables/{table}/items/{itemId}/attachments',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'table', in: 'path', required: true, type: 'string' },
          { name: 'itemId', in: 'path', required: true, type: 'string' },
        ],
      },
      CreateAttachment: {
        path: '/{connectionId}/datasets/{siteUrl}/tables/{table}/items/{itemId}/attachments',
        method: 'POST',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'table', in: 'path', required: true, type: 'string' },
          { name: 'itemId', in: 'path', required: true, type: 'string' },
          { name: 'displayName', in: 'query', required: true, type: 'string' },
          { name: 'body', in: 'body', required: true, type: 'string' },
        ],
      },
      DeleteAttachment: {
        path: '/{connectionId}/datasets/{siteUrl}/tables/{table}/items/{itemId}/attachments/{attachmentId}',
        method: 'DELETE',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'table', in: 'path', required: true, type: 'string' },
          { name: 'itemId', in: 'path', required: true, type: 'string' },
          { name: 'attachmentId', in: 'path', required: true, type: 'string' },
        ],
      },
      GetAttachmentContent: {
        path: '/{connectionId}/datasets/{siteUrl}/tables/{table}/items/{itemId}/attachments/{attachmentId}/content',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'table', in: 'path', required: true, type: 'string' },
          { name: 'itemId', in: 'path', required: true, type: 'string' },
          { name: 'attachmentId', in: 'path', required: true, type: 'string' },
        ],
      },
      GetTables: {
        path: '/{connectionId}/datasets/{siteUrl}/tables',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
        ],
      },
      GetDataSetsMetadata: {
        path: '/{connectionId}/datasets/{siteUrl}',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
        ],
      },
      CreateFile: {
        path: '/{connectionId}/datasets/{siteUrl}/files',
        method: 'POST',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'folderPath', in: 'query', required: true, type: 'string' },
          { name: 'name', in: 'query', required: true, type: 'string' },
          { name: 'body', in: 'body', required: true, type: 'object' },
        ],
      },
      UpdateFile: {
        path: '/{connectionId}/datasets/{siteUrl}/files/{id}',
        method: 'PUT',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'id', in: 'path', required: true, type: 'string' },
          { name: 'body', in: 'body', required: true, type: 'object' },
        ],
      },
      DeleteFile: {
        path: '/{connectionId}/datasets/{siteUrl}/files/{id}',
        method: 'DELETE',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'id', in: 'path', required: true, type: 'string' },
        ],
      },
      MoveFile: {
        path: '/{connectionId}/datasets/{siteUrl}/files/{id}/moveto',
        method: 'POST',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'id', in: 'path', required: true, type: 'string' },
          { name: 'destinationFolderPath', in: 'query', required: true, type: 'string' },
          { name: 'newFileName', in: 'query', required: false, type: 'string' },
        ],
      },
      GetFileMetadata: {
        path: '/{connectionId}/datasets/{siteUrl}/files/{id}',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'id', in: 'path', required: true, type: 'string' },
        ],
      },
      GetFileContent: {
        path: '/{connectionId}/datasets/{siteUrl}/files/{id}/content',
        method: 'GET',
        parameters: [
          { name: 'connectionId', in: 'path', required: true, type: 'string' },
          { name: 'siteUrl', in: 'path', required: true, type: 'string' },
          { name: 'id', in: 'path', required: true, type: 'string' },
        ],
      },
    },
  },
};

const sharePointListCache = new Map();
let iSharePointDebugGroupId = 0;

function isSharePointDebugContext(oValue) {
  return !!oValue
    && typeof oValue === 'object'
    && !Array.isArray(oValue)
    && Array.isArray(oValue.aCallerChain)
    && typeof oValue.sRootName === 'string'
    && oValue.sRootName.trim() !== '';
}

function createSharePointDebugContext(sFunctionName, aArgs, oParentContext) {
  if (isSharePointDebugContext(oParentContext)) {
    return {
      sRootName: oParentContext.sRootName,
      aRootArgs: oParentContext.aRootArgs,
      aCallerChain: oParentContext.aCallerChain.concat(sFunctionName),
      sGroupId: oParentContext.sGroupId,
    };
  }

  return {
    sRootName: sFunctionName,
    aRootArgs: aArgs,
    aCallerChain: [sFunctionName],
    sGroupId: 'sharepoint-' + String(++iSharePointDebugGroupId),
  };
}

function buildSharePointDebugMetadata(oDebugContext) {
  if (!isSharePointDebugContext(oDebugContext)) {
    return null;
  }

  return {
    aCallerChain: oDebugContext.aCallerChain,
    sRootName: oDebugContext.sRootName,
    aRootArgs: oDebugContext.aRootArgs,
    sGroupId: oDebugContext.sGroupId,
  };
}

function initSharePointClient() {
  return getClient(dataSourcesInfo);
}

async function executeConnectorOperation(operationName, parameters = {}, oDebugContext = null, aDebugArgs = null) {
  return _dbgTrack('SharePoint ' + operationName, aDebugArgs || [parameters], async function() {
    try {
      const oClient = await initSharePointClient();
      const oResult = await oClient.executeAsync({
        connectorOperation: {
          tableName: DATA_SOURCE_NAME,
          operationName,
          parameters,
        },
      });

      if (!oResult) {
        throw new Error('No result returned');
      }

      if (oResult.success === false) {
        throw new Error(getSpErrorMessage(oResult.error));
      }

      return Object.prototype.hasOwnProperty.call(oResult, 'data') ? oResult.data : oResult;
    } catch (oError) {
      throw new Error('SharePoint ' + operationName + ' failed: ' + getSpErrorMessage(oError));
    }
  }, buildSharePointDebugMetadata(oDebugContext));
}

function pickSharePointValue() {
  for (let iIndex = 0; iIndex < arguments.length; iIndex += 1) {
    const oValue = arguments[iIndex];
    if (oValue !== undefined && oValue !== null) {
      return oValue;
    }
  }

  return undefined;
}

function isSharePointRecord(oValue) {
  return !!oValue && typeof oValue === 'object' && !Array.isArray(oValue);
}

function getSpErrorMessage(oError) {
  if (!oError) {
    return 'Unknown error';
  }

  if (typeof oError === 'string') {
    return oError;
  }

  if (oError instanceof Error && oError.message) {
    return oError.message;
  }

  const aCandidates = [
    oError.message,
    oError.error && oError.error.message,
    oError.body && oError.body.message,
    oError.body && oError.body.error && oError.body.error.message,
    oError.data && oError.data.message,
    oError.detail,
  ];

  const sCandidate = aCandidates.find((sValue) => typeof sValue === 'string' && sValue.trim() !== '');
  if (sCandidate) {
    return sCandidate;
  }

  try {
    return JSON.stringify(oError);
  } catch (oStringifyError) {
    return String(oError);
  }
}

function requireNonEmptyString(sValue, sLabel) {
  if (typeof sValue !== 'string' || sValue.trim() === '') {
    throw new Error('SharePoint ' + sLabel + ' is required.');
  }

  return sValue.trim();
}

function requireRecord(oValue, sLabel) {
  if (!oValue || typeof oValue !== 'object' || Array.isArray(oValue)) {
    throw new Error('SharePoint ' + sLabel + ' must be an object.');
  }

  return oValue;
}

function normalizeHeaders(oHeaders) {
  if (oHeaders == null) {
    return {};
  }

  if (typeof oHeaders !== 'object' || Array.isArray(oHeaders)) {
    throw new Error('SharePoint request headers must be an object.');
  }

  return oHeaders;
}

function normalizeNumericQueryValue(value, sLabel) {
  if (value == null || value === '') {
    return null;
  }

  const iValue = Number(value);
  if (!Number.isFinite(iValue)) {
    throw new Error('SharePoint ' + sLabel + ' must be numeric.');
  }

  return iValue;
}

function requireItemId(iItemId) {
  if ((typeof iItemId !== 'string' && typeof iItemId !== 'number') || String(iItemId).trim() === '') {
    throw new Error('SharePoint item ID is required.');
  }

  return iItemId;
}

function buildSiteUrlParam(siteUrl) {
  return encodeURIComponent(requireNonEmptyString(siteUrl, 'site URL'));
}

function buildListContext(siteUrl, listId) {
  return {
    siteUrl: buildSiteUrlParam(siteUrl),
    table: requireNonEmptyString(String(listId || ''), 'list ID'),
  };
}

function buildItemQueryParameters(siteUrl, listId, { filter, orderBy, top, skip } = {}) {
  const oParameters = buildListContext(siteUrl, listId);
  if (filter) {
    oParameters.$filter = String(filter);
  }
  if (orderBy) {
    oParameters.$orderby = String(orderBy);
  }

  const iTop = normalizeNumericQueryValue(top, 'top');
  const iSkip = normalizeNumericQueryValue(skip, 'skip');
  if (iTop != null) {
    oParameters.$top = iTop;
  }
  if (iSkip != null) {
    oParameters.$skip = iSkip;
  }

  return oParameters;
}

function buildAttachmentContext(siteUrl, listId, itemId) {
  return Object.assign(buildListContext(siteUrl, listId), {
    itemId: requireItemId(itemId),
  });
}

function buildAttachmentItemContext(siteUrl, listId, itemId, attachmentId) {
  return Object.assign(buildAttachmentContext(siteUrl, listId, itemId), {
    attachmentId: requireNonEmptyString(String(attachmentId || ''), 'attachment ID'),
  });
}

function normalizeCollection(oPayload) {
  if (Array.isArray(oPayload)) {
    return oPayload;
  }

  const aCandidates = [
    oPayload,
    oPayload && oPayload.value,
    oPayload && oPayload.items,
    oPayload && oPayload.results,
    oPayload && oPayload.body,
    oPayload && oPayload.data,
    oPayload && oPayload.result,
    oPayload && oPayload.response,
    oPayload && oPayload.d && oPayload.d.results,
  ];

  const aMatch = aCandidates.find((oCandidate) => Array.isArray(oCandidate));
  return aMatch || [];
}

function normalizeSharePointLookupValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().toLowerCase();
}

function normalizeSharePointListReference(listReference) {
  if (typeof listReference === 'string' || typeof listReference === 'number') {
    const sValue = String(listReference).trim();
    if (!sValue) {
      throw new Error('SharePoint list reference is required.');
    }

    return { listName: sValue };
  }

  if (!isSharePointRecord(listReference)) {
    throw new Error('SharePoint list reference must be a string or object.');
  }

  return listReference;
}

function getSharePointTableToken(oTable) {
  const sCandidate = pickSharePointValue(
    oTable && oTable.Name,
    oTable && oTable.name,
    oTable && oTable.table,
    oTable && oTable.TableName,
    oTable && oTable.tableName,
    oTable && oTable.LogicalName,
    oTable && oTable.logicalName
  );

  return typeof sCandidate === 'string' ? sCandidate.trim() : '';
}

function getSharePointExternalListId(oTable) {
  const sCandidate = pickSharePointValue(
    oTable && oTable.Id,
    oTable && oTable.id,
    oTable && oTable.TableId,
    oTable && oTable.tableId,
    oTable && oTable.ListId,
    oTable && oTable.listId,
    oTable && oTable.UniqueId,
    oTable && oTable.uniqueId,
    getSharePointTableToken(oTable)
  );

  return typeof sCandidate === 'string' ? sCandidate.trim() : '';
}

function getSharePointTableNames(oTable) {
  const aCandidates = [
    oTable && oTable.DisplayName,
    oTable && oTable.displayName,
    oTable && oTable.Title,
    oTable && oTable.title,
    oTable && oTable.ListName,
    oTable && oTable.listName,
    oTable && oTable.Name,
    oTable && oTable.name,
  ];

  return aCandidates
    .filter((sValue, iIndex, aValues) => typeof sValue === 'string' && sValue.trim() !== '' && aValues.indexOf(sValue) === iIndex)
    .map((sValue) => sValue.trim());
}

function getSharePointPreferredListName(oTable, sFallback) {
  return pickSharePointValue(...getSharePointTableNames(oTable), sFallback, '');
}

function getSharePointListCacheKey(siteUrl, { listId, listName } = {}) {
  return [
    buildSiteUrlParam(siteUrl),
    normalizeSharePointLookupValue(listId),
    normalizeSharePointLookupValue(listName),
  ].join('::');
}

function createResolvedSharePointList(siteUrl, oTable, { listId, listName, accessLabel, matchedBy } = {}) {
  const sSiteUrl = requireNonEmptyString(siteUrl, 'site URL');
  const sTableToken = requireNonEmptyString(getSharePointTableToken(oTable) || getSharePointExternalListId(oTable), 'table token');
  const sResolvedListId = requireNonEmptyString(getSharePointExternalListId(oTable) || listId || sTableToken, 'list ID');
  const sResolvedListName = getSharePointPreferredListName(oTable, listName || sResolvedListId);
  const sAccessLabel = pickSharePointValue(accessLabel, 'Connector table API');
  const sMatchedBy = pickSharePointValue(matchedBy, 'connector table lookup');

  return {
    siteUrl: sSiteUrl,
    listId: sResolvedListId,
    listName: sResolvedListName,
    table: sTableToken,
    accessLabel: sAccessLabel,
    matchedBy: sMatchedBy,
    rawTable: oTable || null,
    sSiteUrl: sSiteUrl,
    sListId: sResolvedListId,
    sListName: sResolvedListName,
    sAccessLabel: sAccessLabel,
    sMatchedBy: sMatchedBy,
    oTable: oTable || null,
  };
}

function createConfiguredSharePointList(siteUrl, { listId, listName, accessLabel, matchedBy } = {}) {
  const sSiteUrl = requireNonEmptyString(siteUrl, 'site URL');
  const sResolvedListId = requireNonEmptyString(String(listId || ''), 'list ID');
  const sResolvedListName = requireNonEmptyString(String(listName || sResolvedListId), 'list name');
  const sAccessLabel = pickSharePointValue(accessLabel, 'Configured list ID');
  const sMatchedBy = pickSharePointValue(matchedBy, 'configured list ID');

  return {
    siteUrl: sSiteUrl,
    listId: sResolvedListId,
    listName: sResolvedListName,
    table: sResolvedListId,
    accessLabel: sAccessLabel,
    matchedBy: sMatchedBy,
    rawTable: null,
    sSiteUrl: sSiteUrl,
    sListId: sResolvedListId,
    sListName: sResolvedListName,
    sAccessLabel: sAccessLabel,
    sMatchedBy: sMatchedBy,
    oTable: null,
  };
}

function findSharePointTable(aTables, { listId, listName } = {}) {
  const sNormalizedListId = normalizeSharePointLookupValue(listId);
  const sNormalizedListName = normalizeSharePointLookupValue(listName);

  return normalizeCollection(aTables).find((oTable) => {
    const aIdCandidates = [
      getSharePointTableToken(oTable),
      getSharePointExternalListId(oTable),
    ].map((sValue) => normalizeSharePointLookupValue(sValue)).filter(Boolean);

    if (sNormalizedListId && aIdCandidates.indexOf(sNormalizedListId) !== -1) {
      return true;
    }

    if (!sNormalizedListName) {
      return false;
    }

    return getSharePointTableNames(oTable).some((sCandidate) => normalizeSharePointLookupValue(sCandidate) === sNormalizedListName);
  }) || null;
}

export const callSharePointOperation = async (operationName, parameters = {}, oDebugContext = null) => {
  if (String(operationName || '') === 'HttpRequest') {
    throw new Error('SharePoint HttpRequest is not supported in Code Apps. Use dedicated SharePoint helpers instead.');
  }
  const oCallContext = createSharePointDebugContext('callSharePointOperation', [operationName, parameters], oDebugContext);
  return executeConnectorOperation(operationName, parameters, oCallContext);
};

export const getItems = async (siteUrl, listId, { filter, orderBy, top, skip } = {}, oDebugContext = null) => {
  const oQueryOptions = { filter, orderBy, top, skip };
  const oCallContext = createSharePointDebugContext('getItems', [siteUrl, listId, oQueryOptions], oDebugContext);
  return executeConnectorOperation('GetItems', buildItemQueryParameters(siteUrl, listId, oQueryOptions), oCallContext);
};

export const getSpItem = async (siteUrl, listId, itemId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('getSpItem', [siteUrl, listId, itemId], oDebugContext);
  return executeConnectorOperation('GetItem', Object.assign(buildListContext(siteUrl, listId), {
    id: requireItemId(itemId),
  }), oCallContext);
};

export const createSpItem = async (siteUrl, listId, fields, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('createSpItem', [siteUrl, listId, fields], oDebugContext);
  return executeConnectorOperation('PostItem', Object.assign(buildListContext(siteUrl, listId), {
    item: requireRecord(fields, 'item payload'),
  }), oCallContext);
};

export const updateSpItem = async (siteUrl, listId, itemId, changedFields, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('updateSpItem', [siteUrl, listId, itemId, changedFields], oDebugContext);
  return executeConnectorOperation('PatchItem', Object.assign(buildListContext(siteUrl, listId), {
    id: requireItemId(itemId),
    item: requireRecord(changedFields, 'item payload'),
  }), oCallContext);
};

export const deleteSpItem = async (siteUrl, listId, itemId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('deleteSpItem', [siteUrl, listId, itemId], oDebugContext);
  return executeConnectorOperation('DeleteItem', Object.assign(buildListContext(siteUrl, listId), {
    id: requireItemId(itemId),
  }), oCallContext);
};

export const listTables = async (siteUrl, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('listTables', [siteUrl], oDebugContext);
  // NOTE: listTables (GetTables) only returns custom lists (Type 100).
  // System libraries like Site Pages, Shared Documents, Style Library, etc.
  // are NOT included. To access those, use getItems/getSpItem directly with
  // either the list display name (e.g. 'Site Pages') or the list GUID.
  return normalizeCollection(await executeConnectorOperation('GetTables', {
    siteUrl: buildSiteUrlParam(siteUrl),
  }, oCallContext));
};

export const listLibrary = async (siteUrl, libraryId, queryOptions = {}, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('listLibrary', [siteUrl, libraryId, queryOptions], oDebugContext);
  const sLibraryId = requireNonEmptyString(libraryId, 'library ID');
  const GUID_PATTERN = /^[{(]?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[})]?$/i;
  if (!GUID_PATTERN.test(sLibraryId)) {
    throw new Error(
      'listLibrary requires a library GUID (e.g. "ecf7e0c2-b862-469a-9eee-8a4aba5395ba"), not a display name. ' +
      'Display names return 404 for document libraries. ' +
      'Find the GUID in SharePoint site settings or browser dev tools.'
    );
  }
  return getItems(siteUrl, sLibraryId, queryOptions, oCallContext);
};

export const resolveSharePointList = async (siteUrl, listReference = {}, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('resolveSharePointList', [siteUrl, listReference], oDebugContext);
  const sSiteUrl = requireNonEmptyString(siteUrl, 'site URL');
  const oReference = normalizeSharePointListReference(listReference);
  const sListId = typeof pickSharePointValue(oReference.listId, oReference.sListId, oReference.table) === 'string' ? pickSharePointValue(oReference.listId, oReference.sListId, oReference.table).trim() : '';
  const sListName = typeof pickSharePointValue(oReference.listName, oReference.sListName, oReference.name, oReference.title) === 'string' ? pickSharePointValue(oReference.listName, oReference.sListName, oReference.name, oReference.title).trim() : '';
  const bRefresh = oReference.refresh === true;
  const bSkipTableLookup = oReference.skipTableLookup === true;

  if (!sListId && !sListName) {
    throw new Error('Provide a SharePoint listId or listName.');
  }

  const sCacheKey = getSharePointListCacheKey(sSiteUrl, { listId: sListId, listName: sListName });
  if (!bRefresh && sharePointListCache.has(sCacheKey)) {
    return sharePointListCache.get(sCacheKey);
  }

  let oResolvedList = null;
  let oLookupError = null;

  if (!bSkipTableLookup) {
    try {
      const aTables = await listTables(sSiteUrl, oCallContext);
      const oMatchedTable = findSharePointTable(aTables, {
        listId: sListId,
        listName: sListName,
      });

      if (oMatchedTable) {
        oResolvedList = createResolvedSharePointList(sSiteUrl, oMatchedTable, {
          listId: sListId,
          listName: sListName,
          matchedBy: sListId ? 'connector table ID' : 'connector table name',
        });
      }
    } catch (oError) {
      oLookupError = oError;
    }
  }

  if (!oResolvedList && sListId) {
    oResolvedList = createConfiguredSharePointList(sSiteUrl, {
      listId: sListId,
      listName: sListName,
    });
  }

  if (!oResolvedList && oLookupError) {
    throw oLookupError;
  }

  if (!oResolvedList) {
    throw new Error('SharePoint list "' + sListName + '" was not found for site ' + sSiteUrl + '.');
  }

  sharePointListCache.set(sCacheKey, oResolvedList);
  return oResolvedList;
};

export const getItemsByList = async (siteUrl, listReference, queryOptions = {}, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('getItemsByList', [siteUrl, listReference, queryOptions], oDebugContext);
  const oResolvedList = await resolveSharePointList(siteUrl, listReference, oCallContext);
  return getItems(oResolvedList.siteUrl, pickSharePointValue(oResolvedList.table, oResolvedList.listId), queryOptions, oCallContext);
};

export const getSpItemByList = async (siteUrl, listReference, itemId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('getSpItemByList', [siteUrl, listReference, itemId], oDebugContext);
  const oResolvedList = await resolveSharePointList(siteUrl, listReference, oCallContext);
  return getSpItem(oResolvedList.siteUrl, pickSharePointValue(oResolvedList.table, oResolvedList.listId), itemId, oCallContext);
};

export const createSpItemByList = async (siteUrl, listReference, fields, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('createSpItemByList', [siteUrl, listReference, fields], oDebugContext);
  const oResolvedList = await resolveSharePointList(siteUrl, listReference, oCallContext);
  return createSpItem(oResolvedList.siteUrl, pickSharePointValue(oResolvedList.table, oResolvedList.listId), fields, oCallContext);
};

export const updateSpItemByList = async (siteUrl, listReference, itemId, changedFields, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('updateSpItemByList', [siteUrl, listReference, itemId, changedFields], oDebugContext);
  const oResolvedList = await resolveSharePointList(siteUrl, listReference, oCallContext);
  return updateSpItem(oResolvedList.siteUrl, pickSharePointValue(oResolvedList.table, oResolvedList.listId), itemId, changedFields, oCallContext);
};

export const deleteSpItemByList = async (siteUrl, listReference, itemId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('deleteSpItemByList', [siteUrl, listReference, itemId], oDebugContext);
  const oResolvedList = await resolveSharePointList(siteUrl, listReference, oCallContext);
  return deleteSpItem(oResolvedList.siteUrl, pickSharePointValue(oResolvedList.table, oResolvedList.listId), itemId, oCallContext);
};

export const getItemAttachments = async (siteUrl, listId, itemId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('getItemAttachments', [siteUrl, listId, itemId], oDebugContext);
  return normalizeCollection(await executeConnectorOperation('GetItemAttachments', buildAttachmentContext(siteUrl, listId, itemId), oCallContext));
};

export const getAttachmentContent = async (siteUrl, listId, itemId, attachmentId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('getAttachmentContent', [siteUrl, listId, itemId, attachmentId], oDebugContext);
  return executeConnectorOperation('GetAttachmentContent', buildAttachmentItemContext(siteUrl, listId, itemId, attachmentId), oCallContext);
};

export const createAttachment = async (siteUrl, listId, itemId, displayName, fileContent, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('createAttachment', [siteUrl, listId, itemId, displayName, '(attachment content)'], oDebugContext);
  if (fileContent == null) {
    throw new Error('SharePoint attachment content is required.');
  }

  const sContent = typeof fileContent === 'string' ? fileContent : String(fileContent);
  const oParameters = Object.assign(buildAttachmentContext(siteUrl, listId, itemId), {
    displayName: requireNonEmptyString(displayName, 'attachment display name'),
    body: sContent,
  });

  return executeConnectorOperation('CreateAttachment', oParameters, oCallContext, [{
    siteUrl: oParameters.siteUrl,
    table: oParameters.table,
    itemId: oParameters.itemId,
    displayName: oParameters.displayName,
    body: '(attachment content)',
  }]);
};

export const deleteAttachment = async (siteUrl, listId, itemId, attachmentId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('deleteAttachment', [siteUrl, listId, itemId, attachmentId], oDebugContext);
  return executeConnectorOperation('DeleteAttachment', buildAttachmentItemContext(siteUrl, listId, itemId, attachmentId), oCallContext);
};

export const getItemAttachmentsByList = async (siteUrl, listReference, itemId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('getItemAttachmentsByList', [siteUrl, listReference, itemId], oDebugContext);
  const oResolvedList = await resolveSharePointList(siteUrl, listReference, oCallContext);
  return getItemAttachments(oResolvedList.siteUrl, pickSharePointValue(oResolvedList.table, oResolvedList.listId), itemId, oCallContext);
};

export const getAttachmentContentByList = async (siteUrl, listReference, itemId, attachmentId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('getAttachmentContentByList', [siteUrl, listReference, itemId, attachmentId], oDebugContext);
  const oResolvedList = await resolveSharePointList(siteUrl, listReference, oCallContext);
  return getAttachmentContent(oResolvedList.siteUrl, pickSharePointValue(oResolvedList.table, oResolvedList.listId), itemId, attachmentId, oCallContext);
};

export const createAttachmentByList = async (siteUrl, listReference, itemId, displayName, fileContent, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('createAttachmentByList', [siteUrl, listReference, itemId, displayName, '(attachment content)'], oDebugContext);
  const oResolvedList = await resolveSharePointList(siteUrl, listReference, oCallContext);
  return createAttachment(oResolvedList.siteUrl, pickSharePointValue(oResolvedList.table, oResolvedList.listId), itemId, displayName, fileContent, oCallContext);
};

export const deleteAttachmentByList = async (siteUrl, listReference, itemId, attachmentId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('deleteAttachmentByList', [siteUrl, listReference, itemId, attachmentId], oDebugContext);
  const oResolvedList = await resolveSharePointList(siteUrl, listReference, oCallContext);
  return deleteAttachment(oResolvedList.siteUrl, pickSharePointValue(oResolvedList.table, oResolvedList.listId), itemId, attachmentId, oCallContext);
};

export const createFile = async (siteUrl, folderPath, fileName, fileContent, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('createFile', [siteUrl, folderPath, fileName, fileContent], oDebugContext);
  return executeConnectorOperation('CreateFile', {
    siteUrl: buildSiteUrlParam(siteUrl),
    folderPath: requireNonEmptyString(folderPath, 'folder path'),
    name: requireNonEmptyString(fileName, 'file name'),
    body: fileContent,
  }, oCallContext);
};

export const createRawFile = async (siteUrl, folderPath, fileName, fileContent, oDebugContext = null) => {
  const aCallArgs = [siteUrl, folderPath, fileName, '(raw content)'];
  const oCallContext = createSharePointDebugContext('createRawFile', aCallArgs, oDebugContext);
  requireNonEmptyString(folderPath, 'folder path');
  requireNonEmptyString(fileName, 'file name');
  if (fileContent == null) {
    throw new Error('SharePoint file content is required.');
  }
  var sContent = typeof fileContent === 'string' ? fileContent : String(fileContent);
  var fnOrigStringify = JSON.stringify;
  var bIntercepted = false;
  JSON.stringify = function (oValue) {
    if (!bIntercepted && typeof oValue === 'string' && oValue === sContent) {
      bIntercepted = true;
      return oValue;
    }
    return fnOrigStringify.apply(this, arguments);
  };
  try {
    return await executeConnectorOperation('CreateFile', {
      siteUrl: buildSiteUrlParam(siteUrl),
      folderPath: folderPath.trim(),
      name: fileName.trim(),
      body: sContent,
    }, oCallContext, [{
      siteUrl: buildSiteUrlParam(siteUrl),
      folderPath: folderPath.trim(),
      name: fileName.trim(),
      body: '(raw content)',
    }]);
  } finally {
    JSON.stringify = fnOrigStringify;
  }
};

export const updateFile = async (siteUrl, fileId, fileContent, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('updateFile', [siteUrl, fileId, fileContent], oDebugContext);
  return executeConnectorOperation('UpdateFile', {
    siteUrl: buildSiteUrlParam(siteUrl),
    id: requireNonEmptyString(String(fileId || ''), 'file ID'),
    body: fileContent,
  }, oCallContext);
};

export const deleteFile = async (siteUrl, fileId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('deleteFile', [siteUrl, fileId], oDebugContext);
  return executeConnectorOperation('DeleteFile', {
    siteUrl: buildSiteUrlParam(siteUrl),
    id: requireNonEmptyString(String(fileId || ''), 'file ID'),
  }, oCallContext);
};

export const moveFile = async (siteUrl, sourceFileId, destinationFolderPath, newFileName, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('moveFile', [siteUrl, sourceFileId, destinationFolderPath, newFileName], oDebugContext);
  return executeConnectorOperation('MoveFile', {
    siteUrl: buildSiteUrlParam(siteUrl),
    id: requireNonEmptyString(String(sourceFileId || ''), 'source file ID'),
    destinationFolderPath: requireNonEmptyString(destinationFolderPath, 'destination folder path'),
    newFileName: newFileName || '',
  }, oCallContext);
};

export const getFileMetadata = async (siteUrl, fileId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('getFileMetadata', [siteUrl, fileId], oDebugContext);
  return executeConnectorOperation('GetFileMetadata', {
    siteUrl: buildSiteUrlParam(siteUrl),
    id: requireNonEmptyString(String(fileId || ''), 'file ID'),
  }, oCallContext);
};

export const getFileContent = async (siteUrl, fileId, oDebugContext = null) => {
  const oCallContext = createSharePointDebugContext('getFileContent', [siteUrl, fileId], oDebugContext);
  return executeConnectorOperation('GetFileContent', {
    siteUrl: buildSiteUrlParam(siteUrl),
    id: requireNonEmptyString(String(fileId || ''), 'file ID'),
  }, oCallContext);
};

const SharePointService = {
  callSharePointOperation,
  resolveSharePointList,
  getItems,
  getSpItem,
  createSpItem,
  updateSpItem,
  deleteSpItem,
  getItemsByList,
  getSpItemByList,
  createSpItemByList,
  updateSpItemByList,
  deleteSpItemByList,
  getItemAttachments,
  getAttachmentContent,
  createAttachment,
  deleteAttachment,
  getItemAttachmentsByList,
  getAttachmentContentByList,
  createAttachmentByList,
  deleteAttachmentByList,
  listTables,
  listLibrary,
  createFile,
  createRawFile,
  updateFile,
  deleteFile,
  moveFile,
  getFileMetadata,
  getFileContent,
};

export { SharePointService };
export default SharePointService;