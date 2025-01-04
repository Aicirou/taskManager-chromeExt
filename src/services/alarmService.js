import notificationService from "./notificationService.js"

const ALARM_TYPES = {
  TASK_REMINDER: "TASK_REMINDER_",
}

function createTaskReminderAlarm(taskId, time) {
  const alarmName = `${ALARM_TYPES.TASK_REMINDER}${taskId}`
  chrome.alarms.create(alarmName, {
    when: new Date(time).getTime(),
  })
  console.log(
    `Task reminder alarm created for ${new Date(time).toLocaleString()}`
  )
}

function clearTaskReminderAlarm(taskId) {
  const alarmName = `${ALARM_TYPES.TASK_REMINDER}${taskId}`
  chrome.alarms.clear(alarmName)
}

function handleAlarm(alarm) {
  console.log("Alarm triggered:", alarm)

  if (alarm.name.startsWith(ALARM_TYPES.TASK_REMINDER)) {
    const taskId = alarm.name.replace(ALARM_TYPES.TASK_REMINDER, "")
    chrome.storage.sync.get(["tasks"], function (result) {
      const task = result.tasks.find((t) => t.id.toString() === taskId)
      if (task) {
        console.log("Task reminder triggered for:", task)
        notificationService.createTaskReminder(task)
      }
    })
  }
}

const alarmService = {
  ALARM_TYPES,
  createTaskReminderAlarm,
  clearTaskReminderAlarm,
  handleAlarm,
}

export default alarmService
