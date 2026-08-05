export const PRAYER_KEYS = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'dhuhr', label: 'Dhuhr' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha', label: 'Isha' },
  { key: 'jumuah', label: 'Jumuah' },
]

export function formatDate(value) {
  if (!value) return '—'
  if (value && typeof value.toDate === 'function') return value.toDate().toLocaleDateString()
  if (value instanceof Date) return value.toLocaleDateString()
  return new Date(value).toLocaleDateString()
}

export function formatTime(value) {
  if (!value) return '—'
  if (value && typeof value.toDate === 'function') return value.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (value instanceof Date) return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatCurrency(amount) {
  const n = Number(amount) || 0
  return n.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

export function fullDateLabel(date = new Date()) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm ?? '').split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export function getNextPrayer(prayerTimes, now = new Date()) {
  if (!prayerTimes) return null
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const candidates = []
  for (const { key, label } of PRAYER_KEYS) {
    const value = prayerTimes[key]
    if (!value) continue
    const t = toMinutes(value)
    if (t === null) continue
    candidates.push({ key, label, time: value, minutes: t, isToday: true })
  }
  if (candidates.length === 0) return null

  const next = candidates.find((c) => c.minutes > nowMin)
  if (next) return next

  const earliest = candidates.reduce((a, b) => (b.minutes < a.minutes ? b : a))
  return { ...earliest, isToday: false }
}

export function isStalePrayerTimes(prayerTimes, now = new Date()) {
  if (!prayerTimes) return true
  const today = todayISODate()
  const shown = String(prayerTimes.date ?? '').slice(0, 10)
  if (shown === today) return false
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return shown !== tomorrow.toISOString().slice(0, 10)
}

export function relativeDayLabel(dateStr) {
  if (!dateStr) return ''
  const shown = String(dateStr).slice(0, 10)
  if (shown === todayISODate()) return 'Today'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (shown === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow'
  return formatDate(dateStr)
}
