// A synthesized looping alarm using the Web Audio API — no audio asset needed. Browsers require
// a user gesture before audio can play, so callers must invoke unlockAudio() from a click first.
// Note: the web has no access to a phone's native OS alarm clock; this is an in-app alarm that
// runs while the page/PWA is open.

let ctx: AudioContext | null = null
let loop: number | null = null

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

export function unlockAudio(): void {
  const audio = context()
  if (audio && audio.state === 'suspended') void audio.resume()
}

function beep(): void {
  const audio = context()
  if (!audio) return
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = 'square'
  oscillator.frequency.value = 880
  oscillator.connect(gain)
  gain.connect(audio.destination)
  const now = audio.currentTime
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
  oscillator.start(now)
  oscillator.stop(now + 0.36)
}

export function startAlarm(): void {
  unlockAudio()
  if (loop !== null) return
  beep()
  loop = window.setInterval(beep, 950)
}

export function stopAlarm(): void {
  if (loop !== null) { window.clearInterval(loop); loop = null }
}

export function isAlarmPlaying(): boolean {
  return loop !== null
}

export function vibrate(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([320, 160, 320, 160, 320])
}
