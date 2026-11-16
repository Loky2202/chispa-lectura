import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Toast, TopBar } from '../components/Chrome'
import { Chispa } from '../components/Chispa'
import { VoiceRecorder } from '../components/VoiceRecorder'
import { api } from '../lib/api'
import { DAILY_OPTIONS, getDailyLimit, setDailyLimit } from '../lib/session'
import { sfx } from '../lib/sfx'
import { useStore } from '../lib/store'
import { cn, formatMinutes } from '../lib/utils'
import type { Confusion, ParentSummary } from '../types'

function describe(confusion: Confusion): string {
  const { kind, item, chosen } = confusion
  switch (kind) {
    case 'word-read':
      return `Leyó “${item}” y tocó el dibujo de “${chosen}”`
    case 'sentence':
      return `Frase “${item}”: tocó “${chosen}”`
    case 'vowel':
      return `En “${item}” puso la vocal “${chosen}”`
    case 'sight':
      return `Palabra mágica “${item}”: tocó “${chosen}”`
    default:
      return `Escuchó “${item}” y tocó “${chosen}”`
  }
}

type Gate = 'hold' | 'math' | 'open'

export function ParentsPage() {
  const navigate = useNavigate()
  const refreshStore = useStore((state) => state.refresh)
  const [gate, setGate] = useState<Gate>('hold')
  const [holdProgress, setHoldProgress] = useState(0)
  const [mathWrong, setMathWrong] = useState(false)
  const [summaries, setSummaries] = useState<ParentSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [resetTarget, setResetTarget] = useState<ParentSummary | null>(null)
  const [resetting, setResetting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [voices, setVoices] = useState(false)
  const [dailyLimit, setLimit] = useState(getDailyLimit)
  const intervalRef = useRef<number | null>(null)

  const cancelHold = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    setHoldProgress(0)
  }

  useEffect(() => {
    return () => cancelHold()
  }, [])

  const loadSummaries = async () => {
    setLoading(true)
    try {
      const data = await api.parents()
      setSummaries(data)
    } catch {
      setToast('No se pudo cargar la información')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gate === 'open') void loadSummaries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate])

  const startHold = () => {
    if (gate !== 'hold') return
    const start = Date.now()
    sfx.click()
    intervalRef.current = window.setInterval(() => {
      const percent = Math.min(100, ((Date.now() - start) / 3000) * 100)
      setHoldProgress(percent)
      if (percent >= 100) {
        if (intervalRef.current) window.clearInterval(intervalRef.current)
        intervalRef.current = null
        setGate('math')
        sfx.pop()
      }
    }, 50)
  }

  const answerMath = (value: number) => {
    if (value === 12) {
      sfx.correct()
      setGate('open')
    } else {
      sfx.wrong()
      setMathWrong(true)
      window.setTimeout(() => setMathWrong(false), 600)
    }
  }

  const resetProgress = async () => {
    if (!resetTarget) return
    setResetting(true)
    try {
      await api.resetProgress(resetTarget.id)
      await loadSummaries()
      await refreshStore()
      sfx.correct()
      setToast('Progreso reiniciado')
      setResetTarget(null)
    } catch {
      setToast('No se pudo reiniciar')
    } finally {
      setResetting(false)
    }
  }

  if (gate !== 'open') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Chispa size={140} mood="thinking" />
          <h1 className="font-display text-3xl">Zona de padres</h1>
          <p className="text-sm font-bold text-ink/55">
            Para que los pequeños no cambien nada, confirma que eres un adulto.
          </p>

          {gate === 'hold' && (
            <>
              <button
                type="button"
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                className="relative mt-2 flex h-40 w-40 select-none flex-col items-center justify-center rounded-full border-8 border-white bg-pika text-ink shadow-[0_10px_0_rgba(45,49,66,0.12)] active:scale-95"
              >
                <span className="text-5xl">👆</span>
                <span className="mt-1 text-xs font-extrabold">Mantén 3 segundos</span>
                <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#2D3142"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(holdProgress / 100) * 276.5} 276.5`}
                    opacity="0.35"
                  />
                </svg>
              </button>
              <p className="text-xs font-bold text-ink/40">Suelta y se reinicia</p>
            </>
          )}

          {gate === 'math' && (
            <div className={cn('card w-full border-4 border-white p-5', mathWrong && 'animate-shake')}>
              <p className="font-display text-xl">¿Cuánto es 7 + 5?</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[10, 12, 14].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => answerMath(option)}
                    className="btn btn-white h-16 text-2xl"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="button" onClick={() => navigate('/')} className="btn mt-2 h-12 text-sm font-bold text-ink/45">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  if (voices) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col pb-10">
        <TopBar title="Grabar voces" subtitle="Tu voz en lugar de la del navegador" onBack={() => setVoices(false)} hideCoins />
        <VoiceRecorder onClose={() => setVoices(false)} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col pb-10">
      <TopBar title="Zona de padres" subtitle="Progreso y respaldo" onBack={() => navigate('/')} />

      <div className="mx-4 mt-1 rounded-[2rem] bg-white/80 p-4">
        <p className="text-sm font-bold text-ink/60">
          Los datos se guardan en <span className="font-extrabold">SQLite</span>, dentro de la carpeta{' '}
          <span className="rounded bg-ink/5 px-1 font-mono text-xs">data/</span> del proyecto (volumen de
          Docker). Puedes descargar una copia cuando quieras.
        </p>
        <a
          href={api.backupUrl}
          className="btn btn-mint mt-3 h-14 w-full text-base"
          download
        >
          💾 Descargar copia de seguridad
        </a>
      </div>

      <h2 className="mx-5 mt-5 font-display text-xl">Jugadores</h2>
      {loading && <p className="mx-5 mt-2 text-sm font-bold text-ink/50">Cargando...</p>}
      {!loading && summaries.length === 0 && (
        <p className="mx-5 mt-2 text-sm font-bold text-ink/50">Todavía no hay jugadores.</p>
      )}
      <div className="mx-4 mt-2 flex flex-col gap-3">
        {summaries.map((summary) => (
          <div key={summary.id} className="card border-4 border-white p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pika/40 text-2xl">
                {summary.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl">{summary.name}</p>
                <p className="text-xs font-bold text-ink/45">
                  {summary.lastPlayed
                    ? `Última vez: ${new Date(summary.lastPlayed).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short'
                      })}`
                    : 'Sin actividad todavía'}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold shadow-sm">
                🪙 {summary.coins}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-cream/80 p-2">
                <p className="font-display text-xl">{summary.lessonsCompleted}</p>
                <p className="text-[10px] font-extrabold uppercase text-ink/45">Lecciones</p>
              </div>
              <div className="rounded-2xl bg-cream/80 p-2">
                <p className="font-display text-xl">{summary.totalStars}</p>
                <p className="text-[10px] font-extrabold uppercase text-ink/45">Estrellas</p>
              </div>
              <div className="rounded-2xl bg-cream/80 p-2">
                <p className="font-display text-xl">{formatMinutes(summary.totalSeconds)}</p>
                <p className="text-[10px] font-extrabold uppercase text-ink/45">Tiempo</p>
              </div>
            </div>
            {(summary.confusions?.length ?? 0) > 0 && (
              <div className="mt-3 rounded-2xl bg-cream/80 p-3">
                <p className="text-[10px] font-extrabold uppercase text-ink/45">
                  Lo que más le cuesta (últimos 30 días)
                </p>
                <ul className="mt-1 space-y-1">
                  {summary.confusions?.map((confusion) => (
                    <li
                      key={`${confusion.kind}-${confusion.item}-${confusion.chosen}`}
                      className="flex items-start justify-between gap-2 text-sm font-bold text-ink/70"
                    >
                      <span>{describe(confusion)}</span>
                      <span className="shrink-0 text-xs text-ink/45">
                        {confusion.count}× {confusion.resolved ? '✅' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] font-semibold text-ink/45">
                  ✅ = ya lo resolvió en un repaso. Lo demás aparece en su “Repaso de hoy”.
                </p>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-xs font-bold text-ink/50">
              <span>🔥 Racha: {summary.streak} {summary.streak === 1 ? 'día' : 'días'}</span>
              <button
                type="button"
                onClick={() => setResetTarget(summary)}
                className="rounded-full px-2 py-1 font-extrabold text-coral/80 hover:bg-coral/10"
              >
                Reiniciar progreso
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-5 rounded-[2rem] bg-white/80 p-4">
        <h2 className="font-display text-lg">🎙️ Grabar voces</h2>
        <p className="mt-1 text-sm font-semibold text-ink/60">
          Graba las sílabas y palabras con tu voz: se entienden mucho mejor que la voz del navegador. Lo que
          no grabes se sigue oyendo con la voz de siempre.
        </p>
        <button type="button" onClick={() => setVoices(true)} className="btn btn-primary mt-3 h-14 w-full text-base">
          🎙️ Abrir grabadora
        </button>
      </div>

      <div className="mx-4 mt-5 rounded-[2rem] bg-white/80 p-4">
        <h2 className="font-display text-lg">⏱️ Tiempo diario sugerido</h2>
        <p className="mt-1 text-sm font-semibold text-ink/60">
          Al llegar a este tiempo la app invita a descansar (no bloquea). Se guarda en este dispositivo.
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {DAILY_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => {
                setDailyLimit(minutes)
                setLimit(minutes)
              }}
              className={cn('btn h-12 text-sm', dailyLimit === minutes ? 'btn-mint' : 'btn-white')}
            >
              {minutes === 0 ? 'Sin límite' : `${minutes} min`}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-5 rounded-[2rem] bg-white/80 p-4">
        <h2 className="font-display text-lg">📲 Instalar en la tablet</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm font-semibold text-ink/60">
          <li>Abre la web en Chrome (Android) o Safari (iPad).</li>
          <li>Toca el menú del navegador.</li>
          <li>Elige “Agregar a pantalla de inicio”.</li>
          <li>Se abrirá como una app, con sonido y sin barras.</li>
        </ol>
      </div>

      <div className="mt-5 flex justify-center">
        <button type="button" onClick={() => navigate('/')} className="btn btn-white h-14 px-6">
          🏠 Volver al inicio
        </button>
      </div>

      <Modal
        open={Boolean(resetTarget)}
        onClose={() => {
          if (!resetting) setResetTarget(null)
        }}
        title="¿Reiniciar progreso?"
      >
        <p className="text-center text-sm font-bold text-ink/60">
          Se borrarán las estrellas, monedas y medallas de {resetTarget?.name}. Esta acción no se puede
          deshacer.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setResetTarget(null)}
            disabled={resetting}
            className="btn btn-white h-14 flex-1 text-base"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={resetProgress}
            disabled={resetting}
            className="btn h-14 flex-1 bg-coral text-base text-white shadow-[0_6px_0_#d94f4f]"
          >
            {resetting ? 'Borrando...' : 'Sí, reiniciar'}
          </button>
        </div>
      </Modal>

      <Toast message={toast} />
    </div>
  )
}
