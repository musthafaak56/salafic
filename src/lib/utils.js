export const PRAYER_KEYS = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'dhuhr', label: 'Dhuhr' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha', label: 'Isha' },
  { key: 'jumuah', label: 'Jumuah' },
]

// Is the given date (YYYY-MM-DD) a Friday?
export function isFriday(dateStr) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`)
  return !Number.isNaN(d.getTime()) && d.getDay() === 5
}

export const FRIDAY_SUNNAHS = [
  'Ghusl before the prayer',
  'Wear your best clothes',
  'Perfume and siwak',
  'Recite Surah Al-Kahf',
  'Salawat upon the Prophet',
  'Come to the masjid early',
  'Listen to the khutbah',
  'Seek the answered hour',
  'Walk to the masjid',
  'Increase du’a and dhikr',
]

// The prayer cards to show for a given schedule date: on Fridays the
// Friday prayer ("Jumuah") replaces Dhuhr in the same slot; on other
// days Jumuah is not shown.
export function prayerKeysForDate(dateStr) {
  if (isFriday(dateStr)) {
    return PRAYER_KEYS.filter((p) => p.key !== 'jumuah').map((p) =>
      p.key === 'dhuhr' ? { key: 'jumuah', label: 'Jumuah' } : p
    )
  }
  return PRAYER_KEYS.filter((p) => p.key !== 'jumuah')
}

// Keys for the public site: jumuah replaces dhuhr only when the real
// calendar day is Friday (regardless of which day the published doc was
// saved for), falling back to the dhuhr times when no jumuah times were
// saved.
export function publicPrayerKeys(prayerTimes) {
  if (!prayerTimes) return []
  return prayerKeysForDate(todayISODate()).map((p) => {
    if (p.key !== 'jumuah') return p
    const { adhaan, iqama } = prayerEntry(prayerTimes.jumuah)
    return !adhaan && !iqama ? { key: 'dhuhr', label: 'Dhuhr' } : p
  })
}

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
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
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

export function toMinutes(hhmm) {
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

// Adds (or subtracts) minutes to an HH:mm string (handles rollover both ways).
export function addMinutes(hhmm, mins) {
  const a = toMinutes(hhmm)
  if (a === null || !Number.isFinite(mins)) return hhmm
  const total = a + mins
  const h = (((Math.floor(total / 60)) % 24) + 24) % 24
  const m = ((total % 60) + 60) % 60
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

// Seconds from `now` until an "HH:mm" time (optionally on tomorrow's date).
// Returns null when the time can't be parsed.
export function secondsUntil(hhmm, isTomorrow = false, now = new Date()) {
  if (!hhmm) return null
  const [h, m] = String(hhmm).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  const target = new Date(now)
  target.setHours(h, m, 0, 0)
  if (isTomorrow) target.setDate(target.getDate() + 1)
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
}

// Formats a number of seconds as "hh:mm:ss".
export function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

// The next prayer is computed from the iqama time (when the
// congregation actually starts), falling back to adhaan.
export function getNextPrayer(prayerTimes, now = new Date(), keys) {
  if (!prayerTimes) return null
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const candidates = []
  for (const { key, label } of keys || prayerKeysForDate(prayerTimes.date)) {
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

// The most recent prayer whose time (iqama, falling back to adhaan) has
// already passed today, but less than an hour ago. Returns null after
// that window (or nothing passed yet) so callers can fall back to the
// regular next-prayer countdown.
export function recentlyPassedPrayer(prayerTimes, now = new Date()) {
  if (!prayerTimes) return null
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const passed = []
  for (const { key, label } of publicPrayerKeys(prayerTimes)) {
    const { adhaan, iqama } = prayerEntry(prayerTimes[key])
    const time = iqama || adhaan
    const t = toMinutes(time)
    if (t === null || t > nowMin) continue
    passed.push({ key, label, adhaan, iqama, time, minutes: t })
  }
  if (passed.length === 0) return null
  const latest = passed.reduce((a, b) => (b.minutes > a.minutes ? b : a))
  const elapsed = nowMin * 60 + now.getSeconds() - latest.minutes * 60
  if (elapsed >= 3600) return null
  return { ...latest, elapsed }
}

// The dhuhaa window depends on sunrise and the dhuhr adhaan, so it
// lives on its own rather than in PRAYER_KEYS. It runs from 20 minutes
// after sunrise until 20 minutes before the dhuhr adhaan.
export function dhuhaaWindow(prayerTimes, now = new Date()) {
  if (!prayerTimes) return null
  const sunrise = prayerEntry(prayerTimes.sunrise).adhaan
  const dhuhr = prayerEntry(prayerTimes.dhuhr).adhaan
  const start = toMinutes(addMinutes(sunrise, 20))
  const end = toMinutes(addMinutes(dhuhr, -20))
  if (start === null || end === null) return null
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (nowMin < start || nowMin >= end) return null
  return { start: addMinutes(sunrise, 20), end: addMinutes(dhuhr, -20) }
}

// Is it currently the time for the dhuhaa prayer?
export function isDhuhaTime(prayerTimes, now = new Date()) {
  return Boolean(dhuhaaWindow(prayerTimes, now))
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
