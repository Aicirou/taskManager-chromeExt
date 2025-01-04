import alarmService from "../services/alarmService.js"
import notificationService from "../services/notificationService.js"

console.log("Background script running...")

// State
const state = {
  pomodoro: {
    isActive: false,
    isWorkTime: true,
    currentCycle: 0,
    startTime: null,
  },
}

// Initialize listeners
function initializeBackgroundService() {
  chrome.runtime.onInstalled.addListener(handleInstall)
  chrome.notifications.onClicked.addListener(
    notificationService.handleNotificationClick
  )
  chrome.notifications.onClosed.addListener(
    notificationService.handleNotificationClosed
  )
  chrome.runtime.onMessage.addListener(handleMessage)
  chrome.storage.onChanged.addListener(handleStorageChange)
  chrome.alarms.onAlarm.addListener(alarmService.handleAlarm)

  console.log("Background service initialized with all listeners")
}

function handleInstall() {
  console.log("Extension installed")
  syncStorage()
}

async function syncStorage() {
  const { tasks = [] } = await chrome.storage.sync.get(["tasks"])
  console.log("Current tasks:", tasks)
}

function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case "POMODORO_UPDATE":
      updatePomodoroState(message.payload)
      break
    case "TASK_UPDATE":
      handleTaskUpdate(message.payload)
      break
  }
}

function updatePomodoroState(newState) {
  state.pomodoro = { ...state.pomodoro, ...newState }
  console.log("Pomodoro state updated:", state.pomodoro)
}

function handleStorageChange(changes, namespace) {
  if (namespace === "sync" && changes.tasks) {
    console.log("Tasks updated:", {
      oldValue: changes.tasks.oldValue,
      newValue: changes.tasks.newValue,
      timestamp: new Date().toISOString(),
    })
  }
}

// Initialize the background service
initializeBackgroundService()

chrome.runtime.onStartup.addListener(() => {
  console.log("Extension started")
})
