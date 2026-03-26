import { listEmails, sendEmail } from './codeapp.js';

// ===== STATE =====
let emails = [];
let selectedEmailId = null;

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const emailListEl = () => $('#emailList');
const emailCountEl = () => $('#emailCount');
const loadingEl = () => $('#loadingSkeleton');
const detailEmpty = () => $('#detailEmpty');
const detailContent = () => $('#detailContent');
const statusBar = () => $('#statusBar');
const statusText = () => $('#statusText');
const composeOverlay = () => $('#composeOverlay');

// ===== STATUS HELPERS =====
const setStatus = (text, type = 'ok') => {
  const bar = statusBar();
  const txt = statusText();
  if (!bar || !txt) return;
  bar.className = 'status-bar' + (type === 'error' ? ' status-bar--error' : type === 'loading' ? ' status-bar--loading' : '');
  txt.textContent = text;
};

// ===== FORMAT HELPERS =====
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const oneDay = 86400000;
    if (diff < oneDay && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 7 * oneDay) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const formatFullDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString([], {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// ===== RENDER INBOX =====
const renderEmailList = () => {
  const list = emailListEl();
  if (!list) return;

  const skeleton = loadingEl();
  if (skeleton) skeleton.remove();

  if (emails.length === 0) {
    list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--ink-muted);font-size:14px;">No emails found</div>';
    emailCountEl().textContent = '0';
    return;
  }

  emailCountEl().textContent = `${emails.length}`;

  list.innerHTML = emails.map((email) => {
    const id = email.Id || email.id || '';
    const from = email.From || email.from;
    const senderName = from?.EmailAddress?.Name || from?.emailAddress?.name || from?.Name || 'Unknown';
    const subject = email.Subject || email.subject || '(No subject)';
    const preview = stripHtml(email.BodyPreview || email.bodyPreview || email.Body?.Content || '');
    const dateStr = email.DateTimeReceived || email.receivedDateTime || email.ReceivedDateTime || '';
    const isRead = email.IsRead ?? email.isRead ?? true;
    const isActive = id === selectedEmailId;

    return `
      <div class="email-item ${!isRead ? 'email-item--unread' : ''} ${isActive ? 'email-item--active' : ''}"
           data-id="${id}" role="button" tabindex="0">
        <div class="email-item__avatar">${getInitials(senderName)}</div>
        <div class="email-item__content">
          <div class="email-item__row">
            <span class="email-item__sender">${escapeHtml(senderName)}</span>
            <span class="email-item__time">${formatTime(dateStr)}</span>
          </div>
          <div class="email-item__subject">${escapeHtml(subject)}</div>
          <div class="email-item__preview">${escapeHtml(preview.slice(0, 100))}</div>
        </div>
      </div>
    `;
  }).join('');

  // Attach click handlers
  list.querySelectorAll('.email-item').forEach((el) => {
    el.addEventListener('click', () => selectEmail(el.dataset.id));
  });
};

const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
};

// ===== SELECT EMAIL =====
const selectEmail = (id) => {
  selectedEmailId = id;
  const email = emails.find((e) => (e.Id || e.id) === id);
  if (!email) return;

  // Re-render list to update active state
  renderEmailList();

  // Show detail
  const empty = detailEmpty();
  const content = detailContent();
  if (empty) empty.style.display = 'none';
  if (!content) return;
  content.style.display = 'block';

  const from = email.From || email.from;
  const senderName = from?.EmailAddress?.Name || from?.emailAddress?.name || from?.Name || 'Unknown';
  const senderEmail = from?.EmailAddress?.Address || from?.emailAddress?.address || from?.Address || '';
  const subject = email.Subject || email.subject || '(No subject)';
  const dateStr = email.DateTimeReceived || email.receivedDateTime || email.ReceivedDateTime || '';
  const body = email.Body?.Content || email.body?.content || email.BodyPreview || email.bodyPreview || '';

  content.innerHTML = `
    <h2 class="detail-panel__subject">${escapeHtml(subject)}</h2>
    <div class="detail-panel__meta">
      <div class="detail-panel__meta-avatar">${getInitials(senderName)}</div>
      <div class="detail-panel__meta-info">
        <div class="detail-panel__meta-sender">${escapeHtml(senderName)}</div>
        <div class="detail-panel__meta-email">${escapeHtml(senderEmail)}</div>
        <div class="detail-panel__meta-date">${formatFullDate(dateStr)}</div>
      </div>
    </div>
    <div class="detail-panel__body">${body}</div>
  `;

  // Mobile: show detail
  const appBody = $('#appBody');
  if (appBody) appBody.classList.add('app-body--detail-open');
};

// ===== FETCH INBOX =====
const fetchInbox = async () => {
  setStatus('Loading inbox…', 'loading');
  try {
    const result = await listEmails({ folderId: 'Inbox', top: 25 });
    emails = Array.isArray(result) ? result : [];
    if (result && Array.isArray(result.value)) emails = result.value;
    renderEmailList();
    setStatus(`${emails.length} email${emails.length !== 1 ? 's' : ''} loaded`);
  } catch (err) {
    console.error('Failed to fetch inbox:', err);
    setStatus(`Error: ${err.message}`, 'error');
    const list = emailListEl();
    const skeleton = loadingEl();
    if (skeleton) skeleton.remove();
    if (list) {
      list.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--accent);font-size:14px;">
        Failed to load emails.<br><span style="color:var(--ink-muted);font-size:12px;">${escapeHtml(err.message)}</span>
      </div>`;
    }
  }
};

// ===== SEND EMAIL =====
const doSendEmail = async () => {
  const toEl = $('#composeTo');
  const subjectEl = $('#composeSubject');
  const bodyEl = $('#composeBody');
  const sendBtn = $('#btnSendEmail');

  const to = toEl?.value?.trim();
  const subject = subjectEl?.value?.trim();
  const body = bodyEl?.value?.trim();

  if (!to) {
    toEl?.focus();
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending…';
  setStatus('Sending email…', 'loading');

  try {
    await sendEmail({
      to: to,
      subject: subject || '(No subject)',
      body: '<p>' + escapeHtml(body || '') + '</p>',
      importance: 'Normal'
    });

    setStatus('Email sent successfully');
    closeCompose();

    // Clear form
    if (toEl) toEl.value = '';
    if (subjectEl) subjectEl.value = '';
    if (bodyEl) bodyEl.value = '';
  } catch (err) {
    console.error('Failed to send email:', err);
    setStatus(`Send failed: ${err.message}`, 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send ➤';
  }
};

// ===== COMPOSE MODAL =====
const openCompose = () => {
  const overlay = composeOverlay();
  if (overlay) overlay.classList.add('modal-overlay--visible');
  setTimeout(() => $('#composeTo')?.focus(), 200);
};

const closeCompose = () => {
  const overlay = composeOverlay();
  if (overlay) overlay.classList.remove('modal-overlay--visible');
};

// ===== EVENT BINDINGS =====
const bindEvents = () => {
  $('#btnCompose')?.addEventListener('click', openCompose);
  $('#btnCloseCompose')?.addEventListener('click', closeCompose);
  $('#btnDiscardCompose')?.addEventListener('click', closeCompose);
  $('#btnSendEmail')?.addEventListener('click', doSendEmail);
  $('#btnRefresh')?.addEventListener('click', fetchInbox);

  // Close modal on overlay click
  composeOverlay()?.addEventListener('click', (e) => {
    if (e.target === composeOverlay()) closeCompose();
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCompose();
  });
};

// ===== BOOT =====
async function boot() {
  bindEvents();
  await fetchInbox();
}

boot();
