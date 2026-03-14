import { getMyProfile, getUserPhoto, getManager, getDirectReports } from "./office365users.js";

const root = document.getElementById("root");

// ── SVG icons ──────────────────────────────────────────────────
const icons = {
  mail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z"/><path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z"/></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-.638 1.59l-.558.372a.5.5 0 00-.183.548c.4 1.347 1.394 2.34 2.74 2.74a.5.5 0 00.548-.183l.372-.558a1.5 1.5 0 011.59-.638l3.223.716A1.5 1.5 0 0118 12.352v1.148A1.5 1.5 0 0116.5 15h-1.5A11.5 11.5 0 012 3.5z" clip-rule="evenodd"/></svg>`,
  office: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5H3.75a.75.75 0 010-1.5H4zm3-11a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 2.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm-.5 3.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm3.5-6.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm-.5 3.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 2.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1z" clip-rule="evenodd"/></svg>`,
  dept: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 8a3 3 0 100-6 3 3 0 000 6zm7.5 1a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z"/></svg>`,
};

// ── Helpers ────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function renderChip(icon, text) {
  if (!text) return "";
  return `<span class="chip">${icon}${escapeHtml(text)}</span>`;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function personRow(name, title, photoData) {
  const avatarContent = photoData
    ? `<img src="data:image/jpeg;base64,${photoData}" alt="">`
    : `<span>${getInitials(name)}</span>`;
  return `
    <div class="person-row">
      <div class="person-avatar">${avatarContent}</div>
      <div class="person-meta">
        <div class="person-name">${escapeHtml(name || "Unknown")}</div>
        <div class="person-title">${escapeHtml(title || "")}</div>
      </div>
    </div>`;
}

// ── Load photo (returns base64 or null) ────────────────────────
async function loadPhoto(userId) {
  try {
    const res = await getUserPhoto(userId);
    return res?.value || res || null;
  } catch { return null; }
}

// ── Boot ───────────────────────────────────────────────────────
async function boot() {
  try {
    // 1. Fetch profile
    const me = await getMyProfile();
    const userId = me.id || me.mail || me.userPrincipalName;

    // 2. Fetch photo, manager, and direct reports in parallel
    const [photo, manager, reports] = await Promise.all([
      loadPhoto(userId),
      getManager(userId).catch(() => null),
      getDirectReports(userId).catch(() => ({ value: [] })),
    ]);

    // 3. Load manager photo
    const mgrId = manager?.id || manager?.mail || manager?.userPrincipalName;
    const mgrPhoto = mgrId ? await loadPhoto(mgrId) : null;

    // 4. Load report photos in parallel
    const reportList = reports?.value || [];
    const reportPhotos = await Promise.all(
      reportList.map(r => loadPhoto(r.id || r.mail || r.userPrincipalName))
    );

    // 5. Render
    render(me, photo, manager, mgrPhoto, reportList, reportPhotos);
  } catch (err) {
    root.innerHTML = `<div class="app"><div class="card" style="text-align:center;padding:40px;color:var(--text-muted)">
      <p style="font-size:15px;font-weight:600;margin-bottom:8px">Unable to load profile</p>
      <p style="font-size:13px">${escapeHtml(String(err))}</p>
    </div></div>`;
  }
}

function render(me, photo, manager, mgrPhoto, reports, reportPhotos) {
  const avatarContent = photo
    ? `<img src="data:image/jpeg;base64,${photo}" alt="Profile photo">`
    : `<span class="initials">${getInitials(me.displayName)}</span>`;

  const chips = [
    renderChip(icons.mail, me.mail),
    renderChip(icons.phone, me.businessPhones?.[0] || me.mobilePhone),
    renderChip(icons.office, me.officeLocation),
    renderChip(icons.dept, me.department),
  ].filter(Boolean).join("");

  // Manager section
  const managerHtml = manager
    ? personRow(manager.displayName, manager.jobTitle, mgrPhoto)
    : `<div class="empty-state">No manager found</div>`;

  // Direct reports section
  let reportsHtml;
  if (reports.length === 0) {
    reportsHtml = `<div class="empty-state">No direct reports</div>`;
  } else {
    reportsHtml = reports
      .map((r, i) => personRow(r.displayName, r.jobTitle, reportPhotos[i]))
      .join("");
  }

  root.innerHTML = `
    <div class="app">
      <!-- Hero -->
      <div class="hero">
        <div class="hero-banner"></div>
        <div class="hero-body">
          <div class="avatar-ring">${avatarContent}</div>
          <div class="hero-info">
            <h1>${escapeHtml(me.displayName || "")}</h1>
            <p>${escapeHtml(me.jobTitle || "")}</p>
          </div>
        </div>
        <div class="details">${chips}</div>
      </div>

      <!-- Manager & Reports -->
      <div class="columns">
        <div>
          <div class="section-title">Manager</div>
          <div class="card">${managerHtml}</div>
        </div>
        <div>
          <div class="section-title">Direct Reports</div>
          <div class="card">${reportsHtml}</div>
        </div>
      </div>
    </div>`;
}

boot();