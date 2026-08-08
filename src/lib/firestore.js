import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
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

/* ---------- Events ---------- */

export async function getEvents(masjidId = DEFAULT_MASJID_ID, count = 50) {
  const q = query(
    collection(masjidRef(masjidId), 'events'),
    orderBy('eventAt', 'asc'),
    limit(count)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addEvent(masjidId, data) {
  const docRef = await addDoc(collection(masjidRef(masjidId), 'events'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateEvent(masjidId, id, data) {
  await updateDoc(doc(masjidRef(masjidId), 'events', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteEvent(masjidId, id) {
  await deleteDoc(doc(masjidRef(masjidId), 'events', id))
}
