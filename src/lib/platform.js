import { httpsCallable } from 'firebase/functions'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore'
import { db, functions } from './firebase'
export const act = async (action, data = {}) =>
  (await httpsCallable(functions, 'platformAction')({ action, ...data })).data
export const centerDocument = (id, ...path) => {
  if (!id) throw new Error('Choose a center first.')
  return doc(db, 'masjids', id, ...path)
}
export async function record(id, ...path) {
  const snap = await getDoc(centerDocument(id, ...path))
  return snap.exists() ? { ...snap.data(), id: snap.id } : null
}
export async function records(id, name, count = 50) {
  const snap = await getDocs(
    query(collection(centerDocument(id), name), limit(count)),
  )
  return snap.docs.map((s) => ({ ...s.data(), id: s.id }))
}
export async function directory({
  name = '',
  country = '',
  city = '',
  cursor = null,
} = {}) {
  const constraints = [where('status', '==', 'published')]
  if (country)
    constraints.push(where('countryCode', '==', country.toUpperCase()))
  if (city) constraints.push(where('city', '==', city))
  const prefix = name.trim().toLowerCase()
  if (prefix)
    constraints.push(
      where('searchName', '>=', prefix),
      where('searchName', '<=', prefix + '\uf8ff'),
    )
  constraints.push(orderBy('searchName'), limit(20))
  if (cursor) constraints.push(startAfter(cursor))
  const snap = await getDocs(query(collection(db, 'masjids'), ...constraints))
  return {
    items: snap.docs.map((s) => ({ ...s.data(), id: s.id })),
    cursor: snap.docs.at(-1),
    more: snap.size === 20,
  }
}
