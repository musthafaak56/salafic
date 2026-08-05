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

export function formatDateTime(value) {
  if (!value) return '—'
  const d =
    value && typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
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
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

// Minutes from one HH:mm to another (handles overnight wrap).
export function minutesBetween(earlier, later) {
  const a = toMinutes(earlier)
  const b = toMinutes(later)
  if (a === null || b === null) return null
  let diff = b - a
  if (diff < 0) diff += 24 * 60
  return diff
}

// Adds minutes to an HH:mm string (handles rollover).
export function addMinutes(hhmm, mins) {
  const a = toMinutes(hhmm)
  if (a === null || !Number.isFinite(mins)) return hhmm
  const total = a + mins
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Human label for the gap between adhaan and iqama, e.g. "+10 min".
export function iqamaGapLabel(adhaan, iqama) {
  const mins = minutesBetween(adhaan, iqama)
  if (mins === null) return null
  return `+${mins} min`
}

// Converts an internal "HH:mm" string to 12-hour display, e.g. "05:01 AM".
export function format12h(hhmm) {
  if (!hhmm) return '—'
  const [h, m] = String(hhmm).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return '—'
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
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
