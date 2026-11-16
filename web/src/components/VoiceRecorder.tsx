import { useEffect, useMemo, useRef, useState } from 'react'
import { parentHeaders } from '../lib/api'
import { recordingList } from '../lib/session'
import { audioKey, loadRecordedAudio, speak, stopSpeaking } from '../lib/speech'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'

type Phase = 'idle' | 'recording' | 'saving'

/**
 * Grabadora para la zona de Padres: la familia graba sílabas y palabras con su voz
 * y la app las usa en lugar de la voz del navegador.
 */
export function VoiceRecorder({ onClose }: { onClose: () => void }) {
  const content = useStore((state) => state.content)
  const groups = useMemo(() => recordingList(content), [content])
  const all = useMemo(() => groups.flatMap((group) => group.items), [groups])
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string>('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const stopTimerRef = useRef<number | null>(null)

  const canRecord =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'

  const refresh = async () => {
    try {
      const response = await fetch('/api/audio')
      const rows = (await response.json()) as { key: string }[]
      setSaved(new Set(rows.map((row) => row.key)))
    } catch {
      setError('No se pudo conectar con el servidor.')
    }
    await loadRecordedAudio()
  }

  useEffect(() => {
    void refresh()
    return () => {
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    if (!selected && all.length) setSelected(all[0])
  }, [all, selected])

  const isSaved = (text: string) => saved.has(audioKey(text))
  const nextPending = () => {
    const start = all.indexOf(selected)
    const rest = [...all.slice(start + 1), ...all.slice(0, start + 1)]
    const next = rest.find((item) => !isSaved(item) && item !== selected)
    if (next) setSelected(next)
  }

  const stop = () => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current)
    stopTimerRef.current = null
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const record = async () => {
    if (!selected || phase !== 'idle') return
    setError(null)
    stopSpeaking()
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      const text = selected
      const chunks: Blob[] = []
      const recorder = new MediaRecorder(streamRef.current)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onstop = async () => {
        setPhase('saving')
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          const response = await fetch(`/api/audio/${encodeURIComponent(audioKey(text))}`, {
            method: 'PUT',
            headers: { 'Content-Type': blob.type || 'audio/webm', ...parentHeaders() },
            body: blob
          })
          if (!response.ok) throw new Error('save')
          await refresh()
          speak(text)
        } catch {
          setError('No se pudo guardar. Intenta otra vez.')
        } finally {
          setPhase('idle')
        }
      }
      recorder.start()
      setPhase('recording')
      // Se detiene sola: una sílaba no necesita más de unos segundos.
      stopTimerRef.current = window.setTimeout(stop, text.length <= 4 ? 2500 : 4000)
    } catch {
      setError('No hay permiso para usar el micrófono.')
      setPhase('idle')
    }
  }

  const remove = async () => {
    if (!selected) return
    const response = await fetch(`/api/audio/${encodeURIComponent(audioKey(selected))}`, {
      method: 'DELETE',
      headers: parentHeaders()
    })
    if (!response.ok) setError('No se pudo borrar. Vuelve a entrar a la zona de Padres.')
    await refresh()
  }

  const done = all.filter(isSaved).length

  return (
    <div className="mx-4 mt-2 flex flex-col gap-4">
      <div className="card sticky top-2 z-10 border-4 border-white p-4 text-center">
        <p className="text-xs font-extrabold uppercase tracking-wide text-ink/45">
          {done} de {all.length} grabadas
        </p>
        <p className="mt-1 font-display text-6xl">{selected || '—'}</p>
        {!canRecord ? (
          <p className="mt-3 rounded-2xl bg-coral/10 p-3 text-sm font-bold text-coral">
            Este navegador no deja usar el micrófono aquí. Abre la app en la computadora, en
            http://localhost:3100, para grabar.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={phase === 'recording' ? stop : record}
              disabled={phase === 'saving'}
              className={cn(
                'btn h-14 gap-2 px-6 text-base',
                phase === 'recording' ? 'animate-glow bg-coral text-white' : 'btn-primary'
              )}
            >
              {phase === 'recording' ? '⏹️ Detener' : phase === 'saving' ? 'Guardando...' : '🎙️ Grabar'}
            </button>
            <button type="button" onClick={() => speak(selected)} className="btn btn-white h-14 px-5 text-base">
              ▶️ Escuchar
            </button>
            {isSaved(selected) && (
              <button type="button" onClick={remove} className="btn btn-white h-14 px-5 text-base">
                🗑️ Borrar
              </button>
            )}
            <button type="button" onClick={nextPending} className="btn btn-white h-14 px-5 text-base">
              Siguiente ➡️
            </button>
          </div>
        )}
        <p className="mt-3 text-xs font-bold text-ink/50">
          Toca Grabar y di solo “{selected}”, claro y sin prisa. Se guarda sola y se oye para que la revises.
          {isSaved(selected) ? ' Ya tiene tu voz.' : ' Sin grabación se usa la voz del navegador.'}
        </p>
        {error && <p className="mt-2 text-sm font-bold text-coral">{error}</p>}
      </div>

      {groups.map((group) => (
        <div key={group.title} className="rounded-[2rem] bg-white/80 p-4">
          <h3 className="font-display text-lg">
            {group.title}{' '}
            <span className="text-xs font-bold text-ink/45">
              {group.items.filter(isSaved).length}/{group.items.length}
            </span>
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.items.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSelected(item)}
                className={cn(
                  'rounded-2xl border-2 px-3 py-2 font-display text-lg transition',
                  isSaved(item) ? 'border-mint bg-mint/20' : 'border-ink/10 bg-white',
                  selected === item && 'ring-4 ring-pika-dark'
                )}
              >
                {item}
                {isSaved(item) && ' ✓'}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-center">
        <button type="button" onClick={onClose} className="btn btn-white h-14 px-6">
          ⬅️ Volver a la zona de padres
        </button>
      </div>
    </div>
  )
}
