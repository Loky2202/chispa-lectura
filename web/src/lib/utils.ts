export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ')
}

export function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return 'menos de 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export const PRAISE = ['¡Muy bien!', '¡Genial!', '¡Excelente!', '¡Lo lograste!', '¡Eres increíble!', '¡Qué grande!']

export const ENCOURAGE = ['Casi. ¡Intenta otra vez!', 'Casi casi. ¡Otra vez!', 'Tú puedes. ¡Prueba de nuevo!']

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}
