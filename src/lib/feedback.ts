const CHIME_NOTES = [
  { frequency: 880, offset: 0 },
  { frequency: 1318.5, offset: 0.09 },
]
const NOTE_DURATION = 0.16
const PEAK_GAIN = 0.07
const VIBRATION_MS = 50

export const createAudioContext = () => {
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return null
  try {
    const context = new Context()
    void context.resume()
    return context
  } catch {
    return null
  }
}

export const playChime = (context: AudioContext | null) => {
  if (!context) return
  const start = context.currentTime
  CHIME_NOTES.forEach(({ frequency, offset }) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, start + offset)
    gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, start + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + NOTE_DURATION)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start + offset)
    oscillator.stop(start + offset + NOTE_DURATION + 0.02)
  })
}

export const vibrate = () => {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(VIBRATION_MS)
}
