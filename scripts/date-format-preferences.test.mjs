import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  formatDateSeparatorWithPreferences,
  formatDateWithPreferences,
  formatTimeWithPreferences,
  formatTimestampWithPreferences,
} from '../src/renderer/utils/dateTime.ts'

const fixed = new Date(2024, 11, 31, 13, 5)
const now = new Date(2025, 0, 1, 9, 0)
const base = { locale: 'pt-BR', timeFormat: '24h', dateFormat: 'dmy' }

assert.equal(formatDateWithPreferences(fixed, base), '31/12/2024')
assert.equal(formatDateWithPreferences(fixed, { ...base, dateFormat: 'mdy' }), '12/31/2024')
assert.equal(formatDateWithPreferences(fixed, { ...base, dateFormat: 'ymd' }), '2024-12-31')
assert.match(formatTimeWithPreferences(fixed, { ...base, locale: 'en-US', timeFormat: '12h' }), /1:05\s?PM/i)
assert.match(formatTimeWithPreferences(fixed, { ...base, locale: 'en-US', timeFormat: '24h' }), /13:05/)
assert.match(formatTimestampWithPreferences(now, base, now), /^hoje às /)
assert.match(formatTimestampWithPreferences(fixed, base, now), /^ontem às /)
assert.equal(formatDateSeparatorWithPreferences(now, base, now), 'Hoje')
assert.equal(formatDateSeparatorWithPreferences(fixed, { ...base, locale: 'en-US' }, now), 'Yesterday')

const uiStore = await readFile(new URL('../src/renderer/store/uiStore.ts', import.meta.url), 'utf8')
const dashboard = await readFile(new URL('../src/renderer/pages/DashboardPage.tsx', import.meta.url), 'utf8')
assert.match(uiStore, /locale: 'pt-BR'/)
assert.match(uiStore, /timeFormat: 'auto'/)
assert.match(uiStore, /dateFormat: 'auto'/)
assert.match(uiStore, /partialize: \(state\) => \(\{ locale: state\.locale, timeFormat: state\.timeFormat, dateFormat: state\.dateFormat/)
assert.match(dashboard, /useUIStore\(\(s\) => s\.locale\)/)
assert.match(dashboard, /useUIStore\(\(s\) => s\.timeFormat\)/)
assert.match(dashboard, /useUIStore\(\(s\) => s\.dateFormat\)/)

console.log('date format preference tests passed (locale, date order, 12/24-hour clock and local relative days)')
