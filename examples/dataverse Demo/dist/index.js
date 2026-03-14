import { createItem, listItems } from "./dataverse.js";

const TABLE = "tasks";
const PK = "activityid";

const taskBody = document.getElementById("task-body");
const taskInput = document.getElementById("task-input");
const btnAdd = document.getElementById("btn-add");
const status = document.getElementById("status");

function renderRows(records) {
  if (!records || records.length === 0) {
    taskBody.innerHTML = "<tr><td colspan='3'>No tasks found.</td></tr>";
    return;
  }
  taskBody.innerHTML = records
    .map((r) => {
      const subject = r.subject || "—";
      const state = r.statecode === 0 ? "Open" : "Completed";
      const created = r.createdon
        ? new Date(r.createdon).toLocaleDateString()
        : "—";
      return `<tr><td>${escapeHtml(subject)}</td><td>${state}</td><td>${created}</td></tr>`;
    })
    .join("");
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

async function loadTasks() {
  status.textContent = "Loading tasks…";
  try {
    const result = await listItems(TABLE, PK, {
      select: ["subject", "statecode", "createdon"],
      orderBy: ["createdon desc"],
      top: 5,
    });
    renderRows(result.entities ?? []);
    status.textContent = "";
  } catch (err) {
    status.textContent = "Error loading tasks: " + err.message;
  }
}

async function addTask() {
  const subject = taskInput.value.trim();
  if (!subject) return;

  btnAdd.disabled = true;
  status.textContent = "Creating task…";
  try {
    await createItem(TABLE, PK, { subject });
    taskInput.value = "";
    await loadTasks();
  } catch (err) {
    status.textContent = "Error creating task: " + err.message;
  } finally {
    btnAdd.disabled = false;
  }
}

btnAdd.addEventListener("click", addTask);
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

loadTasks();