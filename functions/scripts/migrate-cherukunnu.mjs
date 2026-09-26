// Run only after a backup. Local output is a reconciliation summary, not raw private data.
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { DEFAULT_PRAYER, minorUnits } from '../domain.js'

const project=process.env.GCLOUD_PROJECT, apply=process.argv.includes('--apply')
if(!project)throw new Error('Set GCLOUD_PROJECT explicitly.')
initializeApp({credential:applicationDefault(),projectId:project})
const db=getFirestore(), ref=db.doc('masjids/main')
const [center,funds,expenses]=await Promise.all([ref.get(),ref.collection('funds').get(),ref.collection('expenses').get()])
const amount=entry=>entry.amountMinor??(Number(entry.amount)===0?0:minorUnits(String(entry.amount),'INR'))
const collected=funds.docs.reduce((s,d)=>s+amount(d.data()),0),spent=expenses.docs.reduce((s,d)=>s+amount(d.data()),0)
console.log({project,mode:apply?'apply':'dry-run',funds:funds.size,expenses:expenses.size,collectedMinor:collected,spentMinor:spent})
if(apply){
  if(!process.argv.includes('--coordinates-confirmed'))throw new Error('Confirm 11.994908, 75.300402 using --coordinates-confirmed; API and old TV coordinates differed.')
  await db.runTransaction(async tx=>{
    const marker=db.doc('migrations/worldwide-main-v1'), done=await tx.get(marker)
    if(done.exists)throw new Error('Migration already completed. Reconcile manually before rerunning.')
    const slugRef=db.doc('centerSlugs/cherukunnu-salafi-center'), existing=await tx.get(slugRef)
    if(existing.exists&&existing.data().centerId!=='main')throw new Error('Slug already assigned to another center.')
    // Replace public root metadata with a deliberate allowlist, preserving all subcollections.
    tx.set(ref,{displayName:'Cherukunnu Salafi Center',type:'center',city:'Cherukunnu',countryCode:'IN',address:'Cherukunnu, Kannur, Kerala',latitude:11.994908,longitude:75.300402,timezone:'Asia/Kolkata',currency:'INR',locale:'en',description:'',slug:'cherukunnu-salafi-center',searchName:'cherukunnu salafi center',status:'published',version:1,prayer:DEFAULT_PRAYER,prayerVersion:0,openingBalanceMinor:0,createdAt:center.data()?.createdAt||new Date().toISOString()})
    tx.set(slugRef,{centerId:'main'})
    tx.set(ref.collection('financeState').doc('current'),{collectedMinor:collected,spentMinor:spent,openingBalanceMinor:0,currency:'INR',version:1,updatedAt:new Date().toISOString()})
    tx.create(marker,{at:new Date().toISOString(),fundCount:funds.size,expenseCount:expenses.size,collectedMinor:collected,spentMinor:spent})
  })
}
