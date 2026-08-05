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

/* ---------- Prayer time model ---------- */

// Normalizes a stored prayer entry (new object or legacy string)
// into { adhaan, iqama }.
export function prayerEntry(value) {
  if (!value) return { adhaan: '', iqama: '' }
  if (typeof value === 'string') return { adhaan: value, iqama: '' }
  return {
    adhaan: value.adhaan || '',
    iqama: value.iqama || '',
  }
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm ?? '').split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

// The next prayer is computed from the iqama time (when the
// congregation actually starts), falling back to adhaan.
export function getNextPrayer(prayerTimes, now = new Date()) {
  if (!prayerTimes) return null
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const candidates = []
  for (const { key, label } of PRAYER_KEYS) {
    const { adhaan, iqama } = prayerEntry(prayerTimes[key])
    const time = iqama || adhaan
    if (!time) continue
    const t = toMinutes(time)
    if (t === null) continue
    candidates.push({
      key,
      label,
      adhaan,
      iqama,
      time,
      minutes: t,
      isToday: true,
    })
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
