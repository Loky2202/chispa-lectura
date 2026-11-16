import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Toast, TopBar } from '../components/Chrome'
import { Chispa } from '../components/Chispa'
import { VoiceRecorder } from '../components/VoiceRecorder'
import { api, ApiError } from '../lib/api'
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

type Gate = 'hold' | 'math' | 'pin' | 'newpin' | 'open'

/** Suma al azar con llevada: cambia cada vez, para que no se aprenda de memoria. */
function makeSum() {
  const pick = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
  const a = pick(6, 9)
  const b = pick(5, 9)
  const answer = a + b
  const wrong = [answer - 2, answer + 2, answer - 1, answer + 1, answer + 10].sort(() => Math.random() - 0.5).slice(0, 2)
  return { a, b, answer, options: [answer, ...wrong].sort(() => Math.random() - 0.5) }
}

export function ParentsPage() {
  const navigate = useNavigate()
  const refreshStore = useStore((state) => state.refresh)
  const [gate, setGate] = useState<Gate>('hold')
  const [holdProgress, setHoldProgress] = useState(0)
  const [mathWrong, setMathWrong] = useState(false)
  const [sum, setSum] = useState(makeSum)
  const [pin, setPin] = useState('')
  const [pinAgain, setPinAgain] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinBusy, setPinBusy] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
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
    } catch (error) {
      if (expired(error)) return
      setToast('No se pudo cargar la información')
    } finally {
      setLoading(false)
    }
  }

  // La sesión de Padres caduca (o el servidor se reinició): se vuelve a pedir el PIN.
  const expired = (error: unknown) => {
    if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) return false
    api.parentLogout()
    setVoices(false)
    setPin('')
    setPinAgain('')
    setPinError(null)
    setGate(error.status === 403 ? 'newpin' : 'pin')
    return true
  }

  // Tras mantener pulsado: con PIN creado se pide el PIN; sin PIN, la suma y luego crearlo.
  const afterHold = async () => {
    try {
      const status = await api.parentStatus()
      setGate(status.authed ? 'open' : status.hasPin ? 'pin' : 'math')
    } catch {
      setToast('La zona de Padres necesita conexión con el servidor')
      setHoldProgress(0)
    }
  }

  const submitPin = async () => {
    if (pinBusy) return
    if (!/^\d{4,8}$/.test(pin)) {
      setPinError('El PIN tiene de 4 a 8 números')
      return
    }
    if (gate === 'newpin' && pin !== pinAgain) {
      setPinError('Los dos PIN no son iguales')
      return
    }
    setPinBusy(true)
    setPinError(null)
    try {
      if (gate === 'newpin') await api.parentSetPin(pin)
      else await api.parentLogin(pin)
      sfx.correct()
      if (changingPin) setToast('PIN cambiado')
      setChangingPin(false)
      setPin('')
      setPinAgain('')
      setGate('open')
    } catch (error) {
      sfx.wrong()
      setPin('')
      setPinAgain('')
      setPinError(error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor')
    } finally {
      setPinBusy(false)
    }
  }

  const downloadBackup = async () => {
    try {
      await api.downloadBackup()
    } catch (error) {
      if (!expired(error)) setToast('No se pudo descargar la copia')
    }
  }

  useEffect(() => {
    if (gate !== 'open') return
    void loadSummaries()
    // El tiempo diario vive en el servidor: se muestra el valor compartido, no el de este dispositivo.
    api
      .settings()
      .then((settings) => {
        if (settings.dailyMinutes === null) return
        setDailyLimit(settings.dailyMinutes)
        setLimit(getDailyLimit())
      })
      .catch(() => undefined)
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
        sfx.pop()
        void afterHold()
      }
    }, 50)
  }

  const answerMath = (value: number) => {
    if (value === sum.answer) {
      sfx.correct()
      setGate('newpin')
    } else {
      sfx.wrong()
      setMathWrong(true)
      window.setTimeout(() => {
        setMathWrong(false)
        setSum(makeSum())
      }, 600)
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
    } catch (error) {
      if (expired(error)) setResetTarget(null)
      else setToast('No se pudo reiniciar')
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
              <p className="font-display text-xl">
                ¿Cuánto es {sum.a} + {sum.b}?
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {sum.options.map((option) => (
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

          {(gate === 'pin' || gate === 'newpin') && (
            <form
              className="card w-full border-4 border-white p-5"
              onSubmit={(event) => {
                event.preventDefault()
                void submitPin()
              }}
            >
              <p className="font-display text-xl">
                {gate === 'pin' ? 'Escribe tu PIN' : changingPin ? 'Nuevo PIN' : 'Crea un PIN de padres'}
              </p>
              {gate === 'newpin' && (
                <p className="mt-1 text-xs font-bold text-ink/50">
                  De 4 a 8 números. Protege el progreso, las copias y las voces grabadas.
                </p>
              )}
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                maxLength={8}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                aria-label="PIN"
                className="mt-4 h-16 w-full rounded-2xl border-4 border-ink/10 bg-white text-center font-display text-3xl tracking-[0.4em] outline-none focus:border-pika"
              />
              {gate === 'newpin' && (
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={8}
                  value={pinAgain}
                  onChange={(event) => setPinAgain(event.target.value.replace(/\D/g, ''))}
                  aria-label="Repite el PIN"
                  placeholder="Repítelo"
                  className="mt-2 h-16 w-full rounded-2xl border-4 border-ink/10 bg-white text-center font-display text-3xl tracking-[0.4em] outline-none placeholder:text-base placeholder:tracking-normal focus:border-pika"
                />
              )}
              {pinError && <p className="mt-2 text-sm font-extrabold text-coral">{pinError}</p>}
              <button type="submit" disabled={pinBusy} className="btn btn-primary mt-4 h-14 w-full text-base">
                {pinBusy ? 'Un momento...' : gate === 'pin' ? 'Entrar' : 'Guardar PIN'}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              if (changingPin) {
                setChangingPin(false)
                setGate('open')
              } else navigate('/')
            }}
            className="btn mt-2 h-12 text-sm font-bold text-ink/45"
          >
            {changingPin ? 'Cancelar' : 'Volver al inicio'}
          </button>
          <Toast message={toast} />
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
        <button type="button" onClick={downloadBackup} className="btn btn-mint mt-3 h-14 w-full text-base">
          💾 Descargar copia de seguridad
        </button>
        <p className="mt-2 text-xs font-semibold text-ink/45">
          Además se guarda una copia automática cada día en{' '}
          <span className="rounded bg-ink/5 px-1 font-mono">data/backups/</span>.
        </p>
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
            {summary.week && (
              <div className="mt-3 rounded-2xl bg-cream/80 p-3">
                <p className="text-[10px] font-extrabold uppercase text-ink/45">Esta semana</p>
                <div
                  className="mt-2 flex h-20 items-end gap-1.5"
                  role="img"
                  aria-label={`Minutos por día: ${summary.week.days
                    .map((day) => Math.round(day.seconds / 60))
                    .join(', ')}`}
                >
                  {summary.week.days.map((day) => {
                    const peak = Math.max(600, ...summary.week!.days.map((item) => item.seconds))
                    const minutes = Math.round(day.seconds / 60)
                    return (
                      <div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5">
                        <span className="text-[10px] font-extrabold text-ink/50">{minutes > 0 ? minutes : ''}</span>
                        <div
                          className={cn('w-full rounded-t-lg', day.seconds > 0 ? 'bg-mint' : 'bg-ink/10')}
                          style={{ height: `${Math.max(6, (day.seconds / peak) * 70)}%` }}
                        />
                        <span className="text-[10px] font-bold uppercase text-ink/45">
                          {new Date(`${day.day}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'narrow' })}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs font-bold text-ink/60">
                  {formatMinutes(summary.week.days.reduce((sum, day) => sum + day.seconds, 0))} en{' '}
                  {summary.week.days.filter((day) => day.seconds > 0).length} de 7 días ·{' '}
                  {summary.week.lessonsPlayed} {summary.week.lessonsPlayed === 1 ? 'lección' : 'lecciones'} ·{' '}
                  {summary.week.mistakes} {summary.week.mistakes === 1 ? 'error' : 'errores'}
                </p>
              </div>
            )}
            {(summary.letters?.length ?? 0) > 0 && (
              <div className="mt-3 rounded-2xl bg-cream/80 p-3">
                <p className="text-[10px] font-extrabold uppercase text-ink/45">Letras que ya practicó</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {summary.letters?.map((entry) => (
                    <span
                      key={entry.letter}
                      title={`${entry.practiced} sílabas practicadas, ${entry.errors} errores sin resolver`}
                      className={cn(
                        'flex h-10 min-w-10 items-center justify-center rounded-xl px-2 font-display text-lg',
                        entry.errors >= 3
                          ? 'bg-coral/30'
                          : entry.errors > 0
                            ? 'bg-pika/60'
                            : 'bg-mint/40'
                      )}
                    >
                      {entry.letter}
                      {entry.errors > 0 && (
                        <span className="ml-1 text-[10px] font-extrabold text-ink/60">{entry.errors}</span>
                      )}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-semibold text-ink/45">
                  Verde = va bien · amarillo = 1 o 2 errores sin resolver · rojo = 3 o más.
                </p>
              </div>
            )}
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
                        {confusion.count}× {confusion.resolved ? '✅' : confusion.stage ? `🔁 ${confusion.stage}/4` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] font-semibold text-ink/45">
                  🔁 = lo va acertando; vuelve a su “Repaso de hoy” al día siguiente, a los 3 y a los 7 días.
                  ✅ = lo acertó las 4 veces.
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
          Al llegar a este tiempo la app invita a descansar (no bloquea). Vale para todos los dispositivos.
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {DAILY_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => {
                setDailyLimit(minutes)
                setLimit(minutes)
                api.saveSettings(minutes).catch((error) => {
                  if (!expired(error)) setToast('No se pudo guardar en el servidor')
                })
              }}
              className={cn('btn h-12 text-sm', dailyLimit === minutes ? 'btn-mint' : 'btn-white')}
            >
              {minutes === 0 ? 'Sin límite' : `${minutes} min`}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-5 rounded-[2rem] bg-white/80 p-4">
        <h2 className="font-display text-lg">🔒 PIN de padres</h2>
        <p className="mt-1 text-sm font-semibold text-ink/60">
          El PIN protege esta zona. La sesión se cierra sola al cerrar la app o después de 2 horas.
        </p>
        <button
          type="button"
          onClick={() => {
            setChangingPin(true)
            setPin('')
            setPinAgain('')
            setPinError(null)
            setGate('newpin')
          }}
          className="btn btn-white mt-3 h-12 w-full text-sm"
        >
          Cambiar PIN
        </button>
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
