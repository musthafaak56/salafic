import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret, defineString } from 'firebase-functions/params'
import { createHash } from 'node:crypto'
import nodemailer from 'nodemailer'
import {
  SUPER_ADMIN_EMAIL,
  applicationFields,
  centerFields,
  prayerSettings,
  DEFAULT_PRAYER,
  text,
  email,
  validId,
  minorUnits,
  noticeFields,
  manualSchedule,
  checkVersion,
  can,
  ROLES,
} from './domain.js'

initializeApp()
const db = getFirestore()
const auth = getAuth()
const smtpPassword = defineSecret('SMTP_PASSWORD')
const smtpUser = defineSecret('SMTP_USER')
const smtpHost = defineString('SMTP_HOST', { default: '' })
const smtpFrom = defineString('SMTP_FROM', { default: '' })
const siteUrl = defineString('SITE_URL', { default: 'https://salafic.web.app' })
const now = () => new Date().toISOString()
const centerRef = (id) => db.collection('masjids').doc(validId(id))
const identity = (req) => {
  if (!req.auth || !req.auth.token.email_verified)
    throw new HttpsError(
      'unauthenticated',
      'Sign in with a verified email account.',
    )
  return { uid: req.auth.uid, email: email(req.auth.token.email) }
}
async function permissions(tx, uid, centerId, capability = 'content') {
  const role = await tx.get(db.doc(`platformRoles/${uid}`))
  if (role.data()?.role === 'superadmin') return 'superadmin'
  if (!centerId)
    throw new HttpsError('permission-denied', 'Super-admin access is required.')
  const member = await tx.get(
    centerRef(centerId).collection('members').doc(uid),
  )
  if (!can(member.data()?.role, capability))
    throw new HttpsError(
      'permission-denied',
      'You do not have permission for this center.',
    )
  if (capability === 'team' && member.data()?.role !== 'owner')
    throw new HttpsError('permission-denied', 'Owner access is required.')
  return member.data().role
}
function audit(tx, ref, uid, action, extra = {}) {
  tx.create(ref.collection('auditLogs').doc(), {
    uid,
    action,
    at: now(),
    ...extra,
  })
}
function mail(tx, id, to, subject, body) {
  tx.set(db.collection('mailOutbox').doc(id), {
    to,
    subject,
    body,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: now(),
    createdAt: now(),
  })
}
function grant(tx, ref, uid, role, address) {
  tx.set(ref.collection('members').doc(uid), {
    uid,
    role,
    email: address,
    joinedAt: now(),
  })
  tx.set(db.doc(`userCenters/${uid}/centers/${ref.id}`), {
    centerId: ref.id,
    role,
  })
}
function notificationText(message) {
  return `${message}\n\nView your requests: ${siteUrl.value()}/onboarding`
}

export const platformAction = onCall({ maxInstances: 10 }, async (req) => {
  try {
    const user = identity(req)
    const { action, ...data } = req.data || {}
    if (action === 'session') {
      const [platform, memberships, invitations] = await Promise.all([
        db.doc(`platformRoles/${user.uid}`).get(),
        db.collection(`userCenters/${user.uid}/centers`).get(),
        db
          .collection('centerInvitations')
          .where('email', '==', user.email)
          .where('status', '==', 'pending')
          .get(),
      ])
      const centers = await Promise.all(
        memberships.docs.map(async (m) => {
          const c = await centerRef(m.id).get()
          return c.exists
            ? { id: c.id, ...c.data(), role: m.data().role }
            : null
        }),
      )
      return {
        role:
          platform.data()?.role === 'superadmin'
            ? 'superadmin'
            : centers.some(Boolean)
              ? 'admin'
              : 'user',
        centers: centers.filter(Boolean),
        invitations: invitations.docs
          .filter((d) => d.data().expiresAt > now())
          .map((d) => ({ id: d.id, ...d.data() })),
      }
    }
    if (action === 'submitApplication') {
      const fields = applicationFields(data.fields)
      const ref = db
        .collection('centerApplications')
        .doc(data.id ? validId(data.id) : db.collection('_').doc().id)
      await db.runTransaction(async (tx) => {
        const previous = await tx.get(ref)
        const rateRef = db.doc(`requestLimits/${user.uid}`)
        const rate = await tx.get(rateRef)
        if (
          previous.exists &&
          (previous.data().submitterUid !== user.uid ||
            previous.data().status !== 'changes_requested')
        )
          throw new HttpsError(
            'permission-denied',
            'Only a request awaiting corrections can be resubmitted.',
          )
        if (rate.exists && Date.now() - Date.parse(rate.data().at) < 30000)
          throw new Error('Please wait a moment before submitting again.')
        const history = [
          ...(previous.data()?.history || []),
          { status: 'pending', at: now(), actor: user.uid },
        ]
        if (history.length > 50)
          throw new Error('Please contact the super admin about this request.')
        tx.set(ref, {
          ...fields,
          submitterUid: user.uid,
          submitterEmail: user.email,
          status: 'pending',
          createdAt: previous.data()?.createdAt || now(),
          updatedAt: now(),
          history,
          feedback: '',
        })
        tx.set(rateRef, { at: now() })
        mail(
          tx,
          `${ref.id}-${history.length}`,
          SUPER_ADMIN_EMAIL,
          `Center request: ${fields.displayName}`,
          `A center request is ready for review.\n${siteUrl.value()}/platform`,
        )
      })
      return { id: ref.id }
    }
    if (action === 'reviewApplication') {
      const ref = db.collection('centerApplications').doc(validId(data.id))
      if (!['approved', 'rejected', 'changes_requested'].includes(data.status))
        throw new Error('Invalid review status.')
      const feedback = text(
        data.feedback || '',
        2000,
        data.status !== 'approved',
      )
      // Identity is resolved from Firebase Auth, never from editable user profiles.
      const application = await ref.get()
      if (!application.exists) throw new Error('Request not found.')
      let recipient = null
      try {
        recipient = await auth.getUserByEmail(
          application.data().designatedAdminEmail,
        )
      } catch (e) {
        if (e.code !== 'auth/user-not-found') throw e
      }
      await db.runTransaction(async (tx) => {
        await permissions(tx, user.uid)
        const snap = await tx.get(ref),
          old = snap.data()
        if (old.status === 'approved' && data.status === 'approved') return
        if (old.status !== 'pending')
          throw new Error('This request has already been reviewed.')
        const center = centerRef(ref.id),
          slugRef = db.doc(`centerSlugs/${old.slug}`)
        const slugDoc =
          data.status === 'approved' ? await tx.get(slugRef) : null
        if (slugDoc?.exists)
          throw new Error(
            'That center URL is already in use. Request a different URL.',
          )
        const assigned =
          recipient?.emailVerified &&
          !recipient.disabled &&
          recipient.email.toLowerCase() === old.designatedAdminEmail
        tx.update(ref, {
          status: data.status,
          feedback,
          reviewerUid: user.uid,
          updatedAt: now(),
          ...(data.status === 'approved'
            ? {
                centerId: center.id,
                adminStatus: assigned ? 'active' : 'invited',
              }
            : {}),
          history: [
            ...old.history,
            { status: data.status, at: now(), actor: user.uid, feedback },
          ],
        })
        if (data.status === 'approved') {
          tx.create(center, {
            ...centerFields(old),
            slug: old.slug,
            searchName: old.displayName.toLowerCase(),
            status: 'draft',
            version: 1,
            prayer: DEFAULT_PRAYER,
            openingBalanceMinor: 0,
            createdAt: now(),
          })
          tx.create(slugRef, { centerId: center.id })
          if (assigned)
            grant(tx, center, recipient.uid, 'owner', old.designatedAdminEmail)
          else
            tx.create(db.doc(`centerInvitations/${ref.id}`), {
              centerId: center.id,
              centerName: old.displayName,
              email: old.designatedAdminEmail,
              role: 'owner',
              status: 'pending',
              applicationId: ref.id,
              expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            })
          mail(
            tx,
            `${ref.id}-invitation`,
            old.designatedAdminEmail,
            'Your center admin access',
            notificationText(
              `Your request for ${old.displayName} is approved. Sign in with this email to manage the center or accept your invitation within seven days.`,
            ),
          )
          audit(tx, center, user.uid, 'center.approved')
        }
        mail(
          tx,
          `${ref.id}-review-${old.history.length}`,
          old.submitterEmail,
          `Center request: ${data.status.replaceAll('_', ' ')}`,
          notificationText(feedback || 'Your center request is approved.'),
        )
      })
      return { ok: true }
    }
    if (action === 'acceptInvitation') {
      await db.runTransaction(async (tx) => {
        const ref = db.doc(`centerInvitations/${validId(data.id)}`),
          snap = await tx.get(ref),
          invite = snap.data()
        if (
          !invite ||
          invite.email !== user.email ||
          invite.status !== 'pending' ||
          invite.expiresAt <= now()
        )
          throw new Error('This invitation is unavailable or expired.')
        const center = centerRef(invite.centerId),
          exists = await tx.get(center)
        const member = await tx.get(center.collection('members').doc(user.uid))
        if (!exists.exists) throw new Error('Center unavailable.')
        if (!member.exists) grant(tx, center, user.uid, invite.role, user.email)
        tx.update(ref, {
          status: 'accepted',
          acceptedAt: now(),
          acceptedBy: user.uid,
        })
        if (invite.applicationId)
          tx.update(db.doc(`centerApplications/${invite.applicationId}`), {
            adminStatus: 'active',
          })
        audit(tx, center, user.uid, 'invitation.accepted')
      })
      return { ok: true }
    }
    const ref = centerRef(data.centerId)
    if (action === 'contentWrite') {
      if (!['events', 'forms'].includes(data.collection))
        throw new Error('Invalid content collection.')
      const target = ref
        .collection(data.collection)
        .doc(data.id ? validId(data.id) : db.collection('_').doc().id)
      let clean
      if (!data.remove) {
        const p = data.payload || {}
        clean = {
          title: text(p.title, 150),
          description: text(p.description || '', 2000, false),
        }
        if (data.collection === 'events') {
          if (
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(p.eventAt) ||
            !Number.isFinite(Date.parse(p.eventAt))
          )
            throw new Error('Enter a valid event date and time.')
          clean = {
            ...clean,
            titleMl: text(p.titleMl || '', 150, false),
            descriptionMl: text(p.descriptionMl || '', 2000, false),
            eventAt: p.eventAt,
            location: text(p.location || '', 300, false),
            repeat: p.repeat === 'weekly' ? 'weekly' : 'once',
          }
        } else {
          if (!Array.isArray(p.fields) || p.fields.length > 50)
            throw new Error('Forms support up to 50 questions.')
          const ids = new Set()
          const fields = p.fields.map((f) => {
            if (
              ![
                'text',
                'textarea',
                'email',
                'tel',
                'number',
                'date',
                'select',
                'radio',
                'checkbox',
              ].includes(f.type)
            )
              throw new Error('Invalid question type.')
            const id = validId(f.id)
            if (ids.has(id)) throw new Error('Question IDs must be unique.')
            ids.add(id)
            if (!Array.isArray(f.options) || f.options.length > 50)
              throw new Error('Too many options.')
            return {
              id,
              label: text(f.label, 200),
              type: f.type,
              required: f.required === true,
              options: f.options.map((o) => text(o, 200)),
            }
          })
          clean = {
            ...clean,
            event: text(p.event || '', 150, false),
            open: p.open === true,
            fields,
          }
        }
      }
      await db.runTransaction(async (tx) => {
        await permissions(tx, user.uid, ref.id, 'content')
        const old = await tx.get(target)
        if (data.remove) tx.delete(target)
        else
          tx.set(target, {
            ...clean,
            createdAt: old.data()?.createdAt || now(),
            updatedAt: now(),
          })
        audit(
          tx,
          ref,
          user.uid,
          `${data.collection}.${data.remove ? 'removed' : 'saved'}`,
          { recordId: target.id },
        )
      })
      return { id: target.id }
    }
    if (action === 'inviteMember') {
      const address = email(data.email),
        role = data.role
      if (!ROLES.includes(role) || role === 'owner')
        throw new Error(
          'Choose an administrator, finance editor, or content editor.',
        )
      await db.runTransaction(async (tx) => {
        await permissions(tx, user.uid, ref.id, 'team')
        const center = await tx.get(ref)
        const inviteId = createHash('sha256')
          .update(`${ref.id}:${address}`)
          .digest('hex')
        const invite = db.doc(`centerInvitations/${inviteId}`)
        tx.set(invite, {
          centerId: ref.id,
          centerName: center.data().displayName,
          email: address,
          role,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        })
        mail(
          tx,
          `${inviteId}-${Date.now()}`,
          address,
          'Center staff invitation',
          notificationText(
            `You are invited to help manage ${center.data().displayName}. Sign in with this email within seven days to accept.`,
          ),
        )
        audit(tx, ref, user.uid, 'member.invited', { email: address, role })
      })
      return { ok: true }
    }
    if (action === 'removeMember') {
      await db.runTransaction(async (tx) => {
        await permissions(tx, user.uid, ref.id, 'team')
        const memberRef = ref.collection('members').doc(validId(data.uid)),
          member = await tx.get(memberRef)
        if (member.data()?.role === 'owner')
          throw new Error('Owner removal requires an ownership transfer.')
        tx.delete(memberRef)
        tx.delete(db.doc(`userCenters/${data.uid}/centers/${ref.id}`))
        audit(tx, ref, user.uid, 'member.removed', { memberUid: data.uid })
      })
      return { ok: true }
    }
    if (action === 'transferOwnership') {
      const uid = validId(data.uid)
      await db.runTransaction(async (tx) => {
        const actorRole = await permissions(tx, user.uid, ref.id, 'team')
        const recipientRef = ref.collection('members').doc(uid),
          recipient = await tx.get(recipientRef)
        if (!recipient.exists || uid === user.uid)
          throw new Error('Select another existing team member.')
        tx.update(recipientRef, { role: 'owner' })
        tx.set(db.doc(`userCenters/${uid}/centers/${ref.id}`), {
          centerId: ref.id,
          role: 'owner',
        })
        if (actorRole !== 'superadmin') {
          tx.update(ref.collection('members').doc(user.uid), { role: 'admin' })
          tx.set(db.doc(`userCenters/${user.uid}/centers/${ref.id}`), {
            centerId: ref.id,
            role: 'admin',
          })
        }
        audit(tx, ref, user.uid, 'ownership.transferred', { newOwnerUid: uid })
      })
      return { ok: true }
    }
    if (action === 'openingBalance') {
      await db.runTransaction(async (tx) => {
        await permissions(tx, user.uid, ref.id, 'finance')
        const center = await tx.get(ref),
          stateRef = ref.collection('financeState').doc('current'),
          state = await tx.get(stateRef)
        if (state.exists)
          throw new Error(
            'The opening balance is locked after the ledger is started.',
          )
        const raw = String(data.amount),
          negative = raw.startsWith('-'),
          absolute = negative ? raw.slice(1) : raw
        const value =
          Number(absolute) === 0
            ? 0
            : minorUnits(absolute, center.data().currency) * (negative ? -1 : 1)
        tx.set(stateRef, {
          collectedMinor: 0,
          spentMinor: 0,
          openingBalanceMinor: value,
          currency: center.data().currency,
          version: 1,
          updatedAt: now(),
        })
        tx.update(ref, { openingBalanceMinor: value })
        audit(tx, ref, user.uid, 'opening-balance.set')
      })
      return { ok: true }
    }
    if (action === 'reverseEntry') {
      if (!['funds', 'expenses'].includes(data.kind))
        throw new Error('Invalid ledger.')
      const entryRef = ref.collection(data.kind).doc(validId(data.id))
      await db.runTransaction(async (tx) => {
        await permissions(tx, user.uid, ref.id, 'finance')
        const entry = await tx.get(entryRef),
          stateRef = ref.collection('financeState').doc('current'),
          state = await tx.get(stateRef)
        if (!entry.exists || !state.exists) throw new Error('Record not found.')
        if (entry.data().reversedAt || entry.data().reverses)
          throw new Error('This entry has already been corrected.')
        const reason = text(data.reason, 1000),
          currency = state.data().currency
        const amount =
          entry.data().amountMinor ??
          minorUnits(String(entry.data().amount), currency)
        const field = data.kind === 'funds' ? 'collectedMinor' : 'spentMinor'
        tx.create(ref.collection(data.kind).doc(`reversal-${entry.id}`), {
          amountMinor: -amount,
          currency,
          note: reason,
          category: 'Correction',
          date: now(),
          byUid: user.uid,
          reverses: entry.id,
        })
        tx.update(entryRef, { reversedAt: now(), reversedBy: user.uid })
        tx.update(stateRef, {
          [field]: state.data()[field] - amount,
          version: state.data().version + 1,
          updatedAt: now(),
        })
        audit(tx, ref, user.uid, 'ledger.reversed', {
          entryId: entry.id,
          kind: data.kind,
        })
      })
      return { ok: true }
    }
    if (action === 'settings') {
      const fields = centerFields(data.fields)
      await db.runTransaction(async (tx) => {
        await permissions(tx, user.uid, ref.id, 'team')
        const snap = await tx.get(ref),
          old = snap.data()
        checkVersion(old.version, data.version)
        if (fields.currency !== old.currency)
          throw new Error('Currency is fixed when the center is created.')
        tx.update(ref, {
          ...fields,
          searchName: fields.displayName.toLowerCase(),
          status: data.published ? 'published' : 'draft',
          version: old.version + 1,
          updatedAt: now(),
        })
        audit(tx, ref, user.uid, 'settings.updated')
      })
      return { ok: true }
    }
    if (action === 'ledger') {
      if (!['funds', 'expenses'].includes(data.kind))
        throw new Error('Invalid ledger.')
      const entry = ref.collection(data.kind).doc(validId(data.id))
      await db.runTransaction(async (tx) => {
        await permissions(tx, user.uid, ref.id, 'finance')
        const center = await tx.get(ref),
          existing = await tx.get(entry)
        if (existing.exists) return
        const financeRef = ref.collection('financeState').doc('current'),
          summary = await tx.get(financeRef)
        const value = minorUnits(data.amount, center.data().currency)
        const state = summary.data() || {
          collectedMinor: 0,
          spentMinor: 0,
          openingBalanceMinor: center.data().openingBalanceMinor || 0,
          version: 0,
        }
        const next = {
          ...state,
          [data.kind === 'funds' ? 'collectedMinor' : 'spentMinor']:
            state[data.kind === 'funds' ? 'collectedMinor' : 'spentMinor'] +
            value,
          version: state.version + 1,
          currency: center.data().currency,
          updatedAt: now(),
        }
        tx.create(entry, {
          amountMinor: value,
          currency: center.data().currency,
          note: text(data.note || '', 1000, false),
          publicDescription: text(data.publicDescription || '', 300, false),
          category: text(data.category || 'General', 80),
          date: now(),
          byUid: user.uid,
        })
        tx.set(financeRef, next)
        audit(tx, ref, user.uid, 'ledger.created', {
          kind: data.kind,
          entryId: entry.id,
        })
      })
      return { ok: true }
    }
    if (['saveDraft', 'publish', 'restore'].includes(action)) {
      const kind = data.kind
      if (!['prayer', 'manual', 'announcement', 'finance'].includes(kind))
        throw new Error('Invalid content type.')
      const id = ['announcement', 'manual'].includes(kind)
        ? validId(data.id)
        : kind
      const target =
        kind === 'prayer'
          ? ref
          : kind === 'manual'
            ? ref.collection('prayerTimes').doc(id)
            : kind === 'finance'
              ? ref.collection('publicFinance').doc('current')
              : ref.collection('announcements').doc(id)
      const draftRef = ref.collection('contentDrafts').doc(`${kind}-${id}`)
      await db.runTransaction(async (tx) => {
        await permissions(
          tx,
          user.uid,
          ref.id,
          kind === 'finance' ? 'finance' : 'content',
        )
        const live = await tx.get(target),
          draft = await tx.get(draftRef)
        const version =
          kind === 'prayer'
            ? live.data()?.prayerVersion || 0
            : live.data()?.version || 0
        const revision =
          action === 'restore'
            ? await tx.get(
                ref
                  .collection('contentRevisions')
                  .doc(validId(data.revisionId)),
              )
            : null
        const finance =
          kind === 'finance'
            ? await tx.get(ref.collection('financeState').doc('current'))
            : null
        if (
          action === 'restore' &&
          (kind === 'finance' ||
            revision?.data()?.kind !== kind ||
            revision.data().targetId !== id)
        )
          throw new Error('This revision cannot be restored here.')
        let payload =
          action === 'saveDraft'
            ? data.payload
            : action === 'restore'
              ? revision.data().payload
              : draft.data()?.payload
        if (kind === 'prayer') payload = prayerSettings(payload)
        else if (kind === 'manual') {
          payload = manualSchedule(payload)
          if (payload.date !== id)
            throw new Error('The schedule date must match the selected date.')
        } else if (kind === 'announcement') {
          payload = noticeFields(payload)
          if (action !== 'saveDraft' && payload.expiresAt <= now())
            throw new Error(
              'Set a new expiry before republishing this announcement.',
            )
        } else {
          if (!finance?.exists)
            throw new Error(
              'Record a donation or expense before creating a report.',
            )
          const f = finance.data()
          payload = {
            currency: f.currency,
            collectedMinor: f.collectedMinor,
            spentMinor: f.spentMinor,
            openingBalanceMinor: f.openingBalanceMinor,
            balanceMinor:
              f.openingBalanceMinor + f.collectedMinor - f.spentMinor,
            ledgerVersion: f.version,
          }
          if (
            action === 'publish' &&
            draft.data()?.payload?.ledgerVersion !== f.version
          )
            throw new Error(
              'The ledger changed. Preview the updated report first.',
            )
        }
        checkVersion(
          version,
          action === 'publish' ? draft.data()?.baseVersion : data.version,
        )
        if (action === 'saveDraft')
          tx.set(draftRef, {
            kind,
            targetId: id,
            payload,
            baseVersion: version,
            authorUid: user.uid,
            updatedAt: now(),
          })
        else {
          const publication = {
            ...payload,
            version: version + 1,
            updatedAt: now(),
          }
          if (kind === 'prayer')
            tx.update(target, {
              prayer: payload,
              prayerVersion: version + 1,
              updatedAt: now(),
            })
          else tx.set(target, publication)
          tx.create(ref.collection('contentRevisions').doc(), {
            kind,
            targetId: id,
            payload,
            version: version + 1,
            authorUid: user.uid,
            at: now(),
            restoredFrom: data.revisionId || null,
          })
          tx.delete(draftRef)
          audit(tx, ref, user.uid, `${kind}.published`)
        }
      })
      return { ok: true }
    }
    throw new Error('Unknown action.')
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError(
      'failed-precondition',
      error.message || 'Unable to complete this action.',
    )
  }
})

export const submitPublicForm = onCall(
  { enforceAppCheck: true, maxInstances: 10 },
  async (req) => {
    try {
      const { centerId, formId, answers, submissionId } = req.data || {}
      const ref = centerRef(centerId),
        formRef = ref.collection('forms').doc(validId(formId))
      if (
        !answers ||
        typeof answers !== 'object' ||
        Array.isArray(answers) ||
        JSON.stringify(answers).length > 30000
      )
        throw new Error('Invalid or oversized answers.')
      const fingerprint = createHash('sha256')
        .update(`${centerId}:${req.rawRequest.ip}:${req.app.appId}`)
        .digest('hex')
      const rateRef = db.doc(`submissionLimits/${fingerprint}`)
      await db.runTransaction(async (tx) => {
        const center = await tx.get(ref),
          form = await tx.get(formRef),
          rate = await tx.get(rateRef)
        const target = ref
            .collection('formSubmissions')
            .doc(validId(submissionId)),
          existing = await tx.get(target)
        if (existing.exists) return
        if (center.data()?.status !== 'published' || form.data()?.open !== true)
          throw new Error('This form is not accepting responses.')
        if (rate.exists && Date.now() - Date.parse(rate.data().at) < 30000)
          throw new Error('Please wait before submitting another response.')
        const fields = form.data().fields,
          clean = {}
        if (Object.keys(answers).some((k) => !fields.some((f) => f.id === k)))
          throw new Error('Unknown question.')
        for (const f of fields) {
          const a = answers[f.id] ?? (f.type === 'checkbox' ? [] : '')
          if (f.type === 'checkbox') {
            if (
              !Array.isArray(a) ||
              a.length > 50 ||
              a.some((v) => !f.options.includes(v)) ||
              (f.required && !a.length)
            )
              throw new Error(`Check ${f.label}.`)
          } else {
            text(a, 2000, f.required)
            if (
              a &&
              ['select', 'radio'].includes(f.type) &&
              !f.options.includes(a)
            )
              throw new Error(`Check ${f.label}.`)
            if (a && f.type === 'email') email(a)
            if (a && f.type === 'number' && !Number.isFinite(Number(a)))
              throw new Error(`Check ${f.label}.`)
          }
          clean[f.id] = a
        }
        tx.create(target, { formId, answers: clean, createdAt: now() })
        tx.set(rateRef, { at: now() })
      })
      return { ok: true }
    } catch (e) {
      throw new HttpsError('failed-precondition', e.message)
    }
  },
)

// Outbox stays private; failures retry independently of application approval.
export const deliverNotifications = onSchedule(
  {
    schedule: 'every 5 minutes',
    secrets: [smtpPassword, smtpUser],
    maxInstances: 1,
  },
  async () => {
    if (!smtpHost.value() || !smtpFrom.value()) return
    const transport = nodemailer.createTransport({
      host: smtpHost.value(),
      port: 465,
      secure: true,
      auth: { user: smtpUser.value(), pass: smtpPassword.value() },
    })
    const pending = await db
      .collection('mailOutbox')
      .where('status', '==', 'pending')
      .limit(25)
      .get()
    for (const doc of pending.docs) {
      const claimed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(doc.ref),
          m = snap.data()
        if (m.status !== 'pending' || m.nextAttemptAt > now()) return null
        tx.update(doc.ref, {
          nextAttemptAt: new Date(Date.now() + 10 * 60000).toISOString(),
        })
        return m
      })
      if (!claimed) continue
      try {
        await transport.sendMail({
          from: smtpFrom.value(),
          to: claimed.to,
          subject: claimed.subject,
          text: claimed.body,
          messageId: `<${doc.id}@salafic.notifications>`,
        })
        await doc.ref.update({ status: 'sent', sentAt: now() })
      } catch {
        const attempts = claimed.attempts + 1
        await doc.ref.update({
          attempts,
          status: attempts >= 8 ? 'failed' : 'pending',
          nextAttemptAt: new Date(
            Date.now() + Math.min(1440, 5 * 2 ** attempts) * 60000,
          ).toISOString(),
        })
      }
    }
  },
)
