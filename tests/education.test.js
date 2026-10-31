import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { educationFields, checkEducationClasses, studentSlots, normalizePhone } from '../src/lib/education.js'
import { publishHifdh, decryptSchedule, confirmAttendance, unpublishHifdh } from '../src/lib/hifdh.js'
import { createSparkActions } from '../src/lib/sparkActions.js'

let env
const dbs = {}, actions = {}
before(async () => {
  env = await initializeTestEnvironment({ projectId: `demo-education-${Date.now()}`, firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } })
  for (const uid of ['super', 'owner', 'admin', 'editor', 'finance', 'outsider', 'unverified']) {
    dbs[uid] = env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: uid !== 'unverified' }).firestore()
    actions[uid] = createSparkActions(dbs[uid], () => ({ uid, email: `${uid}@example.com`, emailVerified: uid !== 'unverified' }))
  }
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'platformRoles', 'super'), { role: 'superadmin' })
    for (const center of ['a', 'b']) await setDoc(doc(db, 'masjids', center), { status: 'published' })
    for (const role of ['owner', 'admin', 'editor', 'finance', 'unverified']) await setDoc(doc(db, 'masjids', 'a', 'members', role), { role: role === 'unverified' ? 'admin' : role })
  })
})
after(async () => env?.cleanup())

test('class times include zero gaps, per-student duration and explicit order', () => {
  const item = { id: 'c', timing: { start: '17:00', end: '18:00', minutes: 10, gap: 0 } }
  const students = [{ id: 'a', name: 'A', classIds: ['c'], classTimings: { c: { position: 2, minutes: 15 } } }, { id: 'b', name: 'B', classIds: ['c'], classTimings: { c: { position: 1, minutes: 0 } } }]
  assert.deepEqual(studentSlots(item, students).map(s => [s.id, s.start, s.end]), [['b', '17:00', '17:10'], ['a', '17:10', '17:25']])
  assert.equal(studentSlots({ ...item, timing: { ...item.timing, gap: 5 } }, students)[1].start, '17:15')
  assert.equal(studentSlots({ ...item, timing: { ...item.timing, end: '17:20' } }, students)[1].overflow, true)
  assert.equal(normalizePhone('+971 (50) 123-4567'), '971501234567')
  assert.throws(() => normalizePhone('not a phone'))
  assert.throws(() => educationFields('classes', { name: 'Class', kind: 'center', timing: { date: '2026-10-18', start: '18:00', end: '17:00', minutes: 10, gap: 0 } }))
})

test('Hifdh encrypted publishing and private attendance enforce phone, session, enrollment and roles', async () => {
  const save = (entity, fields, extra = {}) => actions.admin('saveEducation', { centerId: 'a', entity, fields, ...extra })
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const cls = await save('classes', { name: 'Hifdh class', kind: 'center', timing: { date, start: '17:00', end: '18:00', minutes: 10, gap: 0 } })
  const student = await save('students', { name: 'Private student', kind: 'center', phone: '+971 50 123 4567', classIds: [cls.id], classTimings: { [cls.id]: { position: 1, minutes: 12 } } })
  await save('teachers', { name: 'Teacher with phone', phone: '+971 50 987 6543', classIds: [cls.id] })
  const item = { ...(await getDoc(doc(dbs.admin, 'masjids', 'a', 'educationClasses', cls.id))).data(), id: cls.id }
  const person = { ...(await getDoc(doc(dbs.admin, 'masjids', 'a', 'educationStudents', student.id))).data(), id: student.id }
  await publishHifdh(dbs.admin, { id: 'a', timezone: 'Asia/Dubai' }, item, [person], 'october')
  const publicDb = env.unauthenticatedContext().firestore()
  const publicRef = doc(publicDb, 'masjids', 'a', 'hifdhSchedules', cls.id)
  const encrypted = (await assertSucceeds(getDoc(publicRef))).data()
  await assertSucceeds(getDocs(collection(publicDb, 'masjids', 'a', 'hifdhSchedules')))
  assert.equal(JSON.stringify(encrypted).includes(person.name), false)
  assert.equal(JSON.stringify(encrypted).includes(person.phone), false)
  await assert.rejects(decryptSchedule(encrypted, 'wrong-password'))
  const opened = await decryptSchedule(encrypted, 'october')
  assert.equal(opened.students[0].name, person.name)
  assert.equal(opened.students[0].end, '17:12')
  assert.equal(JSON.stringify(opened).includes(person.phone), false)
  await assertFails(getDoc(doc(publicDb, 'masjids', 'a', 'educationPublications', cls.id)))
  await assertFails(getDoc(doc(publicDb, 'masjids', 'a', 'educationStudents', student.id)))
  await assertFails(confirmAttendance(publicDb, 'a', cls.id, opened, student.id, '971509999999'))
  await assertFails(confirmAttendance(publicDb, 'a', cls.id, { ...opened, key: 'forged' }, student.id, person.phone))
  await assertFails(confirmAttendance(publicDb, 'a', cls.id, { ...opened, date: '2000-01-01' }, student.id, person.phone))
  await assertSucceeds(confirmAttendance(publicDb, 'a', cls.id, opened, student.id, '+971 50 123 4567'))
  await assertSucceeds(confirmAttendance(publicDb, 'a', cls.id, opened, student.id, person.phone))
  const attendanceId = `${cls.id}_${student.id}_${date}`
  await assertFails(getDoc(doc(publicDb, 'masjids', 'a', 'educationAttendance', attendanceId)))
  await assertFails(getDocs(collection(publicDb, 'masjids', 'a', 'educationAttendance')))
  assert.equal((await getDoc(doc(dbs.admin, 'masjids', 'a', 'educationAttendance', attendanceId))).data().attending, true)
  await assertFails(setDoc(publicRef, encrypted))
  await assertFails(setDoc(doc(dbs.editor, 'masjids', 'a', 'educationPublications', cls.id), { key: 'forged' }))
  await assertFails(updateDoc(doc(dbs.admin, 'masjids', 'a', 'educationStudents', student.id), { phone: 'x', version: 2, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(doc(dbs.admin, 'masjids', 'a', 'educationStudents', student.id), { classTimings: { other: { position: 1, minutes: 10 } }, version: 2, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(doc(dbs.admin, 'masjids', 'a', 'educationStudents', student.id), { classTimings: { [cls.id]: { position: 'wrong', minutes: -1 } }, version: 2, updatedAt: serverTimestamp() }))
  await publishHifdh(dbs.admin, { id: 'a', timezone: 'Asia/Dubai' }, item, [person], 'october')
  await assertFails(confirmAttendance(publicDb, 'a', cls.id, opened, student.id, person.phone))
  await unpublishHifdh(dbs.admin, 'a', cls.id)
  assert.equal((await getDoc(publicRef)).exists(), false)
  await assertFails(confirmAttendance(publicDb, 'a', cls.id, opened, student.id, person.phone))
})

test('education field validation enforces program and enrollment requirements', () => {
  assert.throws(() => educationFields('students', { name: 'Student', kind: 'madrasa', classIds: [] }))
  assert.throws(() => educationFields('students', { name: 'Student', kind: 'madrasa', classIds: ['a', 'b'] }))
  assert.throws(() => educationFields('students', { name: 'Student', kind: 'center', classIds: ['a', 'a'] }))
  assert.throws(() => educationFields('teachers', { name: 'Teacher', classIds: ['../other'] }))
  assert.throws(() => educationFields('classes', { name: ' ', kind: 'madrasa' }))
  assert.throws(() => checkEducationClasses('students', { kind: 'center', classIds: ['a'] }, [{ id: 'a', kind: 'madrasa' }]))
  assert.deepEqual(educationFields('teachers', { name: ' Teacher ', classIds: [] }), { name: 'Teacher', classIds: [] })
})

test('education lifecycle: multiple classes, teacher assignments, student programs and revisions', async () => {
  const save = (entity, fields, extra = {}) => actions.admin('saveEducation', { centerId: 'a', entity, fields, ...extra })
  const m1 = await save('classes', { name: 'Madrasa 1', kind: 'madrasa', schedule: 'Saturday' })
  const m2 = await save('classes', { name: 'Madrasa 2', kind: 'madrasa' })
  const centers = []
  for (let i = 0; i < 6; i++) centers.push((await save('classes', { name: `Center ${i}`, kind: 'center' })).id)
  const teacher = await save('teachers', { name: 'Teacher', classIds: [m1.id, m2.id, centers[0]] })
  await save('teachers', { name: 'Unassigned teacher', classIds: [] })
  const student = await save('students', { name: 'Madrasa student', kind: 'madrasa', classIds: [m1.id] })
  const multi = await save('students', { name: 'Center student', kind: 'center', classIds: centers })
  await save('students', { name: 'Center student', kind: 'center', phone: '971501234567', classIds: centers, classTimings: Object.fromEntries(centers.map(id => [id, { position: 1, minutes: 10 }])) }, { id: multi.id, version: 1 })
  await save('students', { name: 'Center student', kind: 'center', classIds: centers.slice(0, 5), classTimings: Object.fromEntries(centers.slice(0, 5).map(id => [id, { position: 1, minutes: 10 }])) }, { id: multi.id, version: 2 })
  await save('students', { name: 'Center student', kind: 'center', classIds: centers, classTimings: Object.fromEntries(centers.map(id => [id, { position: 1, minutes: 10 }])) }, { id: multi.id, version: 3 })
  await assertSucceeds(getDocs(collection(dbs.super, 'masjids', 'a', 'educationStudents')))
  await assertSucceeds(getDocs(collection(dbs.owner, 'masjids', 'a', 'educationTeachers')))
  await save('students', { name: 'Madrasa student updated', kind: 'madrasa', classIds: [m2.id] }, { id: student.id, version: 1 })
  assert.equal((await getDoc(doc(dbs.admin, 'masjids', 'a', 'educationStudents', student.id))).data().version, 2)
  await assert.rejects(save('students', { name: 'Stale edit', kind: 'madrasa', classIds: [m1.id] }, { id: student.id, version: 1 }))
  await assert.rejects(save('classes', { name: 'Wrong type', kind: 'center' }, { id: m1.id, version: 1 }))
  await assert.rejects(save('students', { name: 'Wrong program', kind: 'center', classIds: [centers[0]] }, { id: student.id, version: 2 }))
  await save('teachers', { name: 'Teacher updated', classIds: centers }, { id: teacher.id, version: 1 })
  await actions.super('saveEducation', { centerId: 'b', entity: 'classes', fields: { name: 'Other center class', kind: 'center' } })
})

test('education rules reject private-data leaks, cross-center access and forged relationships', async () => {
  const root = (...p) => doc(dbs.admin, 'masjids', 'a', ...p)
  const cls = await actions.admin('saveEducation', { centerId: 'a', entity: 'classes', fields: { name: 'Protected class', kind: 'madrasa' } })
  const fields = { name: 'Student', kind: 'madrasa', classIds: [cls.id], version: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
  const studentRef = root('educationStudents', 'protected')
  await assertSucceeds(setDoc(studentRef, fields))
  const anonymous = env.unauthenticatedContext().firestore()
  for (const db of [anonymous, dbs.editor, dbs.finance, dbs.outsider, dbs.unverified]) {
    for (const name of ['educationClasses', 'educationTeachers', 'educationStudents']) await assertFails(getDocs(collection(db, 'masjids', 'a', name)))
    await assertFails(setDoc(doc(db, 'masjids', 'a', 'educationStudents', 'forged'), fields))
  }
  await assertFails(getDocs(collection(dbs.admin, 'masjids', 'b', 'educationStudents')))
  await assertFails(setDoc(root('educationStudents', 'two-madrasa'), { ...fields, classIds: [cls.id, cls.id] }))
  await assertFails(setDoc(root('educationStudents', 'wrong-kind'), { ...fields, kind: 'center' }))
  await assertFails(setDoc(root('educationStudents', 'missing-class'), { ...fields, classIds: ['missing'] }))
  await assertFails(setDoc(root('educationStudents', 'invalid-id'), { ...fields, classIds: [123] }))
  await assertFails(setDoc(root('educationStudents', 'empty'), { ...fields, classIds: [] }))
  await assertFails(setDoc(root('educationStudents', 'oversize'), { ...fields, name: 'x'.repeat(121) }))
  await assertFails(setDoc(root('educationStudents', 'extra'), { ...fields, role: 'admin' }))
  await assertFails(setDoc(doc(dbs.super, 'masjids', 'missing', 'educationStudents', 'orphan'), fields))
  await assertFails(updateDoc(studentRef, { name: 5, version: 2, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(studentRef, { name: 'x'.repeat(121), version: 2, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(studentRef, { role: 'admin', version: 2, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(studentRef, { kind: 'center', version: 2, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(studentRef, { createdAt: serverTimestamp(), version: 2, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(studentRef, { classIds: [], version: 2, updatedAt: serverTimestamp() }))
  await assertFails(deleteDoc(root('educationClasses', cls.id)))
  const otherClass = await actions.super('saveEducation', { centerId: 'b', entity: 'classes', fields: { name: 'Other', kind: 'madrasa' } })
  await assertFails(setDoc(root('educationStudents', 'cross-center'), { ...fields, classIds: [otherClass.id] }))
})
