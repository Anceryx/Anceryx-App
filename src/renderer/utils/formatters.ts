/**
 * Formatting utilities for dates, names, and avatars.
 */

const AVATAR_COLORS = [
  '#7C3AED', // violet-600
  '#DC2626', // red-600
  '#2563EB', // blue-600
  '#059669', // emerald-600
  '#D97706', // amber-600
  '#DB2777', // pink-600
  '#0891B2', // cyan-600
  '#65A30D'  // lime-600
]

/**
 * Returns a timestamp string:
 * - "hoje às HH:MM" for today
 * - "ontem às HH:MM" for yesterday
 * - "DD/MM/YYYY HH:MM" for older dates
 */
export function formatTimestamp(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const msgStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const hhmm = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)

  if (msgStart.getTime() === todayStart.getTime()) {
    return `hoje às ${hhmm}`
  }
  if (msgStart.getTime() === yesterdayStart.getTime()) {
    return `ontem às ${hhmm}`
  }

  const ddmmyyyy = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)

  return `${ddmmyyyy} ${hhmm}`
}

/**
 * Returns a date separator label:
 * - "Hoje" for today
 * - "Ontem" for yesterday
 * - "DD de MÊS de YYYY" for older dates
 */
export function formatDateSeparator(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const msgStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (msgStart.getTime() === todayStart.getTime()) return 'Hoje'
  if (msgStart.getTime() === yesterdayStart.getTime()) return 'Ontem'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(d)
}

/**
 * Returns initials from a name:
 * - First letter of the first word + first letter of the second word (if present).
 * - Falls back to a single letter if there is only one word.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  const first = parts[0][0].toUpperCase()
  const second = parts.length > 1 && parts[1] ? parts[1][0].toUpperCase() : ''
  return `${first}${second}`
}

/**
 * Returns a deterministic hex color from the given name
 * by summing character codes modulo the palette length.
 */
export function getAvatarColor(name: string): string {
  let sum = 0
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i)
  }
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}
