import {
  Coordinates,
  PrayerTimes,
  CalculationMethod,
  Madhab,
  HighLatitudeRule,
} from 'adhan'
import { DEFAULT_PRAYER, PRAYERS } from '../../functions/domain.js'
import { zonedInstant } from '../../functions/time.js'
export { zonedInstant } from '../../functions/time.js'

export function localDate(timezone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  return ['year', 'month', 'day']
    .map((key) => parts.find((p) => p.type === key).value)
    .join('-')
}
export function shiftDate(date, days) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
export function calculateSchedule(
  center,
  date = localDate(center.timezone),
  manual = null,
) {
  const config = { ...DEFAULT_PRAYER, ...center.prayer }
  const [y, m, d] = date.split('-').map(Number)
  const params = CalculationMethod[config.method]()
  params.madhab = Madhab[config.madhab]
  params.highLatitudeRule = HighLatitudeRule[config.highLatitude]
  const base = new PrayerTimes(
    new Coordinates(center.latitude, center.longitude),
    new Date(y, m - 1, d),
    params,
  )
  const prayers = PRAYERS.map((key) => {
    const offset = config.offsets?.[key] || 0
    const manualTime =
      manual?.[key]?.adhaan ||
      (typeof manual?.[key] === 'string' ? manual[key] : '')
    const at = manualTime
      ? zonedInstant(date, manualTime, center.timezone)
      : new Date(base[key].getTime() + offset * 60000).toISOString()
    const iqama = manual?.[key]?.iqama
      ? zonedInstant(date, manual[key].iqama, center.timezone)
      : new Date(
          Date.parse(at) + (config.gaps?.[key] || 0) * 60000,
        ).toISOString()
    return {
      key,
      base: Number.isFinite(base[key].getTime())
        ? base[key].toISOString()
        : null,
      offset: manualTime ? 0 : offset,
      at,
      iqama,
    }
  })
  return {
    date,
    timezone: center.timezone,
    source: manual
      ? 'Published timetable'
      : 'Calculated for this center · local adjustments applied',
    prayers,
    sunrise: Number.isFinite(base.sunrise.getTime())
      ? base.sunrise.toISOString()
      : null,
    jumuah: config.jumuah || [],
  }
}
export function nextPrayer(schedules, now = Date.now()) {
  return (
    schedules
      .flatMap((s) => s.prayers)
      .filter((p) => Date.parse(p.at) > now)
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0] || null
  )
}
export function timeLabel(iso, center) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '—'
  return new Intl.DateTimeFormat(center.locale || 'en', {
    timeZone: center.timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: center.timeFormat !== '24',
  }).format(new Date(iso))
}

export function hijriDate(center, now = Date.now()) {
  return new Intl.DateTimeFormat(`${center.locale || 'en'}-u-ca-islamic`, {
    timeZone: center.timezone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(now + (center.hijriAdjustment || 0) * 86400000))
}
