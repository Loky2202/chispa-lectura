import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Activity,
  BuildWord,
  CountSyllables,
  ListenTap,
  Memory,
  MissingLetter,
  OddOneOut,
  ReadAloud,
  SentencePicture,
  Sequence,
  Story,
  WordPicture
} from '../types'
import { sfx } from '../lib/sfx'
import {
  listenOnce,
  speak,
  speakQueue,
  speechRecognitionAvailable,
  stopSpeaking,
  type RecognitionHandle
} from '../lib/speech'
import { cn, ENCOURAGE, normalize, pick, PRAISE, shuffle } from '../lib/utils'

function useSpeakOnMount(texts: string[], delay = 500) {
  const key = texts.join('||')
  useEffect(() => {
    const timer = window.setTimeout(() => speakQueue(texts), delay)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delay])
}

function useAnswer(texts: string[], onDone: (perfect: boolean) => void) {
  const [locked, setLocked] = useState(false)
  const [praise, setPraise] = useState<string | null>(null)
  const mistakesRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  useSpeakOnMount(texts)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const succeed = (message?: string) => {
    if (locked || !mountedRef.current) return
    setLocked(true)
    const text = message ?? pick(PRAISE)
    setPraise(text)
    sfx.correct()
    speak(text)
    timerRef.current = window.setTimeout(() => {
      if (mountedRef.current) onDone(mistakesRef.current === 0)
    }, 1300)
  }

  const fail = () => {
    if (locked || !mountedRef.current) return
    mistakesRef.current += 1
    sfx.wrong()
    speak(pick(ENCOURAGE))
  }

  return { locked, praise, succeed, fail }
}

function PraiseBubble({ text }: { text: string | null }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="rounded-[2rem] bg-white px-8 py-5 font-display text-3xl text-ink shadow-2xl"
            initial={{ scale: 0.6, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            {text} 🎉
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Prompt({ text, onSpeak }: { text: string; onSpeak?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h2 className="max-w-xl font-display text-2xl leading-snug sm:text-3xl">{text}</h2>
      {onSpeak && (
        <button
          type="button"
          onClick={() => {
            sfx.click()
            onSpeak()
          }}
          className="btn btn-white h-12 gap-2 px-5 text-sm"
          aria-label="Escuchar otra vez"
        >
          🔊 Escuchar
        </button>
      )}
    </div>
  )
}

function PictureChoices({
  options,
  answer,
  disabled,
  onCorrect,
  onWrong,
  showLabels = true
}: {
  options: { emoji: string; label: string }[]
  answer: string
  disabled: boolean
  onCorrect: () => void
  onWrong: () => void
  showLabels?: boolean
}) {
  const [wrong, setWrong] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)

  const choose = (label: string) => {
    if (disabled || right) return
    if (normalize(label) === normalize(answer)) {
      setRight(label)
      onCorrect()
    } else {
      setWrong(label)
      onWrong()
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((option) => (
        <motion.button
          key={option.label}
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => choose(option.label)}
          className={cn(
            'card flex flex-col items-center gap-1 border-4 border-white p-3 pt-4 transition',
            right === option.label && 'bg-mint/20 ring-4 ring-mint',
            wrong === option.label && 'animate-shake bg-coral/10 ring-4 ring-coral'
          )}
        >
          <span className="text-5xl sm:text-6xl">{option.emoji}</span>
          {showLabels && <span className="text-sm font-bold text-ink/70">{option.label}</span>}
        </motion.button>
      ))}
    </div>
  )
}

function ListenTapActivity({ a, onDone }: { a: ListenTap; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail } = useAnswer([a.prompt, a.audio], onDone)
  const [wrong, setWrong] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)

  const choose = (option: string) => {
    if (locked || right) return
    if (normalize(option) === normalize(a.answer)) {
      setRight(option)
      succeed()
    } else {
      setWrong(option)
      fail()
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <Prompt text={a.prompt} onSpeak={() => speak(a.audio, 0.8)} />
      <div className="grid w-full max-w-lg grid-cols-3 gap-3">
        {a.options.map((option) => (
          <motion.button
            key={option}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => choose(option)}
            className={cn(
              'card flex aspect-square items-center justify-center border-4 border-white font-display text-5xl uppercase transition sm:text-6xl',
              right === option && 'bg-mint/25 ring-4 ring-mint',
              wrong === option && 'animate-shake bg-coral/10 ring-4 ring-coral'
            )}
          >
            {option}
          </motion.button>
        ))}
      </div>
      <PraiseBubble text={praise} />
    </div>
  )
}

function WordPictureActivity({ a, onDone }: { a: WordPicture; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail } = useAnswer([a.audio ?? a.prompt], onDone)
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <Prompt text={a.prompt} onSpeak={() => speak(a.audio ?? a.prompt)} />
      <PictureChoices
        options={a.options}
        answer={a.answer}
        disabled={locked}
        onCorrect={succeed}
        onWrong={fail}
      />
      <PraiseBubble text={praise} />
    </div>
  )
}

function CountSyllablesActivity({ a, onDone }: { a: CountSyllables; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail } = useAnswer(
    [a.word, '¿Cuántas sílabas tiene?'],
    onDone
  )
  const [wrong, setWrong] = useState<number | null>(null)
  const [right, setRight] = useState<number | null>(null)

  const choose = (option: number) => {
    if (locked || right !== null) return
    if (option === a.answer) {
      setRight(option)
      succeed()
    } else {
      setWrong(option)
      fail()
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <span className="text-7xl">{a.emoji}</span>
        <span className="font-display text-3xl">{a.word}</span>
        <button
          type="button"
          onClick={() => {
            sfx.click()
            speak(a.word, 0.78)
          }}
          className="btn btn-white h-11 gap-2 px-4 text-sm"
        >
          🔊 Escuchar
        </button>
      </div>
      <h2 className="text-center font-display text-xl">¿Cuántas sílabas tiene?</h2>
      <div className="flex gap-3">
        {a.options.map((option) => (
          <motion.button
            key={option}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => choose(option)}
            className={cn(
              'card flex h-20 w-20 items-center justify-center border-4 border-white font-display text-4xl',
              right === option && 'bg-mint/25 ring-4 ring-mint',
              wrong === option && 'animate-shake bg-coral/10 ring-4 ring-coral'
            )}
          >
            {option}
          </motion.button>
        ))}
      </div>
      {right !== null && (
        <div className="animate-pop flex gap-2 text-3xl">
          {Array.from({ length: a.answer }).map((_, index) => (
            <span key={index}>👏</span>
          ))}
        </div>
      )}
      <PraiseBubble text={praise} />
    </div>
  )
}

function MissingLetterActivity({ a, onDone }: { a: MissingLetter; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail } = useAnswer(['¿Qué vocal falta?', a.word], onDone)
  const [wrong, setWrong] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)

  const choose = (option: string) => {
    if (locked || right) return
    if (normalize(option) === normalize(a.answer)) {
      setRight(option)
      succeed()
    } else {
      setWrong(option)
      fail()
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <span className="text-7xl">{a.emoji}</span>
      <div className="flex gap-2">
        {a.display.split('').map((letter, index) => (
          <div
            key={`${letter}-${index}`}
            className={cn(
              'flex h-20 w-16 items-center justify-center rounded-2xl border-4 font-display text-4xl',
              letter === '_'
                ? right
                  ? 'animate-pop border-mint bg-mint/20'
                  : 'border-dashed border-ink/25 bg-white/60'
                : 'border-white bg-white'
            )}
          >
            {letter === '_' ? (right ?? '') : letter}
          </div>
        ))}
      </div>
      <h2 className="font-display text-xl">¿Qué vocal falta?</h2>
      <div className="flex gap-3">
        {a.options.map((option) => (
          <motion.button
            key={option}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => choose(option)}
            className={cn(
              'card flex h-20 w-20 items-center justify-center border-4 border-white font-display text-4xl uppercase',
              right === option && 'bg-mint/25 ring-4 ring-mint',
              wrong === option && 'animate-shake bg-coral/10 ring-4 ring-coral'
            )}
          >
            {option}
          </motion.button>
        ))}
      </div>
      <PraiseBubble text={praise} />
    </div>
  )
}

function BuildWordActivity({ a, onDone }: { a: BuildWord; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail } = useAnswer([a.word], onDone)
  const letters = useMemo(
    () => shuffle(a.word.split('').map((letter, index) => ({ letter, index }))),
    [a.word]
  )
  const [placed, setPlaced] = useState<number[]>([])
  const [wrongTile, setWrongTile] = useState<number | null>(null)
  const expected = a.word.split('')

  const tap = (tile: { letter: string; index: number }) => {
    if (locked || placed.includes(tile.index)) return
    const nextLetter = expected[placed.length]
    if (normalize(tile.letter) === normalize(nextLetter)) {
      const next = [...placed, tile.index]
      setPlaced(next)
      sfx.pop()
      if (next.length === expected.length) {
        speak(a.word, 0.8)
        succeed()
      }
    } else {
      setWrongTile(tile.index)
      fail()
      window.setTimeout(() => setWrongTile(null), 650)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <span className="text-7xl">{a.emoji}</span>
      <button
        type="button"
        onClick={() => {
          sfx.click()
          speak(a.word, 0.78)
        }}
        className="btn btn-white h-11 gap-2 px-4 text-sm"
      >
        🔊 Escuchar la palabra
      </button>

      <div className="flex flex-wrap justify-center gap-2">
        {expected.map((letter, index) => (
          <div
            key={index}
            className={cn(
              'flex h-16 w-14 items-center justify-center rounded-2xl border-4 font-display text-3xl',
              index < placed.length
                ? 'border-mint bg-mint/20'
                : 'border-dashed border-ink/25 bg-white/60'
            )}
          >
            {index < placed.length ? expected[index] : ''}
          </div>
        ))}
      </div>

      <div className="flex max-w-lg flex-wrap justify-center gap-2">
        {letters.map((tile) => {
          const used = placed.includes(tile.index)
          return (
            <motion.button
              key={tile.index}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => tap(tile)}
              disabled={used}
              className={cn(
                'card flex h-16 w-14 items-center justify-center border-4 border-white font-display text-3xl uppercase transition',
                used && 'opacity-25',
                wrongTile === tile.index && 'animate-shake bg-coral/15 ring-4 ring-coral'
              )}
            >
              {tile.letter}
            </motion.button>
          )
        })}
      </div>
      <PraiseBubble text={praise} />
    </div>
  )
}

function SentencePictureActivity({
  a,
  onDone
}: {
  a: SentencePicture
  onDone: (perfect: boolean) => void
}) {
  const { locked, praise, succeed, fail } = useAnswer([a.sentence], onDone)
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <div className="card max-w-2xl border-4 border-white px-6 py-5 text-center">
        <p className="font-display text-3xl leading-snug sm:text-4xl">{a.sentence}</p>
        <button
          type="button"
          onClick={() => {
            sfx.click()
            speak(a.sentence, 0.82)
          }}
          className="btn btn-white mt-3 h-11 gap-2 px-4 text-sm"
        >
          🔊 Escuchar
        </button>
      </div>
      <p className="text-sm font-bold text-ink/60">¿De qué habla la frase?</p>
      <PictureChoices
        options={a.options}
        answer={a.answer}
        disabled={locked}
        onCorrect={succeed}
        onWrong={fail}
      />
      <PraiseBubble text={praise} />
    </div>
  )
}

function ReadAloudActivity({ a, onDone }: { a: ReadAloud; onDone: (perfect: boolean) => void }) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'heard' | 'error'>('idle')
  const [transcript, setTranscript] = useState('')
  const [praise, setPraise] = useState<string | null>(null)
  const handleRef = useRef<RecognitionHandle | null>(null)
  const doneRef = useRef(false)
  const listenTimerRef = useRef<number | null>(null)
  const doneTimerRef = useRef<number | null>(null)
  const supported = speechRecognitionAvailable()

  useSpeakOnMount([a.text], 700)

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
    const text = message ?? pick(PRAISE)
    setPraise(text)
    sfx.correct()
    speak(text)
    doneTimerRef.current = window.setTimeout(() => onDone(true), 1400)
  }

  const start = () => {
    if (!supported || doneRef.current) return
    if (listenTimerRef.current) {
      window.clearTimeout(listenTimerRef.current)
      listenTimerRef.current = null
    }
    stopSpeaking()
    setTranscript('')
    setStatus('listening')
    sfx.click()
    handleRef.current = listenOnce(
      (heard) => {
        setTranscript(heard)
        const target = normalize(a.text)
        const spoken = normalize(heard)
        const words = target.split(' ').filter((word) => word.length > 2)
        const matches = words.filter((word) => spoken.includes(word)).length
        const enough = spoken.includes(target) || (words.length > 0 && matches >= Math.ceil(words.length * 0.6))
        if (enough) {
          finish('¡Leíste muy bien!')
        } else {
          setStatus('heard')
          speak('Casi. Intenta otra vez.', 0.9)
        }
      },
      (error) => {
        setStatus('error')
        speak(error === 'not-allowed' ? 'Necesito permiso para escucharte.' : 'No pude escucharte.')
      },
      () => {
        setStatus((current) => (current === 'listening' ? 'idle' : current))
      }
    )
    listenTimerRef.current = window.setTimeout(() => handleRef.current?.stop(), 9000)
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <div className="card flex max-w-2xl flex-col items-center gap-3 border-4 border-white px-6 py-6 text-center">
        <span className="text-6xl">{a.emoji ?? '📖'}</span>
        <p className="font-display text-3xl leading-snug sm:text-4xl">{a.text}</p>
        <button
          type="button"
          onClick={() => {
            sfx.click()
            speak(a.text, 0.82)
          }}
          className="btn btn-white h-11 gap-2 px-4 text-sm"
        >
          🔊 Escuchar
        </button>
      </div>

      {supported ? (
        <>
          <p className="text-center text-sm font-bold text-ink/60">
            Toca el micrófono y lee la frase en voz alta.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={start}
              disabled={status === 'listening' || doneRef.current}
              className={cn(
                'btn btn-primary h-16 gap-3 px-7 text-lg',
                status === 'listening' && 'animate-glow'
              )}
            >
              🎤 {status === 'listening' ? 'Te escucho...' : 'Leer'}
            </button>
            <button
              type="button"
              onClick={() => finish()}
              className="btn btn-white h-14 px-5 text-base"
            >
              Ya leí
            </button>
          </div>
          {status === 'heard' && (
            <div className="animate-pop rounded-2xl bg-white/90 px-5 py-3 text-center text-sm font-bold">
              Escuché: <span className="text-coral">“{transcript}”</span>
              <br />
              ¡Intenta otra vez!
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-2xl bg-coral/10 px-5 py-3 text-center text-sm font-bold text-coral">
              No pude escucharte. Puedes tocar “Ya leí”.
            </div>
          )}
        </>
      ) : (
        <>
          <div className="rounded-2xl bg-white/80 px-5 py-3 text-center text-sm font-bold text-ink/60">
            Este dispositivo no puede escuchar. Lee en voz alta y toca “Ya leí”.
          </div>
          <button type="button" onClick={() => finish()} className="btn btn-primary h-16 px-8 text-lg">
            ✅ Ya leí
          </button>
        </>
      )}
      <PraiseBubble text={praise} />
    </div>
  )
}

function MemoryActivity({ a, onDone }: { a: Memory; onDone: (perfect: boolean) => void }) {
  const cards = useMemo(
    () =>
      shuffle([...a.items, ...a.items].map((item, index) => ({ id: index, item }))),
    [a.items]
  )
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [praise, setPraise] = useState<string | null>(null)
  const mistakesRef = useRef(0)
  const finishedRef = useRef(false)

  useSpeakOnMount(['Encuentra las parejas iguales'])

  useEffect(() => {
    if (cards.length > 0 && matched.size === cards.length && !finishedRef.current) {
      finishedRef.current = true
      sfx.win()
      const text = pick(PRAISE)
      setPraise(text)
      speak(text)
      window.setTimeout(() => onDone(mistakesRef.current === 0), 1200)
    }
  }, [matched, cards.length, onDone])

  const tap = (id: number) => {
    if (busy || flipped.includes(id) || matched.has(id)) return
    const next = [...flipped, id]
    setFlipped(next)
    sfx.pop()
    if (next.length < 2) return

    const [first, second] = next
    const firstCard = cards.find((card) => card.id === first)
    const secondCard = cards.find((card) => card.id === second)
    setBusy(true)

    if (firstCard && secondCard && firstCard.item === secondCard.item) {
      window.setTimeout(() => {
        setMatched((current) => {
          const copy = new Set(current)
          copy.add(first)
          copy.add(second)
          return copy
        })
        setFlipped([])
        setBusy(false)
        sfx.correct()
      }, 420)
    } else {
      mistakesRef.current += 1
      window.setTimeout(() => {
        setFlipped([])
        setBusy(false)
        sfx.wrong()
      }, 900)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-5">
      <h2 className="font-display text-2xl">Encuentra las parejas</h2>
      <div className="grid w-full max-w-lg grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card) => {
          const open = flipped.includes(card.id) || matched.has(card.id)
          return (
            <motion.button
              key={card.id}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => tap(card.id)}
              className={cn(
                'flex aspect-square items-center justify-center rounded-2xl border-4 text-3xl font-display transition sm:text-4xl',
                open
                  ? 'border-white bg-white shadow-[0_6px_0_rgba(45,49,66,0.08)]'
                  : 'border-pika-dark/40 bg-gradient-to-br from-pika to-pika-dark text-white/80'
              )}
            >
              {open ? card.item : '⚡'}
            </motion.button>
          )
        })}
      </div>
      <PraiseBubble text={praise} />
    </div>
  )
}

const PAD_COLORS = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#A78BFA']

function SequenceActivity({ a, onDone }: { a: Sequence; onDone: (perfect: boolean) => void }) {
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

function StoryActivity({ a, onDone }: { a: Story; onDone: (perfect: boolean) => void }) {
  const [mode, setMode] = useState<'read' | 'quiz'>('read')
  const [page, setPage] = useState(0)
  const [question, setQuestion] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [wrong, setWrong] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)
  const [praise, setPraise] = useState<string | null>(null)
  const doneRef = useRef(false)
  const currentPage = a.pages[page]
  const currentQuestion = a.questions[question]

  useEffect(() => {
    if (mode === 'read' && currentPage) {
      const timer = window.setTimeout(() => speak(currentPage.text, 0.82), 450)
      return () => window.clearTimeout(timer)
    }
    if (mode === 'quiz' && currentQuestion) {
      const timer = window.setTimeout(
        () => speakQueue([currentQuestion.q, ...currentQuestion.options]),
        450
      )
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [mode, page, question, currentPage, currentQuestion])

  const nextPage = () => {
    if (page < a.pages.length - 1) {
      setPage(page + 1)
    } else {
      setMode('quiz')
      setQuestion(0)
    }
  }

  const answer = (option: string) => {
    if (right) return
    if (normalize(option) === normalize(currentQuestion.answer)) {
      setRight(option)
      sfx.correct()
      const text = pick(PRAISE)
      setPraise(text)
      speak(text)
      window.setTimeout(() => {
        setRight(null)
        setPraise(null)
        if (question < a.questions.length - 1) {
          setQuestion(question + 1)
        } else if (!doneRef.current) {
          doneRef.current = true
          sfx.win()
          speak('¡Terminaste el cuento!')
          window.setTimeout(() => onDone(mistakes === 0), 1200)
        }
      }, 1200)
    } else {
      setWrong(option)
      setMistakes((value) => value + 1)
      sfx.wrong()
      speak(pick(ENCOURAGE))
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-5">
      {mode === 'read' ? (
        <>
          <div className="flex items-center gap-2 text-sm font-bold text-ink/50">
            {a.pages.map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  index === page ? 'bg-pika-dark' : 'bg-ink/15'
                )}
              />
            ))}
          </div>
          <div className="card flex w-full max-w-2xl flex-col items-center gap-3 border-4 border-white px-6 py-7 text-center">
            <span className="text-7xl">{currentPage.emoji}</span>
            <p className="font-display text-3xl leading-snug sm:text-4xl">
              {currentPage.text.split(' ').map((word, index) => (
                <button
                  key={`${word}-${index}`}
                  type="button"
                  onClick={() => {
                    sfx.click()
                    speak(word.replace(/[.,!?¡¿]/g, ''), 0.78)
                  }}
                  className="mr-1 rounded-lg px-1 transition hover:bg-pika/30 active:bg-pika/50"
                >
                  {word}
                </button>
              ))}
            </p>
            <button
              type="button"
              onClick={() => {
                sfx.click()
                speak(currentPage.text, 0.82)
              }}
              className="btn btn-white h-11 gap-2 px-4 text-sm"
            >
              🔊 Escuchar
            </button>
          </div>
          <button type="button" onClick={nextPage} className="btn btn-primary h-16 px-8 text-lg">
            {page < a.pages.length - 1 ? 'Siguiente ➡️' : '¡Preguntas! 🧠'}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm font-bold text-ink/50">
            Pregunta {question + 1} de {a.questions.length}
          </div>
          <div className="card w-full max-w-2xl border-4 border-white px-6 py-6 text-center">
            <h2 className="font-display text-2xl sm:text-3xl">{currentQuestion.q}</h2>
          </div>
          <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
            {currentQuestion.options.map((option) => (
              <motion.button
                key={option}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => answer(option)}
                className={cn(
                  'card border-4 border-white px-4 py-5 font-display text-xl transition',
                  right === option && 'bg-mint/25 ring-4 ring-mint',
                  wrong === option && 'animate-shake bg-coral/10 ring-4 ring-coral'
                )}
              >
                {option}
              </motion.button>
            ))}
          </div>
        </>
      )}
      <PraiseBubble text={praise} />
    </div>
  )
}

function OddOneOutActivity({ a, onDone }: { a: OddOneOut; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail } = useAnswer([a.prompt], onDone)
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <Prompt text={a.prompt} onSpeak={() => speak(a.prompt)} />
      <PictureChoices
        options={a.options}
        answer={a.answer}
        disabled={locked}
        onCorrect={succeed}
        onWrong={fail}
      />
      <PraiseBubble text={praise} />
    </div>
  )
}

export function ActivityView({
  activity,
  onDone
}: {
  activity: Activity
  onDone: (perfect: boolean) => void
}) {
  switch (activity.type) {
    case 'listen_tap':
      return <ListenTapActivity a={activity} onDone={onDone} />
    case 'word_picture':
      return <WordPictureActivity a={activity} onDone={onDone} />
    case 'count_syllables':
      return <CountSyllablesActivity a={activity} onDone={onDone} />
    case 'missing_letter':
      return <MissingLetterActivity a={activity} onDone={onDone} />
    case 'build_word':
      return <BuildWordActivity a={activity} onDone={onDone} />
    case 'sentence_picture':
      return <SentencePictureActivity a={activity} onDone={onDone} />
    case 'read_aloud':
      return <ReadAloudActivity a={activity} onDone={onDone} />
    case 'memory':
      return <MemoryActivity a={activity} onDone={onDone} />
    case 'sequence':
      return <SequenceActivity a={activity} onDone={onDone} />
    case 'story':
      return <StoryActivity a={activity} onDone={onDone} />
    case 'odd_one_out':
      return <OddOneOutActivity a={activity} onDone={onDone} />
    default:
      return <div className="p-6 text-center">Actividad no disponible</div>
  }
}
