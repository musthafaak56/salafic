// Trusted operator only. Dry run by default; never infer roles from old user profiles.
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { SUPER_ADMIN_EMAIL } from '../domain.js'

const apply=process.argv.includes('--apply')
const project=process.env.GCLOUD_PROJECT
if(!project)throw new Error('Set GCLOUD_PROJECT explicitly before running this script.')
initializeApp({credential:applicationDefault(),projectId:project})
const user=await getAuth().getUserByEmail(SUPER_ADMIN_EMAIL)
if(!user.emailVerified||user.disabled)throw new Error('The designated super-admin account must be verified and enabled.')
console.log(`${apply?'Provisioning':'Dry run: would provision'} super-admin access for the verified designated account in ${project}.`)
if(apply)await getFirestore().doc(`platformRoles/${user.uid}`).set({role:'superadmin',email:SUPER_ADMIN_EMAIL,provisionedAt:new Date().toISOString()})
