import test from 'node:test'
import assert from 'node:assert/strict'
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST
)
  throw new Error('Integration tests require both emulators.')
const { platformAction } = await import('../index.js')
const { getFirestore } = await import('firebase-admin/firestore')
const { getAuth } = await import('firebase-admin/auth')
const db = getFirestore(),
  auth = getAuth()
const call = async (uid, email, action, data = {}) => {
  if (
    !data.token &&
    (action === 'publish' || (action === 'contentWrite' && data.publish))
  ) {
    const draftPath =
      action === 'publish'
        ? `contentDrafts/${data.kind}-${data.id}`
        : `${data.collection === 'events' ? 'eventDrafts' : 'formDrafts'}/${data.id}`
    data = {
      ...data,
      token: (
        await db.doc(`masjids/${data.centerId}/${draftPath}`).get()
      ).data()?.token,
    }
  }
  return platformAction.run({
    auth: { uid, token: { email, email_verified: true } },
    data: { action, ...data },
  })
}
test('request approval, admin assignment, publishing, idempotency, and isolation', async () => {
  await auth.createUser({
    uid: 'super',
    email: 'musthafaak56@gmail.com',
    emailVerified: true,
  })
  await auth.createUser({
    uid: 'intended-admin',
    email: 'admin@example.com',
    emailVerified: true,
  })
  await db.doc('platformRoles/super').set({ role: 'superadmin' })
  const fields = {
    displayName: 'Dubai Test Center',
    type: 'center',
    city: 'Dubai',
    countryCode: 'AE',
    address: 'Test address',
    latitude: 25.2,
    longitude: 55.2,
    mapsUrl: 'https://www.google.com/maps?q=25.2,55.2',
    timezone: 'Asia/Dubai',
    currency: 'AED',
    locale: 'en',
    description: '',
    slug: 'dubai-test',
    designatedAdminEmail: 'admin@example.com',
  }
  const { id } = await call(
    'applicant',
    'applicant@example.com',
    'submitApplication',
    { fields },
  )
  const application = (await db.doc(`centerApplications/${id}`).get()).data()
  assert.equal(application.latitude, 25.2)
  assert.equal(application.timezone, 'Asia/Dubai')
  assert.equal((await db.doc(`mailOutbox/${id}-1`).get()).data().to, 'musthafaak56@gmail.com')
  await assert.rejects(() =>
    call('applicant', 'applicant@example.com', 'reviewApplication', {
      id,
      status: 'approved',
    }),
  )
  await call('super', 'musthafaak56@gmail.com', 'reviewApplication', {
    id,
    status: 'approved',
  })
  await call('super', 'musthafaak56@gmail.com', 'reviewApplication', {
    id,
    status: 'approved',
  })
  assert.equal(
    (await db.doc(`masjids/${id}/members/intended-admin`).get()).data().role,
    'owner',
  )
  assert.equal(
    (await db.doc(`masjids/${id}/members/applicant`).get()).exists,
    false,
  )
  const admin = (action, data = {}) =>
    call('intended-admin', 'admin@example.com', action, {
      centerId: id,
      ...data,
    })
  await admin('settings', { fields, version: 1, published: true })
  await assert.rejects(() =>
    admin('settings', { fields, version: 1, published: true }),
  )
  await admin('ledger', {
    kind: 'funds',
    id: 'entry-one',
    amount: '12.34',
    note: 'private donor note',
    category: 'General',
  })
  await admin('ledger', {
    kind: 'funds',
    id: 'entry-one',
    amount: '12.34',
    note: 'private donor note',
    category: 'General',
  })
  assert.equal(
    (await db.doc(`masjids/${id}/financeState/current`).get()).data()
      .collectedMinor,
    1234,
  )
  await admin('saveDraft', {
    kind: 'finance',
    id: 'finance',
    payload: {},
    version: 0,
  })
  await admin('publish', { kind: 'finance', id: 'finance' })
  const report = (
    await db.doc(`masjids/${id}/publicFinance/current`).get()
  ).data()
  assert.equal(report.collectedMinor, 1234)
  assert.equal(JSON.stringify(report).includes('private donor'), false)
  await assert.rejects(() =>
    call('stranger', 'stranger@example.com', 'ledger', {
      centerId: id,
      kind: 'funds',
      id: 'unauthorized',
      amount: '20',
    }),
  )
  const prayer = { method: 'Dubai', offsets: { fajr: 5 }, gaps: { fajr: 15 } }
  await admin('saveDraft', {
    kind: 'prayer',
    id: 'prayer',
    payload: prayer,
    version: 0,
  })
  await admin('publish', { kind: 'prayer', id: 'prayer' })
  assert.equal(
    (await db.doc(`masjids/${id}`).get()).data().prayer.offsets.fajr,
    5,
  )
  await assert.rejects(() =>
    admin('saveDraft', {
      kind: 'prayer',
      id: 'prayer',
      payload: prayer,
      version: 0,
    }),
  )
  const notice = {
    title: 'Friday gathering',
    message: 'Welcome',
    startsAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    surfaces: ['home', 'tv'],
  }
  await admin('saveDraft', {
    kind: 'announcement',
    id: 'notice',
    payload: notice,
    version: 0,
  })
  assert.equal(
    (await db.doc(`masjids/${id}/announcements/notice`).get()).exists,
    false,
  )
  await admin('publish', { kind: 'announcement', id: 'notice' })
  assert.equal(
    (await db.doc(`masjids/${id}/announcements/notice`).get()).data().title,
    notice.title,
  )
  assert.equal((await db.collection('mailOutbox').get()).size >= 3, true)
})
test('invitation requires the intended verified email and cannot be replayed', async () => {
  await db
    .doc('masjids/invited')
    .set({ status: 'draft', displayName: 'Invited center' })
  await db.doc('centerInvitations/test-invite').set({
    centerId: 'invited',
    email: 'recipient@example.com',
    role: 'admin',
    status: 'pending',
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  })
  await assert.rejects(() =>
    call('wrong', 'wrong@example.com', 'acceptInvitation', {
      id: 'test-invite',
    }),
  )
  await call('right', 'recipient@example.com', 'acceptInvitation', {
    id: 'test-invite',
  })
  assert.equal(
    (await db.doc('masjids/invited/members/right').get()).data().role,
    'admin',
  )
  await assert.rejects(() =>
    call('right', 'recipient@example.com', 'acceptInvitation', {
      id: 'test-invite',
    }),
  )
})

test('community editing respects center roles and version conflicts', async () => {
  await db.doc('masjids/community-test').set({ version: 1, status: 'published' })
  for (const [uid, role] of [['community-owner', 'owner'], ['community-editor', 'editor'], ['community-finance', 'finance']]) {
    await db.doc(`masjids/community-test/members/${uid}`).set({ uid, role })
  }
  const edit = (uid, kind, fields, version) => call(uid, `${uid}@example.test`, 'saveCommunity', { centerId: 'community-test', kind, fields, version })
  await edit('community-editor', 'madrasa', { name: 'Weekend madrasa', classes: [{ name: 'Quran', schedule: 'Saturday 9 am' }] }, 1)
  await assert.rejects(() => edit('community-editor', 'committee', { members: [] }, 2))
  await assert.rejects(() => edit('community-finance', 'madrasa', { name: 'Other' }, 2))
  await assert.rejects(() => edit('outsider', 'madrasa', { name: 'Other' }, 2))
  await edit('community-owner', 'committee', { members: [{ name: 'Example member', role: 'Secretary' }] }, 2)
  await assert.rejects(() => edit('community-owner', 'committee', { members: [] }, 2))
  const saved = (await db.doc('masjids/community-test').get()).data()
  assert.equal(saved.madrasa.classes[0].name, 'Quran')
  assert.equal(saved.committee.members[0].role, 'Secretary')
  assert.equal(saved.version, 3)
  assert.equal((await db.collection('masjids/community-test/members').get()).size, 3)
})
test('manual schedules, private event/form drafts, ledger reversals and ownership transfer', async () => {
  const id = 'extended-test'
  await db.doc(`masjids/${id}`).set({
    displayName: 'Extended center',
    timezone: 'America/New_York',
    currency: 'USD',
    status: 'published',
  })
  await db
    .doc(`masjids/${id}/members/owner-test`)
    .set({ role: 'owner', uid: 'owner-test', email: 'owner@example.com' })
  await db
    .doc(`masjids/${id}/members/editor-test`)
    .set({ role: 'editor', uid: 'editor-test', email: 'editor@example.com' })
  const owner = (action, data = {}) =>
    call('owner-test', 'owner@example.com', action, { centerId: id, ...data })
  await owner('openingBalance', { amount: '10' })
  await owner('ledger', {
    kind: 'funds',
    id: 'first',
    amount: '5',
    note: 'private',
  })
  await assert.rejects(() => owner('openingBalance', { amount: '20' }))
  await owner('reverseEntry', {
    kind: 'funds',
    id: 'first',
    reason: 'Duplicate entry',
  })
  await assert.rejects(() =>
    owner('reverseEntry', { kind: 'funds', id: 'first', reason: 'Repeat' }),
  )
  assert.equal(
    (await db.doc(`masjids/${id}/financeState/current`).get()).data()
      .collectedMinor,
    0,
  )
  await owner('reconcileFinance')
  assert.equal(
    (await db.doc(`masjids/${id}/financeState/current`).get()).data()
      .collectedMinor,
    0,
  )
  const manual = {
    date: '2026-09-27',
    ...Object.fromEntries(
      ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((k) => [
        k,
        { adhaan: '12:00', iqama: '12:15' },
      ]),
    ),
  }
  await owner('saveDraft', {
    kind: 'manual',
    id: manual.date,
    payload: manual,
    version: 0,
  })
  await owner('publish', { kind: 'manual', id: manual.date })
  await owner('saveDraft', {
    kind: 'manual',
    id: manual.date,
    payload: manual,
    version: 1,
  })
  await db.doc(`masjids/${id}`).update({ version: 1 })
  await assert.rejects(() =>
    owner('publish', { kind: 'manual', id: manual.date }),
  )
  assert.equal(
    (await db.doc(`masjids/${id}/prayerTimes/${manual.date}`).get()).data().fajr
      .adhaan,
    '12:00',
  )
  await owner('contentWrite', {
    collection: 'events',
    id: 'weekly',
    draft: true,
    version: 0,
    payload: { title: 'Class', eventAt: '2026-03-01T12:00', repeat: 'weekly' },
  })
  assert.equal(
    (await db.doc(`masjids/${id}/events/weekly`).get()).exists,
    false,
  )
  await owner('contentWrite', {
    collection: 'events',
    id: 'weekly',
    publish: true,
  })
  assert.equal(
    (await db.doc(`masjids/${id}/events/weekly`).get()).data().eventAt,
    '2026-03-01T17:00:00.000Z',
  )
  await assert.rejects(() =>
    owner('contentWrite', {
      collection: 'events',
      id: 'weekly',
      draft: true,
      version: 0,
      payload: { title: 'Old edit', eventAt: '2026-03-01T12:00' },
    }),
  )
  await owner('contentWrite', {
    collection: 'events',
    id: 'weekly',
    draft: true,
    version: 1,
    payload: { title: 'Revised', eventAt: '2026-03-01T12:00' },
  })
  await assert.rejects(() =>
    owner('contentWrite', {
      collection: 'events',
      id: 'weekly',
      publish: true,
      token: 'outdated-preview',
    }),
  )
  await owner('contentWrite', {
    collection: 'forms',
    id: 'registration',
    draft: true,
    version: 0,
    payload: { title: 'Register', fields: [], open: true },
  })
  assert.equal(
    (await db.doc(`masjids/${id}/forms/registration`).get()).exists,
    false,
  )
  await owner('contentWrite', {
    collection: 'forms',
    id: 'registration',
    publish: true,
  })
  assert.equal(
    (await db.doc(`masjids/${id}/forms/registration`).get()).data().open,
    true,
  )
  await owner('transferOwnership', { uid: 'editor-test' })
  assert.equal(
    (await db.doc(`masjids/${id}/members/editor-test`).get()).data().role,
    'owner',
  )
  assert.equal(
    (await db.doc(`masjids/${id}/members/owner-test`).get()).data().role,
    'admin',
  )
  await assert.rejects(() =>
    owner('changeMemberRole', { uid: 'editor-test', role: 'admin' }),
  )
})
