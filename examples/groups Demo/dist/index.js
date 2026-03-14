
import { listMyGroups } from "./office365groups.js";

function getElements() {
  const eStatus = document.getElementById("groupsStatus");
  const eList = document.getElementById("groupsList");
  const eRefresh = document.getElementById("groupsRefresh");

  return { eStatus, eList, eRefresh };
}

function setStatus(sMessage) {
  const { eStatus } = getElements();
  if (eStatus) {
    eStatus.textContent = sMessage;
  }
}

function normalizeGroups(oResult) {
  if (Array.isArray(oResult)) {
    return oResult;
  }

  if (oResult && Array.isArray(oResult.value)) {
    return oResult.value;
  }

  if (oResult && Array.isArray(oResult.data)) {
    return oResult.data;
  }

  if (oResult && Array.isArray(oResult.groups)) {
    return oResult.groups;
  }

  return [];
}

function getGroupName(oGroup) {
  return oGroup.displayName || oGroup.name || oGroup.mailNickname || oGroup.id || "Unnamed group";
}

function getGroupMeta(oGroup) {
  const aParts = [
    oGroup.mail || "",
    oGroup.visibility || "",
    oGroup.description || ""
  ].filter(Boolean);

  return aParts.join(" — ");
}

function renderGroups(aGroups) {
  const { eList } = getElements();

  if (!eList) {
    throw new Error("Missing groups list element.");
  }

  eList.innerHTML = "";

  if (!Array.isArray(aGroups) || aGroups.length === 0) {
    const eItem = document.createElement("li");
    eItem.textContent = "No groups found.";
    eList.appendChild(eItem);
    return;
  }

  aGroups.forEach((oGroup) => {
    const eItem = document.createElement("li");
    const eTitle = document.createElement("strong");
    const sMeta = getGroupMeta(oGroup);

    eTitle.textContent = getGroupName(oGroup);
    eItem.appendChild(eTitle);

    if (sMeta) {
      const eMeta = document.createElement("div");
      eMeta.textContent = sMeta;
      eItem.appendChild(eMeta);
    }

    eList.appendChild(eItem);
  });
}

async function loadGroups() {
  try {
    setStatus("Loading groups...");
    const oResult = await listMyGroups();
    const aGroups = normalizeGroups(oResult);

    renderGroups(aGroups);
    setStatus("Loaded " + aGroups.length + " groups.");
  } catch (oErr) {
    renderGroups([]);
    setStatus("Failed to load groups: " + (oErr.message || oErr));
  }
}

async function boot() {
  const { eRefresh } = getElements();

  if (eRefresh) {
    eRefresh.addEventListener("click", () => {
      loadGroups();
    });
  }

  await loadGroups();
}

boot();
