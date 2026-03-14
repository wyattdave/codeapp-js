
import { getItemsByName, getItems, listTables } from './sharepoint.js';

const sSiteUrl = '<SITE_URL>';
const sListName = '<LIST_NAME>';
const iTopRows = 20;

function getElementById(sId) {
  return document.getElementById(sId);
}

function setStatus(sMessage, bIsError = false) {
  const eStatusBar = getElementById('statusBar');

  if (!eStatusBar) {
    return;
  }

  eStatusBar.hidden = false;
  eStatusBar.textContent = sMessage;
  eStatusBar.dataset.state = bIsError ? 'error' : 'info';
}

function hideStatus() {
  const eStatusBar = getElementById('statusBar');

  if (!eStatusBar) {
    return;
  }

  eStatusBar.hidden = true;
}

function setMetaLabels(iRowCount) {
  const eSiteLabel = getElementById('siteLabel');
  const eListLabel = getElementById('listLabel');
  const eCountLabel = getElementById('countLabel');

  if (eSiteLabel) {
    eSiteLabel.textContent = `Site: ${sSiteUrl}`;
  }

  if (eListLabel) {
    eListLabel.textContent = `List: ${sListName}`;
  }

  if (eCountLabel) {
    eCountLabel.textContent = `Rows: ${iRowCount}`;
  }
}

function normalizeResultArray(oResult) {
  if (Array.isArray(oResult)) {
    return oResult;
  }

  if (oResult && Array.isArray(oResult.value)) {
    return oResult.value;
  }

  if (oResult && oResult.body && Array.isArray(oResult.body.value)) {
    return oResult.body.value;
  }

  if (oResult && Array.isArray(oResult.body)) {
    return oResult.body;
  }

  return [];
}

function isRenderableValue(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function getVisibleColumns(aRows) {
  const aIgnoredColumns = [
    '@odata.etag',
    'Attachments',
    'ContentTypeId',
    'GUID',
    'ComplianceAssetId',
    'odata.editLink'
  ];

  const aColumns = [];

  aRows.forEach((oRow) => {
    Object.keys(oRow || {}).forEach((sKey) => {
      const bIgnored =
        aIgnoredColumns.includes(sKey) ||
        sKey.indexOf('@odata') === 0 ||
        sKey.indexOf('_') === 0;

      if (bIgnored || aColumns.includes(sKey)) {
        return;
      }

      if (isRenderableValue(oRow[sKey])) {
        aColumns.push(sKey);
      }
    });
  });

  return aColumns;
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

function renderTable(aRows) {
  const eTable = getElementById('listTable');
  const eTableHead = getElementById('tableHead');
  const eTableBody = getElementById('tableBody');
  const eEmptyState = getElementById('emptyState');

  if (!eTable || !eTableHead || !eTableBody || !eEmptyState) {
    return;
  }

  eTableHead.innerHTML = '';
  eTableBody.innerHTML = '';

  if (!aRows.length) {
    eTable.hidden = true;
    eEmptyState.hidden = false;
    return;
  }

  const aColumns = getVisibleColumns(aRows);

  if (!aColumns.length) {
    eTable.hidden = true;
    eEmptyState.hidden = false;
    setStatus('Rows loaded, but no simple text columns were available to render.');
    return;
  }

  const eHeaderRow = document.createElement('tr');

  aColumns.forEach((sColumn) => {
    const eHeaderCell = document.createElement('th');
    eHeaderCell.textContent = sColumn;
    eHeaderRow.appendChild(eHeaderCell);
  });

  eTableHead.appendChild(eHeaderRow);

  aRows.forEach((oRow) => {
    const eBodyRow = document.createElement('tr');

    aColumns.forEach((sColumn) => {
      const eBodyCell = document.createElement('td');
      eBodyCell.textContent = formatCellValue(oRow[sColumn]);
      eBodyRow.appendChild(eBodyCell);
    });

    eTableBody.appendChild(eBodyRow);
  });

  eEmptyState.hidden = true;
  eTable.hidden = false;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getListIdentifier(oList) {
  return (
    oList?.Name ||
    oList?.name ||
    oList?.Id ||
    oList?.id ||
    oList?.TableName ||
    oList?.tableName ||
    ''
  );
}

function matchesListName(oList) {
  const sTarget = normalizeText(sListName);
  const aCandidates = [
    oList?.DisplayName,
    oList?.displayName,
    oList?.Title,
    oList?.title,
    oList?.Name,
    oList?.name
  ]
    .filter(Boolean)
    .map((value) => normalizeText(value));

  return aCandidates.includes(sTarget);
}

async function loadRowsByListName() {
  const oResult = await getItemsByName(sSiteUrl, sListName, { top: iTopRows });
  return normalizeResultArray(oResult).slice(0, iTopRows);
}

async function loadRowsByResolvedListId() {
  setStatus('List name lookup failed. Trying connector table lookup...');

  const oTablesResult = await listTables(sSiteUrl);
  const aLists = normalizeResultArray(oTablesResult);
  const oMatchedList = aLists.find((oList) => matchesListName(oList));
  const sResolvedListId = getListIdentifier(oMatchedList);

  if (!sResolvedListId) {
    throw new Error(`List '${sListName}' was not found in connector metadata.`);
  }

  const oItemsResult = await getItems(sSiteUrl, sResolvedListId, { top: iTopRows });
  return normalizeResultArray(oItemsResult).slice(0, iTopRows);
}

function shouldTryFallback(oError) {
  const sMessage = oError && oError.message ? oError.message : String(oError);
  return sMessage.indexOf('404') >= 0 || sMessage.indexOf('Resource not found') >= 0;
}

async function loadSharePointRows() {
  setStatus('Loading rows from SharePoint...');

  let aRows = [];

  try {
    aRows = await loadRowsByListName();
  } catch (oError) {
    if (!shouldTryFallback(oError)) {
      throw oError;
    }

    aRows = await loadRowsByResolvedListId();
  }

  setMetaLabels(aRows.length);
  renderTable(aRows);

  if (aRows.length) {
    hideStatus();
    return;
  }

  setStatus('The list loaded successfully, but no rows were returned.');
}

async function boot() {
  setMetaLabels(0);

  try {
    await loadSharePointRows();
  } catch (oErr) {
    const sMessage = oErr && oErr.message ? oErr.message : String(oErr);
    setStatus('SharePoint: ' + sMessage, true);
  }
}

boot();
