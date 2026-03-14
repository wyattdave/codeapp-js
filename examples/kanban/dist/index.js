
import { registerTable, listItems, createItem, updateItem, deleteItem } from './dataverse.js';

const sBoardPrefix = 'worktracker|';
const sCacheKey = 'workTrackerTasksCache';

const aColumns = [
  { id: 'backlog', title: 'Backlog', color: '#7c8aa5' },
  { id: 'ready', title: 'Ready', color: '#395cff' },
  { id: 'inprogress', title: 'In Progress', color: '#f59e0b' },
  { id: 'complete', title: 'Complete', color: '#13b981' },
  { id: 'rejected', title: 'Rejected', color: '#ef476f' }
];

const aSeedTasks = [
  {
    id: createId(),
    title: 'Prepare monthly planning summary',
    description: 'Pull together the current priorities, risks, and proposed actions for the next review.',
    status: 'backlog',
    priority: 'High',
    owner: 'You',
    dueDate: '2026-03-18',
    estimate: '3h',
    progress: 10,
    tags: ['Planning', 'Reporting']
  },
  {
    id: createId(),
    title: 'Review ready-for-build requests',
    description: 'Check scope, confirm acceptance criteria, and mark the next best work items for execution.',
    status: 'ready',
    priority: 'Medium',
    owner: 'You',
    dueDate: '2026-03-16',
    estimate: '2h',
    progress: 35,
    tags: ['Triage']
  },
  {
    id: createId(),
    title: 'Build stakeholder update deck',
    description: 'Turn the latest work highlights into a concise narrative for the weekly stakeholder sync.',
    status: 'inprogress',
    priority: 'High',
    owner: 'You',
    dueDate: '2026-03-15',
    estimate: '5h',
    progress: 68,
    tags: ['Comms', 'Weekly']
  },
  {
    id: createId(),
    title: 'Close completed support actions',
    description: 'Archive the delivered improvements and note what changed for future reference.',
    status: 'complete',
    priority: 'Low',
    owner: 'You',
    dueDate: '2026-03-12',
    estimate: '1h',
    progress: 100,
    tags: ['Ops']
  },
  {
    id: createId(),
    title: 'Drop duplicate reporting request',
    description: 'The request overlaps with an existing dashboard and no longer adds useful value.',
    status: 'rejected',
    priority: 'Low',
    owner: 'You',
    dueDate: '2026-03-11',
    estimate: '30m',
    progress: 0,
    tags: ['Archive']
  }
];

const oState = {
  tasks: [],
  search: '',
  statusFilter: 'all',
  draggedTaskId: '',
  editingTaskId: '',
  syncMessage: 'Connecting to Dataverse task table...'
};

const iInitialConnectionRetries = 4;
const iInitialConnectionRetryDelayMs = 500;

function createId() {
  return 'task-' + Math.random().toString(36).slice(2, 10);
}

function getSeedTasks() {
  return aSeedTasks.map((oTask) => ({
    ...oTask,
    id: createId(),
    tags: Array.isArray(oTask.tags) ? [...oTask.tags] : []
  }));
}

function loadCachedTasks() {
  const sSaved = localStorage.getItem(sCacheKey);
  if (!sSaved) {
    return [];
  }

  try {
    const aParsed = JSON.parse(sSaved);
    return Array.isArray(aParsed) ? aParsed : [];
  } catch (oError) {
    console.error('Failed to read cached tasks:', oError);
    return [];
  }
}

function saveCachedTasks() {
  localStorage.setItem(sCacheKey, JSON.stringify(oState.tasks));
}

function isValidStatus(sStatus) {
  return aColumns.some((oColumn) => oColumn.id === sStatus);
}

function clampProgress(iValue) {
  return Math.max(0, Math.min(100, Number(iValue) || 0));
}

function mapPriorityToCode(sPriority) {
  if (sPriority === 'High') {
    return 2;
  }
  if (sPriority === 'Low') {
    return 0;
  }
  return 1;
}

function mapPriorityFromCode(iCode) {
  if (Number(iCode) === 2) {
    return 'High';
  }
  if (Number(iCode) === 0) {
    return 'Low';
  }
  return 'Medium';
}

function normalizeDate(sDateValue) {
  if (!sDateValue) {
    return '';
  }
  return String(sDateValue).slice(0, 10);
}

function toDataverseDateValue(sDateValue) {
  if (!sDateValue) {
    return null;
  }
  return sDateValue + 'T12:00:00Z';
}

function parseBoardMeta(sCategory) {
  if (!sCategory || !String(sCategory).startsWith(sBoardPrefix)) {
    return null;
  }

  try {
    return JSON.parse(String(sCategory).slice(sBoardPrefix.length));
  } catch (oError) {
    console.error('Failed to parse board metadata:', oError);
    return null;
  }
}

function buildBoardMetaString(oTask) {
  const oMeta = {
    status: isValidStatus(oTask.status) ? oTask.status : 'backlog',
    owner: String(oTask.owner || 'You').slice(0, 80),
    estimate: String(oTask.estimate || '').slice(0, 30),
    tags: Array.isArray(oTask.tags) ? oTask.tags.slice(0, 8).map((sTag) => String(sTag).slice(0, 24)) : []
  };

  let sValue = sBoardPrefix + JSON.stringify(oMeta);

  while (sValue.length > 240 && oMeta.tags.length > 0) {
    oMeta.tags.pop();
    sValue = sBoardPrefix + JSON.stringify(oMeta);
  }

  return sValue.slice(0, 240);
}

function mapDataverseTaskToBoardTask(oRecord) {
  const oMeta = parseBoardMeta(oRecord.category) || {};
  const sTaskId = oRecord.activityid || oRecord.taskid || createId();

  return {
    id: sTaskId,
    title: oRecord.subject || 'Untitled task',
    description: oRecord.description || '',
    status: isValidStatus(oMeta.status) ? oMeta.status : 'backlog',
    priority: mapPriorityFromCode(oRecord.prioritycode),
    owner: oMeta.owner || 'You',
    dueDate: normalizeDate(oRecord.scheduledend),
    estimate: oMeta.estimate || '',
    progress: clampProgress(oRecord.percentcomplete),
    tags: Array.isArray(oMeta.tags) ? oMeta.tags : []
  };
}

function buildDataverseTaskPayload(oTaskInput) {
  const oPayload = {
    subject: oTaskInput.title,
    description: oTaskInput.description,
    prioritycode: mapPriorityToCode(oTaskInput.priority),
    percentcomplete: clampProgress(oTaskInput.progress),
    category: buildBoardMetaString(oTaskInput)
  };

  if (oTaskInput.dueDate) {
    oPayload.scheduledend = toDataverseDateValue(oTaskInput.dueDate);
  } else {
    oPayload.scheduledend = null;
  }

  return oPayload;
}

async function loadDataverseTasks() {
  const oResult = await listItems('tasks', 'activityid', {
    filter: "startswith(category, '" + sBoardPrefix + "')",
    select: ['activityid', 'subject', 'description', 'prioritycode', 'scheduledend', 'percentcomplete', 'category', 'modifiedon'],
    orderBy: ['modifiedon desc'],
    top: 200
  });

  return (oResult.entities || []).map((oRecord) => mapDataverseTaskToBoardTask(oRecord));
}

async function refreshBoardFromDataverse(sMessage) {
  const aTasks = await loadDataverseTasks();
  oState.tasks = aTasks;
  oState.syncMessage = sMessage || 'Synced with Dataverse task table.';
  saveCachedTasks();
}

async function createBoardTask(oTaskInput) {
  await createItem('tasks', 'activityid', buildDataverseTaskPayload(oTaskInput));
}

async function updateBoardTask(sTaskId, oTaskInput) {
  await updateItem('tasks', 'activityid', sTaskId, buildDataverseTaskPayload(oTaskInput));
}

async function deleteBoardTask(sTaskId) {
  await deleteItem('tasks', 'activityid', sTaskId);
}

function getFilteredTasks() {
  return oState.tasks.filter((oTask) => {
    const bSearchMatch = !oState.search || [oTask.title, oTask.description, oTask.owner, ...(oTask.tags || [])]
      .join(' ')
      .toLowerCase()
      .includes(oState.search.toLowerCase());

    const bStatusMatch = oState.statusFilter === 'all' || oTask.status === oState.statusFilter;
    return bSearchMatch && bStatusMatch;
  });
}

function getTasksByColumn(sColumnId) {
  return getFilteredTasks().filter((oTask) => oTask.status === sColumnId);
}

function countOpenTasks() {
  return oState.tasks.filter((oTask) => oTask.status !== 'complete' && oTask.status !== 'rejected').length;
}

function countInProgressTasks() {
  return oState.tasks.filter((oTask) => oTask.status === 'inprogress').length;
}

function countCompletedTasks() {
  return oState.tasks.filter((oTask) => oTask.status === 'complete').length;
}

function getFocusScore() {
  const iTotal = oState.tasks.length || 1;
  const iDoneWeight = countCompletedTasks() * 100;
  const iActiveWeight = countInProgressTasks() * 60;
  const iReadyWeight = oState.tasks.filter((oTask) => oTask.status === 'ready').length * 30;
  return Math.min(100, Math.round((iDoneWeight + iActiveWeight + iReadyWeight) / iTotal));
}

function getPriorityBadgeClass(sPriority) {
  if (sPriority === 'High') {
    return 'badge badgePriorityHigh';
  }
  if (sPriority === 'Medium') {
    return 'badge badgePriorityMedium';
  }
  return 'badge badgePriorityLow';
}

function escapeHtml(sValue) {
  return String(sValue)
    .replace(new RegExp('&', 'g'), '&amp;')
    .replace(new RegExp('<', 'g'), '&lt;')
    .replace(new RegExp('>', 'g'), '&gt;')
    .replace(new RegExp('\"', 'g'), '&quot;')
    .replace(new RegExp("'", 'g'), '&#39;');
}

function delay(iMilliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, iMilliseconds);
  });
}

function waitForHostLoad() {
  if (document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.addEventListener('load', resolve, { once: true });
  });
}

function isHostStartupError(oError) {
  const sMessage = String(oError && oError.message ? oError.message : oError || '').toLowerCase();
  return sMessage.includes('metadata')
    || sMessage.includes('runtime')
    || sMessage.includes('connection')
    || sMessage.includes('initial')
    || sMessage.includes('token')
    || sMessage.includes('postmessage');
}

function getConnectionErrorMessage(oError) {
  const sMessage = String(oError && oError.message ? oError.message : oError || 'Unknown Dataverse error');

  if (isHostStartupError(oError)) {
    return 'Dataverse connection is only available after the Power Apps Code App host finishes initializing: ' + sMessage;
  }

  return 'Dataverse load failed: ' + sMessage;
}

async function connectToDataverseOnStartup() {
  let oLastError = null;

  for (let iAttempt = 0; iAttempt < iInitialConnectionRetries; iAttempt += 1) {
    try {
      await refreshBoardFromDataverse('Connected to Dataverse task table.');
      if (oState.tasks.length === 0) {
        oState.syncMessage = 'No board tasks found in Dataverse yet.';
      }
      return;
    } catch (oError) {
      oLastError = oError;

      if (!isHostStartupError(oError) || iAttempt === iInitialConnectionRetries - 1) {
        break;
      }

      oState.syncMessage = 'Waiting for Power Apps Code App host to initialize Dataverse connection...';
      renderApp();
      await delay(iInitialConnectionRetryDelayMs * (iAttempt + 1));
    }
  }

  throw oLastError;
}

function renderCard(oTask) {
  const sTags = (oTask.tags || []).join(', ') || 'None';
  const iProgress = clampProgress(oTask.progress);

  return `
    <article class="card" draggable="true" data-task-id="${escapeHtml(oTask.id)}">
      <div class="cardHeader">
        <h3 class="cardTitle">${escapeHtml(oTask.title)}</h3>
        <span class="${getPriorityBadgeClass(oTask.priority)}">${escapeHtml(oTask.priority)}</span>
      </div>
      <p class="cardDescription">${escapeHtml(oTask.description)}</p>
      <div class="progressBar">
        <div class="progressValue" style="width: ${iProgress}%"></div>
      </div>
      <div class="cardMetaGrid">
        <div class="metaItem">
          <span class="metaLabel">Owner</span>
          <span class="metaValue">${escapeHtml(oTask.owner)}</span>
        </div>
        <div class="metaItem">
          <span class="metaLabel">Due</span>
          <span class="metaValue">${escapeHtml(oTask.dueDate || 'Not set')}</span>
        </div>
        <div class="metaItem">
          <span class="metaLabel">Estimate</span>
          <span class="metaValue">${escapeHtml(oTask.estimate || 'Not set')}</span>
        </div>
        <div class="metaItem">
          <span class="metaLabel">Tags</span>
          <span class="metaValue">${escapeHtml(sTags)}</span>
        </div>
      </div>
      <div class="cardFooter">
        <span>${escapeHtml(String(iProgress))}% complete</span>
        <button class="ghostButton" type="button" data-edit-task-id="${escapeHtml(oTask.id)}">Edit</button>
      </div>
    </article>
  `;
}

function renderColumn(oColumn) {
  const aTasks = getTasksByColumn(oColumn.id);
  const sCards = aTasks.length
    ? aTasks.map((oTask) => renderCard(oTask)).join('')
    : '<div class="emptyState">Drop work here or add a new task.</div>';

  return `
    <section class="column" aria-label="${escapeHtml(oColumn.title)}">
      <div class="columnHeader">
        <div class="columnTitleWrap">
          <span class="columnDot" style="background:${escapeHtml(oColumn.color)}"></span>
          <h2 class="columnTitle">${escapeHtml(oColumn.title)}</h2>
        </div>
        <span class="columnCount">${aTasks.length}</span>
      </div>
      <div class="columnBody" data-column-id="${escapeHtml(oColumn.id)}">
        ${sCards}
      </div>
    </section>
  `;
}

function renderApp() {
  const eApp = document.getElementById('app');
  if (!eApp) {
    return;
  }

  eApp.innerHTML = `
    <div class="shell">
      <section class="hero">
        <div>
          <h1 class="heroTitle">Track work on a clean paper-grid board.</h1>
          <p class="heroCopy">A quiet editorial kanban for backlog, ready, in progress, complete, and rejected work. Drag cards between columns, keep the important details visible, and save the board into Dataverse task records.</p>
        </div>
        <div class="heroMeta">
          <div class="metricCard">
            <span class="metricLabel">Open tasks</span>
            <strong class="metricValue">${countOpenTasks()}</strong>
          </div>
          <div class="metricCard">
            <span class="metricLabel">In progress</span>
            <strong class="metricValue">${countInProgressTasks()}</strong>
          </div>
          <div class="metricCard">
            <span class="metricLabel">Completed</span>
            <strong class="metricValue">${countCompletedTasks()}</strong>
          </div>
          <div class="metricCard">
            <span class="metricLabel">Focus score</span>
            <strong class="metricValue">${getFocusScore()}%</strong>
          </div>
        </div>
      </section>

      <section class="toolbar">
        <div class="toolbarGroup">
          <input id="searchInput" class="toolbarInput" type="search" placeholder="Search title, description, owner, or tags" value="${escapeHtml(oState.search)}">
          <select id="statusFilter" class="toolbarSelect" aria-label="Filter tasks by status">
            <option value="all"${oState.statusFilter === 'all' ? ' selected' : ''}>All statuses</option>
            ${aColumns.map((oColumn) => `<option value="${escapeHtml(oColumn.id)}"${oState.statusFilter === oColumn.id ? ' selected' : ''}>${escapeHtml(oColumn.title)}</option>`).join('')}
          </select>
        </div>
        <div class="toolbarGroup">
          <span class="statusText">${escapeHtml(oState.syncMessage)}</span>
          <button id="addTaskButton" class="primaryButton" type="button">Add task</button>
          <button id="resetBoardButton" class="secondaryButton" type="button">Load sample board</button>
        </div>
      </section>

      <section class="boardWrap">
        <div class="board">
          ${aColumns.map((oColumn) => renderColumn(oColumn)).join('')}
        </div>
      </section>
    </div>

    <div id="taskDialogBackdrop" class="dialogBackdrop" aria-hidden="true">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="taskDialogTitle">
        <div class="dialogHeader">
          <h2 id="taskDialogTitle" class="dialogTitle">Task details</h2>
        </div>
        <form id="taskForm">
          <div class="dialogBody">
            <div class="formGrid">
              <div class="field fieldWide">
                <label for="taskTitle">Title</label>
                <input id="taskTitle" class="toolbarInput" name="taskTitle" type="text" maxlength="120" required>
              </div>
              <div class="field fieldWide">
                <label for="taskDescription">Description</label>
                <textarea id="taskDescription" class="toolbarTextarea" name="taskDescription" rows="4" maxlength="400"></textarea>
              </div>
              <div class="field">
                <label for="taskOwner">Owner</label>
                <input id="taskOwner" class="toolbarInput" name="taskOwner" type="text" maxlength="80" placeholder="You">
              </div>
              <div class="field">
                <label for="taskPriority">Priority</label>
                <select id="taskPriority" class="toolbarSelect" name="taskPriority">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div class="field">
                <label for="taskDueDate">Due date</label>
                <input id="taskDueDate" class="toolbarInput" name="taskDueDate" type="date">
              </div>
              <div class="field">
                <label for="taskEstimate">Estimate</label>
                <input id="taskEstimate" class="toolbarInput" name="taskEstimate" type="text" maxlength="30" placeholder="2h">
              </div>
              <div class="field">
                <label for="taskStatus">Status</label>
                <select id="taskStatus" class="toolbarSelect" name="taskStatus">
                  ${aColumns.map((oColumn) => `<option value="${escapeHtml(oColumn.id)}">${escapeHtml(oColumn.title)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="taskProgress">Progress</label>
                <input id="taskProgress" class="toolbarInput" name="taskProgress" type="number" min="0" max="100" value="0">
              </div>
              <div class="field fieldWide">
                <label for="taskTags">Tags</label>
                <input id="taskTags" class="toolbarInput" name="taskTags" type="text" maxlength="120" placeholder="Planning, Reporting">
                <span class="helperText">Separate tags with commas.</span>
              </div>
            </div>
          </div>
          <div class="dialogFooter">
            <div class="toolbarGroup">
              <button id="deleteTaskButton" class="ghostButton hidden" type="button">Delete</button>
              <span class="statusText">Board status, owner, estimate, and tags are stored in task category metadata.</span>
            </div>
            <div class="toolbarGroup">
              <button id="cancelTaskButton" class="secondaryButton" type="button">Cancel</button>
              <button class="primaryButton" type="submit">Save task</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  bindAppEvents();
}

function bindAppEvents() {
  const eSearchInput = document.getElementById('searchInput');
  const eStatusFilter = document.getElementById('statusFilter');
  const eAddTaskButton = document.getElementById('addTaskButton');
  const eResetBoardButton = document.getElementById('resetBoardButton');
  const eBackdrop = document.getElementById('taskDialogBackdrop');
  const eTaskForm = document.getElementById('taskForm');
  const eCancelTaskButton = document.getElementById('cancelTaskButton');
  const eDeleteTaskButton = document.getElementById('deleteTaskButton');

  if (eSearchInput) {
    eSearchInput.addEventListener('input', (oEvent) => {
      oState.search = oEvent.target.value;
      renderApp();
    });
  }

  if (eStatusFilter) {
    eStatusFilter.addEventListener('change', (oEvent) => {
      oState.statusFilter = oEvent.target.value;
      renderApp();
    });
  }

  if (eAddTaskButton) {
    eAddTaskButton.addEventListener('click', () => openTaskDialog(''));
  }

  if (eResetBoardButton) {
    eResetBoardButton.addEventListener('click', async () => {
      try {
        oState.syncMessage = 'Loading sample board into Dataverse...';
        renderApp();

        const aExistingTasks = [...oState.tasks];
        await Promise.all(aExistingTasks.map((oTask) => deleteBoardTask(oTask.id)));
        await Promise.all(getSeedTasks().map((oTask) => createBoardTask(oTask)));
        await refreshBoardFromDataverse('Sample board loaded into Dataverse task table.');
      } catch (oError) {
        oState.syncMessage = 'Sample load failed: ' + (oError.message || oError);
      }

      renderApp();
    });
  }

  if (eCancelTaskButton) {
    eCancelTaskButton.addEventListener('click', closeTaskDialog);
  }

  if (eBackdrop) {
    eBackdrop.addEventListener('click', (oEvent) => {
      if (oEvent.target === eBackdrop) {
        closeTaskDialog();
      }
    });
  }

  if (eTaskForm) {
    eTaskForm.addEventListener('submit', async (oEvent) => {
      await handleTaskSubmit(oEvent);
    });
  }

  if (eDeleteTaskButton) {
    eDeleteTaskButton.addEventListener('click', async () => {
      await handleTaskDelete();
    });
  }

  document.querySelectorAll('[data-edit-task-id]').forEach((eButton) => {
    eButton.addEventListener('click', () => {
      openTaskDialog(eButton.getAttribute('data-edit-task-id') || '');
    });
  });

  document.querySelectorAll('.card').forEach((eCard) => {
    eCard.addEventListener('dragstart', handleDragStart);
    eCard.addEventListener('dragend', handleDragEnd);
  });

  document.querySelectorAll('.columnBody').forEach((eColumnBody) => {
    eColumnBody.addEventListener('dragover', handleDragOver);
    eColumnBody.addEventListener('dragleave', handleDragLeave);
    eColumnBody.addEventListener('drop', async (oEvent) => {
      await handleDrop(oEvent);
    });
  });
}

function openTaskDialog(sTaskId) {
  oState.editingTaskId = sTaskId;
  const eBackdrop = document.getElementById('taskDialogBackdrop');
  const eDeleteTaskButton = document.getElementById('deleteTaskButton');
  const oTask = oState.tasks.find((oItem) => oItem.id === sTaskId);

  const eTitle = document.getElementById('taskTitle');
  const eDescription = document.getElementById('taskDescription');
  const eOwner = document.getElementById('taskOwner');
  const ePriority = document.getElementById('taskPriority');
  const eDueDate = document.getElementById('taskDueDate');
  const eEstimate = document.getElementById('taskEstimate');
  const eStatus = document.getElementById('taskStatus');
  const eProgress = document.getElementById('taskProgress');
  const eTags = document.getElementById('taskTags');

  if (!eBackdrop || !eTitle || !eDescription || !eOwner || !ePriority || !eDueDate || !eEstimate || !eStatus || !eProgress || !eTags) {
    return;
  }

  eTitle.value = oTask ? oTask.title : '';
  eDescription.value = oTask ? oTask.description : '';
  eOwner.value = oTask ? oTask.owner : 'You';
  ePriority.value = oTask ? oTask.priority : 'Medium';
  eDueDate.value = oTask ? oTask.dueDate : '';
  eEstimate.value = oTask ? oTask.estimate : '';
  eStatus.value = oTask ? oTask.status : 'backlog';
  eProgress.value = oTask ? String(oTask.progress) : '0';
  eTags.value = oTask ? (oTask.tags || []).join(', ') : '';

  if (eDeleteTaskButton) {
    eDeleteTaskButton.classList.toggle('hidden', !oTask);
  }

  eBackdrop.classList.add('open');
  eBackdrop.setAttribute('aria-hidden', 'false');
  eTitle.focus();
}

function closeTaskDialog() {
  const eBackdrop = document.getElementById('taskDialogBackdrop');
  if (!eBackdrop) {
    return;
  }

  oState.editingTaskId = '';
  eBackdrop.classList.remove('open');
  eBackdrop.setAttribute('aria-hidden', 'true');
}

async function handleTaskSubmit(oEvent) {
  oEvent.preventDefault();

  const eForm = oEvent.target;
  const oFormData = new FormData(eForm);
  const aTags = String(oFormData.get('taskTags') || '')
    .split(',')
    .map((sTag) => sTag.trim())
    .filter(Boolean);

  const oTaskInput = {
    title: String(oFormData.get('taskTitle') || '').trim(),
    description: String(oFormData.get('taskDescription') || '').trim(),
    owner: String(oFormData.get('taskOwner') || '').trim() || 'You',
    priority: String(oFormData.get('taskPriority') || 'Medium'),
    dueDate: String(oFormData.get('taskDueDate') || ''),
    estimate: String(oFormData.get('taskEstimate') || '').trim(),
    status: String(oFormData.get('taskStatus') || 'backlog'),
    progress: clampProgress(oFormData.get('taskProgress')),
    tags: aTags
  };

  if (!oTaskInput.title) {
    return;
  }

  try {
    oState.syncMessage = oState.editingTaskId ? 'Updating Dataverse task...' : 'Creating Dataverse task...';
    renderApp();

    if (oState.editingTaskId) {
      await updateBoardTask(oState.editingTaskId, oTaskInput);
      await refreshBoardFromDataverse('Task updated in Dataverse.');
    } else {
      await createBoardTask(oTaskInput);
      await refreshBoardFromDataverse('Task created in Dataverse.');
    }

    closeTaskDialog();
  } catch (oError) {
    oState.syncMessage = 'Save failed: ' + (oError.message || oError);
  }

  renderApp();
}

async function handleTaskDelete() {
  if (!oState.editingTaskId) {
    return;
  }

  try {
    oState.syncMessage = 'Deleting Dataverse task...';
    renderApp();
    await deleteBoardTask(oState.editingTaskId);
    await refreshBoardFromDataverse('Task deleted from Dataverse.');
    closeTaskDialog();
  } catch (oError) {
    oState.syncMessage = 'Delete failed: ' + (oError.message || oError);
  }

  renderApp();
}

function handleDragStart(oEvent) {
  const eCard = oEvent.currentTarget;
  const sTaskId = eCard.getAttribute('data-task-id') || '';
  oState.draggedTaskId = sTaskId;
  eCard.classList.add('dragging');

  if (oEvent.dataTransfer) {
    oEvent.dataTransfer.effectAllowed = 'move';
    oEvent.dataTransfer.setData('text/plain', sTaskId);
  }
}

function handleDragEnd(oEvent) {
  oEvent.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.columnBody').forEach((eColumn) => eColumn.classList.remove('dragOver'));
  oState.draggedTaskId = '';
}

function handleDragOver(oEvent) {
  oEvent.preventDefault();
  oEvent.currentTarget.classList.add('dragOver');
}

function handleDragLeave(oEvent) {
  oEvent.currentTarget.classList.remove('dragOver');
}

async function handleDrop(oEvent) {
  oEvent.preventDefault();
  const eColumnBody = oEvent.currentTarget;
  const sColumnId = eColumnBody.getAttribute('data-column-id') || '';
  const sTaskId = oState.draggedTaskId || (oEvent.dataTransfer ? oEvent.dataTransfer.getData('text/plain') : '');

  eColumnBody.classList.remove('dragOver');

  if (!sColumnId || !sTaskId) {
    return;
  }

  const oTask = oState.tasks.find((oItem) => oItem.id === sTaskId);
  if (!oTask) {
    return;
  }

  try {
    const iProgress = sColumnId === 'complete' ? 100 : sColumnId === 'rejected' ? 0 : oTask.progress;
    oState.syncMessage = 'Moving Dataverse task...';
    renderApp();

    await updateBoardTask(sTaskId, {
      ...oTask,
      status: sColumnId,
      progress: iProgress
    });

    await refreshBoardFromDataverse('Task moved in Dataverse.');
  } catch (oError) {
    oState.syncMessage = 'Move failed: ' + (oError.message || oError);
  }

  renderApp();
}

async function boot() {
  await waitForHostLoad();

  registerTable('tasks', 'activityid');

  oState.tasks = loadCachedTasks();
  if (oState.tasks.length > 0) {
    oState.syncMessage = 'Loading fresh data from Dataverse...';
  } else {
    oState.syncMessage = 'Connecting to Dataverse task table...';
  }

  renderApp();

  try {
    await connectToDataverseOnStartup();
  } catch (oError) {
    if (oState.tasks.length > 0) {
      oState.syncMessage = 'Dataverse unavailable. Showing cached board: ' + getConnectionErrorMessage(oError);
    } else {
      oState.tasks = [];
      oState.syncMessage = getConnectionErrorMessage(oError);
    }
  }

  renderApp();
}

boot();
