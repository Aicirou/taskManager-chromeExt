import alarmService from "../services/alarmService.js"
import notificationService from "../services/notificationService.js"

document.addEventListener("DOMContentLoaded", function () {
  function initializeElements() {
    const elements = {
      taskList: document.getElementById("task-list"),
      addTaskButton: document.getElementById("add-task-btn"),
      taskInput: document.getElementById("task-input"),
      startPomodoroBtn: document.getElementById("start-pomodoro"),
      pausePomodoroBtn: document.getElementById("pause-pomodoro"),
      resetPomodoroBtn: document.getElementById("reset-pomodoro"),
      pomodoroStatus: document.getElementById("pomodoro-status"),
      timerCountdown: document.getElementById("timer-countdown"),
    }

    // Validate all required elements exist
    const missingElements = Object.entries(elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key)

    if (missingElements.length > 0) {
      throw new Error(
        `Missing required elements: ${missingElements.join(", ")}`
      )
    }

    return elements
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme)
  }

  function detectSystemTheme() {
    const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)")
    applyTheme(darkThemeMq.matches ? "dark" : "light")
    darkThemeMq.addEventListener("change", (e) => {
      applyTheme(e.matches ? "dark" : "light")
    })
  }

  try {
    const elements = initializeElements()

    // Initialize tabs
    initializeTabs()

    // Detect and apply system theme
    detectSystemTheme()

    // Pomodoro state
    let pomodoroState = {
      isWorkTime: true,
      isPomodoroActive: false,
      isPaused: false,
      pomodoroTimer: null,
      startTime: null,
      pausedTimeRemaining: null,
      duration: null, // Added to track current phase duration
      POMODORO_WORK: 25 * 60 * 1000, // 25 minutes in milliseconds
      POMODORO_BREAK: 5 * 60 * 1000, // 5 minutes in milliseconds
    }

    // Event Bindings
    elements.addTaskButton.addEventListener("click", () =>
      handleAddTask(elements)
    )
    bindPomodoroEvents(elements, pomodoroState)
    elements.taskList.addEventListener("click", (e) =>
      handleTaskClick(e, elements)
    )

    // Load initial tasks
    loadTasks(elements)
    loadReminders()

    console.log("Task Manager initialized successfully")
  } catch (error) {
    console.error("Failed to initialize Task Manager:", error)
    document.body.innerHTML = `
            <div class="error-message">
                Failed to initialize Task Manager. Please reload the extension.
                <br>
                Error: ${error.message}
            </div>
        `
  }
})

function initializeTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn")
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.tab
      switchTab(tabId)
    })
  })
}

function switchTab(tabId) {
  // Update tab buttons and panes
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId)
  })
  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === tabId)
  })

  // Auto-refresh content when switching to tasks or reminders tab
  const elements = {
    taskList: document.getElementById("task-list"),
  }
  if (tabId === "tasks-tab" || tabId === "reminders-tab") {
    refreshTasksView(elements)
  }

  // Update header text
  const headerText = {
    "tasks-tab": "📝 My Tasks",
    "pomodoro-tab": "⏲️ Pomodoro Timer",
    "reminders-tab": "🔔 Active Reminders",
  }
  document.querySelector(".app-header h1").textContent = headerText[tabId]

  // Add animation class
  document.querySelector(".app-header").classList.add("header-transition")
  setTimeout(() => {
    document.querySelector(".app-header").classList.remove("header-transition")
  }, 300)
}

// Add function to check for expired reminders
export function checkForExpiredReminders() {
  const now = Date.now()
  chrome.storage.sync.get(["tasks"], async function (result) {
    const tasks = result.tasks || []
    const hasNewlyExpired = tasks.some((task) => {
      const reminderTime = new Date(task.reminder).getTime()
      return reminderTime < now && reminderTime > now - 1000 // Check if expired in the last second
    })

    if (hasNewlyExpired) {
      const elements = {
        taskList: document.getElementById("task-list"),
      }
      await refreshTasksView(elements)
    }
  })
}

// Add interval to check for expired reminders
setInterval(checkForExpiredReminders, 1000)

async function loadReminders() {
  const { tasks = [] } = await chrome.storage.sync.get(["tasks"])
  const remindersList = document.getElementById("reminders-list")
  remindersList.innerHTML = ""

  const allReminders = tasks
    .filter((task) => task.reminder && !task.completed)
    .sort((a, b) => new Date(a.reminder) - new Date(b.reminder))

  if (allReminders.length === 0) {
    remindersList.innerHTML = `<li class="placeholder">No reminders set. Add a reminder to get started!</li>`
  } else {
    const now = Date.now()
    allReminders.forEach((task) => {
      const reminderTime = new Date(task.reminder).getTime()
      const isExpired = reminderTime < now

      const li = document.createElement("li")
      li.className = `reminder-item ${isExpired ? "expired" : "upcoming"}`
      li.innerHTML = `
        <div class="reminder-content">
            <span class="reminder-text">${task.text}</span>
            <div class="reminder-meta">
                <span class="time ${isExpired ? "expired" : ""}">${
        isExpired ? "⌛" : "⏰"
      } ${new Date(task.reminder).toLocaleString()}</span>
                <span class="status-badge">${
                  isExpired ? "Expired" : "Upcoming"
                }</span>
            </div>
        </div>
      `
      remindersList.appendChild(li)
    })
  }
}

function handleAddTask(elements) {
  const taskText = elements.taskInput.value
  if (taskText) {
    saveTask({ text: taskText }).then((newTask) => {
      elements.taskInput.value = ""
      refreshTasksView(elements) // Ensure tasks are refreshed properly
    })
  }
}

async function loadTasks(elements) {
  const { tasks = [] } = await chrome.storage.sync.get(["tasks"])
  elements.taskList.innerHTML = "" // Clear current tasks

  if (tasks.length === 0) {
    elements.taskList.innerHTML = `<li class="placeholder">No tasks available. Add a new task to get started!</li>`
  } else {
    tasks.forEach((task) => renderTask(task, elements.taskList))
  }
}

// handleTaskClick function
function handleTaskClick(e, elements) {
  const target = e.target
  const task = target.closest("li")
  if (target.classList.contains("complete-task")) {
    completeTask(task, elements)
  } else if (target.classList.contains("delete-task")) {
    deleteTask(task, elements)
  }
}

async function refreshTasksView(elements) {
  if (!elements || !elements.taskList) {
    console.error("Required elements not found for refresh")
    return
  }

  try {
    const activeTab = document.querySelector(".tab-pane.active").id
    elements.taskList.innerHTML = "" // Clear current tasks

    if (activeTab === "tasks-tab") {
      await loadTasks(elements)
    }
    if (activeTab === "reminders-tab" || activeTab === "tasks-tab") {
      await loadReminders()
    }
  } catch (error) {
    console.error("Error refreshing tasks:", error)
  }
}

// Update task modification functions
async function completeTask(taskElement, elements) {
  const taskId = parseInt(taskElement.dataset.id)
  const { tasks = [] } = await chrome.storage.sync.get(["tasks"])
  const task = tasks.find((task) => task.id === taskId)
  task.completed = !task.completed
  await chrome.storage.sync.set({ tasks })
  await refreshTasksView(elements)
}

async function deleteTask(taskElement, elements) {
  const taskId = parseInt(taskElement.dataset.id)
  const { tasks = [] } = await chrome.storage.sync.get(["tasks"])
  const updatedTasks = tasks.filter((task) => task.id !== taskId)
  await chrome.storage.sync.set({ tasks: updatedTasks })
  await refreshTasksView(elements)
}

async function updateTaskReminder(taskId, reminderTime) {
  const { tasks = [] } = await chrome.storage.sync.get(["tasks"])
  const task = tasks.find((t) => t.id === taskId)
  if (task) {
    task.reminder = reminderTime
    await chrome.storage.sync.set({ tasks })
    alarmService.createTaskReminderAlarm(taskId, reminderTime)

    const elements = {
      taskList: document.getElementById("task-list"),
    }
    await refreshTasksView(elements)
    console.log("Reminder set for task:", task)
  }
}

async function saveTask(taskData) {
  const { tasks = [] } = await chrome.storage.sync.get(["tasks"])
  const newTask = {
    id: Date.now(),
    text: taskData.text,
    timestamp: new Date().toLocaleString(), // Assign current time
    completed: false,
    reminder: taskData.reminder || null,
  }

  if (newTask.reminder) {
    alarmService.createTaskReminderAlarm(newTask.id, newTask.reminder)
  }

  tasks.push(newTask)
  await chrome.storage.sync.set({ tasks })

  // Auto-refresh after adding new task
  const elements = {
    taskList: document.getElementById("task-list"),
  }
  await refreshTasksView(elements)

  return newTask
}

function renderTask(task, taskList) {
  const li = document.createElement("li")
  li.dataset.id = task.id

  const isReminderExpired =
    task.reminder && new Date(task.reminder).getTime() < Date.now()
  const reminderStatus = isReminderExpired ? "expired" : "upcoming"

  const reminderBadgeHtml = task.reminder
    ? `<span class="reminder-badge ${reminderStatus}"
            title="Reminder ${
              isReminderExpired ? "was" : "set"
            } for: ${new Date(task.reminder).toLocaleString()}">
            ${isReminderExpired ? "⏰" : "⏰"}
       </span>`
    : ""

  li.innerHTML = `
        <div class="task-content">
            <span class="${task.completed ? "completed" : ""}">${
    task.text
  }</span>
            <div class="task-actions">
                <button class="complete-task action-btn" title="Complete">✓</button>
                <div class="task-options-wrapper">
                    <button class="options-btn action-btn" title="Options">⋮</button>
                    <div class="task-options-menu">
                        <button class="set-reminder-btn menu-item">
                            <span class="icon">🔔</span>
                            Set Reminder
                        </button>
                        <button class="delete-task menu-item">
                            <span class="icon">🗑️</span>
                            Delete
                        </button>
                    </div>
                </div>
                ${reminderBadgeHtml}
            </div>
        </div>
        <div class="reminder-dialog" style="display: none;">
            <div class="reminder-dialog-content">
                <h3>Set Reminder</h3>
                <input type="datetime-local" class="task-reminder-input">
                <div class="reminder-dialog-buttons">
                    <button class="cancel-reminder dialog-btn">Cancel</button>
                    <button class="confirm-reminder dialog-btn primary">Set</button>
                </div>
            </div>
        </div>
    `

  // Add options button handler
  const optionsBtn = li.querySelector(".options-btn")
  const optionsMenu = li.querySelector(".task-options-menu")
  optionsBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    optionsMenu.classList.toggle("show")
  })

  // Close menu when clicking outside
  document.addEventListener("click", () => {
    optionsMenu.classList.remove("show")
  })

  // Add reminder button handler
  li.querySelector(".set-reminder-btn").addEventListener("click", () => {
    li.querySelector(".reminder-dialog").style.display = "flex"
    optionsMenu.classList.remove("show")
  })

  // Add cancel reminder handler
  li.querySelector(".cancel-reminder").addEventListener("click", () => {
    li.querySelector(".reminder-dialog").style.display = "none"
  })

  // Add confirm reminder handler
  li.querySelector(".confirm-reminder").addEventListener("click", async () => {
    const reminderTime = li.querySelector(".task-reminder-input").value
    if (reminderTime) {
      await updateTaskReminder(task.id, reminderTime)
      li.querySelector(".reminder-dialog").style.display = "none"
    }
  })

  taskList.appendChild(li)
}

// Pomodoro Functions
function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`
}

function updateTimer(elements, state) {
  const timerProgress = document.querySelector(".timer-progress")
  const workLine = document.querySelector(".work-line")
  const breakLine = document.querySelector(".break-line")

  if (!state.isPomodoroActive) {
    elements.timerCountdown.textContent = formatTime(state.POMODORO_WORK)
    timerProgress.style.strokeDashoffset = "283"
    workLine.style.stroke = "var(--work-color)"
    breakLine.style.stroke = "var(--break-color)"
    return
  }

  if (state.isPaused && state.pausedTimeRemaining) {
    elements.timerCountdown.textContent = formatTime(state.pausedTimeRemaining)
    return
  }

  const duration = state.isWorkTime ? state.POMODORO_WORK : state.POMODORO_BREAK
  const remaining = Math.max(0, state.startTime + duration - Date.now())
  const progress = remaining / duration

  elements.timerCountdown.textContent = formatTime(remaining)

  // Update circular progress
  const circumference = 2 * Math.PI * 45 // 45 is radius from SVG
  const offset = circumference - progress * circumference
  timerProgress.style.strokeDashoffset = offset

  // Update line colors based on active phase
  if (state.isWorkTime) {
    workLine.style.stroke = "var(--work-color)"
    breakLine.style.stroke = "var(--inactive-color)"
  } else {
    workLine.style.stroke = "var(--inactive-color)"
    breakLine.style.stroke = "var(--break-color)"
  }

  if (remaining > 0 && state.isPomodoroActive && !state.isPaused) {
    requestAnimationFrame(() => updateTimer(elements, state))
  }
}

function startPomodoro(elements, state) {
  state.isPomodoroActive = true
  state.isPaused = false
  state.startTime = Date.now()
  state.pausedTimeRemaining = null

  updatePomodoroControls(elements, state)
  updateTimer(elements, state)
  scheduleNextPomodoroPhase(elements, state)
}

function togglePausePomodoro(elements, state) {
  const duration = state.isWorkTime ? state.POMODORO_WORK : state.POMODORO_BREAK

  if (state.isPaused) {
    // Resume
    state.isPaused = false
    state.startTime = Date.now() - (duration - state.pausedTimeRemaining)
    scheduleNextPomodoroPhase(elements, state)
  } else {
    // Pause
    state.isPaused = true
    clearTimeout(state.pomodoroTimer)
    state.pausedTimeRemaining = Math.max(
      0,
      duration - (Date.now() - state.startTime)
    )
  }

  updatePomodoroControls(elements, state)
  updateTimer(elements, state)
}

function resetPomodoro(elements, state) {
  state.isPomodoroActive = false
  state.isPaused = false
  state.isWorkTime = true
  clearTimeout(state.pomodoroTimer)
  state.startTime = null
  state.pausedTimeRemaining = null

  updatePomodoroControls(elements, state)
  elements.timerCountdown.textContent = "25:00"
}

function updatePomodoroControls(elements, state) {
  elements.startPomodoroBtn.disabled = state.isPomodoroActive
  elements.pausePomodoroBtn.disabled = !state.isPomodoroActive
  elements.pausePomodoroBtn.textContent = state.isPaused ? "Resume" : "Pause"

  elements.pomodoroStatus.textContent = state.isPomodoroActive
    ? `Pomodoro ${state.isPaused ? "Paused" : "Active"}: ${
        state.isWorkTime ? "Work Time" : "Break Time"
      }`
    : "Pomodoro Inactive"
}

function scheduleNextPomodoroPhase(elements, state) {
  const duration = state.isWorkTime ? state.POMODORO_WORK : state.POMODORO_BREAK
  state.duration = duration // Store current phase duration

  state.pomodoroTimer = setTimeout(() => {
    const phase = state.isWorkTime ? "break" : "work"
    notificationService.createPomodoroNotification(phase)

    state.isWorkTime = !state.isWorkTime
    state.startTime = Date.now()
    state.pausedTimeRemaining = null

    if (state.isPomodoroActive) {
      scheduleNextPomodoroPhase(elements, state)
      updateTimer(elements, state)
    }
    updatePomodoroStatus(elements, state)
  }, duration)
}

function updatePomodoroStatus(elements, state) {
  elements.pomodoroStatus.textContent = state.isPomodoroActive
    ? `Pomodoro Active: ${state.isWorkTime ? "Work Time" : "Break Time"}`
    : "Pomodoro Inactive"
}

function bindPomodoroEvents(elements, state) {
  elements.startPomodoroBtn.addEventListener("click", () => {
    if (!state.isPomodoroActive) {
      startPomodoro(elements, state)
    }
  })

  elements.pausePomodoroBtn.addEventListener("click", () => {
    if (state.isPomodoroActive) {
      togglePausePomodoro(elements, state)
    }
  })

  elements.resetPomodoroBtn.addEventListener("click", () => {
    resetPomodoro(elements, state)
  })
}
