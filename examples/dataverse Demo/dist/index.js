import { enableDebugger } from "./codeapp.js";

enableDebugger();

import {
  initDataSources,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  callUnboundAction,
  whoAmI,
} from './codeapp.js';

const sTaskTableName = 'tasks';
const sTaskPrimaryKey = 'activityid';
const sUserTableName = 'systemusers';
const sUserPrimaryKey = 'systemuserid';

const aAccessLevels = [
  {
    id: 'read',
    label: 'Read only',
    mask: 'ReadAccess',
    note: 'View the task record.',
  },
  {
    id: 'work',
    label: 'Collaborate',
    mask: 'ReadAccess,WriteAccess,AppendAccess,AppendToAccess',
    note: 'Update the task and related notes.',
  },
  {
    id: 'share',
    label: 'Collaborate + reshare',
    mask: 'ReadAccess,WriteAccess,AppendAccess,AppendToAccess,ShareAccess',
    note: 'Update the task and share it onward.',
  },
];

const oState = {
  aTasks: [],
  aUsers: [],
  aShareEvents: [],
  sSelectedTaskId: '',
  sCurrentUserId: '',
  sStatusText: 'Booting Dataverse task workspace...',
  sStatusTone: 'live',
  sShareStatusText: 'Select a task, choose a user, then grant access.',
  sListCaption: 'Showing the latest task records.',
  bLoading: false,
  bSaving: false,
  bSharing: false,
};

const oElements = {
  eConnectionState: document.getElementById('connectionState'),
  eTaskCount: document.getElementById('taskCount'),
  eUserCount: document.getElementById('userCount'),
  eTaskSearch: document.getElementById('taskSearch'),
  ePriorityFilter: document.getElementById('priorityFilter'),
  eStatusTone: document.getElementById('statusTone'),
  eStatusText: document.getElementById('statusText'),
  eCurrentUserText: document.getElementById('currentUserText'),
  eTaskList: document.getElementById('taskList'),
  eListCaption: document.getElementById('listCaption'),
  eEditorHeading: document.getElementById('editorHeading'),
  eRecordMeta: document.getElementById('recordMeta'),
  eTaskForm: document.getElementById('taskForm'),
  eTaskTitle: document.getElementById('taskTitle'),
  eTaskPriority: document.getElementById('taskPriority'),
  eTaskDueDate: document.getElementById('taskDueDate'),
  eTaskDescription: document.getElementById('taskDescription'),
  eBtnRefresh: document.getElementById('btnRefresh'),
  eBtnNewTask: document.getElementById('btnNewTask'),
  eBtnResetTask: document.getElementById('btnResetTask'),
  eBtnDeleteTask: document.getElementById('btnDeleteTask'),
  eShareUser: document.getElementById('shareUser'),
  eShareAccess: document.getElementById('shareAccess'),
  eBtnShareTask: document.getElementById('btnShareTask'),
  eShareStatusText: document.getElementById('shareStatusText'),
  eShareLog: document.getElementById('shareLog'),
};

function dsEntry(sPrimaryKey) {
  return {
    tableId: '',
    version: '',
    primaryKey: sPrimaryKey,
    dataSourceType: 'Dataverse',
    apis: {},
  };
}

function normalizeGuid(sValue) {
  return String(sValue || '').split('{').join('').split('}').join('').toLowerCase();
}

function normalizeDateValue(sValue) {
  if (!sValue) {
    return '';
  }

  return String(sValue).slice(0, 10);
}

function formatDateLabel(sValue) {
  if (!sValue) {
    return 'No due date';
  }

  const oDate = new Date(sValue);
  if (Number.isNaN(oDate.getTime())) {
    return 'No due date';
  }

  return oDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTimeLabel(sValue) {
  if (!sValue) {
    return 'Not yet saved';
  }

  const oDate = new Date(sValue);
  if (Number.isNaN(oDate.getTime())) {
    return 'Not yet saved';
  }

  return oDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function priorityLabelFromCode(iCode) {
  if (Number(iCode) === 2) {
    return 'High';
  }
  if (Number(iCode) === 0) {
    return 'Low';
  }
  return 'Normal';
}

function stateLabelFromCode(iCode) {
  if (Number(iCode) === 1) {
    return 'Completed';
  }
  if (Number(iCode) === 2) {
    return 'Canceled';
  }
  return 'Open';
}

function setStatus(sText, sTone) {
  oState.sStatusText = sText;
  oState.sStatusTone = sTone || 'live';
  renderStatus();
}

function setShareStatus(sText, sTone) {
  oState.sShareStatusText = sText;
  oElements.eShareStatusText.textContent = sText;
  oElements.eShareStatusText.dataset.tone = sTone || 'live';
}

function getSelectedTask() {
  return oState.aTasks.find((oTask) => oTask.id === oState.sSelectedTaskId) || null;
}

function getVisibleTasks() {
  const sSearch = String(oElements.eTaskSearch.value || '').trim().toLowerCase();
  const sPriorityFilter = String(oElements.ePriorityFilter.value || 'all');

  return oState.aTasks.filter((oTask) => {
    const bMatchesSearch = !sSearch
      || String(oTask.subject || '').toLowerCase().includes(sSearch)
      || String(oTask.description || '').toLowerCase().includes(sSearch);
    const bMatchesPriority = sPriorityFilter === 'all' || String(oTask.prioritycode) === sPriorityFilter;
    return bMatchesSearch && bMatchesPriority;
  });
}

function mapTaskRecord(oRecord) {
  return {
    id: oRecord.activityid || oRecord.taskid || '',
    subject: oRecord.subject || '',
    description: oRecord.description || '',
    prioritycode: Number(oRecord.prioritycode),
    scheduledend: normalizeDateValue(oRecord.scheduledend),
    statecode: Number(oRecord.statecode),
    statuscode: Number(oRecord.statuscode),
    modifiedon: oRecord.modifiedon || '',
  };
}

function mapUserRecord(oRecord) {
  return {
    id: oRecord.systemuserid || '',
    fullname: oRecord.fullname || 'Unnamed user',
    email: oRecord.internalemailaddress || oRecord.domainname || '',
  };
}

function renderStatus() {
  oElements.eConnectionState.textContent = oState.bLoading ? 'Refreshing' : 'Connected';
  if (oState.sStatusTone === 'error') {
    oElements.eConnectionState.textContent = 'Attention';
  }
  oElements.eStatusTone.textContent = oState.sStatusTone;
  oElements.eStatusTone.dataset.tone = oState.sStatusTone;
  oElements.eStatusText.textContent = oState.sStatusText;
}

function renderMetrics() {
  oElements.eTaskCount.textContent = String(oState.aTasks.length);
  oElements.eUserCount.textContent = String(oState.aUsers.length);
}

function renderTaskList() {
  const aVisibleTasks = getVisibleTasks();
  oElements.eTaskList.innerHTML = '';

  if (aVisibleTasks.length === 0) {
    const eEmpty = document.createElement('div');
    eEmpty.className = 'empty-card';
    eEmpty.textContent = 'No Dataverse task records match the current filters.';
    oElements.eTaskList.appendChild(eEmpty);
  }

  aVisibleTasks.forEach((oTask) => {
    const eButton = document.createElement('button');
    eButton.type = 'button';
    eButton.className = 'task-card';
    if (oTask.id === oState.sSelectedTaskId) {
      eButton.className += ' task-card--active';
    }

    const eTopRow = document.createElement('div');
    eTopRow.className = 'task-card__row';

    const eTitle = document.createElement('h3');
    eTitle.className = 'task-card__title';
    eTitle.textContent = oTask.subject || 'Untitled task';

    const ePriority = document.createElement('span');
    ePriority.className = 'pill pill--priority';
    ePriority.textContent = priorityLabelFromCode(oTask.prioritycode);

    eTopRow.appendChild(eTitle);
    eTopRow.appendChild(ePriority);

    const eDescription = document.createElement('p');
    eDescription.className = 'task-card__description';
    eDescription.textContent = oTask.description || 'No description';

    const eBottomRow = document.createElement('div');
    eBottomRow.className = 'task-card__row task-card__row--meta';

    const eDue = document.createElement('span');
    eDue.className = 'pill';
    eDue.textContent = formatDateLabel(oTask.scheduledend);

    const eState = document.createElement('span');
    eState.className = 'pill';
    eState.textContent = stateLabelFromCode(oTask.statecode);

    eBottomRow.appendChild(eDue);
    eBottomRow.appendChild(eState);

    eButton.appendChild(eTopRow);
    eButton.appendChild(eDescription);
    eButton.appendChild(eBottomRow);

    eButton.addEventListener('click', () => {
      selectTask(oTask.id);
    });

    oElements.eTaskList.appendChild(eButton);
  });

  oState.sListCaption = aVisibleTasks.length + ' task' + (aVisibleTasks.length === 1 ? '' : 's') + ' shown from Dataverse.';
  oElements.eListCaption.textContent = oState.sListCaption;
}

function renderShareOptions() {
  const sSelectedAccessId = String(oElements.eShareAccess.value || 'read');
  const sSelectedUserId = String(oElements.eShareUser.value || '');

  oElements.eShareAccess.innerHTML = '';
  aAccessLevels.forEach((oLevel) => {
    const eOption = document.createElement('option');
    eOption.value = oLevel.id;
    eOption.textContent = oLevel.label + ' - ' + oLevel.note;
    oElements.eShareAccess.appendChild(eOption);
  });

  if (aAccessLevels.some((oLevel) => oLevel.id === sSelectedAccessId)) {
    oElements.eShareAccess.value = sSelectedAccessId;
  }

  oElements.eShareUser.innerHTML = '';
  if (oState.aUsers.length === 0) {
    const eOption = document.createElement('option');
    eOption.value = '';
    eOption.textContent = 'No Dataverse users loaded';
    oElements.eShareUser.appendChild(eOption);
    return;
  }

  const ePlaceholder = document.createElement('option');
  ePlaceholder.value = '';
  ePlaceholder.textContent = 'Select a Dataverse user';
  oElements.eShareUser.appendChild(ePlaceholder);

  oState.aUsers.forEach((oUser) => {
    const eOption = document.createElement('option');
    eOption.value = oUser.id;
    eOption.textContent = oUser.fullname + (oUser.email ? ' - ' + oUser.email : '');
    oElements.eShareUser.appendChild(eOption);
  });

  if (oState.aUsers.some((oUser) => oUser.id === sSelectedUserId)) {
    oElements.eShareUser.value = sSelectedUserId;
  }
}

function renderShareLog() {
  oElements.eShareLog.innerHTML = '';
  if (oState.aShareEvents.length === 0) {
    const eEmpty = document.createElement('div');
    eEmpty.className = 'empty-card empty-card--compact';
    eEmpty.textContent = 'Share events from this session will appear here.';
    oElements.eShareLog.appendChild(eEmpty);
    return;
  }

  oState.aShareEvents.forEach((oEvent) => {
    const eItem = document.createElement('article');
    eItem.className = 'share-log__item';

    const eHeadline = document.createElement('strong');
    eHeadline.textContent = oEvent.title;

    const eMeta = document.createElement('p');
    eMeta.textContent = oEvent.detail;

    eItem.appendChild(eHeadline);
    eItem.appendChild(eMeta);
    oElements.eShareLog.appendChild(eItem);
  });
}

function renderEditor() {
  const oTask = getSelectedTask();
  if (!oTask) {
    oElements.eEditorHeading.textContent = 'New task';
    oElements.eRecordMeta.textContent = 'Create a new Dataverse task record.';
    oElements.eBtnDeleteTask.disabled = true;
    return;
  }

  oElements.eEditorHeading.textContent = oTask.subject || 'Selected task';
  oElements.eRecordMeta.textContent = 'Last updated ' + formatDateTimeLabel(oTask.modifiedon) + ' - ' + oTask.id;
  oElements.eBtnDeleteTask.disabled = false;
}

function renderCurrentUser() {
  if (!oState.sCurrentUserId) {
    oElements.eCurrentUserText.textContent = 'Current Dataverse user could not be detected.';
    return;
  }

  oElements.eCurrentUserText.textContent = 'Current Dataverse user: ' + oState.sCurrentUserId;
}

function renderActionState() {
  const bHasSelectedTask = !!getSelectedTask();
  const bHasShareTarget = !!oElements.eShareUser.value;
  const bDisableWrite = oState.bSaving || oState.bLoading;

  oElements.eBtnRefresh.disabled = oState.bLoading;
  oElements.eBtnNewTask.disabled = bDisableWrite;
  oElements.eBtnResetTask.disabled = bDisableWrite;
  oElements.eBtnDeleteTask.disabled = !bHasSelectedTask || bDisableWrite;
  oElements.eBtnShareTask.disabled = !bHasSelectedTask || !bHasShareTarget || oState.bSharing || oState.bLoading;
}

function renderAll() {
  renderStatus();
  renderMetrics();
  renderTaskList();
  renderEditor();
  renderShareOptions();
  renderShareLog();
  renderCurrentUser();
  renderActionState();
}

function fillForm(oTask) {
  oElements.eTaskTitle.value = oTask ? oTask.subject : '';
  oElements.eTaskPriority.value = oTask ? String(oTask.prioritycode) : '1';
  oElements.eTaskDueDate.value = oTask ? normalizeDateValue(oTask.scheduledend) : '';
  oElements.eTaskDescription.value = oTask ? oTask.description : '';
}

function selectTask(sTaskId) {
  oState.sSelectedTaskId = sTaskId || '';
  fillForm(getSelectedTask());
  if (oState.sSelectedTaskId) {
    setShareStatus('Ready to share the selected Dataverse task.', 'live');
  } else {
    setShareStatus('Select a task, choose a user, then grant access.', 'live');
  }
  renderAll();
}

function resetComposer() {
  oState.sSelectedTaskId = '';
  fillForm(null);
  renderAll();
}

function buildTaskPayload() {
  const sSubject = String(oElements.eTaskTitle.value || '').trim();
  const sDescription = String(oElements.eTaskDescription.value || '').trim();
  const sPriority = String(oElements.eTaskPriority.value || '1');
  const sDueDate = String(oElements.eTaskDueDate.value || '');

  if (!sSubject) {
    throw new Error('Task subject is required.');
  }

  const oPayload = {
    subject: sSubject,
    description: sDescription,
    prioritycode: Number(sPriority),
  };

  if (sDueDate) {
    oPayload.scheduledend = sDueDate + 'T12:00:00Z';
  } else {
    oPayload.scheduledend = null;
  }

  return oPayload;
}

async function loadCurrentUser() {
  try {
    oState.sCurrentUserId = normalizeGuid(await whoAmI());
  } catch (oError) {
    console.error('Failed to resolve current Dataverse user:', oError);
    oState.sCurrentUserId = '';
  }
}

async function loadTasks() {
  const oResult = await listItems(sTaskTableName, sTaskPrimaryKey, {
    select: ['activityid', 'subject', 'description', 'prioritycode', 'scheduledend', 'statecode', 'statuscode', 'modifiedon'],
    orderBy: ['modifiedon desc'],
    top: 100,
  });

  oState.aTasks = (oResult.entities || []).map((oRecord) => mapTaskRecord(oRecord));

  if (oState.sSelectedTaskId) {
    const oSelected = getSelectedTask();
    if (!oSelected) {
      oState.sSelectedTaskId = '';
    }
  }

  if (!oState.sSelectedTaskId && oState.aTasks.length > 0) {
    oState.sSelectedTaskId = oState.aTasks[0].id;
    fillForm(oState.aTasks[0]);
  }
}

async function loadUsers() {
  const oResult = await listItems(sUserTableName, sUserPrimaryKey, {
    filter: 'isdisabled eq false',
    select: ['systemuserid', 'fullname', 'internalemailaddress', 'domainname'],
    orderBy: ['fullname asc'],
    top: 100,
  });

  oState.aUsers = (oResult.entities || [])
    .map((oRecord) => mapUserRecord(oRecord))
    .filter((oUser) => !!oUser.id)
    .filter((oUser) => normalizeGuid(oUser.id) !== oState.sCurrentUserId);
}

async function refreshWorkspace() {
  oState.bLoading = true;
  setStatus('Refreshing task records and share targets from Dataverse...', 'live');
  renderAll();

  try {
    await Promise.all([loadTasks(), loadUsers()]);
    setStatus('Dataverse task workspace is up to date.', 'live');
    if (oState.aUsers.length === 0) {
      setShareStatus('No Dataverse users were returned from systemusers.', 'warning');
    } else if (getSelectedTask()) {
      setShareStatus('Ready to share the selected Dataverse task.', 'live');
    } else {
      setShareStatus('Select a task, choose a user, then grant access.', 'live');
    }
  } catch (oError) {
    console.error('Failed to refresh Dataverse workspace:', oError);
    setStatus('Failed to load Dataverse data: ' + (oError.message || String(oError)), 'error');
  } finally {
    oState.bLoading = false;
    renderAll();
  }
}

async function handleSaveTask(oEvent) {
  oEvent.preventDefault();
  oState.bSaving = true;
  setStatus('Saving task record to Dataverse...', 'live');
  renderActionState();

  try {
    const oPayload = buildTaskPayload();
    const oSelectedTask = getSelectedTask();

    if (oSelectedTask) {
      await updateItem(sTaskTableName, sTaskPrimaryKey, oSelectedTask.id, oPayload);
      setStatus('Task record updated in Dataverse.', 'success');
    } else {
      const oCreated = await createItem(sTaskTableName, sTaskPrimaryKey, oPayload);
      const sCreatedId = normalizeGuid(oCreated && (oCreated.activityid || oCreated.id || oCreated[sTaskPrimaryKey]));
      setStatus('Task record created in Dataverse.', 'success');
      await loadTasks();
      if (sCreatedId) {
        const oCreatedTask = oState.aTasks.find((oTask) => normalizeGuid(oTask.id) === sCreatedId);
        if (oCreatedTask) {
          oState.sSelectedTaskId = oCreatedTask.id;
          fillForm(oCreatedTask);
        }
      }
    }

    await refreshWorkspace();
  } catch (oError) {
    console.error('Failed to save task:', oError);
    setStatus('Save failed: ' + (oError.message || String(oError)), 'error');
  } finally {
    oState.bSaving = false;
    renderAll();
  }
}

async function handleDeleteTask() {
  const oSelectedTask = getSelectedTask();
  if (!oSelectedTask) {
    return;
  }

  const bConfirmed = window.confirm('Delete the task "' + oSelectedTask.subject + '" from Dataverse?');
  if (!bConfirmed) {
    return;
  }

  oState.bSaving = true;
  setStatus('Deleting task record from Dataverse...', 'warning');
  renderActionState();

  try {
    await deleteItem(sTaskTableName, sTaskPrimaryKey, oSelectedTask.id);
    resetComposer();
    await refreshWorkspace();
    setStatus('Task record deleted from Dataverse.', 'success');
  } catch (oError) {
    console.error('Failed to delete task:', oError);
    setStatus('Delete failed: ' + (oError.message || String(oError)), 'error');
  } finally {
    oState.bSaving = false;
    renderAll();
  }
}

function getAccessLevelById(sId) {
  return aAccessLevels.find((oLevel) => oLevel.id === sId) || aAccessLevels[0];
}

function buildShareParams(sTaskId, sUserId, sMask) {
  return {
    Target: {
      '@odata.type': 'Microsoft.Dynamics.CRM.task',
      activityid: sTaskId,
    },
    PrincipalAccess: {
      AccessMask: sMask,
      Principal: {
        '@odata.type': 'Microsoft.Dynamics.CRM.systemuser',
        systemuserid: sUserId,
      },
    },
  };
}

async function shareTaskRecord(sTaskId, sUserId, sMask) {
  const oParams = buildShareParams(sTaskId, sUserId, sMask);

  try {
    await callUnboundAction(sTaskTableName, sTaskPrimaryKey, 'GrantAccess', oParams);
  } catch (oError) {
    const sMessage = String(oError && oError.message ? oError.message : oError).toLowerCase();
    const bCanFallback = sMessage.includes('already') || sMessage.includes('existing') || sMessage.includes('principal');

    if (!bCanFallback) {
      throw oError;
    }

    await callUnboundAction(sTaskTableName, sTaskPrimaryKey, 'ModifyAccess', oParams);
  }
}

async function handleShareTask() {
  const oSelectedTask = getSelectedTask();
  const sUserId = String(oElements.eShareUser.value || '');
  const oAccessLevel = getAccessLevelById(String(oElements.eShareAccess.value || 'read'));
  const oUser = oState.aUsers.find((oItem) => oItem.id === sUserId) || null;

  if (!oSelectedTask) {
    setShareStatus('Select a task before sharing it.', 'warning');
    renderActionState();
    return;
  }

  if (!sUserId || !oUser) {
    setShareStatus('Choose a Dataverse user to receive access.', 'warning');
    renderActionState();
    return;
  }

  oState.bSharing = true;
  setShareStatus('Granting Dataverse access to ' + oUser.fullname + '...', 'live');
  renderActionState();

  try {
    await shareTaskRecord(oSelectedTask.id, sUserId, oAccessLevel.mask);
    oState.aShareEvents.unshift({
      title: oSelectedTask.subject + ' shared',
      detail: oUser.fullname + ' received ' + oAccessLevel.label.toLowerCase() + ' on ' + formatDateTimeLabel(new Date().toISOString()) + '.',
    });
    oState.aShareEvents = oState.aShareEvents.slice(0, 6);
    setShareStatus('Dataverse access granted to ' + oUser.fullname + '.', 'success');
  } catch (oError) {
    console.error('Failed to share task record:', oError);
    setShareStatus('Share failed: ' + (oError.message || String(oError)), 'error');
  } finally {
    oState.bSharing = false;
    renderAll();
  }
}

function wireEvents() {
  oElements.eBtnRefresh.addEventListener('click', refreshWorkspace);
  oElements.eBtnNewTask.addEventListener('click', resetComposer);
  oElements.eBtnResetTask.addEventListener('click', () => {
    fillForm(getSelectedTask());
  });
  oElements.eBtnDeleteTask.addEventListener('click', handleDeleteTask);
  oElements.eBtnShareTask.addEventListener('click', handleShareTask);
  oElements.eTaskForm.addEventListener('submit', handleSaveTask);
  oElements.eTaskSearch.addEventListener('input', renderTaskList);
  oElements.ePriorityFilter.addEventListener('change', renderTaskList);
  oElements.eShareUser.addEventListener('change', renderActionState);
}

async function boot() {
  wireEvents();
  initDataSources({
    tasks: dsEntry(sTaskPrimaryKey),
    systemusers: dsEntry(sUserPrimaryKey),
  });
  renderAll();
  fillForm(null);
  await loadCurrentUser();
  await refreshWorkspace();
}

boot();