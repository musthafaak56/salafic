export const SUPER_ADMIN_EMAIL = 'musthafaak56@gmail.com'
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
export const ROLES = ['owner', 'admin', 'finance', 'editor']
export function text(value, max = 200, required = true) {
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new Error('Please check the required text fields.')
  return value.trim()
}
export function email(value) {
  const result = text(value, 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    throw new Error('Enter a valid email address.')
  return result
}
export function validId(value) {
  if (typeof value !== 'string' || !/^[\w-]{1,120}$/.test(value))
    throw new Error('Invalid record identifier.')
  return value
}
export function slug(value) {
  const result = text(value, 80).toLowerCase()
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result) ||
    [
      'admin',
      'platform',
      'login',
      'centers',
      'quran',
      'onboarding',
      'api',
    ].includes(result)
  )
    throw new Error(
      'Choose a unique URL using lowercase letters, numbers and hyphens.',
    )
  return result
}
export function centerFields(data) {
  const latitude = Number(data.latitude),
    longitude = Number(data.longitude)
  if (
    data.latitude === '' ||
    data.longitude === '' ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180
  )
    throw new Error('Enter valid center coordinates.')
  const timezone = text(data.timezone, 80)
  new Intl.DateTimeFormat('en', { timeZone: timezone }).format()
  const currency = text(data.currency, 3).toUpperCase()
  if (!Intl.supportedValuesOf('currency').includes(currency))
    throw new Error('Choose a supported currency code.')
  const locale = text(data.locale || 'en', 35)
  new Intl.DateTimeFormat(locale).format()
  const countryCode = text(data.countryCode, 2).toUpperCase()
  if (!/^[A-Z]{2}$/.test(countryCode))
    throw new Error('Use a two-letter country code.')
  const publicLinks = {}
  for (const key of ['logoUrl', 'coverUrl', 'websiteUrl']) {
    const value = text(data[key] || '', 2000, false)
    if (value && new URL(value).protocol !== 'https:')
      throw new Error('Use HTTPS links for images and websites.')
    publicLinks[key] = value
  }
  return {
    displayName: text(data.displayName, 120),
    type: data.type === 'masjid' ? 'masjid' : 'center',
    city: text(data.city, 100),
    countryCode,
    address: text(data.address, 300),
    latitude,
    longitude,
    timezone,
    currency,
    locale,
    timeFormat: data.timeFormat === '24' ? '24' : '12',
    hijriAdjustment:
      Number.isInteger(Number(data.hijriAdjustment || 0)) &&
      Math.abs(Number(data.hijriAdjustment || 0)) <= 2
        ? Number(data.hijriAdjustment || 0)
        : 0,
    modules: {
      finances: data.modules?.finances !== false,
      events: data.modules?.events !== false,
      forms: data.modules?.forms !== false,
    },
    description: text(data.description || '', 1000, false),
    ...publicLinks,
    contactEmail: data.contactEmail ? email(data.contactEmail) : '',
    phone: text(data.phone || '', 40, false),
  }
}
export function applicationFields(data) {
  return {
    ...centerFields(data),
    slug: slug(data.slug),
    designatedAdminEmail: email(data.designatedAdminEmail),
  }
}
export function prayerSettings(data = {}) {
  const methods = [
    'MuslimWorldLeague',
    'NorthAmerica',
    'Karachi',
    'UmmAlQura',
    'Egyptian',
    'Dubai',
    'Singapore',
    'MoonsightingCommittee',
  ]
  if (!methods.includes(data.method))
    throw new Error('Select a prayer calculation method.')
  const offsets = {},
    gaps = {}
  for (const key of PRAYERS) {
    offsets[key] = Number(data.offsets?.[key] ?? 0)
    gaps[key] = Number(data.gaps?.[key] ?? 10)
    if (
      !Number.isInteger(offsets[key]) ||
      Math.abs(offsets[key]) > 180 ||
      !Number.isInteger(gaps[key]) ||
      gaps[key] < 0 ||
      gaps[key] > 180
    )
      throw new Error(
        'Use whole-minute adjustments between -180 and 180, and congregation gaps from 0 to 180.',
      )
  }
  const jumuah = data.jumuah || []
  if (
    !Array.isArray(jumuah) ||
    jumuah.length > 6 ||
    jumuah.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))
  )
    throw new Error('Enter valid Friday congregation times.')
  return {
    method: data.method,
    madhab: data.madhab === 'Hanafi' ? 'Hanafi' : 'Shafi',
    highLatitude: [
      'MiddleOfTheNight',
      'SeventhOfTheNight',
      'TwilightAngle',
    ].includes(data.highLatitude)
      ? data.highLatitude
      : 'TwilightAngle',
    offsets,
    gaps,
    jumuah,
  }
}
export const DEFAULT_PRAYER = prayerSettings({ method: 'MuslimWorldLeague' })
export function minorUnits(amount, currency) {
  const digits = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits
  const value = String(amount)
  if (
    !/^\d+(\.\d+)?$/.test(value) ||
    (value.split('.')[1]?.length || 0) > digits
  )
    throw new Error(`Use no more than ${digits} decimal places.`)
  const [whole, fraction = ''] = value.split('.')
  const result = Number(whole + fraction.padEnd(digits, '0'))
  if (!Number.isSafeInteger(result) || result <= 0 || result > 1e12)
    throw new Error('Enter a valid positive amount.')
  return result
}
export function money(amountMinor, currency, locale = 'en') {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  })
  return formatter.format(
    amountMinor / 10 ** formatter.resolvedOptions().maximumFractionDigits,
  )
}
export function noticeFields(data) {
  const startsAt = new Date(data.startsAt).toISOString(),
    expiresAt = new Date(data.expiresAt).toISOString()
  if (startsAt >= expiresAt)
    throw new Error('Expiry must be after the start time.')
  const surfaces = data.surfaces || ['home', 'tv']
  if (
    !Array.isArray(surfaces) ||
    !surfaces.length ||
    surfaces.some((s) => !['home', 'tv'].includes(s))
  )
    throw new Error('Choose where the notice appears.')
  return {
    title: text(data.title, 150),
    message: text(data.message, 2000),
    startsAt,
    expiresAt,
    priority: data.priority === 'urgent' ? 'urgent' : 'normal',
    surfaces,
  }
}
export function manualSchedule(data) {
  const date = text(data.date, 10)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new Error('Enter a valid schedule date.')
  const result = { date }
  for (const key of PRAYERS) {
    const entry = data[key]
    if (
      !entry ||
      ![entry.adhaan, entry.iqama].every((t) =>
        /^([01]\d|2[0-3]):[0-5]\d$/.test(t),
      )
    )
      throw new Error(`Enter valid adhan and iqamah times for ${key}.`)
    result[key] = { adhaan: entry.adhaan, iqama: entry.iqama }
  }
  return result
}
export function activeNotices(notices, surface, now = Date.now()) {
  return notices.filter(
    (n) =>
      n.surfaces.includes(surface) &&
      Date.parse(n.startsAt) <= now &&
      Date.parse(n.expiresAt) > now,
  )
}
export function checkVersion(actual, expected) {
  if ((actual || 0) !== expected)
    throw new Error(
      'This record changed. Reload before publishing your changes.',
    )
}
export function can(role, capability) {
  return (
    ['owner', 'admin'].includes(role) ||
    (capability === 'finance' && role === 'finance') ||
    (capability === 'content' && role === 'editor')
  )
}
