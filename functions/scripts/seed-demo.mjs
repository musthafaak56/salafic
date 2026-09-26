import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { DEFAULT_PRAYER } from '../domain.js'
if(!process.env.FIRESTORE_EMULATOR_HOST||process.env.GCLOUD_PROJECT!=='demo-salafic')throw new Error('Demo seeding is emulator-only.')
initializeApp({projectId:'demo-salafic'})
const db=getFirestore()
for(const center of [
  {id:'demo-dubai',displayName:'Dubai Community Center',slug:'dubai-community',city:'Dubai',countryCode:'AE',latitude:25.2048,longitude:55.2708,timezone:'Asia/Dubai',currency:'AED',locale:'en'},
  {id:'demo-london',displayName:'London Community Masjid',slug:'london-community',city:'London',countryCode:'GB',latitude:51.5074,longitude:-0.1278,timezone:'Europe/London',currency:'GBP',locale:'en'},
  {id:'demo-arabic',displayName:'مركز المجتمع',slug:'arabic-community',city:'دبي',countryCode:'AE',latitude:25.2048,longitude:55.2708,timezone:'Asia/Dubai',currency:'AED',locale:'ar'},
]){
  const {id,...fields}=center
  await db.doc(`masjids/${id}`).set({...fields,type:'center',status:'published',address:'Demonstration address · local test data',description:'Local test center for preview and verification.',searchName:fields.displayName.toLowerCase(),version:1,prayer:DEFAULT_PRAYER,prayerVersion:0})
  await db.doc(`centerSlugs/${fields.slug}`).set({centerId:id})
  await db.doc(`masjids/${id}/publicFinance/current`).set({currency:center.currency,collectedMinor:245000,spentMinor:92500,balanceMinor:152500,openingBalanceMinor:0,version:1,updatedAt:new Date().toISOString()})
  await db.doc(`masjids/${id}/announcements/welcome`).set({title:'Community gathering',message:'Join us after the evening prayer this weekend.',startsAt:new Date(Date.now()-60000).toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),surfaces:['home','tv'],priority:'normal'})
}
console.log('Seeded three local demonstration centers. No production data was changed.')
