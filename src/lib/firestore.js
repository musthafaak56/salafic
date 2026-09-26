import { collection, getDocs, getDoc, query, orderBy, limit, doc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'
import { act } from './platform'

function masjidRef(id) {
  if (!id) throw new Error('A center must be selected before loading records.')
  return doc(db, 'masjids', id)
}
async function list(id, name, count = 100, sort = 'createdAt') {
  const snap = await getDocs(query(collection(masjidRef(id), name), orderBy(sort, 'desc'), limit(count)))
  return snap.docs.map(d => ({ ...d.data(), id: d.id }))
}
export async function getLatestPrayerTimes(id) { return (await list(id, 'prayerTimes', 1, 'date'))[0] || null }
export const getFunds = (id, count = 25) => list(id, 'funds', count, 'date')
export const getAllFunds = id => list(id, 'funds', 1000, 'date')
export const getExpenses = (id, count = 25) => list(id, 'expenses', count, 'date')
export const getAllExpenses = id => list(id, 'expenses', 1000, 'date')
export const getEvents = (id, count = 100) => list(id, 'events', count, 'eventAt')
export const getForms = id => list(id, 'forms')
export async function getForm(id, formId) {
  const snap = await getDoc(doc(masjidRef(id), 'forms', formId))
  return snap.exists() ? { ...snap.data(), id: snap.id } : null
}
export const addEvent = async (centerId, payload) => (await act('contentWrite', {centerId,collection:'events',payload})).id
export const updateEvent = (centerId, id, payload) => act('contentWrite', {centerId,collection:'events',id,payload})
export const deleteEvent = (centerId, id) => act('contentWrite', {centerId,collection:'events',id,remove:true})
export const addForm = async (centerId, payload) => (await act('contentWrite', {centerId,collection:'forms',payload})).id
export const updateForm = (centerId, id, payload) => act('contentWrite', {centerId,collection:'forms',id,payload})
export const deleteForm = (centerId, id) => act('contentWrite', {centerId,collection:'forms',id,remove:true})
export const getSubmissions = async (id, formId) => (await list(id, 'formSubmissions', 1000)).filter(s => s.formId === formId)
export const addSubmission = async (centerId, data) => (await httpsCallable(functions, 'submitPublicForm')({centerId,...data})).data
// Compatibility exports for the retired single-center screens; writes still require a center.
export const addFund = (centerId,data) => act('ledger',{centerId,kind:'funds',id:crypto.randomUUID(),...data,amount:String(data.amount)})
export const addExpense = (centerId,data) => act('ledger',{centerId,kind:'expenses',id:crypto.randomUUID(),...data,amount:String(data.amount)})
export const addPrayerTimes = () => { throw new Error('Use the center prayer settings page to publish a schedule.') }
