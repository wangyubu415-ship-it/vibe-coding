const STORAGE_KEY = "todo-app-tasks";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const prioritySelect = document.querySelector("#priority-select");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const activeCount = document.querySelector("#active-count");
const completedCount = document.querySelector("#completed-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const clearAllButton = document.querySelector("#clear-all");

const DEFAULT_PRIORITY = "medium";
const PRIORITY_LABELS = {
  high: "高",
  medium: "中",
  low: "低",
};

let tasks = loadTasks();
let editingTaskId = null;

function loadTasks() {
  try {
    const savedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(savedTasks)) {
      return [];
    }

    return savedTasks.map(normalizeTask).filter((task) => task.text);
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Some file:// previews restrict storage; keep the app interactive anyway.
  }
}

function isValidPriority(priority) {
  return Object.prototype.hasOwnProperty.call(PRIORITY_LABELS, priority);
}

function normalizeTask(task, index) {
  return {
    id: task.id ?? Date.now() + index,
    text: String(task.text || "").trim(),
    completed: Boolean(task.completed),
    priority: isValidPriority(task.priority) ? task.priority : DEFAULT_PRIORITY,
  };
}

function createTask(text, priority) {
  return {
    id: Date.now(),
    text,
    completed: false,
    priority: isValidPriority(priority) ? priority : DEFAULT_PRIORITY,
  };
}

function addTask(text, priority) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    input.focus();
    return;
  }

  tasks.unshift(createTask(trimmedText, priority));
  input.value = "";
  prioritySelect.value = DEFAULT_PRIORITY;
  saveTasks();
  render();
  input.focus();
}

function toggleTask(id) {
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  );
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  if (editingTaskId === id) {
    editingTaskId = null;
  }
  saveTasks();
  render();
}

function clearCompletedTasks() {
  tasks = tasks.filter((task) => !task.completed);
  if (!tasks.some((task) => task.id === editingTaskId)) {
    editingTaskId = null;
  }
  saveTasks();
  render();
}

function clearAllTasks() {
  if (tasks.length === 0) {
    return;
  }

  const confirmed = window.confirm("确定要清空全部任务吗？此操作无法撤销。");

  if (!confirmed) {
    return;
  }

  tasks = [];
  editingTaskId = null;
  saveTasks();
  render();
}

function startEditing(id) {
  editingTaskId = id;
  render();

  const editInput = list.querySelector(".edit-input");
  editInput?.focus();
  editInput?.select();
}

function cancelEditing() {
  editingTaskId = null;
  render();
}

function saveEditedTask(id, text, priority) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    const editInput = list.querySelector(".edit-input");
    editInput?.focus();
    return;
  }

  tasks = tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          text: trimmedText,
          priority: isValidPriority(priority) ? priority : DEFAULT_PRIORITY,
        }
      : task,
  );
  editingTaskId = null;
  saveTasks();
  render();
}

function updateStats() {
  const completedTotal = tasks.filter((task) => task.completed).length;
  const activeTotal = tasks.length - completedTotal;

  activeCount.textContent = activeTotal;
  completedCount.textContent = completedTotal;
  clearCompletedButton.disabled = completedTotal === 0;
  clearAllButton.disabled = tasks.length === 0;
  emptyState.classList.toggle("is-hidden", tasks.length > 0);
}

function createButton(className, text, ariaLabel) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = text;
  button.setAttribute("aria-label", ariaLabel);
  return button;
}

function createPrioritySelect(value) {
  const select = document.createElement("select");
  select.className = "edit-priority-select";
  select.setAttribute("aria-label", "编辑优先级");

  Object.entries(PRIORITY_LABELS).forEach(([priority, label]) => {
    const option = document.createElement("option");
    option.value = priority;
    option.textContent = `${label}优先级`;
    option.selected = priority === value;
    select.append(option);
  });

  select.value = value;
  return select;
}

function renderTask(task) {
  const item = document.createElement("li");
  item.className = [
    "todo-item",
    `priority-${task.priority}`,
    task.completed ? "is-completed" : "",
    editingTaskId === task.id ? "is-editing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const checkbox = document.createElement("input");
  checkbox.className = "todo-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `标记任务：${task.text}`);
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const content = document.createElement("div");
  content.className = "task-content";

  const actions = document.createElement("div");
  actions.className = "task-actions";

  if (editingTaskId === task.id) {
    const editGroup = document.createElement("div");
    editGroup.className = "edit-group";

    const editInput = document.createElement("input");
    editInput.className = "edit-input";
    editInput.type = "text";
    editInput.value = task.text;
    editInput.maxLength = 80;
    editInput.setAttribute("aria-label", "编辑任务内容");

    const editPrioritySelect = createPrioritySelect(task.priority);

    const saveButton = createButton("action-button save-button", "保存", `保存任务：${task.text}`);
    const cancelButton = createButton("action-button", "取消", `取消编辑：${task.text}`);

    const saveCurrentEdit = () => saveEditedTask(task.id, editInput.value, editPrioritySelect.value);

    editInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        saveCurrentEdit();
      }

      if (event.key === "Escape") {
        cancelEditing();
      }
    });
    saveButton.addEventListener("click", saveCurrentEdit);
    cancelButton.addEventListener("click", cancelEditing);

    editGroup.append(editInput, editPrioritySelect);
    content.append(editGroup);
    actions.append(saveButton, cancelButton);
  } else {
    const priorityBadge = document.createElement("span");
    priorityBadge.className = `priority-badge priority-${task.priority}`;
    priorityBadge.textContent = `${PRIORITY_LABELS[task.priority]}优先级`;

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = task.text;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.append(priorityBadge);

    const editButton = createButton("action-button", "编辑", `编辑任务：${task.text}`);
    editButton.addEventListener("click", () => startEditing(task.id));

    content.append(meta, text);
    actions.append(editButton);
  }

  const deleteButton = createButton("delete-button", "×", `删除任务：${task.text}`);
  deleteButton.addEventListener("click", () => deleteTask(task.id));
  actions.append(deleteButton);

  item.append(checkbox, content, actions);
  return item;
}

function render() {
  list.replaceChildren(...tasks.map(renderTask));
  updateStats();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(input.value, prioritySelect.value);
});

clearCompletedButton.addEventListener("click", clearCompletedTasks);
clearAllButton.addEventListener("click", clearAllTasks);

render();
