import { enableDebugger } from './codeapp.js';
enableDebugger();

import {
  createSpItemByList,
  deleteSpItemByList,
  getItemsByList,
  resolveSharePointList,
  updateSpItemByList,
} from './connectors/sharepoint.js';

const APP_CONFIG = {
  appName: 'Test List Bureau',
  siteUrl: 'https://37wcqv.sharepoint.com/sites/testsite/',
  listId: '742435b6-7897-4636-ab8e-ec347405b9a6',
  listName: 'Test list',
};

const FIELDS = {
  title: 'Title',
  date: 'date',
  text: 'text',
  choice: 'choice',
  lookup: 'lookup',
  signOffStatus: 'Sign_x002d_off_x0020_status',
};

const READY_STATUSES = ['approved', 'complete', 'completed', 'ready'];

const state = {
  listAccess: null,
  items: [],
  selectedId: null,
  formMode: 'create',
  form: createEmptyForm(),
  isLoading: true,
  isSaving: false,
  isDeleting: false,
  searchTerm: '',
  spotlight: false,
  notice: null,
  toastTimer: null,
};

const ui = {};

function createEmptyForm() {
  return {
    title: '',
    date: '',
    text: '',
    choice: '',
    signOffStatus: '',
    lookup: '',
  };
}

function cacheElements() {
  ui.connectionLabel = document.getElementById('connectionLabel');
  ui.totalCount = document.getElementById('totalCount');
  ui.readyCount = document.getElementById('readyCount');
  ui.missingDateCount = document.getElementById('missingDateCount');
  ui.search = document.getElementById('search');
  ui.refreshButton = document.getElementById('refreshButton');
  ui.toggleSpotlight = document.getElementById('toggleSpotlight');
  ui.createButton = document.getElementById('createButton');
  ui.resultCount = document.getElementById('resultCount');
  ui.notice = document.getElementById('notice');
  ui.loadingState = document.getElementById('loadingState');
  ui.emptyState = document.getElementById('emptyState');
  ui.tableScroll = document.getElementById('tableScroll');
  ui.rows = document.getElementById('rows');
  ui.panelTitle = document.getElementById('panelTitle');
  ui.panelCopy = document.getElementById('panelCopy');
  ui.itemForm = document.getElementById('itemForm');
  ui.titleField = document.getElementById('titleField');
  ui.dateField = document.getElementById('dateField');
  ui.textField = document.getElementById('textField');
  ui.choiceField = document.getElementById('choiceField');
  ui.signOffField = document.getElementById('signOffField');
  ui.lookupField = document.getElementById('lookupField');
  ui.deleteButton = document.getElementById('deleteButton');
  ui.saveButton = document.getElementById('saveButton');
  ui.toast = document.getElementById('toast');
}

function bindEvents() {
  ui.search.addEventListener('input', (event) => {
    state.searchTerm = event.target.value.trim().toLowerCase();
    render();
  });

  ui.refreshButton.addEventListener('click', async () => {
    await refreshItems({ preserveSelection: true, preserveCreateMode: state.formMode === 'create' });
    showToast('List refreshed.', 'success');
  });

  ui.toggleSpotlight.addEventListener('click', () => {
    state.spotlight = !state.spotlight;
    document.body.classList.toggle('spotlight-mode', state.spotlight);
  });

  ui.createButton.addEventListener('click', () => {
    beginCreate();
  });

  ui.rows.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-item-id]');
    if (!row) {
      return;
    }

    selectItemById(row.dataset.itemId);
  });

  ui.itemForm.addEventListener('input', syncFormFromInputs);
  ui.itemForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveItem();
  });

  ui.deleteButton.addEventListener('click', async () => {
    await deleteSelectedItem();
  });
}

function normalizeCollection(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload && payload.value,
    payload && payload.items,
    payload && payload.results,
    payload && payload.body,
    payload && payload.data,
    payload && payload.result,
    payload && payload.response,
    payload && payload.d && payload.d.results,
  ];

  return candidates.find(Array.isArray) || [];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function extractItemId(item) {
  const id = item && (item.ID ?? item.Id ?? item.id);
  return id == null ? '' : String(id);
}

function formatLookupValue(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  const candidate = value.Value ?? value.Title ?? value.title ?? value.DisplayName ?? value.displayName ?? value.LookupValue ?? value.lookupValue;
  return candidate == null ? '' : String(candidate);
}

function formatChoiceValue(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  const candidate = value.Value ?? value.Label ?? value.label ?? value.Name ?? value.name;
  return candidate == null ? '' : String(candidate);
}

function formatDateForInput(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForTable(value) {
  const normalized = formatDateForInput(value);
  if (!normalized) {
    return '<span class="muted">No date</span>';
  }

  return escapeHtml(normalized);
}

function mapSharePointItem(item) {
  return {
    id: extractItemId(item),
    title: String(item?.[FIELDS.title] ?? ''),
    date: formatDateForInput(item?.[FIELDS.date]),
    text: String(item?.[FIELDS.text] ?? ''),
    choice: formatChoiceValue(item?.[FIELDS.choice]),
    signOffStatus: String(item?.[FIELDS.signOffStatus] ?? ''),
    lookup: formatLookupValue(item?.[FIELDS.lookup]),
    raw: item,
  };
}

function getFilteredItems() {
  if (!state.searchTerm) {
    return state.items;
  }

  return state.items.filter((item) => {
    return [item.title, item.text, item.choice, item.signOffStatus, item.lookup, item.date]
      .some((value) => String(value || '').toLowerCase().includes(state.searchTerm));
  });
}

function findItemById(itemId) {
  return state.items.find((item) => item.id === String(itemId)) || null;
}

function populateFormFromItem(item) {
  state.form = {
    title: item?.title ?? '',
    date: item?.date ?? '',
    text: item?.text ?? '',
    choice: item?.choice ?? '',
    signOffStatus: item?.signOffStatus ?? '',
    lookup: item?.lookup ?? '',
  };
}

function syncFormFromInputs() {
  state.form = {
    title: ui.titleField.value,
    date: ui.dateField.value,
    text: ui.textField.value,
    choice: ui.choiceField.value,
    signOffStatus: ui.signOffField.value,
    lookup: ui.lookupField.value,
  };
}

function setNotice(message, type = 'info') {
  state.notice = message ? { message, type } : null;
}

function showToast(message, type = 'success') {
  if (!message) {
    return;
  }

  window.clearTimeout(state.toastTimer);
  ui.toast.textContent = message;
  ui.toast.dataset.type = type;
  ui.toast.classList.add('is-visible');
  state.toastTimer = window.setTimeout(() => {
    ui.toast.classList.remove('is-visible');
  }, 3200);
}

function updateStats() {
  const totalCount = state.items.length;
  const readyCount = state.items.filter((item) => READY_STATUSES.includes(item.signOffStatus.trim().toLowerCase())).length;
  const missingDateCount = state.items.filter((item) => !item.date).length;

  ui.totalCount.textContent = String(totalCount);
  ui.readyCount.textContent = String(readyCount);
  ui.missingDateCount.textContent = String(missingDateCount);
}

function renderRows() {
  const filteredItems = getFilteredItems();
  ui.resultCount.textContent = `${filteredItems.length} visible rows`;

  if (state.isLoading) {
    ui.loadingState.classList.add('is-visible');
    ui.emptyState.classList.remove('is-visible');
    ui.tableScroll.style.display = 'none';
    ui.rows.innerHTML = '';
    return;
  }

  ui.loadingState.classList.remove('is-visible');

  if (filteredItems.length === 0) {
    ui.emptyState.classList.add('is-visible');
    ui.tableScroll.style.display = 'none';
    ui.rows.innerHTML = '';
    return;
  }

  ui.emptyState.classList.remove('is-visible');
  ui.tableScroll.style.display = 'block';
  ui.rows.innerHTML = filteredItems.map((item) => {
    const rowClass = item.id === state.selectedId ? ' class="active"' : '';
    const textValue = item.text || '<span class="muted">No text</span>';
    const choiceValue = item.choice ? `<span class="pill">${escapeHtml(item.choice)}</span>` : '<span class="muted">No choice</span>';
    const signOffValue = item.signOffStatus || '<span class="muted">No status</span>';

    return `
      <tr data-item-id="${escapeHtml(item.id)}"${rowClass}>
        <td>${escapeHtml(item.title || 'Untitled')}</td>
        <td>${formatDateForTable(item.date)}</td>
        <td>${textValue}</td>
        <td>${choiceValue}</td>
        <td>${escapeHtml(signOffValue)}</td>
      </tr>
    `;
  }).join('');
}

function renderForm() {
  const isEditing = state.formMode === 'edit' && !!state.selectedId;
  ui.panelTitle.textContent = isEditing ? `Edit: ${state.form.title || 'Item'}` : 'Create new item';
  ui.panelCopy.textContent = isEditing
    ? 'Update the selected row, then save changes or delete it from the list.'
    : 'Fill in the fields below to create a new SharePoint list item.';
  ui.titleField.value = state.form.title;
  ui.dateField.value = state.form.date;
  ui.textField.value = state.form.text;
  ui.choiceField.value = state.form.choice;
  ui.signOffField.value = state.form.signOffStatus;
  ui.lookupField.value = state.form.lookup;
  ui.deleteButton.style.visibility = isEditing ? 'visible' : 'hidden';
  ui.deleteButton.disabled = !isEditing || state.isDeleting || state.isSaving;
  ui.saveButton.textContent = isEditing ? 'Save changes' : 'Create item';
  ui.saveButton.disabled = state.isSaving || state.isDeleting;
  ui.titleField.disabled = state.isSaving || state.isDeleting;
  ui.dateField.disabled = state.isSaving || state.isDeleting;
  ui.textField.disabled = state.isSaving || state.isDeleting;
  ui.choiceField.disabled = state.isSaving || state.isDeleting;
  ui.signOffField.disabled = state.isSaving || state.isDeleting;
}

function renderNotice() {
  if (!state.notice) {
    ui.notice.classList.remove('is-visible');
    ui.notice.textContent = '';
    ui.notice.dataset.type = 'info';
    return;
  }

  ui.notice.classList.add('is-visible');
  ui.notice.dataset.type = state.notice.type;
  ui.notice.textContent = state.notice.message;
}

function render() {
  document.title = APP_CONFIG.appName;
  ui.connectionLabel.textContent = state.listAccess
    ? `Connected to ${state.listAccess.listName} on SharePoint`
    : 'Connecting to SharePoint...';
  updateStats();
  renderRows();
  renderForm();
  renderNotice();
}

function beginCreate() {
  state.formMode = 'create';
  state.selectedId = null;
  state.form = createEmptyForm();
  setNotice(null);
  render();
  ui.titleField.focus();
}

function selectItemById(itemId) {
  const item = findItemById(itemId);
  if (!item) {
    return;
  }

  state.formMode = 'edit';
  state.selectedId = item.id;
  populateFormFromItem(item);
  setNotice(null);
  render();
}

function buildPayloadFromForm() {
  const payload = {
    [FIELDS.title]: state.form.title.trim(),
  };

  if (!payload[FIELDS.title]) {
    throw new Error('Title is required.');
  }

  if (state.form.date) {
    payload[FIELDS.date] = state.form.date;
  }

  if (state.form.text.trim()) {
    payload[FIELDS.text] = state.form.text.trim();
  }

  if (state.form.choice.trim()) {
    payload[FIELDS.choice] = state.form.choice.trim();
  }

  if (state.form.signOffStatus.trim()) {
    payload[FIELDS.signOffStatus] = state.form.signOffStatus.trim();
  }

  return payload;
}

async function refreshItems({ preferredSelection = null, preserveSelection = true, preserveCreateMode = false } = {}) {
  state.isLoading = true;
  setNotice(null);
  render();

  try {
    const response = await getItemsByList(APP_CONFIG.siteUrl, state.listAccess || {
      listId: APP_CONFIG.listId,
      listName: APP_CONFIG.listName,
    }, {
      top: 200,
      orderBy: 'ID desc',
    });

    state.items = normalizeCollection(response)
      .map(mapSharePointItem)
      .filter((item) => item.id);

    const nextSelectedId = preferredSelection && findItemIdInCollection(state.items, preferredSelection)
      ? String(preferredSelection)
      : preserveSelection && state.selectedId && findItemIdInCollection(state.items, state.selectedId)
        ? state.selectedId
        : null;

    if (nextSelectedId) {
      state.selectedId = nextSelectedId;
      state.formMode = 'edit';
      populateFormFromItem(findItemById(nextSelectedId));
    } else if (preserveCreateMode) {
      state.selectedId = null;
      state.formMode = 'create';
    } else if (state.items.length > 0) {
      state.selectedId = state.items[0].id;
      state.formMode = 'edit';
      populateFormFromItem(state.items[0]);
    } else {
      state.selectedId = null;
      state.formMode = 'create';
      state.form = createEmptyForm();
    }
  } catch (error) {
    setNotice(error.message, 'error');
  } finally {
    state.isLoading = false;
    render();
  }
}

function findItemIdInCollection(items, itemId) {
  return items.some((item) => item.id === String(itemId));
}

async function saveItem() {
  syncFormFromInputs();
  state.isSaving = true;
  setNotice(null);
  render();

  try {
    const payload = buildPayloadFromForm();

    if (state.formMode === 'edit' && state.selectedId) {
      await updateSpItemByList(APP_CONFIG.siteUrl, state.listAccess, state.selectedId, payload);
      showToast('Item updated.', 'success');
      await refreshItems({ preferredSelection: state.selectedId, preserveSelection: true });
      return;
    }

    const created = await createSpItemByList(APP_CONFIG.siteUrl, state.listAccess, payload);
    const createdId = extractItemId(created);
    showToast('Item created.', 'success');
    await refreshItems({ preferredSelection: createdId || null, preserveSelection: false });
  } catch (error) {
    setNotice(error.message, 'error');
    showToast(error.message, 'error');
  } finally {
    state.isSaving = false;
    render();
  }
}

async function deleteSelectedItem() {
  if (!(state.formMode === 'edit' && state.selectedId)) {
    return;
  }

  const selectedItem = findItemById(state.selectedId);
  const itemName = selectedItem?.title || 'this item';
  const confirmed = window.confirm(`Delete ${itemName}?`);
  if (!confirmed) {
    return;
  }

  state.isDeleting = true;
  setNotice(null);
  render();

  try {
    await deleteSpItemByList(APP_CONFIG.siteUrl, state.listAccess, state.selectedId);
    showToast('Item deleted.', 'success');
    beginCreate();
    await refreshItems({ preserveSelection: false, preserveCreateMode: false });
  } catch (error) {
    setNotice(error.message, 'error');
    showToast(error.message, 'error');
  } finally {
    state.isDeleting = false;
    render();
  }
}

async function boot() {
  cacheElements();
  bindEvents();
  render();

  try {
    state.listAccess = await resolveSharePointList(APP_CONFIG.siteUrl, {
      listId: APP_CONFIG.listId,
      listName: APP_CONFIG.listName,
    });
    await refreshItems({ preserveSelection: false, preserveCreateMode: false });
  } catch (error) {
    state.isLoading = false;
    setNotice(error.message, 'error');
    render();
  }
}

boot();