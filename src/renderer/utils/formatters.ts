/**
 * Formatting utilities for dates, names, and avatars.
 */

import { useUIStore } from '@/store/uiStore'
import { formatDateSeparatorWithPreferences, formatDateTimeWithPreferences, formatDateWithPreferences, formatTimeWithPreferences, formatTimestampWithPreferences, type DateTimePreferences } from '@/utils/dateTime'

export type { DateTimePreferences } from '@/utils/dateTime'

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

function preferences(): DateTimePreferences {
  const { locale, timeFormat, dateFormat } = useUIStore.getState()
  return { locale, timeFormat, dateFormat }
}

export function formatDate(date: Date, prefs = preferences()): string { return formatDateWithPreferences(date, prefs) }
export function formatTime(date: Date, prefs = preferences()): string { return formatTimeWithPreferences(date, prefs) }
export function formatDateTime(date: Date, prefs = preferences()): string { return formatDateTimeWithPreferences(date, prefs) }
export function formatTimestamp(date: Date, prefs = preferences()): string { return formatTimestampWithPreferences(new Date(date), prefs) }
export function formatDateSeparator(date: Date, prefs = preferences()): string { return formatDateSeparatorWithPreferences(new Date(date), prefs) }
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
