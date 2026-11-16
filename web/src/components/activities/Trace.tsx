import { useEffect, useRef, useState } from 'react'
import type { Trace } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak } from '../../lib/speech'
import { pick, PRAISE } from '../../lib/utils'
import { useSpeakOnMount, PraiseBubble } from './shared'

const TRACE_SIZE = 320

/**
 * Dibujar la letra con el dedo sobre su silueta. No hay errores: se completa cuando
 * el trazo cubre casi toda la letra (y siempre aparece un botón para seguir).
 */
export function TraceActivity({ a, onDone }: { a: Trace; onDone: (perfect: boolean) => void }) {
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
