import { doc, runTransaction, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { normalizePhone, studentSlots } from './education.js'
import { zonedInstant } from '../../functions/time.js'

const encode = bytes => {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(binary)
}
const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0))
async function passwordKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
export async function encryptSchedule(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await passwordKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)))
  return { salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) }
}
export async function decryptSchedule(data, password) {
  const key = await passwordKey(password, decode(data.salt))
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(data.iv) }, key, decode(data.ciphertext))
  return JSON.parse(new TextDecoder().decode(plaintext))
}

export async function publishHifdh(database, center, item, students, password) {
  if (item.kind !== 'center' || !item.timing) throw new Error('Save the center class date and times first.')
  if (!password || password.length > 100) throw new Error('Enter a page password with 1–100 characters.')
  const rows = studentSlots(item, students)
  if (!rows.length) throw new Error('Add students to this class before publishing.')
  if (rows.some(s => s.overflow)) throw new Error('Student slots exceed the class end time. Adjust the times before publishing.')
  const sessionAt = Timestamp.fromDate(new Date(zonedInstant(item.timing.date, item.timing.start, center.timezone)))
  if (sessionAt.toMillis() <= Date.now()) throw new Error('Choose a future date and start time for the next class.')
  const key = crypto.randomUUID()
  // Explicit projection: phone numbers and private student details never enter the encrypted public payload.
  const payload = { name: item.name, date: item.timing.date, start: item.timing.start, end: item.timing.end, timezone: center.timezone, key, students: rows.map(({ id, name, start, end }) => ({ id, name, start, end })) }
  const encrypted = await encryptSchedule(payload, password)
  if (encrypted.ciphertext.length > 250000) throw new Error('This roster is too large to publish as one schedule.')
  await runTransaction(database, async tx => {
    const classRef = doc(database, 'masjids', center.id, 'educationClasses', item.id)
    const current = await tx.get(classRef)
    if (current.data()?.version !== item.version) throw new Error('The class changed. Reload before publishing.')
    tx.set(doc(database, 'masjids', center.id, 'educationPublications', item.id), { key, date: item.timing.date, sessionAt, publishedAt: serverTimestamp() })
    tx.set(doc(database, 'masjids', center.id, 'hifdhSchedules', item.id), { ...encrypted, sessionAt, updatedAt: serverTimestamp() })
  })
}

export async function unpublishHifdh(database, centerId, classId) {
  await runTransaction(database, async tx => {
    tx.delete(doc(database, 'masjids', centerId, 'hifdhSchedules', classId))
    tx.delete(doc(database, 'masjids', centerId, 'educationPublications', classId))
  })
}

export async function confirmAttendance(database, centerId, classId, schedule, studentId, phone) {
  const normalized = normalizePhone(phone)
  if (!normalized) throw new Error('Enter the phone number registered with the center.')
  await setDoc(doc(database, 'masjids', centerId, 'educationAttendance', `${classId}_${studentId}_${schedule.date}`), {
    classId, studentId, date: schedule.date, phone: normalized, key: schedule.key, attending: true, updatedAt: serverTimestamp(),
  })
}
