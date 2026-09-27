// Exercises real local HTTP handlers; never accepts a production project.
import assert from 'node:assert/strict'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
if (
  process.env.GCLOUD_PROJECT !== 'demo-salafic' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw new Error('Use only the documented local demo emulators.')
initializeApp({ projectId: 'demo-salafic' })
const auth = getAuth(),
  db = getFirestore(),
  uid = 'local-smoke-owner'
try {
  await auth.createUser({
    uid,
    email: 'local-owner@example.test',
    password: 'local-demo-password-123',
    emailVerified: true,
  })
} catch (error) {
  if (error.code !== 'auth/uid-already-exists') throw error
}
await db
  .doc(`masjids/demo-dubai/members/${uid}`)
  .set({ uid, role: 'owner', email: 'local-owner@example.test' })
await db
  .doc(`userCenters/${uid}/centers/demo-dubai`)
  .set({ centerId: 'demo-dubai', role: 'owner' })
const login = await fetch(
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'local-owner@example.test',
      password: 'local-demo-password-123',
      returnSecureToken: true,
    }),
  },
)
assert.equal(login.ok, true)
const { idToken } = await login.json()
const call = async (action, data = {}) => {
  const response = await fetch(
    'http://127.0.0.1:5001/demo-salafic/us-central1/platformAction',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ data: { action, ...data } }),
      signal: AbortSignal.timeout(15000),
    },
  )
  const body = await response.json()
  assert.equal(response.ok, true, JSON.stringify(body))
  return body.result
}
const session = await call('session')
assert.equal(
  session.centers.some((c) => c.id === 'demo-dubai' && c.role === 'owner'),
  true,
)
await call('auditCenterAccess', { centerId: 'demo-dubai' })
const center = (await db.doc('masjids/demo-dubai').get()).data()
await call('saveDraft', {
  centerId: 'demo-dubai',
  kind: 'prayer',
  id: 'prayer',
  version: center.prayerVersion || 0,
  payload: { ...center.prayer, offsets: { ...center.prayer.offsets, fajr: 5 } },
})
const draft = (
  await db.doc('masjids/demo-dubai/contentDrafts/prayer-prayer').get()
).data()
await call('publish', {
  centerId: 'demo-dubai',
  kind: 'prayer',
  id: 'prayer',
  token: draft.token,
})
assert.equal(
  (await db.doc('masjids/demo-dubai').get()).data().prayer.offsets.fajr,
  5,
)
const metadata = await fetch(
  'http://127.0.0.1:5001/demo-salafic/us-central1/centerPage/c/dubai-community',
  { signal: AbortSignal.timeout(15000) },
)
assert.equal(metadata.ok, true)
assert.match(await metadata.text(), /Dubai Community Center — Salafic/)
console.log(
  'Local HTTP checks passed: verified sign-in, membership, audited administration, exact-draft prayer publishing and center metadata.',
)
