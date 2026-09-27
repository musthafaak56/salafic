// Center wall time is resolved identically by the browser and trusted backend.
export function zonedInstant(date, time, timezone) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    throw new Error('Enter a valid date and time.')
  const desired = Date.parse(`${date}T${time}:00Z`)
  if (
    !Number.isFinite(desired) ||
    new Date(desired).toISOString().slice(0, 10) !== date
  )
    throw new Error('Enter a valid date and time.')
  let result = desired
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  for (let i = 0; i < 4; i++) {
    const p = Object.fromEntries(
      fmt.formatToParts(new Date(result)).map((p) => [p.type, p.value]),
    )
    const shown = Date.parse(
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
    )
    const delta = desired - shown
    if (!delta) return new Date(result).toISOString()
    result += delta
  }
  throw new Error(
    'This local time does not exist during the daylight-saving change. Choose another time.',
  )
}

export function eventFields(payload, timezone) {
  const wall = payload.eventLocal || payload.eventAt
  if (typeof wall !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall))
    throw new Error('Enter a valid event date and time.')
  const [date, time] = wall.split('T')
  return {
    eventLocal: wall,
    eventAt: zonedInstant(date, time, timezone),
    timezone,
    repeat: payload.repeat === 'weekly' ? 'weekly' : 'once',
  }
}

export function nextEvent(event, now = Date.now()) {
  if (event.repeat !== 'weekly') return event.eventAt
  const wall = event.eventLocal || event.eventAt.slice(0, 16)
  const [start, time] = wall.split('T')
  const zone = event.timezone
  if (!zone) return event.eventAt
  const first = Date.parse(zonedInstant(start, time, zone))
  const weeks = Math.max(0, Math.floor((now - first) / (7 * 86400000)) - 1)
  for (let i = weeks; i < weeks + 4; i++) {
    const day = new Date(`${start}T12:00:00Z`)
    day.setUTCDate(day.getUTCDate() + i * 7)
    try {
      const instant = zonedInstant(day.toISOString().slice(0, 10), time, zone)
      if (Date.parse(instant) >= now) return instant
    } catch {
      /* Skip a nonexistent wall time in the spring DST transition. */
    }
  }
  return null
}
