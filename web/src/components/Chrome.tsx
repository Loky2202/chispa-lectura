import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { Pikachu } from './Pikachu'

export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFF6D6] via-[#E8FAFF] to-[#FFF0F5]" />
      <div className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-pika/40 blur-3xl" />
      <div className="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-mint/30 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-grape/20 blur-3xl" />
      <div className="dots-bg absolute inset-0 opacity-40" />
      <span className="animate-float absolute left-[5%] top-[10%] text-6xl opacity-60">☁️</span>
      <span className="animate-float-slow absolute right-[6%] top-[18%] text-5xl opacity-50">☁️</span>
      <span className="animate-float-slow absolute left-[10%] top-[52%] text-3xl opacity-40">⭐</span>
      <span className="animate-float absolute right-[12%] top-[62%] text-3xl opacity-40">✨</span>
      <span className="animate-float absolute bottom-[12%] left-[46%] text-2xl opacity-30">⚡</span>
    </div>
  )
}

export function IconButton({
  children,
  onClick,
  label,
  className
}: {
  children: ReactNode
  onClick?: () => void
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'btn h-12 w-12 shrink-0 rounded-2xl bg-white/90 text-xl shadow-[0_4px_0_rgba(45,49,66,0.1)]',
        className
      )}
    >
      {children}
    </button>
  )
}

export function CoinPill({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-sm font-extrabold shadow-[0_4px_0_rgba(45,49,66,0.08)]',
        className
      )}
    >
      <span className="text-base">🪙</span>
      <span>{value}</span>
    </div>
  )
}

export function Stars({
  value,
  size = 'md',
  animate = false
}: {
  value: number
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}) {
  const sizes = { sm: 'text-base', md: 'text-2xl', lg: 'text-5xl' }
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} de 3 estrellas`}>
      {[1, 2, 3].map((star) => (
        <span
          key={star}
          className={cn(
            sizes[size],
            star <= value ? 'drop-shadow-sm' : 'opacity-20 grayscale',
            animate && star <= value && 'animate-star-pop'
          )}
          style={animate ? { animationDelay: `${star * 140}ms` } : undefined}
        >
          ⭐
        </span>
      ))}
    </div>
  )
}

export function ProgressBar({
  value,
  className,
  barClassName
}: {
  value: number
  className?: string
  barClassName?: string
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)))
  return (
    <div className={cn('h-4 w-full overflow-hidden rounded-full bg-white/80', className)}>
      <motion.div
        className={cn('h-full rounded-full bg-mint', barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  )
}

export function TopBar({
  title,
  subtitle,
  onBack,
  right,
  hideCoins = false
}: {
  title?: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
  hideCoins?: boolean
}) {
  const profile = useStore((state) => state.profile)
  const data = useStore((state) => state.data)

  return (
    <header className="safe-bottom flex items-center gap-3 px-4 pb-2 pt-4">
      {onBack ? (
        <IconButton onClick={onBack} label="Volver">
          ⬅️
        </IconButton>
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-[0_4px_0_rgba(45,49,66,0.08)]">
          <Pikachu size={38} mood="happy" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl font-semibold leading-tight">{title}</h1>
        <p className="truncate text-xs font-semibold text-ink/55">
          {subtitle ?? `${profile?.avatar ?? '⚡'} ${profile?.name ?? ''}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!hideCoins && <CoinPill value={profile?.coins ?? 0} />}
        {data && data.streak > 1 && (
          <div className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-sm font-extrabold shadow-[0_4px_0_rgba(45,49,66,0.08)]">
            🔥 {data.streak}
          </div>
        )}
        {right}
      </div>
    </header>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl"
            initial={{ y: 60, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(event) => event.stopPropagation()}
          >
            {title && <h2 className="mb-2 text-center font-display text-2xl">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function LoadingScreen({ message = 'Preparando la aventura...' }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Pikachu size={170} mood="cheer" bounce />
      <h1 className="font-display text-2xl">{message}</h1>
      <div className="flex gap-1">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="h-3 w-3 rounded-full bg-pika-dark"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: dot * 0.12 }}
          />
        ))}
      </div>
    </div>
  )
}

export function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-ink px-5 py-3 text-center text-sm font-bold text-white shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
