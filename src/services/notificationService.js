import soundService from "./soundService.js"

const NOTIFICATION_TYPES = {
  TASK_REMINDER: "TASK_REMINDER",
  POMODORO_WORK: "POMODORO_WORK",
  POMODORO_BREAK: "POMODORO_BREAK",
  GENERAL: "GENERAL",
}

function createNotification(type, options) {
  const notificationId = `${type}_${Date.now()}`
  const defaultOptions = {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/notification48.png"),
    requireInteraction: false,
    priority: 0,
    silent: false,
    eventTime: Date.now(),
  }

  // Remove timeout from options before creating notification
  const { timeout, ...finalOptions } = { ...defaultOptions, ...options }

  chrome.notifications.create(notificationId, finalOptions, (createdId) => {
    console.log(`Notification created: ${createdId}`, finalOptions)

    // Play sound notification
    soundService.playSound(type)

    // Handle auto-clear separately
    if (!finalOptions.requireInteraction) {
      setTimeout(() => {
        clearNotification(createdId)
      }, timeout || 5000) // Default 5 seconds if not specified
    }
  })

  return notificationId
}

function clearNotification(notificationId) {
  chrome.notifications.clear(notificationId, (wasCleared) => {
    if (wasCleared) {
      console.log(`Notification cleared: ${notificationId}`)
    }
  })
}

function createTaskReminder(task) {
  console.log("Creating task reminder notification for:", task)
  return createNotification(NOTIFICATION_TYPES.TASK_REMINDER, {
    title: "Task Reminder",
    message: `Reminder for: ${task.text}`,
    requireInteraction: true, // Task reminders should require interaction
    priority: 2,
  })
}

function createPomodoroNotification(phase) {
  console.log("Creating Pomodoro notification for phase:", phase)
  const messages = {
    work: {
      title: "Pomodoro Work Time",
      message: "Time to focus! Work session started.",
      type: NOTIFICATION_TYPES.POMODORO_WORK,
    },
    break: {
      title: "Pomodoro Break Time",
      message: "Take a break! You've earned it.",
      type: NOTIFICATION_TYPES.POMODORO_BREAK,
    },
  }

  const { title, message, type } = messages[phase]

  return createNotification(type, {
    title,
    message,
    requireInteraction: false,
    timeout: 5000, // Pomodoro notifications auto-clear after 5 seconds
  })
}

function handleNotificationClick(notificationId) {
  console.log("Notification clicked:", notificationId)
  if (notificationId.startsWith(NOTIFICATION_TYPES.TASK_REMINDER)) {
    // Handle task reminder click
    chrome.storage.sync.get(["tasks"], function (result) {
      console.log("Current tasks when notification clicked:", result.tasks)
    })
  }
}

function handleNotificationClosed(notificationId) {
  console.log("Notification closed:", notificationId)
}

const notificationService = {
  NOTIFICATION_TYPES,
  createTaskReminder,
  createPomodoroNotification,
  handleNotificationClick,
  handleNotificationClosed,
  clearNotification,
}

export default notificationService
