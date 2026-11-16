import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Activity,
  Blend,
  BuildWord,
  CountSyllables,
  Learn,
  ListenTap,
  Memory,
  Mistake,
  MissingLetter,
  OddOneOut,
  ReadAloud,
  SentencePicture,
  Sequence,
  Story,
  Trace,
  WordPicture
} from '../types'
import { listenKind } from '../lib/session'
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

/** La lección se suscribe aquí para saber qué falló el niño (y qué eligió). */
export const mistakeSink: { current: ((mistake: Mistake) => void) | null } = { current: null }

const PAUSE_AFTER_ERROR = 1100

function useAnswer(
  texts: string[],
  onDone: (perfect: boolean) => void,
  track?: Pick<Mistake, 'kind' | 'item'>
) {
  const [done, setDone] = useState(false)
  const [paused, setPaused] = useState(false)
  const [praise, setPraise] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const mistakesRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const pauseRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  useSpeakOnMount(texts)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) window.clearTimeout(timerRef.current)
      if (pauseRef.current) window.clearTimeout(pauseRef.current)
    }
  }, [])

  // `before`: algo que se dice antes del elogio (la palabra recién armada).
  const succeed = (message?: string, before?: string) => {
    if (done || !mountedRef.current) return
    setDone(true)
    const text = message ?? pick(PRAISE)
    setPraise(text)
    sfx.correct()
    speakQueue(before ? [before, text] : [text])
    timerRef.current = window.setTimeout(
      () => {
        if (mountedRef.current) onDone(mistakesRef.current === 0)
      },
      before ? 2300 : 1300
    )
  }

  // `again`: lo que se repite después del ánimo (el sonido que había que encontrar).
  // `chosen`: lo que tocó, para saber qué confunde con qué.
  const fail = (again?: string, chosen?: string) => {
    if (done || !mountedRef.current) return
    mistakesRef.current += 1
    setMistakes(mistakesRef.current)
    if (track) mistakeSink.current?.({ ...track, chosen: chosen ?? '' })
    sfx.wrong()
    speakQueue(again ? [pick(ENCOURAGE), again] : [pick(ENCOURAGE)])
    // Pausa corta sin castigo: evita avanzar tocando al azar y da tiempo de escuchar.
    setPaused(true)
    if (pauseRef.current) window.clearTimeout(pauseRef.current)
    pauseRef.current = window.setTimeout(() => {
      if (mountedRef.current) setPaused(false)
    }, PAUSE_AFTER_ERROR)
  }

  // Al segundo error la respuesta correcta brilla: el niño siempre termina con éxito.
  return { locked: done || paused, praise, succeed, fail, reveal: mistakes >= REVEAL_AFTER }
}

const REVEAL_AFTER = 2
const REVEAL_CLASS = 'animate-glow ring-4 ring-pika-dark'
const SYLLABLE_COLORS = ['text-blue-600', 'text-rose-500']

/** Palabra con las sílabas en dos colores: ayuda a ver dónde se parte. */
function SyllableWord({ parts, className }: { parts: string[]; className?: string }) {
  return (
    <span className={cn('font-display', className)}>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className={SYLLABLE_COLORS[index % 2]}>
          {part}
        </span>
      ))}
    </span>
  )
}

/** Texto en el que cada palabra se puede tocar para escucharla. */
function TapText({ text, className, active }: { text: string; className?: string; active?: number }) {
  return (
    <p className={cn('font-display text-3xl leading-snug sm:text-4xl', className)}>
      {text.split(' ').map((word, index) => (
        <button
          key={`${word}-${index}`}
          type="button"
          onClick={() => {
            sfx.click()
            speak(word.replace(/[.,!?¡¿]/g, ''), 0.78)
          }}
          className={cn(
            'mr-1 rounded-lg px-1 transition hover:bg-pika/30 active:bg-pika/50',
            active === index && 'bg-pika/60'
          )}
        >
          {word}
        </button>
      ))}
    </p>
  )
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
  showLabels = true,
  reveal = false
}: {
  options: { emoji: string; label: string }[]
  answer: string
  disabled: boolean
  onCorrect: () => void
  onWrong: (label: string) => void
  showLabels?: boolean
  reveal?: boolean
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
      onWrong(label)
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
          aria-label={option.label}
          className={cn(
            'card flex flex-col items-center gap-1 border-4 border-white p-3 pt-4 transition',
            right === option.label && 'bg-mint/20 ring-4 ring-mint',
            wrong === option.label && 'animate-shake bg-coral/10 ring-4 ring-coral',
            reveal && !right && wrong !== option.label && normalize(option.label) === normalize(answer) && REVEAL_CLASS
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
  const { locked, praise, succeed, fail, reveal } = useAnswer([a.prompt, a.audio], onDone, {
    kind: listenKind(a),
    item: a.answer
  })
  // Sílabas y letras: fichas cuadradas. Palabras: fichas anchas, una debajo de otra.
  const longest = Math.max(...a.options.map((option) => option.length))
  const wordy = longest > 3
  const [wrong, setWrong] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)

  const choose = (option: string) => {
    if (locked || right) return
    if (normalize(option) === normalize(a.answer)) {
      setRight(option)
      succeed()
    } else {
      setWrong(option)
      fail(a.audio, option)
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <Prompt text={a.prompt} onSpeak={() => speak(a.audio, 0.8)} />
      <div className={cn('grid w-full gap-3', wordy ? 'max-w-md grid-cols-1' : 'max-w-lg grid-cols-3')}>
        {a.options.map((option) => (
          <motion.button
            key={option}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => choose(option)}
            className={cn(
              'card flex items-center justify-center border-4 border-white font-display transition',
              wordy ? (longest > 7 ? 'h-20 px-4 text-4xl' : 'h-20 px-4 text-5xl') : 'aspect-square text-5xl sm:text-6xl',
              right === option && 'bg-mint/25 ring-4 ring-mint',
              wrong === option && 'animate-shake bg-coral/10 ring-4 ring-coral',
              reveal && !right && wrong !== option && normalize(option) === normalize(a.answer) && REVEAL_CLASS
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
  // audio === '' → el niño debe leer; el audio solo aparece como ayuda tras un error.
  const silent = a.audio === ''
  // La voz solo dice la instrucción (el niño todavía no puede leerla); la palabra la lee él.
  const { locked, praise, succeed, fail, reveal } = useAnswer(
    silent ? ['Lee la palabra y toca su dibujo.'] : [a.audio ?? a.prompt],
    onDone,
    silent ? { kind: 'word-read', item: a.answer } : undefined
  )
  const [hint, setHint] = useState(false)
  const parts = a.parts?.length ? a.parts : [a.answer]
  // Ayuda: la palabra sílaba por sílaba y después completa (modela cómo se unen).
  const help = () => speakQueue(parts.length > 1 ? [...parts, a.answer] : [a.answer], 0.75)
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      {silent ? (
        <div className="flex flex-col items-center gap-3">
          <div className="card border-4 border-white px-8 py-5">
            <SyllableWord parts={parts} className="text-6xl sm:text-7xl" />
          </div>
          {hint && (
            <button
              type="button"
              onClick={() => {
                sfx.click()
                help()
              }}
              className="btn btn-white animate-pop h-12 gap-2 px-5 text-sm"
            >
              🔊 Ayuda
            </button>
          )}
        </div>
      ) : (
        <Prompt text={a.prompt} onSpeak={() => speak(a.audio ?? a.prompt)} />
      )}
      <PictureChoices
        options={a.options}
        answer={a.answer}
        disabled={locked}
        onCorrect={succeed}
        onWrong={(label) => {
          setHint(true)
          fail(undefined, label)
        }}
        showLabels={!a.hideLabels}
        reveal={reveal}
      />
      <PraiseBubble text={praise} />
    </div>
  )
}

function CountSyllablesActivity({ a, onDone }: { a: CountSyllables; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail, reveal } = useAnswer(
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
              wrong === option && 'animate-shake bg-coral/10 ring-4 ring-coral',
              reveal && right === null && wrong !== option && option === a.answer && REVEAL_CLASS
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
  const { locked, praise, succeed, fail, reveal } = useAnswer(['¿Qué vocal falta?', a.word], onDone, {
    kind: 'vowel',
    item: a.word
  })
  const [wrong, setWrong] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)

  const choose = (option: string) => {
    if (locked || right) return
    if (normalize(option) === normalize(a.answer)) {
      setRight(option)
      succeed()
    } else {
      setWrong(option)
      fail(a.word, option)
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
              'card flex h-20 w-20 items-center justify-center border-4 border-white font-display text-4xl',
              right === option && 'bg-mint/25 ring-4 ring-mint',
              wrong === option && 'animate-shake bg-coral/10 ring-4 ring-coral',
              reveal && !right && wrong !== option && normalize(option) === normalize(a.answer) && REVEAL_CLASS
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
  // Mientras aprende sílabas, la palabra se arma con fichas de sílaba (más una que sobra).
  const bySyllable = Boolean(a.parts?.length)
  const { locked, praise, succeed, fail, reveal } = useAnswer(
    bySyllable ? ['Arma la palabra.', a.word] : [a.word],
    onDone
  )
  const expected = useMemo(() => (a.parts?.length ? a.parts : a.word.split('')), [a.parts, a.word])
  const tiles = useMemo(
    () =>
      shuffle(
        [...expected, ...(a.parts?.length ? (a.extra ?? []) : [])].map((text, index) => ({ text, index }))
      ),
    [expected, a.parts, a.extra]
  )
  const [placed, setPlaced] = useState<number[]>([])
  const [wrongTile, setWrongTile] = useState<number | null>(null)
  // Tras dos errores brilla la ficha que sigue.
  const nextTile = reveal
    ? tiles.find(
        (tile) =>
          !placed.includes(tile.index) &&
          normalize(tile.text) === normalize(expected[placed.length] ?? '')
      )?.index
    : undefined

  const tap = (tile: { text: string; index: number }) => {
    if (locked || placed.includes(tile.index)) return
    if (normalize(tile.text) === normalize(expected[placed.length])) {
      const next = [...placed, tile.index]
      setPlaced(next)
      sfx.pop()
      if (next.length === expected.length) succeed(undefined, a.word)
      else if (bySyllable) speak(expected[placed.length], 0.75)
    } else {
      setWrongTile(tile.index)
      fail()
      window.setTimeout(() => setWrongTile(null), 650)
    }
  }

  const box = bySyllable ? 'h-20 min-w-20 px-3 text-4xl' : 'h-16 w-14 text-3xl'

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
        {expected.map((text, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center justify-center rounded-2xl border-4 font-display',
              box,
              index < placed.length
                ? cn('border-mint bg-mint/20', bySyllable && SYLLABLE_COLORS[index % 2])
                : 'border-dashed border-ink/25 bg-white/60'
            )}
          >
            {index < placed.length ? text : ''}
          </div>
        ))}
      </div>

      <div className="flex max-w-lg flex-wrap justify-center gap-2">
        {tiles.map((tile) => {
          const used = placed.includes(tile.index)
          return (
            <motion.button
              key={tile.index}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => tap(tile)}
              disabled={used}
              className={cn(
                'card flex items-center justify-center border-4 border-white font-display transition',
                box,
                used && 'opacity-25',
                nextTile === tile.index && wrongTile !== tile.index && REVEAL_CLASS,
                wrongTile === tile.index && 'animate-shake bg-coral/15 ring-4 ring-coral'
              )}
            >
              {tile.text}
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
  // La voz solo dice la instrucción: el niño lee la frase y escucha solo si lo pide
  // (toda la frase con el botón, o una palabra tocándola).
  const { locked, praise, succeed, fail, reveal } = useAnswer(
    a.question ? ['Lee la frase.', a.question] : ['Lee la frase y toca el dibujo.'],
    onDone,
    { kind: 'sentence', item: a.sentence }
  )
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <div className="card max-w-2xl border-4 border-white px-6 py-5 text-center">
        <TapText text={a.sentence} />
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
      {a.question ? (
        <button
          type="button"
          onClick={() => {
            sfx.click()
            speak(a.question ?? '')
          }}
          className="flex items-center gap-2 rounded-full bg-white/80 px-5 py-2 font-display text-xl"
        >
          🔊 {a.question}
        </button>
      ) : (
        <p className="text-sm font-bold text-ink/60">¿De qué habla la frase?</p>
      )}
      <PictureChoices
        options={a.options}
        answer={a.answer}
        disabled={locked}
        onCorrect={succeed}
        onWrong={(label) => fail(undefined, label)}
        showLabels={!a.hideLabels}
        reveal={reveal}
      />
      <PraiseBubble text={praise} />
    </div>
  )
}

function ReadAloudActivity({ a, onDone }: { a: ReadAloud; onDone: (perfect: boolean) => void }) {
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

function MemoryActivity({ a, onDone }: { a: Memory; onDone: (perfect: boolean) => void }) {
  // Con `pairs` se juntan dos cartas distintas (M con m); sin él, dos cartas iguales.
  const cards = useMemo(
    () =>
      shuffle(
        a.pairs?.length
          ? a.pairs.flatMap((pair, index) => pair.map((item) => ({ item, pair: index })))
          : a.items.flatMap((item, index) => [
              { item, pair: index },
              { item, pair: index }
            ])
      ).map((card, index) => ({ ...card, id: index })),
    [a.items, a.pairs]
  )
  const instruction = a.pairs?.length ? 'Junta la mayúscula con su minúscula.' : 'Encuentra las parejas iguales'
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [praise, setPraise] = useState<string | null>(null)
  const mistakesRef = useRef(0)
  const finishedRef = useRef(false)

  useSpeakOnMount([instruction])

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

    if (firstCard && secondCard && firstCard.pair === secondCard.pair) {
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
      <h2 className="text-center font-display text-2xl">
        {a.pairs?.length ? 'Junta la mayúscula con su minúscula' : 'Encuentra las parejas'}
      </h2>
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
            <TapText text={currentPage.text} />
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
  const { locked, praise, succeed, fail, reveal } = useAnswer([a.prompt], onDone)
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <Prompt text={a.prompt} onSpeak={() => speak(a.prompt)} />
      <PictureChoices
        options={a.options}
        answer={a.answer}
        disabled={locked}
        onCorrect={succeed}
        onWrong={() => fail()}
        reveal={reveal}
      />
      <PraiseBubble text={praise} />
    </div>
  )
}

/** Presentación de una letra: el niño toca cada sílaba para escucharla. No hay errores. */
function LearnActivity({ a, onDone }: { a: Learn; onDone: (perfect: boolean) => void }) {
  const [heard, setHeard] = useState<Set<string>>(new Set())
  const allHeard = heard.size >= a.syllables.length
  const single = a.syllables.length === 1
  const hint = single ? 'Toca la letra para escucharla.' : 'Toca cada sílaba para escucharla.'
  const intro = [a.say, a.note, hint].filter((text): text is string => Boolean(text))

  useSpeakOnMount(intro, 600)

  const tap = (syllable: string) => {
    sfx.pop()
    speak(syllable, 0.72)
    setHeard((current) => new Set(current).add(syllable))
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <div className="card flex w-full max-w-xl flex-col items-center gap-3 border-4 border-white px-6 py-6 text-center">
        <span className="rounded-full bg-pika/40 px-4 py-1 text-xs font-extrabold uppercase tracking-wide text-ink/60">
          {a.letter ? 'Letra nueva' : 'Sílabas nuevas'}
        </span>
        <div className="flex items-center justify-center gap-6">
          {a.letter && (
            <span className="font-display text-7xl leading-none text-blue-600 sm:text-8xl">
              {a.upper && a.upper !== a.letter ? `${a.upper} ${a.letter}` : a.letter}
            </span>
          )}
          {a.keyword && (
            <button
              type="button"
              onClick={() => {
                sfx.click()
                speakQueue(intro.slice(0, -1).length ? intro.slice(0, -1) : [a.keyword ?? ''])
              }}
              className="flex flex-col items-center gap-1 rounded-3xl px-3 py-2 transition active:bg-pika/30"
              aria-label="Escuchar otra vez"
            >
              <span className="text-6xl sm:text-7xl">{a.emoji}</span>
              <span className="font-display text-3xl">
                {(a.parts?.length ? a.parts : [a.keyword]).map((part, index) => (
                  <span key={`${part}-${index}`} className={part === a.focus ? 'text-rose-500' : 'text-ink'}>
                    {part}
                  </span>
                ))}
              </span>
            </button>
          )}
        </div>
        {a.note && <p className="text-sm font-bold text-ink/60">{a.note}</p>}
      </div>

      <p className="text-center text-sm font-bold text-ink/60">👆 {hint.replace('.', '')}</p>
      <div className="flex max-w-xl flex-wrap justify-center gap-3">
        {a.syllables.map((syllable) => (
          <motion.button
            key={syllable}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => tap(syllable)}
            className={cn(
              'card flex h-24 min-w-24 items-center justify-center border-4 border-white px-4 font-display text-5xl transition',
              heard.has(syllable) ? 'bg-mint/25 ring-4 ring-mint' : 'animate-glow'
            )}
          >
            {syllable}
          </motion.button>
        ))}
      </div>

      <button
        type="button"
        disabled={!allHeard}
        onClick={() => {
          sfx.correct()
          onDone(true)
        }}
        className={cn('btn btn-primary h-16 px-10 text-lg', allHeard && 'animate-pop')}
      >
        ¡Listo! ➡️
      </button>
    </div>
  )
}

/** Unir sílabas: toca cada sílaba en orden y se juntan en la palabra. No hay errores. */
function BlendActivity({ a, onDone }: { a: Blend; onDone: (perfect: boolean) => void }) {
  const [count, setCount] = useState(0)
  const [joined, setJoined] = useState(false)
  const [praise, setPraise] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  useSpeakOnMount(['Toca las sílabas y júntalas.'])

  useEffect(() => {
    return () => timers.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const tap = (index: number) => {
    if (joined) return
    sfx.pop()
    speak(a.parts[index], 0.72)
    if (index !== count) return
    const next = count + 1
    setCount(next)
    if (next === a.parts.length) {
      timers.current.push(
        window.setTimeout(() => {
          setJoined(true)
          sfx.correct()
          speak(a.word, 0.8)
        }, 800)
      )
      timers.current.push(
        window.setTimeout(() => {
          const text = pick(PRAISE)
          setPraise(text)
          speak(text)
        }, 2300)
      )
      timers.current.push(window.setTimeout(() => onDone(true), 3600))
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <h2 className="text-center font-display text-2xl">Une las sílabas</h2>
      <div className="flex h-24 items-center justify-center">
        {joined && a.emoji ? (
          <span className="animate-pop text-8xl">{a.emoji}</span>
        ) : (
          <span className="text-6xl opacity-30">{a.emoji ? '❓' : '🔤'}</span>
        )}
      </div>
      <motion.div layout className={cn('flex flex-wrap items-center justify-center', joined ? 'gap-0' : 'gap-3')}>
        {a.parts.map((part, index) => (
          <motion.button
            layout
            key={`${part}-${index}`}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => tap(index)}
            className={cn(
              'flex h-24 items-center justify-center font-display text-6xl transition',
              SYLLABLE_COLORS[index % 2],
              joined
                ? 'px-0'
                : cn(
                    'card min-w-24 border-4 border-white px-5',
                    index < count && 'bg-mint/25 ring-4 ring-mint',
                    index === count && 'animate-glow'
                  )
            )}
          >
            {part}
          </motion.button>
        ))}
      </motion.div>
      <p className="text-center text-sm font-bold text-ink/60">
        {joined ? '¡Así se lee!' : '👆 Toca cada sílaba, en orden'}
      </p>
      <PraiseBubble text={praise} />
    </div>
  )
}

const TRACE_SIZE = 320

/**
 * Dibujar la letra con el dedo sobre su silueta. No hay errores: se completa cuando
 * el trazo cubre casi toda la letra (y siempre aparece un botón para seguir).
 */
function TraceActivity({ a, onDone }: { a: Trace; onDone: (perfect: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointsRef = useRef<{ x: number; y: number; hit: boolean }[]>([])
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const doneRef = useRef(false)
  const timers = useRef<number[]>([])
  const [coverage, setCoverage] = useState(0)
  const [praise, setPraise] = useState<string | null>(null)
  const [canSkip, setCanSkip] = useState(false)

  useSpeakOnMount(['Dibuja la letra con tu dedo.', a.letter])

  const drawGuide = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, TRACE_SIZE, TRACE_SIZE)
    // Letras con cola (g, j, p, q, y) suben la línea base para que quepan.
    const tail = /[gjpqy]/.test(a.letter)
    ctx.font = `600 ${a.letter.length > 1 ? 190 : 290}px Fredoka, Nunito, ui-rounded, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(45, 49, 66, 0.16)'
    ctx.fillText(a.letter, TRACE_SIZE / 2, TRACE_SIZE * (tail ? 0.64 : 0.8))
  }

  useEffect(() => {
    drawGuide()
    // Puntos de la letra (cada 6 px) que el trazo tiene que tocar.
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      const pixels = ctx.getImageData(0, 0, TRACE_SIZE, TRACE_SIZE).data
      const points: { x: number; y: number; hit: boolean }[] = []
      for (let y = 3; y < TRACE_SIZE; y += 6) {
        for (let x = 3; x < TRACE_SIZE; x += 6) {
          if (pixels[(y * TRACE_SIZE + x) * 4 + 3] > 20) points.push({ x, y, hit: false })
        }
      }
      pointsRef.current = points
    }
    timers.current.push(window.setTimeout(() => setCanSkip(true), 9000))
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.letter])

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    const text = pick(PRAISE)
    setPraise(text)
    sfx.correct()
    speak(text)
    timers.current.push(window.setTimeout(() => onDone(true), 1300))
  }

  const position = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * TRACE_SIZE,
      y: ((event.clientY - rect.top) / rect.height) * TRACE_SIZE
    }
  }

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 22
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    const points = pointsRef.current
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 6))
    for (let step = 0; step <= steps; step += 1) {
      const x = from.x + ((to.x - from.x) * step) / steps
      const y = from.y + ((to.y - from.y) * step) / steps
      for (const point of points) {
        if (!point.hit && (point.x - x) ** 2 + (point.y - y) ** 2 < 18 ** 2) point.hit = true
      }
    }
    const covered = points.length ? points.filter((point) => point.hit).length / points.length : 0
    setCoverage(covered)
    if (covered >= 0.85) finish()
  }

  const clear = () => {
    if (doneRef.current) return
    sfx.click()
    pointsRef.current.forEach((point) => {
      point.hit = false
    })
    setCoverage(0)
    drawGuide()
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-5">
      <h2 className="text-center font-display text-2xl">✍️ Dibuja la letra con tu dedo</h2>
      <canvas
        ref={canvasRef}
        width={TRACE_SIZE}
        height={TRACE_SIZE}
        className="card w-full max-w-xs touch-none border-4 border-white"
        style={{ aspectRatio: '1 / 1' }}
        onPointerDown={(event) => {
          if (doneRef.current) return
          event.currentTarget.setPointerCapture(event.pointerId)
          const point = position(event)
          lastRef.current = point
          stroke(point, point)
        }}
        onPointerMove={(event) => {
          if (!lastRef.current || doneRef.current) return
          const point = position(event)
          stroke(lastRef.current, point)
          lastRef.current = point
        }}
        onPointerUp={() => {
          lastRef.current = null
        }}
        onPointerCancel={() => {
          lastRef.current = null
        }}
      />
      <div className="h-3 w-full max-w-xs overflow-hidden rounded-full bg-white/80">
        <div
          className="h-full rounded-full bg-mint transition-all"
          style={{ width: `${Math.min(100, Math.round((coverage / 0.85) * 100))}%` }}
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            sfx.click()
            speak(a.letter, 0.75)
          }}
          className="btn btn-white h-12 gap-2 px-5 text-sm"
        >
          🔊 Escuchar
        </button>
        <button type="button" onClick={clear} className="btn btn-white h-12 gap-2 px-5 text-sm">
          🧽 Borrar
        </button>
        {canSkip && (
          <button type="button" onClick={finish} className="btn btn-primary animate-pop h-12 px-5 text-sm">
            ¡Listo! ➡️
          </button>
        )}
      </div>
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
    case 'learn':
      return <LearnActivity a={activity} onDone={onDone} />
    case 'blend':
      return <BlendActivity a={activity} onDone={onDone} />
    case 'trace':
      return <TraceActivity a={activity} onDone={onDone} />
    default:
      return <div className="p-6 text-center">Actividad no disponible</div>
  }
}
