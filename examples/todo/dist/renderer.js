import { createItem, listItems, updateItem, deleteItem } from "./dataverse.js";

const TABLE = "tasks";
const KEY = "activityid";

// Track IDs that exist in Dataverse (to distinguish create vs update)
const oExistingIds = new Set();

// Local order persistence (drag-to-reorder stored client-side)
function getLocalOrder() {
  try { return JSON.parse(localStorage.getItem('noteOrder') || '{}'); } catch { return {}; }
}
function saveLocalOrder() {
  const oOrder = {};
  oState.notes.forEach((oN) => { oOrder[oN.id] = oN.order; });
  localStorage.setItem('noteOrder', JSON.stringify(oOrder));
}

// Simple markdown helpers (minimal)
function mdToHtml(sMd) {
  // escape HTML
  const escapeHtml = (sText) => sText.replace(new RegExp('[&<>]', 'g'), (sChar) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[sChar]));
  let sOut = escapeHtml(sMd);
  // headings
  sOut = sOut.replace(new RegExp('^###### (.*)$', 'gm'), '<h6>$1</h6>')
             .replace(new RegExp('^##### (.*)$', 'gm'), '<h5>$1</h5>')
             .replace(new RegExp('^#### (.*)$', 'gm'), '<h4>$1</h4>')
             .replace(new RegExp('^### (.*)$', 'gm'), '<h3>$1</h3>')
             .replace(new RegExp('^## (.*)$', 'gm'), '<h2>$1</h2>')
             .replace(new RegExp('^# (.*)$', 'gm'), '<h1>$1</h1>');
  // blockquote
  sOut = sOut.replace(new RegExp('^> (.*)$', 'gm'), '<blockquote>$1</blockquote>');
  // task list items (keep before unordered list so they are not double processed)
  sOut = sOut.replace(new RegExp('^[-*] \\[( |x|X)?\\] (.*)$', 'gm'), (sMatch, sCheck, sText) => {
    const sChecked = sCheck && new RegExp('x|X').test(sCheck) ? ' checked' : '';
    return '<div class="task-item"><label><input type="checkbox" class="task-box"' + sChecked + '><span class="checkbox-ui"></span><span class="task-text">' + sText + '</span></label></div>';
  });
  // ordered list
  sOut = sOut.replace(new RegExp('^(\\d+)\\. (.*)(?:\\n(?!.|\\d+\\.).)*', 'gms'), (sMatch) => {
    const aItems = sMatch.split('\n').map((sLine) => sLine.match(new RegExp('^\\d+\\. (.*)'))?.[1]).filter(Boolean);
    return '<ol>' + aItems.map((sItem) => '<li>' + sItem + '</li>').join('') + '</ol>';
  });
  // unordered list
  sOut = sOut.replace(new RegExp('^(?:- |\\* )(.*)(?:\\n(?!\\n|[-*] ).)*', 'gms'), (sMatch) => {
    const aItems = sMatch.split('\n').map((sLine) => sLine.replace(new RegExp('^(?:- |\\* )'), ''));
    return '<ul>' + aItems.map((sItem) => '<li>' + sItem + '</li>').join('') + '</ul>';
  });
  // bold / italic / code / link
  sOut = sOut.replace(new RegExp('\\*\\*(.+?)\\*\\*', 'g'), '<strong>$1</strong>')
             .replace(new RegExp('\\*(.+?)\\*', 'g'), '<em>$1</em>')
             .replace(new RegExp('`([^`]+?)`', 'g'), '<code>$1</code>')
             .replace(new RegExp('\\[(.+?)\\]\\((.+?)\\)', 'g'), '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // paragraphs
  sOut = sOut.replace(new RegExp('^(?!<h\\d|<blockquote|<ul|<ol|<pre|<code|<div class="task-item")(.*)$', 'gm'), '<p>$1</p>');
  return sOut;
}

const $ = (sSelector) => document.querySelector(sSelector);
const $$ = (sSelector) => Array.from(document.querySelectorAll(sSelector));

const oState = {
  notes: [], // {id, title, content, tags:[], order}
  selectedId: null,
  tags: new Set(),
};

function setStatus(sMessage) { $('#sync-status').textContent = sMessage; }

function isHexColor(sValue) {
  return new RegExp('^([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$').test(sValue);
}

function renderTags() {
  const eWrap = $('#tag-list');
  eWrap.innerHTML = '';
  const aTags = Array.from(oState.tags).sort();
  aTags.forEach((sTag) => {
    const eButton = document.createElement('button');
    eButton.className = 'tag';
    eButton.textContent = '#' + sTag;
    eButton.onclick = () => filterByTag(sTag);
    eWrap.appendChild(eButton);
  });
}

function filterByTag(sTag) {
  const eList = $('#note-list');
  eList.querySelectorAll('li').forEach((eLi) => {
    const bHas = eLi.dataset.tags?.split(',').includes(sTag);
    eLi.style.display = bHas ? '' : 'none';
  });
}

function renderList() {
  const eList = $('#note-list');
  eList.innerHTML = '';
  const aSorted = [...oState.notes].sort((oA, oB) => oA.order - oB.order);
  aSorted.forEach((oNote) => {
    const eLi = document.createElement('li');
    eLi.className = 'note-item';
    eLi.draggable = true;
    eLi.dataset.id = oNote.id;
    eLi.dataset.tags = (oNote.tags || []).join(',');
    eLi.innerHTML = '<span class="title">' + (oNote.title || '(Untitled)') + ' </span>' +
      '<span class="muted">' + (oNote.tags || []).map((sTag) => '#' + sTag).join(' ') + '</span>' +
      '<button class="note-del" title="Delete" aria-label="Delete note" data-del>&times;</button>';
    eLi.addEventListener('click', (oEvent) => { if (oEvent.target.closest('[data-del]')) return; selectNote(oNote.id); });
    // delete button
    eLi.querySelector('[data-del]').addEventListener('click', async (oEvent) => { oEvent.stopPropagation(); await deleteNote(oNote.id); });
    // drag handlers
    eLi.addEventListener('dragstart', (oEvent) => {
      eLi.classList.add('dragging');
      oEvent.dataTransfer.setData('text/plain', oNote.id);
    });
    eLi.addEventListener('dragend', () => eLi.classList.remove('dragging'));
    eLi.addEventListener('dragover', (oEvent) => {
      oEvent.preventDefault();
      const eDragging = document.querySelector('.dragging');
      if (!eDragging || eDragging === eLi) return;
      const oRect = eLi.getBoundingClientRect();
      const bAfter = (oEvent.clientY - oRect.top) > oRect.height / 2;
      if (bAfter) eLi.after(eDragging); else eLi.before(eDragging);
    });
    eLi.addEventListener('drop', () => {
      // update orders by DOM position
      $$('#note-list .note-item').forEach((eItem, iIdx) => {
        const sId = eItem.dataset.id;
        const oFound = oState.notes.find((oN) => oN.id === sId);
        if (oFound) { oFound.order = iIdx; }
      });
      saveLocalOrder();
    });
    eList.appendChild(eLi);
  });
}

function selectNote(sId) {
  oState.selectedId = sId;
  const oNote = oState.notes.find((oN) => oN.id === sId);
  $('#title').value = oNote?.title || '';
  $('#content').value = oNote?.content || '';
  updatePreview();
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: build a v4 UUID from crypto.getRandomValues
  const aBytes = new Uint8Array(16);
  crypto.getRandomValues(aBytes);
  aBytes[6] = (aBytes[6] & 0x0f) | 0x40; // version 4
  aBytes[8] = (aBytes[8] & 0x3f) | 0x80; // variant 1
  const sHex = Array.from(aBytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return sHex.slice(0, 8) + '-' + sHex.slice(8, 12) + '-' + sHex.slice(12, 16) + '-' + sHex.slice(16, 20) + '-' + sHex.slice(20);
}

function newNote() {
  const sId = generateUUID();
  const iMaxOrder = oState.notes.reduce((iMax, oN) => Math.max(iMax, oN.order || 0), -1) + 1;
  const oNote = { id: sId, title: '', content: '', tags: [], order: iMaxOrder };
  oState.notes.push(oNote);
  selectNote(sId);
  renderList();
  debounceSave();
}

function applyMd(sAction) {
  const eTextarea = $('#content');
  const iStart = eTextarea.selectionStart;
  const iEnd = eTextarea.selectionEnd;
  const sSelected = eTextarea.value.slice(iStart, iEnd);
  const iLineStart = eTextarea.value.lastIndexOf('\n', iStart - 1) + 1;
  const iLineEnd = eTextarea.value.indexOf('\n', iEnd); // -1 ok
  const aSelLines = eTextarea.value.slice(iLineStart, iLineEnd === -1 ? undefined : iLineEnd).split('\n');

  let sReplacement = sSelected;
  switch (sAction) {
    case 'bold': sReplacement = '**' + (sSelected || 'bold') + '**'; break;
    case 'italic': sReplacement = '*' + (sSelected || 'italic') + '*'; break;
    case 'h1': sReplacement = '# ' + (sSelected || 'Heading 1'); break;
    case 'h2': sReplacement = '## ' + (sSelected || 'Heading 2'); break;
    case 'ul': sReplacement = aSelLines.map((sLine) => sLine ? '- ' + sLine : '- ').join('\n'); break;
    case 'ol': sReplacement = aSelLines.map((sLine, iIdx) => (iIdx + 1) + '. ' + (sLine || '')).join('\n'); break;
    case 'task': sReplacement = aSelLines.map((sLine) => sLine ? '- [ ] ' + sLine : '- [ ] ').join('\n'); break;
    case 'code': sReplacement = '`' + (sSelected || 'code') + '`'; break;
    case 'quote': sReplacement = sSelected.split('\n').map((sLine) => '> ' + sLine).join('\n'); break;
    case 'link': sReplacement = '[' + (sSelected || 'label') + '](https://)'; break;
    case 'tag': {
      const sTag = prompt('Enter tag (no #):');
      if (!sTag) return; addTagToCurrent(sTag); return;
    }
  }
  eTextarea.setRangeText(sReplacement, iStart, iEnd, 'end');
  onEdit();
}

function addTagToCurrent(sTag) {
  const oNote = oState.notes.find((oN) => oN.id === oState.selectedId);
  if (!oNote) return;
  // Insert #tag into content so tags stay in sync with text
  const sHashtag = '#' + sTag;
  const eContent = $('#content');
  if (!oNote.content.match(new RegExp('(^|\\s)' + sHashtag + '(\\s|$)', 'm'))) {
    eContent.value = eContent.value + '\n' + sHashtag;
  }
  onEdit();
}

function onEdit() {
  const sId = oState.selectedId; if (!sId) return;
  const oNote = oState.notes.find((oN) => oN.id === sId); if (!oNote) return;
  oNote.title = $('#title').value.trim();
  oNote.content = $('#content').value;
  // extract #tags from content - replace entirely so partial keystrokes don't accumulate
  const aTagMatches = [...oNote.content.matchAll(new RegExp('(^|\\s)#([\\w-]+)', 'g'))].map((aMatch) => aMatch[2]).filter((sTag) => !isHexColor(sTag));
  oNote.tags = [...new Set(aTagMatches)];
  // rebuild global tag set from all notes
  oState.tags = new Set(oState.notes.flatMap((oN) => oN.tags || []).filter((sTag) => !isHexColor(sTag)));
  renderTags();
  renderList();
  updatePreview();
  debounceSave();
}

function updatePreview() {
  const bHidden = $('#preview').hasAttribute('hidden');
  if (bHidden) return;
  const sMd = $('#content').value;
  const aLines = sMd.split('\n');
  // Build HTML
  const sHtml = mdToHtml(sMd);
  const ePreview = $('#preview');
  ePreview.innerHTML = sHtml;
  // Map task list items to original line numbers
  const aTaskLineIndices = [];
  aLines.forEach((sLine, iIdx) => { if (new RegExp('^[-*] \\[( |x|X)?\\] ').test(sLine)) aTaskLineIndices.push(iIdx); });
  ePreview.querySelectorAll('.task-item input.task-box').forEach((eInput, iIdx) => {
    eInput.dataset.line = aTaskLineIndices[iIdx];
    eInput.addEventListener('change', () => {
      const iLineNum = parseInt(eInput.dataset.line, 10);
      if (Number.isNaN(iLineNum)) return;
      // Toggle the checkbox marker in the markdown line
      aLines[iLineNum] = aLines[iLineNum].replace(new RegExp('^([-*] )\\[( |x|X)?\\] '), (sMatch, sPrefix) => sPrefix + '[' + (eInput.checked ? 'x' : ' ') + '] ');
      // Update textarea (preserve scroll)
      const eTextarea = $('#content');
      const iScrollPos = eTextarea.scrollTop;
      eTextarea.value = aLines.join('\n');
      eTextarea.scrollTop = iScrollPos;
      // Persist change
      onEdit();
    });
  });
}

let iSaveTimer = null;
function debounceSave() {
  clearTimeout(iSaveTimer);
  iSaveTimer = setTimeout(saveCurrentNote, 500);
}

async function saveCurrentNote() {
  const oNote = oState.notes.find((oN) => oN.id === oState.selectedId);
  if (!oNote) return;
  try {
    setStatus('Saving...');
    const oRecord = { subject: oNote.title, description: oNote.content };
    if (oExistingIds.has(oNote.id)) {
      await updateItem(TABLE, KEY, oNote.id, oRecord);
    } else {
      oRecord[KEY] = oNote.id;
      await createItem(TABLE, KEY, oRecord);
      oExistingIds.add(oNote.id);
    }
    saveLocalOrder();
    setStatus('Saved');
  } catch (oError) {
    setStatus('Save failed: ' + oError.message);
  }
}

async function sync(bLoad = false) {
  try {
    setStatus('Syncing...');
    const oResult = await listItems(TABLE, KEY, {
      select: ["activityid", "subject", "description"],
    });
    if (!oResult.success) {
      setStatus('Sync failed: ' + (oResult.error?.message || 'Unknown error'));
      return;
    }
    const aRecords = Array.isArray(oResult.data) ? oResult.data : [];
    const oOrderMap = getLocalOrder();
    oState.notes = aRecords.map((oRec, iIdx) => {
      const sId = oRec[KEY] || oRec.activityid;
      oExistingIds.add(sId);
      const sContent = oRec.description || '';
      const aTags = [...sContent.matchAll(new RegExp('(^|\\s)#([\\w-]+)', 'g'))].map((aMatch) => aMatch[2]).filter((sTag) => !isHexColor(sTag));
      return {
        id: sId,
        title: oRec.subject || '',
        content: sContent,
        tags: [...new Set(aTags)],
        order: oOrderMap[sId] ?? iIdx,
      };
    });
    oState.tags = new Set(oState.notes.flatMap((oN) => oN.tags || []).filter((sTag) => !isHexColor(sTag)));
    renderTags();
    renderList();
    if (bLoad && oState.notes[0]) selectNote(oState.notes[0].id);
    setStatus('Synced at ' + new Date().toLocaleTimeString());
  } catch (oError) {
    setStatus('Sync failed: ' + oError.message);
  }
}

function wire() {
  $('#btn-new').onclick = newNote;
  $('#btn-preview').onclick = () => {
    const ePrev = $('#preview');
    if (ePrev.hasAttribute('hidden')) { ePrev.removeAttribute('hidden'); updatePreview(); }
    else ePrev.setAttribute('hidden', '');
  };
  $('#btn-sync').onclick = () => sync(false);
  $('#title').addEventListener('input', onEdit);
  $('#content').addEventListener('input', onEdit);
  $('.toolbar').addEventListener('click', (oEvent) => {
    const eBtn = oEvent.target.closest('button[data-md]'); if (!eBtn || eBtn.disabled) return;
    applyMd(eBtn.dataset.md);
  });

  // Network status monitoring
  if ('onLine' in navigator) {
    const updateNetworkStatus = () => {
      if (!navigator.onLine) { setStatus('No internet connection'); }
    };
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
  }

  // Load tasks from Dataverse on startup
  sync(true);
}

window.addEventListener('DOMContentLoaded', wire);

async function deleteNote(sId) {
  const iIdx = oState.notes.findIndex((oN) => oN.id === sId);
  if (iIdx === -1) return;
  oState.notes.splice(iIdx, 1);
  // normalize order
  oState.notes.sort((oA, oB) => oA.order - oB.order).forEach((oN, iIndex) => oN.order = iIndex);
  if (oState.selectedId === sId) {
    oState.selectedId = oState.notes[0]?.id || null;
    $('#title').value = oState.notes[0]?.title || '';
    $('#content').value = oState.notes[0]?.content || '';
  }
  // rebuild global tags from remaining notes
  oState.tags = new Set(oState.notes.flatMap((oN) => oN.tags || []).filter((sTag) => !isHexColor(sTag)));
  renderTags();
  renderList();
  updatePreview();
  if (oExistingIds.has(sId)) {
    try {
      setStatus('Deleting...');
      await deleteItem(TABLE, KEY, sId);
      oExistingIds.delete(sId);
      setStatus('Deleted');
    } catch (oError) {
      setStatus('Delete failed: ' + oError.message);
    }
  }
  saveLocalOrder();
}
