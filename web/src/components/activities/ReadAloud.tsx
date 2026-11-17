import { useEffect, useRef, useState } from 'react'
import type { ReadAloud } from '../../types'
import { sfx } from '../../lib/sfx'
import { listenOnce, speak, speakQueue, speechRecognitionAvailable, stopSpeaking, type RecognitionHandle } from '../../lib/speech'
import { cn, normalize, pick, PRAISE } from '../../lib/utils'
import { useSpeakOnMount, TapText, PraiseBubble } from './shared'

export function ReadAloudActivity({ a, onDone }: { a: ReadAloud; onDone: (perfect: boolean) => void }) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'again' | 'error'>('idle')
  const [active, setActive] = useState(-1)
  const [praise, setPraise] = useState<string | null>(null)
  const handleRef = useRef<RecognitionHandle | null>(null)
  const doneRef = useRef(false)
  const listenTimerRef = useRef<number | null>(null)
  const doneTimerRef = useRef<number | null>(null)
  const supported = speechRecognitionAvailable()
  const words = a.text.split(' ')

  useSpeakOnMount(['Lee la frase en voz alta.'])

  useEffect(() => {
    return () => {
      handleRef.current?.stop()
      if (listenTimerRef.current) window.clearTimeout(listenTimerRef.current)
      if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current)
      stopSpeaking()
    }
  }, [])

  const finish = (message?: string) => {
    if (doneRef.current) return
    doneRef.current = true
    if (listenTimerRef.current) {
      window.clearTimeout(listenTimerRef.current)
      listenTimerRef.current = null
    }
    handleRef.current?.stop()
    setActive(-1)
    const text = message ?? pick(PRAISE)
    setPraise(text)
    sfx.correct()
    speak(text)
    doneTimerRef.current = window.setTimeout(() => onDone(true), 1400)
  }

  // Lectura en eco: la voz la lee palabra por palabra (se van iluminando) y luego completa.
  const echo = () => {
    if (doneRef.current) return
    handleRef.current?.stop()
    setStatus('idle')
    sfx.click()
    speakQueue(
      ['Vamos a leerla juntos.', ...words.map((word) => word.replace(/[.,!?¡¿]/g, '')), a.text, 'Ahora tú.'],
      0.78,
      (index) => setActive(index >= 1 && index <= words.length ? index - 1 : -1)
    )
  }

  const listen = () => {
    if (!supported || doneRef.current) return
    if (listenTimerRef.current) {
      window.clearTimeout(listenTimerRef.current)
      listenTimerRef.current = null
    }
    stopSpeaking()
    setActive(-1)
    setStatus('listening')
    sfx.click()
    handleRef.current = listenOnce(
      (heard) => {
        const target = normalize(a.text)
        const spoken = normalize(heard)
        const long = target.split(' ').filter((word) => word.length > 2)
        const matches = long.filter((word) => spoken.includes(word)).length
        const enough = spoken.includes(target) || (long.length > 0 && matches >= Math.ceil(long.length * 0.6))
        if (enough) {
          finish('¡Leíste muy bien!')
        } else {
          setStatus('again')
          speak('Casi. Intenta otra vez.', 0.9)
        }
      },
      () => setStatus('error'),
      () => setStatus((current) => (current === 'listening' ? 'idle' : current))
    )
    listenTimerRef.current = window.setTimeout(() => handleRef.current?.stop(), 9000)
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <div className="card flex max-w-2xl flex-col items-center gap-3 border-4 border-white px-6 py-6 text-center">
        <span className="text-6xl">{a.emoji ?? '📖'}</span>
        <TapText text={a.text} active={active} />
      </div>

      <div className="flex w-full max-w-md flex-col items-stretch gap-3">
        <button type="button" onClick={() => finish()} className="btn btn-primary h-16 gap-2 px-7 text-xl">
          👍 ¡Ya la leí!
        </button>
        <button type="button" onClick={echo} className="btn btn-white h-14 gap-2 px-5 text-base">
          🤝 Leámosla juntos
        </button>
        {supported && (
          <button
            type="button"
            onClick={listen}
            disabled={status === 'listening'}
            className={cn('btn btn-white h-14 gap-2 px-5 text-base', status === 'listening' && 'animate-glow')}
          >
            🎤 {status === 'listening' ? 'Te escucho...' : 'Que me escuche Chispa'}
          </button>
        )}
      </div>

      {status === 'again' && <div className="animate-pop text-4xl">💪 🔁</div>}
      {status === 'error' && (
        <p className="text-center text-xs font-bold text-ink/45">El micrófono no está disponible ahora.</p>
      )}
      <PraiseBubble text={praise} />
    </div>
  )
}
