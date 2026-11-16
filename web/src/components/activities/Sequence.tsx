import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Sequence } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak } from '../../lib/speech'
import { cn } from '../../lib/utils'
import { useSpeakOnMount, PraiseBubble } from './shared'

const PAD_COLORS = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#A78BFA']

export function SequenceActivity({ a, onDone }: { a: Sequence; onDone: (perfect: boolean) => void }) {
  const lengths = [a.length, a.length + 1, a.length + 2]
  const [phase, setPhase] = useState<'ready' | 'watch' | 'play' | 'done'>('ready')
  const [round, setRound] = useState(0)
  const [sequence, setSequence] = useState<number[]>([])
  const [input, setInput] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const [praise, setPraise] = useState<string | null>(null)
  const mistakesRef = useRef(0)
  const timers = useRef<number[]>([])
  const finishedRef = useRef(false)

  useSpeakOnMount(['Mira y escucha la secuencia. Después repítela.'])

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  const playSequence = (seq: number[]) => {
    clearTimers()
    setPhase('watch')
    setInput(0)
    const gap = 700
    seq.forEach((pad, index) => {
      timers.current.push(
        window.setTimeout(() => {
          setActive(pad)
          sfx.pad(pad)
        }, index * gap + 300)
      )
      timers.current.push(
        window.setTimeout(() => setActive(null), index * gap + 720)
      )
    })
    timers.current.push(
      window.setTimeout(() => {
        setPhase('play')
        speak('Tu turno', 0.95)
      }, seq.length * gap + 500)
    )
  }

  const startRound = (index: number) => {
    const seq = Array.from({ length: lengths[index] }, () => Math.floor(Math.random() * 4))
    setRound(index)
    setSequence(seq)
    playSequence(seq)
  }

  const tapPad = (pad: number) => {
    if (phase !== 'play') return
    setActive(pad)
    sfx.pad(pad)
    timers.current.push(window.setTimeout(() => setActive(null), 260))

    if (pad === sequence[input]) {
      const next = input + 1
      if (next === sequence.length) {
        if (round === lengths.length - 1) {
          setPhase('done')
          if (!finishedRef.current) {
            finishedRef.current = true
            sfx.win()
            const text = '¡Excelente memoria!'
            setPraise(text)
            speak(text)
            window.setTimeout(() => onDone(mistakesRef.current === 0), 1300)
          }
        } else {
          setPhase('watch')
          speak('¡Muy bien!', 0.95)
          timers.current.push(window.setTimeout(() => startRound(round + 1), 1200))
        }
      } else {
        setInput(next)
      }
    } else {
      mistakesRef.current += 1
      sfx.wrong()
      speak('Casi. Mira otra vez.', 0.95)
      setPhase('watch')
      timers.current.push(window.setTimeout(() => playSequence(sequence), 1200))
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <h2 className="text-center font-display text-2xl">
        {phase === 'ready' ? 'Simón de sonidos' : `Ronda ${round + 1} de ${lengths.length}`}
      </h2>

      {phase === 'ready' ? (
        <div className="flex flex-col items-center gap-4">
          <p className="max-w-sm text-center text-sm font-bold text-ink/60">
            Escucha los sonidos y repite la secuencia tocando los botones.
          </p>
          <button
            type="button"
            onClick={() => {
              sfx.click()
              startRound(0)
            }}
            className="btn btn-primary h-16 px-8 text-lg"
          >
            ▶️ Empezar
          </button>
        </div>
      ) : (
        <div className="grid w-full max-w-md grid-cols-2 gap-3">
          {PAD_COLORS.map((color, index) => (
            <motion.button
              key={color}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => tapPad(index)}
              className={cn(
                'h-28 rounded-[1.6rem] border-4 border-white transition sm:h-32',
                active === index ? 'scale-105 brightness-110 ring-4 ring-ink/20' : 'opacity-90'
              )}
              style={{ backgroundColor: color }}
              aria-label={`Botón ${index + 1}`}
            />
          ))}
        </div>
      )}

      {phase === 'watch' && (
        <p className="animate-pulse font-display text-lg text-ink/60">👀 Mira y escucha...</p>
      )}
      {phase === 'play' && (
        <p className="font-display text-lg text-mint">👆 Tu turno</p>
      )}
      {phase === 'done' && (
        <p className="font-display text-xl text-mint">¡Secuencia completa! 🎉</p>
      )}
      <PraiseBubble text={praise} />
    </div>
  )
}
