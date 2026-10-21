export interface DateTimePreferences {
  locale: 'pt-BR' | 'en-US' | 'es-ES'
  timeFormat: 'auto' | '12h' | '24h'
  dateFormat: 'auto' | 'dmy' | 'mdy' | 'ymd'
}

const relativeLabels = {
  'pt-BR': { today: 'hoje', yesterday: 'ontem', at: 'às' },
  'en-US': { today: 'today', yesterday: 'yesterday', at: 'at' },
  'es-ES': { today: 'hoy', yesterday: 'ayer', at: 'a las' },
} as const

function localDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dateParts(date: Date, prefs: DateTimePreferences, month: '2-digit' | 'long') {
  const parts = new Intl.DateTimeFormat(prefs.locale, { day: '2-digit', month, year: 'numeric' }).formatToParts(date)
  return Object.fromEntries(parts.filter((part) => ['day', 'month', 'year'].includes(part.type)).map((part) => [part.type, part.value])) as Record<'day' | 'month' | 'year', string>
}

export function formatDateWithPreferences(date: Date, prefs: DateTimePreferences): string {
  if (prefs.dateFormat === 'auto') return new Intl.DateTimeFormat(prefs.locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  const values = dateParts(date, prefs, '2-digit')
  const order = prefs.dateFormat === 'dmy' ? ['day', 'month', 'year'] : prefs.dateFormat === 'mdy' ? ['month', 'day', 'year'] : ['year', 'month', 'day']
  const separator = prefs.dateFormat === 'ymd' ? '-' : '/'
  return order.map((part) => values[part as keyof typeof values]).join(separator)
}

export function formatTimeWithPreferences(date: Date, prefs: DateTimePreferences): string {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  if (prefs.timeFormat === '12h') options.hour12 = true
  if (prefs.timeFormat === '24h') options.hour12 = false
  return new Intl.DateTimeFormat(prefs.locale, options).format(date)
}

export function formatTimestampWithPreferences(date: Date, prefs: DateTimePreferences, now = new Date()): string {
  if (Number.isNaN(date.getTime())) return ''
  const today = localDay(now)
  const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const messageDay = localDay(date)
  const labels = relativeLabels[prefs.locale]
  const time = formatTimeWithPreferences(date, prefs)
  if (messageDay === today) return `${labels.today} ${labels.at} ${time}`
  if (messageDay === yesterday) return `${labels.yesterday} ${labels.at} ${time}`
  return `${formatDateWithPreferences(date, prefs)} ${time}`
}

export function formatDateTimeWithPreferences(date: Date, prefs: DateTimePreferences): string {
  if (Number.isNaN(date.getTime())) return ''
  return `${formatDateWithPreferences(date, prefs)} ${formatTimeWithPreferences(date, prefs)}`
}

export function formatDateSeparatorWithPreferences(date: Date, prefs: DateTimePreferences, now = new Date()): string {
  if (Number.isNaN(date.getTime())) return ''
  const today = localDay(now)
  const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const dateDay = localDay(date)
  const labels = relativeLabels[prefs.locale]
  if (dateDay === today) return labels.today[0].toLocaleUpperCase(prefs.locale) + labels.today.slice(1)
  if (dateDay === yesterday) return labels.yesterday[0].toLocaleUpperCase(prefs.locale) + labels.yesterday.slice(1)
  const values = dateParts(date, prefs, 'long')
  const order = prefs.dateFormat === 'dmy' ? ['day', 'month', 'year'] : prefs.dateFormat === 'mdy' ? ['month', 'day', 'year'] : prefs.dateFormat === 'ymd' ? ['year', 'month', 'day'] : new Intl.DateTimeFormat(prefs.locale, { day: '2-digit', month: 'long', year: 'numeric' }).formatToParts(date).filter((part) => ['day', 'month', 'year'].includes(part.type)).map((part) => part.type)
  return order.map((part) => values[part as keyof typeof values]).join(' ')
}
