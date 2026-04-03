import { enableDebugger } from "./codeapp.js";

enableDebugger();

import {
  createSpItem,
  deleteSpItem,
  getItems,
  listTables,
  updateSpItem,
} from './sharepoint.js';

const oAppConfig = {
  sAppName: 'SharePoint Demo App',
  sSiteUrl: 'https://37wcqv.sharepoint.com/sites/testsite',
  sListName: 'Test List',
};

const aSystemFieldNames = [
  'ID',
  'Id',
  'GUID',
  'Modified',
  'Created',
  'Author',
  'AuthorId',
  'Editor',
  'EditorId',
  'Attachments',
  'FileRef',
  'FileLeafRef',
  'ContentType',
  'ContentTypeId',
  'ComplianceAssetId',
  'FolderChildCount',
  'ItemChildCount',
  '_UIVersionString',
  '_ModerationStatus',
  '_ModerationComments',
  'AppAuthor',
  'AppEditor',
  'LinkTitleNoMenu',
  'LinkTitle',
  'Edit',
  'DocIcon',
  'Order',
  'SortBehavior',
  'WorkflowVersion',
];

const oState = {
  eRoot: null,
  oListAccess: null,
  aItems: [],
  aFields: [],
  sError: '',
  sNotice: '',
  bLoading: true,
  bRefreshing: false,
  bSubmittingCreate: false,
  bSubmittingEdit: false,
  iSelectedItemId: null,
};

async function boot() {
  oState.eRoot = document.getElementById('root');
  if (!oState.eRoot) {
    throw new Error('Root element not found.');
  }

  oState.eRoot.addEventListener('click', handleRootClick);
  oState.eRoot.addEventListener('submit', handleRootSubmit);

  renderApp();
  await initializeApp();
}

async function initializeApp() {
  try {
    oState.oListAccess = await resolveListAccess();
    await refreshAppData({ bPreserveSelection: false });
    oState.sNotice = 'Connected to ' + oState.oListAccess.sListName + ' and ready for CRUD operations.';
  } catch (oError) {
    oState.sError = getErrorMessage(oError);
  } finally {
    oState.bLoading = false;
    renderApp();
  }
}

async function resolveListAccess() {
  try {
    const oTableAccess = await resolveListAccessFromTables();
    if (oTableAccess) {
      return oTableAccess;
    }
  } catch (oError) {
    throw new Error('SharePoint table lookup failed: ' + getErrorMessage(oError));
  }

  throw new Error('The SharePoint list "' + oAppConfig.sListName + '" could not be resolved through connector table lookup. Configure a real SharePoint list ID or expose a matching list through listTables.');
}

async function resolveListAccessFromTables() {
  const oTablesResponse = await listTables(oAppConfig.sSiteUrl);
  const aTables = normalizeCollection(oTablesResponse);
  const sTargetName = normalizeString(oAppConfig.sListName);
  const oMatchedTable = aTables.find(function(oTable) {
    return getListTableNames(oTable).some(function(sCandidate) {
      return normalizeString(sCandidate) === sTargetName;
    });
  });

  if (!oMatchedTable) {
    return null;
  }

  const sListId = getTableId(oMatchedTable);
  if (!sListId) {
    throw new Error('The SharePoint connector returned the list but did not expose a usable list identifier.');
  }

  return {
    sSiteUrl: oAppConfig.sSiteUrl,
    sListName: getPreferredListName(oMatchedTable),
    sListId: sListId,
    sAccessLabel: 'Connector table API',
  };
}

async function refreshAppData({ bPreserveSelection } = { bPreserveSelection: true }) {
  const aItems = await fetchItems();
  const aFields = await loadFieldDefinitions(aItems);
  oState.aItems = sortItemsDescending(aItems);
  oState.aFields = aFields;

  const iExistingSelection = bPreserveSelection ? oState.iSelectedItemId : null;
  const bSelectionStillExists = iExistingSelection != null && oState.aItems.some(function(oItem) {
    return getItemId(oItem) === iExistingSelection;
  });

  oState.iSelectedItemId = bSelectionStillExists ? iExistingSelection : (oState.aItems[0] ? getItemId(oState.aItems[0]) : null);
}

async function fetchItems() {
  const oResponse = await getItems(oState.oListAccess.sSiteUrl, oState.oListAccess.sListId, { top: 200 });
  return normalizeCollection(oResponse);
}

async function loadFieldDefinitions(aItems) {
  return ensureTitleField(sortFields(deriveFieldsFromItems(aItems)));
}

function deriveFieldsFromItems(aItems) {
  const oFieldMap = new Map();

  aItems.forEach(function(oItem) {
    Object.entries(oItem || {}).forEach(function([sName, value]) {
      if (isSystemField(sName) || !isEditablePrimitive(value)) {
        return;
      }

      if (!oFieldMap.has(sName)) {
        oFieldMap.set(sName, {
          sName: sName,
          sLabel: toLabel(sName),
          sType: inferFieldTypeFromValue(value),
          bRequired: sName === 'Title',
          aChoices: [],
          sDefaultValue: '',
        });
      }
    });
  });

  return Array.from(oFieldMap.values());
}

function ensureTitleField(aFields) {
  const bHasTitle = aFields.some(function(oField) {
    return oField.sName === 'Title';
  });

  if (!bHasTitle) {
    aFields.unshift({
      sName: 'Title',
      sLabel: 'Title',
      sType: 'Text',
      bRequired: true,
      aChoices: [],
      sDefaultValue: '',
    });
  }

  return aFields;
}

function sortFields(aFields) {
  return aFields.slice().sort(function(oLeft, oRight) {
    if (oLeft.sName === 'Title') return -1;
    if (oRight.sName === 'Title') return 1;
    if (oLeft.bRequired !== oRight.bRequired) return oLeft.bRequired ? -1 : 1;
    return oLeft.sLabel.localeCompare(oRight.sLabel);
  });
}

function renderApp() {
  const oSelectedItem = getSelectedItem();
  const aPreviewFields = getPreviewFields();

  oState.eRoot.innerHTML = `
    <main class="app-shell">
      <section class="hero">
        <div>
          <p class="eyebrow">SharePoint Integration Demo</p>
          <h1>${escapeHtml(oAppConfig.sAppName)}</h1>
          <p>Browse live list items, add a new record, edit the selected entry, and delete records without leaving the page. The form adapts to your list fields when SharePoint metadata is available.</p>
          ${renderStatusMarkup()}
          <div class="pill-row">
            <span class="pill"><b>Mode</b>${escapeHtml(oState.oListAccess ? oState.oListAccess.sAccessLabel : 'Connecting')}</span>
            <span class="pill"><b>List</b>${escapeHtml(oState.oListAccess ? oState.oListAccess.sListName : oAppConfig.sListName)}</span>
            <span class="pill"><b>Editable Fields</b>${String(oState.aFields.length)}</span>
          </div>
        </div>
        <div class="hero-meta">
          <div class="meta-card">
            <span class="meta-label">SharePoint Site</span>
            <span class="meta-value mono">${escapeHtml(oAppConfig.sSiteUrl)}</span>
          </div>
          <div class="meta-card">
            <span class="meta-label">Configured List</span>
            <span class="meta-value">${escapeHtml(oAppConfig.sListName)}</span>
          </div>
          <div class="meta-card">
            <span class="meta-label">Demo Focus</span>
            <span class="meta-value">List items, connector table discovery, and table-ID CRUD forms.</span>
          </div>
        </div>
      </section>

      <section class="metrics">
        <article class="metric">
          <span class="metric-label">Total Items</span>
          <span class="metric-value">${String(oState.aItems.length)}</span>
        </article>
        <article class="metric">
          <span class="metric-label">Selected Item</span>
          <span class="metric-value">${oSelectedItem ? String(getItemId(oSelectedItem)) : '0'}</span>
        </article>
        <article class="metric">
          <span class="metric-label">Connection State</span>
          <span class="metric-value">${oState.bLoading ? '...' : 'Live'}</span>
        </article>
      </section>

      <section class="panel-grid">
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Add Record</h2>
              <p>Create a new SharePoint item using discovered fields. Required columns are marked automatically when metadata is available.</p>
            </div>
          </div>
          ${renderCreateForm()}
        </article>

        <section>
          <article class="panel">
            <div class="panel-header">
              <div>
                <h2>List Items</h2>
                <p>All fetched records are shown below. Select a row to edit it or delete it directly from the table.</p>
              </div>
              <div class="button-row">
                <button class="button-ghost" type="button" data-action="refresh" ${isActionDisabled() ? 'disabled' : ''}>${oState.bRefreshing ? 'Refreshing...' : 'Refresh list'}</button>
              </div>
            </div>
            ${renderTableMarkup(aPreviewFields)}
          </article>

          <article class="editor-panel">
            ${renderEditorMarkup(oSelectedItem)}
          </article>
        </section>
      </section>
    </main>
  `;
}

function renderStatusMarkup() {
  if (!oState.sError && !oState.sNotice && !oState.bLoading) {
    return '';
  }

  if (oState.sError) {
    return `
      <div class="status" data-tone="error">
        <div>!</div>
        <div>
          <strong>Connection or operation error</strong>
          <div>${escapeHtml(oState.sError)}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="status" data-tone="success">
      <div>${oState.bLoading ? '...' : 'OK'}</div>
      <div>
        <strong>${oState.bLoading ? 'Connecting to SharePoint' : 'Ready'}</strong>
        <div>${escapeHtml(oState.bLoading ? 'Loading list configuration and items.' : oState.sNotice)}</div>
      </div>
    </div>
  `;
}

function renderCreateForm() {
  return `
    <form id="create-form" class="field-grid">
      ${renderFieldInputs(null, 'create')}
      <p class="helper-text">Use advanced payload overrides if your list has additional complex columns you want to send manually.</p>
      <details class="details-box">
        <summary>Advanced payload overrides</summary>
        <div class="details-inner">
          <div class="field">
            <label for="create-overrides">JSON object merged into the create request</label>
            <textarea id="create-overrides" name="payloadOverrides">{}</textarea>
          </div>
        </div>
      </details>
      <div class="button-row">
        <button class="button" type="submit" ${isActionDisabled() ? 'disabled' : ''}>${oState.bSubmittingCreate ? 'Adding...' : 'Add item'}</button>
        <button class="button-ghost" type="reset" data-action="refresh" ${isActionDisabled() ? 'disabled' : ''}>Reload defaults</button>
      </div>
    </form>
  `;
}

function renderTableMarkup(aPreviewFields) {
  if (oState.bLoading) {
    return '<div class="empty-state">Loading list items from SharePoint.</div>';
  }

  if (oState.aItems.length === 0) {
    return '<div class="empty-state">No items were returned from the list yet. Use the create form to add the first record.</div>';
  }

  const sHeaderCells = aPreviewFields.map(function(oField) {
    return '<th scope="col">' + escapeHtml(oField.sLabel) + '</th>';
  }).join('');

  const sRows = oState.aItems.map(function(oItem) {
    const iItemId = getItemId(oItem);
    const bIsSelected = iItemId === oState.iSelectedItemId;
    const sTitle = getPrimaryTitle(oItem);
    const sPreviewCells = aPreviewFields.map(function(oField) {
      return '<td data-label="' + escapeHtml(oField.sLabel) + '">' + escapeHtml(formatPreviewValue(oItem[oField.sName])) + '</td>';
    }).join('');

    return `
      <tr class="item-row ${bIsSelected ? 'is-selected' : ''}" data-select-item="${String(iItemId)}">
        <td data-label="Record">
          <span class="row-title">${escapeHtml(sTitle)}</span>
          <span class="row-subtitle">ID ${String(iItemId)}</span>
        </td>
        ${sPreviewCells}
        <td data-label="Actions">
          <div class="table-actions">
            <button class="button-ghost" type="button" data-select-item="${String(iItemId)}">Edit</button>
            <button class="button-danger" type="button" data-delete-item="${String(iItemId)}" ${isActionDisabled() ? 'disabled' : ''}>Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-wrap">
      <table class="item-table">
        <thead>
          <tr>
            <th scope="col">Record</th>
            ${sHeaderCells}
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>${sRows}</tbody>
      </table>
    </div>
  `;
}

function renderEditorMarkup(oSelectedItem) {
  if (!oSelectedItem) {
    return `
      <div class="editor-empty">
        Select a record from the table to inspect and update its fields. Delete is also available here for the active selection.
      </div>
    `;
  }

  return `
    <div class="editor-head">
      <div>
        <span class="tag">Selected record</span>
        <h2>${escapeHtml(getPrimaryTitle(oSelectedItem))}</h2>
        <p>Edit the fields below, then save the record back to SharePoint.</p>
      </div>
      <div class="muted">Item ID ${String(getItemId(oSelectedItem))}</div>
    </div>
    <form id="edit-form" class="field-grid" data-item-id="${String(getItemId(oSelectedItem))}">
      ${renderFieldInputs(oSelectedItem, 'edit')}
      <details class="details-box">
        <summary>Advanced payload overrides</summary>
        <div class="details-inner">
          <div class="field">
            <label for="edit-overrides">JSON object merged into the update request</label>
            <textarea id="edit-overrides" name="payloadOverrides">{}</textarea>
          </div>
          <p class="helper-text">Current item snapshot:</p>
          <div class="field">
            <textarea readonly>${escapeHtml(JSON.stringify(oSelectedItem, null, 2))}</textarea>
          </div>
        </div>
      </details>
      <div class="button-row">
        <button class="button" type="submit" ${isActionDisabled() ? 'disabled' : ''}>${oState.bSubmittingEdit ? 'Saving...' : 'Save changes'}</button>
        <button class="button-danger" type="button" data-delete-item="${String(getItemId(oSelectedItem))}" ${isActionDisabled() ? 'disabled' : ''}>Delete item</button>
      </div>
    </form>
  `;
}

function renderFieldInputs(oItem, sFormMode) {
  return oState.aFields.map(function(oField) {
    const value = oItem ? oItem[oField.sName] : (oField.sDefaultValue || '');
    return renderFieldMarkup(oField, value, sFormMode);
  }).join('');
}

function renderFieldMarkup(oField, value, sFormMode) {
  const sFieldName = 'field:' + oField.sName;
  const sId = sFormMode + '-' + oField.sName;
  const sRequired = oField.bRequired ? 'required' : '';
  const sLabel = escapeHtml(oField.sLabel);

  if (oField.sType === 'Boolean') {
    return `
      <div class="field">
        <label for="${escapeHtml(sId)}"><span>${sLabel}${oField.bRequired ? '<em>required</em>' : ''}</span></label>
        <label class="checkbox-field" for="${escapeHtml(sId)}">
          <input id="${escapeHtml(sId)}" name="${escapeHtml(sFieldName)}" type="checkbox" ${value ? 'checked' : ''} />
          <span>${value ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>
    `;
  }

  if (oField.sType === 'Choice' && oField.aChoices.length > 0) {
    const sOptions = ['<option value="">Select a value</option>'].concat(oField.aChoices.map(function(sChoice) {
      const bSelected = String(value || '') === String(sChoice);
      return '<option value="' + escapeHtml(String(sChoice)) + '" ' + (bSelected ? 'selected' : '') + '>' + escapeHtml(String(sChoice)) + '</option>';
    })).join('');

    return `
      <div class="field">
        <label for="${escapeHtml(sId)}"><span>${sLabel}${oField.bRequired ? '<em>required</em>' : ''}</span></label>
        <select id="${escapeHtml(sId)}" name="${escapeHtml(sFieldName)}" ${sRequired}>${sOptions}</select>
      </div>
    `;
  }

  if (oField.sType === 'Note') {
    return `
      <div class="field">
        <label for="${escapeHtml(sId)}"><span>${sLabel}${oField.bRequired ? '<em>required</em>' : ''}</span></label>
        <textarea id="${escapeHtml(sId)}" name="${escapeHtml(sFieldName)}" ${sRequired}>${escapeHtml(formatInputValue(oField, value))}</textarea>
      </div>
    `;
  }

  const sType = oField.sType === 'Number' ? 'number' : (oField.sType === 'DateTime' ? 'datetime-local' : 'text');
  const sStep = oField.sType === 'Number' ? 'step="any"' : '';

  return `
    <div class="field">
      <label for="${escapeHtml(sId)}"><span>${sLabel}${oField.bRequired ? '<em>required</em>' : ''}</span></label>
      <input id="${escapeHtml(sId)}" name="${escapeHtml(sFieldName)}" type="${sType}" value="${escapeAttribute(formatInputValue(oField, value))}" ${sRequired} ${sStep} />
    </div>
  `;
}

async function handleRootClick(oEvent) {
  const eAction = oEvent.target.closest('[data-action], [data-select-item], [data-delete-item]');
  if (!eAction) {
    return;
  }

  if (eAction.hasAttribute('data-select-item')) {
    const iItemId = Number(eAction.getAttribute('data-select-item'));
    if (!Number.isNaN(iItemId)) {
      oState.iSelectedItemId = iItemId;
      oState.sError = '';
      oState.sNotice = 'Editing item ' + String(iItemId) + '.';
      renderApp();
    }
    return;
  }

  if (eAction.hasAttribute('data-delete-item')) {
    const iItemId = Number(eAction.getAttribute('data-delete-item'));
    if (!Number.isNaN(iItemId)) {
      await handleDelete(iItemId);
    }
    return;
  }

  const sAction = eAction.getAttribute('data-action');
  if (sAction === 'refresh') {
    await handleRefresh();
  }
}

async function handleRootSubmit(oEvent) {
  oEvent.preventDefault();
  const eForm = oEvent.target;
  if (!(eForm instanceof HTMLFormElement)) {
    return;
  }

  if (eForm.id === 'create-form') {
    await handleCreateSubmit(eForm);
    return;
  }

  if (eForm.id === 'edit-form') {
    await handleEditSubmit(eForm);
  }
}

async function handleRefresh() {
  oState.bRefreshing = true;
  oState.sError = '';
  oState.sNotice = 'Refreshing items from SharePoint.';
  renderApp();

  try {
    await refreshAppData({ bPreserveSelection: true });
    oState.sNotice = 'List refreshed successfully.';
  } catch (oError) {
    oState.sError = getErrorMessage(oError);
  } finally {
    oState.bRefreshing = false;
    renderApp();
  }
}

async function handleCreateSubmit(eForm) {
  let oPayload;
  try {
    oPayload = buildPayloadFromForm(eForm);
  } catch (oError) {
    oState.sError = getErrorMessage(oError);
    renderApp();
    return;
  }

  oState.bSubmittingCreate = true;
  oState.sError = '';
  oState.sNotice = 'Creating a new SharePoint item.';
  renderApp();

  try {
    const oResult = await createListItem(oPayload);
    await refreshAppData({ bPreserveSelection: false });
    const iCreatedItemId = getItemId(oResult);
    if (iCreatedItemId != null) {
      oState.iSelectedItemId = iCreatedItemId;
    }
    oState.sNotice = 'New item created successfully.';
  } catch (oError) {
    oState.sError = getErrorMessage(oError);
  } finally {
    oState.bSubmittingCreate = false;
    renderApp();
  }
}

async function handleEditSubmit(eForm) {
  const iItemId = Number(eForm.getAttribute('data-item-id'));
  let oPayload;
  try {
    oPayload = buildPayloadFromForm(eForm);
  } catch (oError) {
    oState.sError = getErrorMessage(oError);
    renderApp();
    return;
  }

  oState.bSubmittingEdit = true;
  oState.sError = '';
  oState.sNotice = 'Saving changes to item ' + String(iItemId) + '.';
  renderApp();

  try {
    await updateListItem(iItemId, oPayload);
    await refreshAppData({ bPreserveSelection: true });
    oState.sNotice = 'Item ' + String(iItemId) + ' updated successfully.';
  } catch (oError) {
    oState.sError = getErrorMessage(oError);
  } finally {
    oState.bSubmittingEdit = false;
    renderApp();
  }
}

async function handleDelete(iItemId) {
  if (!window.confirm('Delete SharePoint item ' + String(iItemId) + '?')) {
    return;
  }

  oState.bSubmittingEdit = true;
  oState.sError = '';
  oState.sNotice = 'Deleting item ' + String(iItemId) + '.';
  renderApp();

  try {
    await deleteListItem(iItemId);
    await refreshAppData({ bPreserveSelection: false });
    oState.sNotice = 'Item ' + String(iItemId) + ' deleted successfully.';
  } catch (oError) {
    oState.sError = getErrorMessage(oError);
  } finally {
    oState.bSubmittingEdit = false;
    renderApp();
  }
}

async function createListItem(oPayload) {
  return createSpItem(oState.oListAccess.sSiteUrl, oState.oListAccess.sListId, oPayload);
}

async function updateListItem(iItemId, oPayload) {
  return updateSpItem(oState.oListAccess.sSiteUrl, oState.oListAccess.sListId, iItemId, oPayload);
}

async function deleteListItem(iItemId) {
  return deleteSpItem(oState.oListAccess.sSiteUrl, oState.oListAccess.sListId, iItemId);
}

function buildPayloadFromForm(eForm) {
  const oPayload = {};

  oState.aFields.forEach(function(oField) {
    const eField = eForm.elements.namedItem('field:' + oField.sName);
    if (!eField) {
      return;
    }
    oPayload[oField.sName] = readFieldValue(oField, eField);
  });

  const eOverridesField = eForm.elements.namedItem('payloadOverrides');
  const sOverrides = eOverridesField && 'value' in eOverridesField ? String(eOverridesField.value || '').trim() : '';
  if (sOverrides) {
    const oOverrides = JSON.parse(sOverrides);
    if (!oOverrides || Array.isArray(oOverrides) || typeof oOverrides !== 'object') {
      throw new Error('Advanced payload overrides must be a JSON object.');
    }
    return Object.assign(oPayload, oOverrides);
  }

  return oPayload;
}

function readFieldValue(oField, eField) {
  if (oField.sType === 'Boolean' && eField instanceof HTMLInputElement) {
    return eField.checked;
  }

  const sValue = 'value' in eField ? String(eField.value || '') : '';
  if (oField.sType === 'Number') {
    return sValue === '' ? null : Number(sValue);
  }
  if (oField.sType === 'DateTime') {
    return sValue === '' ? null : new Date(sValue).toISOString();
  }
  return sValue;
}

function getSelectedItem() {
  return oState.aItems.find(function(oItem) {
    return getItemId(oItem) === oState.iSelectedItemId;
  }) || null;
}

function getPreviewFields() {
  return oState.aFields.filter(function(oField) {
    return oField.sName !== 'Title';
  }).slice(0, 3);
}

function normalizeCollection(oPayload) {
  if (oPayload && typeof oPayload === 'object') {
    const aNestedCandidates = [
      oPayload.value,
      oPayload.items,
      oPayload.results,
      oPayload.body,
      oPayload.data,
      oPayload.result,
      oPayload.d,
      oPayload.response,
    ];

    for (const oCandidate of aNestedCandidates) {
      const aNormalizedCandidate = normalizeCollectionCandidate(oCandidate);
      if (aNormalizedCandidate) {
        return aNormalizedCandidate;
      }
    }
  }

  return normalizeCollectionCandidate(oPayload) || [];
}

function normalizeCollectionCandidate(oPayload) {
  if (Array.isArray(oPayload)) {
    return oPayload;
  }
  if (oPayload && Array.isArray(oPayload.value)) {
    return oPayload.value;
  }
  if (oPayload && oPayload.d && Array.isArray(oPayload.d.results)) {
    return oPayload.d.results;
  }
  if (oPayload && Array.isArray(oPayload.items)) {
    return oPayload.items;
  }
  if (oPayload && Array.isArray(oPayload.results)) {
    return oPayload.results;
  }
  return null;
}

function sortItemsDescending(aItems) {
  return aItems.slice().sort(function(oLeft, oRight) {
    return Number(getItemId(oRight) || 0) - Number(getItemId(oLeft) || 0);
  });
}

function getItemId(oItem) {
  if (!oItem || typeof oItem !== 'object') {
    return null;
  }
  return oItem.ID ?? oItem.Id ?? oItem.id ?? null;
}

function getPrimaryTitle(oItem) {
  return String(oItem.Title || oItem.title || 'Untitled item');
}

function formatPreviewValue(value) {
  if (value == null || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return '[complex value]';
  }
  return String(value);
}

function formatInputValue(oField, value) {
  if (value == null) {
    return '';
  }
  if (oField.sType === 'DateTime') {
    const oDate = new Date(value);
    if (Number.isNaN(oDate.getTime())) {
      return '';
    }
    const iTimezoneOffset = oDate.getTimezoneOffset();
    const oLocalDate = new Date(oDate.getTime() - (iTimezoneOffset * 60000));
    return oLocalDate.toISOString().slice(0, 16);
  }
  return String(value);
}

function normalizeChoices(choices) {
  if (Array.isArray(choices)) {
    return choices;
  }
  if (choices && Array.isArray(choices.results)) {
    return choices.results;
  }
  return [];
}

function inferFieldTypeFromValue(value) {
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') return 'Number';
  if (typeof value === 'string' && value.length > 80) return 'Note';
  if (typeof value === 'string' && !Number.isNaN(new Date(value).getTime()) && value.includes('T')) return 'DateTime';
  return 'Text';
}

function isEditablePrimitive(value) {
  return value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function isSystemField(sFieldName) {
  return aSystemFieldNames.includes(sFieldName);
}

function getTableId(oTable) {
  return oTable.Id
    || oTable.id
    || oTable.TableId
    || oTable.tableId
    || oTable.TableName
    || oTable.tableName
    || oTable.EntitySetName
    || oTable.entitySetName
    || oTable.Name
    || oTable.name
    || null;
}

function getPreferredListName(oTable) {
  return oTable.DisplayName || oTable.displayName || oTable.Title || oTable.title || oAppConfig.sListName;
}

function getListTableNames(oTable) {
  return [
    oTable.DisplayName,
    oTable.displayName,
    oTable.Title,
    oTable.title,
    oTable.TableName,
    oTable.tableName,
    oTable.Name,
    oTable.name,
    oTable.EntitySetName,
    oTable.entitySetName,
  ].filter(Boolean);
}

function normalizeString(sValue) {
  return String(sValue || '').trim().toLowerCase();
}

function getErrorMessage(oError) {
  if (!oError) {
    return 'Unknown error';
  }
  if (typeof oError === 'string') {
    return oError;
  }
  if (typeof oError.message === 'string' && oError.message) {
    return oError.message;
  }
  try {
    return JSON.stringify(oError);
  } catch (oStringifyError) {
    return String(oError);
  }
}

function toLabel(sFieldName) {
  return String(sFieldName)
    .replace(new RegExp('_x0020_', 'g'), ' ')
    .replace(new RegExp('([a-z])([A-Z])', 'g'), '$1 $2');
}

function escapeHtml(sValue) {
  return String(sValue)
    .replace(new RegExp('&', 'g'), '&amp;')
    .replace(new RegExp('<', 'g'), '&lt;')
    .replace(new RegExp('>', 'g'), '&gt;')
    .replace(new RegExp('"', 'g'), '&quot;');
}

function escapeAttribute(sValue) {
  return escapeHtml(sValue).replace(new RegExp("'", 'g'), '&#39;');
}

function isActionDisabled() {
  return oState.bLoading || oState.bRefreshing || oState.bSubmittingCreate || oState.bSubmittingEdit;
}

boot().catch(function(oError) {
  console.error(oError);
  oState.sError = getErrorMessage(oError);
  oState.bLoading = false;
  renderApp();
});