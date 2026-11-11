let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  if (context.state === 'suspended') {
    void context.resume()
  }
  return context
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.12) {
  const ctx = getContext()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime + start)
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start)
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(ctx.currentTime + start)
  oscillator.stop(ctx.currentTime + start + duration + 0.05)
}

export const sfx = {
  click() {
    tone(560, 0, 0.07, 'triangle', 0.06)
  },
  pop() {
    tone(880, 0, 0.06, 'square', 0.04)
  },
  correct() {
    ;[523.25, 659.25, 783.99].forEach((freq, index) => tone(freq, index * 0.09, 0.16, 'sine', 0.1))
  },
  wrong() {
    tone(220, 0, 0.16, 'sawtooth', 0.05)
    tone(174, 0.12, 0.2, 'sawtooth', 0.04)
  },
  star() {
    ;[783.99, 987.77, 1174.66].forEach((freq, index) => tone(freq, index * 0.08, 0.2, 'triangle', 0.1))
  },
  win() {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => tone(freq, index * 0.13, 0.3, 'sine', 0.1))
  },
  pad(index: number) {
    const notes = [261.63, 329.63, 392.0, 523.25]
    tone(notes[index] ?? 440, 0, 0.25, 'sine', 0.12)
  },
  unlock() {
    ;[659.25, 880, 1046.5].forEach((freq, index) => tone(freq, index * 0.1, 0.22, 'triangle', 0.1))
  }
}
