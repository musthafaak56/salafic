export const EDUCATION_COLLECTIONS = { classes: 'educationClasses', teachers: 'educationTeachers', students: 'educationStudents' }
export const MAX_CLASS_ASSIGNMENTS = 6

export function normalizePhone(value = '') {
  const phone = String(value).trim().replace(/[\s()+.-]/g, '')
  if (phone && !/^[0-9]{7,15}$/.test(phone)) throw new Error('Enter a phone number with country code, using 7–15 digits.')
  return phone
}

export function minutesValue(value, min = 1) {
  if (!/^\d+$/.test(String(value)) || Number(value) < min || Number(value) > 240) throw new Error(`Enter whole minutes between ${min} and 240.`)
  return Number(value)
}

export function educationFields(entity, input) {
  if (!Object.hasOwn(EDUCATION_COLLECTIONS, entity)) throw new Error('Choose classes, teachers or students.')
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 120) throw new Error('Enter a name with 1–120 characters.')
  if (entity !== 'teachers' && !['madrasa', 'center'].includes(input.kind)) throw new Error('Choose Madrasa or Center.')
  if (entity === 'classes') {
    const schedule = typeof input.schedule === 'string' ? input.schedule.trim() : ''
    if (schedule.length > 300) throw new Error('Keep the schedule within 300 characters.')
    const fields = { name, kind: input.kind, schedule }
    if (input.kind === 'center' && input.timing) {
      const t = input.timing
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.start) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.end) || t.end <= t.start)
        throw new Error('Set a class end time later than its start time on the same day.')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date) || new Date(`${t.date}T12:00:00Z`).toISOString().slice(0, 10) !== t.date) throw new Error('Choose the next class date.')
      fields.timing = { start: t.start, end: t.end, date: t.date, minutes: minutesValue(t.minutes), gap: minutesValue(t.gap, 0) }
    }
    return fields
  }
  const classIds = input.classIds
  if (!Array.isArray(classIds) || classIds.length > MAX_CLASS_ASSIGNMENTS || new Set(classIds).size !== classIds.length || classIds.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(id)))
    throw new Error(`Select up to ${MAX_CLASS_ASSIGNMENTS} different classes.`)
  if (entity === 'students' && (input.kind === 'madrasa' ? classIds.length !== 1 : classIds.length < 1))
    throw new Error(input.kind === 'madrasa' ? 'Select one madrasa class for this student.' : 'Select at least one center class for this student.')
  const fields = { name, ...(entity === 'students' ? { kind: input.kind } : {}), classIds: [...classIds] }
  if (input.phone !== undefined) fields.phone = normalizePhone(input.phone)
  if (entity === 'students' && input.classTimings) {
    fields.classTimings = Object.fromEntries(classIds.filter(id => input.classTimings[id]).map(id => {
      const slot = input.classTimings[id]
      if (!Number.isFinite(slot.position) || Math.abs(slot.position) > 1e15) throw new Error('Student order is invalid. Reload the roster.')
      return [id, { position: slot.position, minutes: minutesValue(slot.minutes, 0) }]
    }))
  }
  return fields
}

export function checkEducationClasses(entity, fields, classes) {
  for (const id of fields.classIds || []) {
    const item = classes.find(c => c.id === id)
    if (!item) throw new Error('A selected class no longer exists. Reload and try again.')
    if (entity === 'students' && item.kind !== fields.kind)
      throw new Error('Madrasa students need a madrasa class; center students can only join center classes.')
  }
}

export function classRoster(item, students) {
  return students.filter(s => s.classIds.includes(item.id)).sort((a, b) =>
    (a.classTimings?.[item.id]?.position ?? 0) - (b.classTimings?.[item.id]?.position ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

export const clockMinutes = time => Number(time.split(':')[0]) * 60 + Number(time.split(':')[1])
export const minutesClock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function studentSlots(item, students) {
  if (!item.timing) return []
  let cursor = clockMinutes(item.timing.start)
  return classRoster(item, students).map(student => {
    const minutes = student.classTimings?.[item.id]?.minutes || item.timing.minutes
    const start = cursor
    cursor += minutes + item.timing.gap
    return { id: student.id, name: student.name, start: minutesClock(start), end: minutesClock(start + minutes), minutes, overflow: start + minutes > clockMinutes(item.timing.end) }
  })
}
