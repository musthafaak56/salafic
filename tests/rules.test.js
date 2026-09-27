import test, { before, after } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
let env
before(async () => {
  env = await initializeTestEnvironment({
    projectId: `demo-rules-${Date.now()}`,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    for (const id of ['a', 'b']) {
      await setDoc(doc(db, 'masjids', id), {
        status: 'published',
        displayName: id,
      })
      await setDoc(doc(db, 'masjids', id, 'members', id), {
        uid: id,
        role: 'owner',
      })
      await setDoc(doc(db, 'masjids', id, 'funds', 'private'), {
        note: 'private',
        amountMinor: 100,
      })
      await setDoc(doc(db, 'masjids', id, 'publicFinance', 'current'), {
        collectedMinor: 100,
      })
      await setDoc(doc(db, 'masjids', id, 'eventDrafts', 'private'), {
        payload: { title: 'Draft' },
      })
    }
    await setDoc(doc(db, 'masjids', 'draft'), { status: 'draft' })
    await setDoc(doc(db, 'platformRoles', 'super'), { role: 'superadmin' })
    await setDoc(doc(db, 'centerApplications', 'request'), {
      submitterUid: 'a',
      status: 'pending',
    })
  })
})
after(async () => {
  await env?.cleanup()
})
test('anonymous visitors see published centers and sanitized finance only', async () => {
  const db = env.unauthenticatedContext().firestore()
  await assertSucceeds(
    getDocs(
      query(collection(db, 'masjids'), where('status', '==', 'published')),
    ),
  )
  await assertSucceeds(
    getDoc(doc(db, 'masjids', 'a', 'publicFinance', 'current')),
  )
  await assertFails(getDocs(collection(db, 'masjids')))
  await assertFails(getDoc(doc(db, 'masjids', 'draft')))
  await assertFails(getDoc(doc(db, 'masjids', 'a', 'funds', 'private')))
  await assertFails(getDoc(doc(db, 'centerApplications', 'request')))
  await assertFails(getDoc(doc(db, 'masjids', 'a', 'eventDrafts', 'private')))
})
test('center staff cannot read other centers or write any trusted roles', async () => {
  const db = env
    .authenticatedContext('a', { email: 'a@example.com', email_verified: true })
    .firestore()
  await assertSucceeds(getDoc(doc(db, 'masjids', 'a', 'funds', 'private')))
  await assertFails(getDoc(doc(db, 'masjids', 'b', 'funds', 'private')))
  await assertFails(getDoc(doc(db, 'masjids', 'b', 'eventDrafts', 'private')))
  await assertFails(
    setDoc(doc(db, 'masjids', 'b', 'members', 'a'), { role: 'owner' }),
  )
  await assertFails(
    setDoc(doc(db, 'platformRoles', 'a'), { role: 'superadmin' }),
  )
  await assertFails(
    updateDoc(doc(db, 'centerApplications', 'request'), { status: 'approved' }),
  )
})
test('profile create/update reject escalation, extra fields, oversized data and forged identity', async () => {
  const db = env
      .authenticatedContext('profile', { email: 'profile@example.com' })
      .firestore(),
    ref = doc(db, 'users', 'profile')
  const valid = {
    uid: 'profile',
    name: 'Person',
    email: 'profile@example.com',
    createdAt: serverTimestamp(),
  }
  await assertFails(setDoc(ref, { ...valid, role: 'superadmin' }))
  await assertFails(setDoc(ref, { ...valid, uid: 'another' }))
  await assertSucceeds(setDoc(ref, valid))
  await assertFails(updateDoc(ref, { name: 'x'.repeat(121) }))
  await assertFails(updateDoc(ref, { role: 'admin' }))
  await assertFails(updateDoc(ref, { createdAt: new Date(0) }))
  await assertFails(
    getDoc(
      doc(env.authenticatedContext('other').firestore(), 'users', 'profile'),
    ),
  )
})
test('even super admin uses backend for mutations', async () => {
  const db = env.authenticatedContext('super').firestore()
  await assertSucceeds(getDoc(doc(db, 'centerApplications', 'request')))
  await assertFails(
    setDoc(doc(db, 'masjids', 'a', 'funds', 'new'), { amountMinor: -100 }),
  )
  await assertFails(
    setDoc(doc(db, 'mailOutbox', 'message'), { to: 'attacker@example.com' }),
  )
})
