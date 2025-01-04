const SOUND_TYPES = {
  TASK_REMINDER: "TASK_REMINDER",
  POMODORO_WORK: "POMODORO_WORK",
  POMODORO_BREAK: "POMODORO_BREAK",
  GENERAL: "GENERAL",
}

const soundFiles = {
  [SOUND_TYPES.TASK_REMINDER]: "sounds/task_reminder.mp3",
  [SOUND_TYPES.POMODORO_WORK]: "sounds/pomodoro_work.mp3",
  [SOUND_TYPES.POMODORO_BREAK]: "sounds/pomodoro_break.mp3",
  [SOUND_TYPES.GENERAL]: "sounds/general.mp3",
}

function playSound(type) {
  const soundFile = soundFiles[type]
  if (soundFile) {
    const audio = new Audio(chrome.runtime.getURL(soundFile))
    audio.play().catch((error) => console.error("Error playing sound:", error))
  } else {
    console.error("Sound type not recognized:", type)
  }
}

const soundService = {
  SOUND_TYPES,
  playSound,
}

export default soundService
