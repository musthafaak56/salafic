import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export const DEFAULT_MASJID_ID = 'main'

function masjidRef(masjidId = DEFAULT_MASJID_ID) {
  return doc(db, 'masjids', masjidId)
}

/* ---------- Prayer times ---------- */

export async function getLatestPrayerTimes(masjidId = DEFAULT_MASJID_ID) {
  const q = query(
    collection(masjidRef(masjidId), 'prayerTimes'),
    orderBy('date', 'desc'),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export async function addPrayerTimes(masjidId, data) {
  const docRef = doc(masjidRef(masjidId), 'prayerTimes', data.date)
  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

/* ---------- Funds (donations) ---------- */

export async function getFunds(masjidId = DEFAULT_MASJID_ID, count = 5) {
  const q = query(
    collection(masjidRef(masjidId), 'funds'),
    orderBy('createdAt', 'desc'),
    limit(count)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getAllFunds(masjidId = DEFAULT_MASJID_ID) {
  const snap = await getDocs(collection(masjidRef(masjidId), 'funds'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addFund(masjidId, data) {
  const docRef = await addDoc(collection(masjidRef(masjidId), 'funds'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

/* ---------- Expenses ---------- */

export async function getExpenses(masjidId = DEFAULT_MASJID_ID, count = 5) {
  const q = query(
    collection(masjidRef(masjidId), 'expenses'),
    orderBy('createdAt', 'desc'),
    limit(count)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getAllExpenses(masjidId = DEFAULT_MASJID_ID) {
  const snap = await getDocs(collection(masjidRef(masjidId), 'expenses'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addExpense(masjidId, data) {
  const docRef = await addDoc(collection(masjidRef(masjidId), 'expenses'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}
