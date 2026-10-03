import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useCenter } from '../context/CenterContext'
import { useAuth } from '../context/AuthContext'
import { act, record, records } from '../lib/platform'
import { PRAYERS, DEFAULT_PRAYER, money } from '../../functions/domain'
import {
  calculateSchedule,
  localDate,
  timeLabel,
  zonedInstant,
} from '../lib/centerPrayer'
import {
  CenterFields,
  Input,
  Message,
  Shell,
  useAction,
} from '../components/PlatformUI'
import {
  Announcements,
  FinanceReport,
  PrayerBoard,
} from '../components/CenterPublicParts'
import Button from '../components/Button'
import DashboardNav from '../components/DashboardNav'

export function CenterAdminLayout() {
  const { center, base } = useCenter(),
    { profile } = useAuth()
  const [access, setAccess] = useState({ loading: true })
  useEffect(() => {
    let active = true
    setAccess({ loading: true })
    act('auditCenterAccess', { centerId: center.id })
      .then(() => {
        if (active) setAccess({ allowed: true })
      })
      .catch((error) => {
        if (active) setAccess({ error: error.message })
      })
    return () => {
      active = false
    }
  }, [center.id, profile?.role])
  const role =
    profile?.role === 'superadmin'
      ? 'owner'
      : profile?.centers?.find((c) => c.id === center.id)?.role
  const tabs = [
    ['', 'Overview'],
    ...(['owner', 'admin', 'editor'].includes(role)
      ? [
          ['prayer-times', 'Prayer times'],
          ['madrasa', 'Madrasa'],
          ['announcements', 'Announcements'],
          ['events', 'Events'],
          ['forms', 'Forms'],
        ]
      : []),
    ...(['owner', 'admin', 'finance'].includes(role)
      ? [['finances', 'Finances']]
      : []),
    ...(role === 'owner'
      ? [
          ['settings', 'Settings'],
          ['committee', 'Committee'],
          ['team', 'Team'],
        ]
      : []),
  ]
  return (
    <Shell
      eyebrow={`Center administration · ${center.status}`}
      title={center.displayName}
      actions={<Link to={base}>View public page ↗</Link>}
      sidebar={<DashboardNav title="Center management" links={tabs.map(([path, label]) => ({ to: `${base}/admin${path ? '/' + path : ''}`, label, icon: path || 'overview', end: !path }))}>
        {profile?.role === 'superadmin' && <Link className="dashboard-back" to="/platform/centers">All centers</Link>}
        {profile?.centers?.length > 1 && (
          <Input
            label="Switch center"
            value={center.slug}
            onChange={(slug) => {
              window.location.assign(`/c/${slug}/admin`)
            }}
            options={profile.centers.map((c) => ({
              value: c.slug,
              label: c.displayName,
            }))}
          />
        )}
      </DashboardNav>}
    >
      {access.loading ? (
        <p role="status">Opening center administration…</p>
      ) : access.error ? (
        <Message error>{access.error}</Message>
      ) : (
        <Outlet key={center.id} />
      )}
    </Shell>
  )
}
export function CenterOverview() {
  const { center, base } = useCenter()
  return (
    <section className="platform-section">
      <h2>Your community, in one place.</h2>
      <p>
        Manage your center’s public information using the sidebar. Prayer
        times use the center’s location and saved minute adjustments.
      </p>
      <div className="platform-links">
        <Link to={`${base}/admin/prayer-times`}>Review prayer times →</Link>
        <Link to={`${base}/admin/settings`}>Complete center settings →</Link>
        <Link to={`${base}/tv`}>Open TV display →</Link>
      </div>
      {center.status !== 'published' && (
        <Message>
          This center is a draft. Review its settings and publish it when ready.
        </Message>
      )}
    </section>
  )
}

export function CenterSettings() {
  const { center, centerId } = useCenter(),
    [fields, setFields] = useState(center),
    [published, setPublished] = useState(center.status === 'published'),
    action = useAction()
  return (
    <section className="platform-section">
      <h2>Center settings</h2>
      {action.feedback}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          action.run(async () => {
            await act('settings', {
              centerId,
              fields,
              published,
              version: fields.version,
            })
            setFields({ ...fields, version: fields.version + 1 })
          }, 'Center settings saved.')
        }}
      >
        <CenterFields value={fields} onChange={setFields} currencyLocked />
        <p className="platform-hint">
          Coordinates determine prayer times. Existing minute adjustments are
          retained when the location changes.
        </p>
        <label className="platform-check">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          Publish this center in the directory
        </label>
        <Button type="submit" loading={action.busy}>
          Save settings
        </Button>
      </form>
    </section>
  )
}

function useAdminRecords(name) {
  const { centerId } = useCenter(),
    [items, setItems] = useState([]),
    [error, setError] = useState('')
  async function reload() {
    try {
      setItems(await records(centerId, name, 100))
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => {
    reload()
  }, [centerId, name])
  return { items, reload, error }
}
export function Publishing({
  kind,
  id,
  payload,
  version,
  children,
  onPublished,
}) {
  const { centerId, center } = useCenter(),
    action = useAction(),
    [draft, setDraft] = useState(null),
    [previewMode, setPreviewMode] = useState('desktop'),
    revisions = useAdminRecords('contentRevisions')
  async function loadDraft() {
    setDraft(await record(centerId, 'contentDrafts', `${kind}-${id}`))
  }
  useEffect(() => {
    loadDraft().catch(() => {})
  }, [centerId, kind, id])
  const history = revisions.items
    .filter((r) => r.kind === kind && r.targetId === id)
    .sort((a, b) => b.version - a.version)
  let previewContent = null
  if (draft) {
    try {
      previewContent = children(draft.payload)
    } catch (error) {
      previewContent = (
        <Message error>
          {error.message ||
            'This draft cannot be previewed. Check its settings and save it again.'}
        </Message>
      )
    }
  }
  return (
    <>
      <div className="platform-links">
        <Button
          type="button"
          loading={action.busy}
          onClick={() =>
            action.run(async () => {
              await act('saveDraft', { centerId, kind, id, payload, version })
              await loadDraft()
            }, 'Draft saved. Review the preview before publishing.')
          }
        >
          Save draft & preview
        </Button>
      </div>
      {action.feedback}
      {draft && (
        <section className="publication-preview">
          <p className="eyebrow">Private preview · {center.displayName}</p>
          <Input
            label="Preview layout"
            value={previewMode}
            onChange={setPreviewMode}
            options={['desktop', 'mobile', 'tv']}
          />
          <div className={`preview-${previewMode}`}>{previewContent}</div>
          <Button
            type="button"
            loading={action.busy}
            onClick={() =>
              action.run(async () => {
                await act('publish', { centerId, kind, id, token: draft.token })
                setDraft(null)
                await revisions.reload()
                await onPublished?.()
              }, 'Published successfully.')
            }
          >
            Publish this version
          </Button>
        </section>
      )}
      <details className="revision-history">
        <summary>Publishing history ({history.length})</summary>
        {revisions.error && <Message error>{revisions.error}</Message>}
        {history.map((r) => (
          <div className="platform-row" key={r.id}>
            <p>
              Version {r.version} · {new Date(r.at).toLocaleString()}
              <br />
              <small>By {r.authorUid}</small>
            </p>
            {kind !== 'finance' && (
              <Button
                type="button"
                variant="outline"
                loading={action.busy}
                onClick={() => {
                  if (
                    window.confirm('Restore this version as a new publication?')
                  )
                    action.run(async () => {
                      await act('restore', {
                        centerId,
                        kind,
                        id,
                        version,
                        revisionId: r.id,
                      })
                      await revisions.reload()
                      await onPublished?.()
                    }, 'Previous content restored as a new version.')
                }}
              >
                Restore
              </Button>
            )}
          </div>
        ))}
      </details>
    </>
  )
}

export function CenterPrayers() {
  const { center } = useCenter(),
    [config, setConfig] = useState(center.prayer || DEFAULT_PRAYER),
    [version, setVersion] = useState(center.prayerVersion || 0)
  let preview = null,
    error = ''
  try {
    preview = calculateSchedule({ ...center, prayer: config })
  } catch {
    error = 'Check the location and prayer settings before publishing.'
  }
  const setOffset = (key, value) =>
    setConfig({
      ...config,
      offsets: { ...config.offsets, [key]: Number(value) },
    })
  return (
    <section className="platform-section">
      <h2>Prayer settings</h2>
      <p>
        Default times are calculated for {center.city}, {center.timezone}. Add
        or subtract minutes independently for each prayer.
      </p>
      <div className="platform-fields">
        <Input
          label="Calculation method"
          value={config.method}
          onChange={(method) => setConfig({ ...config, method })}
          options={[
            'MuslimWorldLeague',
            'NorthAmerica',
            'Karachi',
            'UmmAlQura',
            'Egyptian',
            'Dubai',
            'Singapore',
            'MoonsightingCommittee',
          ]}
        />
        <Input
          label="Asr convention"
          value={config.madhab}
          onChange={(madhab) => setConfig({ ...config, madhab })}
          options={['Shafi', 'Hanafi']}
        />
        <Input
          label="High-latitude rule"
          value={config.highLatitude}
          onChange={(highLatitude) => setConfig({ ...config, highLatitude })}
          options={['TwilightAngle', 'MiddleOfTheNight', 'SeventhOfTheNight']}
        />
      </div>
      <div className="adjustment-grid">
        {PRAYERS.map((key) => (
          <div key={key}>
            <h3 className="capitalize">{key}</h3>
            <p className="platform-hint">
              Base{' '}
              {preview
                ? timeLabel(
                    preview.prayers.find((p) => p.key === key).base,
                    center,
                  )
                : '—'}
            </p>
            <Input
              label={`${key} adjustment (minutes)`}
              type="number"
              min="-180"
              max="180"
              step="1"
              value={config.offsets[key]}
              onChange={(value) => setOffset(key, value)}
            />
            <Input
              label={`${key} iqamah gap (minutes)`}
              type="number"
              min="0"
              max="180"
              step="1"
              value={config.gaps[key]}
              onChange={(value) =>
                setConfig({
                  ...config,
                  gaps: { ...config.gaps, [key]: Number(value) },
                })
              }
            />
            <Button
              variant="ghost"
              type="button"
              onClick={() => setOffset(key, 0)}
            >
              Reset offset
            </Button>
          </div>
        ))}
      </div>
      <Input
        label="Friday congregation times (comma separated, 24-hour)"
        placeholder="12:30, 13:15"
        value={config.jumuah.join(', ')}
        onChange={(v) =>
          setConfig({
            ...config,
            jumuah: v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />
      {error && <Message error>{error}</Message>}
      <Publishing
        kind="prayer"
        id="prayer"
        payload={config}
        version={version}
        onPublished={async () => {
          const latest = await record(center.id)
          setConfig(latest.prayer)
          setVersion(latest.prayerVersion || 0)
        }}
      >
        {(draft) => (
          <PrayerBoard
            center={{ ...center, prayer: draft }}
            schedules={[calculateSchedule({ ...center, prayer: draft })]}
            preview
          />
        )}
      </Publishing>
    </section>
  )
}

export function CenterAnnouncements() {
  const { center } = useCenter(),
    notices = useAdminRecords('announcements')
  const archived = useAdminRecords('announcementArchive')
  const fresh = () => ({
    id: crypto.randomUUID(),
    title: '',
    message: '',
    startsAt: `${localDate(center.timezone)}T09:00`,
    expiresAt: `${localDate(center.timezone)}T23:59`,
    priority: 'normal',
    surfaces: ['home', 'tv'],
    version: 0,
  })
  const [form, setForm] = useState(fresh),
    action = useAction()
  function edit(n) {
    if (Date.parse(n.expiresAt) <= Date.now()) {
      setForm({
        ...fresh(),
        title: n.title,
        message: n.message,
        priority: n.priority,
        surfaces: n.surfaces,
      })
      return
    }
    setForm({
      ...n,
      startsAt: new Intl.DateTimeFormat('sv-SE', {
        timeZone: center.timezone,
        dateStyle: 'short',
        timeStyle: 'short',
      })
        .format(new Date(n.startsAt))
        .replace(' ', 'T'),
      expiresAt: new Intl.DateTimeFormat('sv-SE', {
        timeZone: center.timezone,
        dateStyle: 'short',
        timeStyle: 'short',
      })
        .format(new Date(n.expiresAt))
        .replace(' ', 'T'),
    })
  }
  let payload
  try {
    const [sd, st] = form.startsAt.split('T'),
      [ed, et] = form.expiresAt.split('T')
    payload = {
      ...form,
      startsAt: zonedInstant(sd, st, center.timezone),
      expiresAt: zonedInstant(ed, et, center.timezone),
    }
  } catch {}
  return (
    <section className="platform-section">
      <div className="platform-row">
        <h2>Announcements</h2>
        <Button
          variant="outline"
          onClick={() => {
            setForm(fresh())
          }}
        >
          New announcement
        </Button>
      </div>
      {notices.error && <Message error>{notices.error}</Message>}
      <div className="platform-fields">
        <Input
          label="Title"
          value={form.title}
          maxLength={150}
          onChange={(title) => setForm({ ...form, title })}
        />
        <Input
          label="Priority"
          value={form.priority}
          onChange={(priority) => setForm({ ...form, priority })}
          options={['normal', 'urgent']}
        />
        <Input
          label={`Starts (${center.timezone})`}
          type="datetime-local"
          value={form.startsAt}
          onChange={(startsAt) => setForm({ ...form, startsAt })}
        />
        <Input
          label={`Expires (${center.timezone})`}
          type="datetime-local"
          value={form.expiresAt}
          onChange={(expiresAt) => setForm({ ...form, expiresAt })}
        />
      </div>
      <label className="platform-field">
        <span>Message</span>
        <textarea
          rows="4"
          maxLength={2000}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </label>
      <div className="platform-links">
        {['home', 'tv'].map((s) => (
          <label key={s} className="platform-check">
            <input
              type="checkbox"
              checked={form.surfaces.includes(s)}
              onChange={(e) =>
                setForm({
                  ...form,
                  surfaces: e.target.checked
                    ? [...form.surfaces, s]
                    : form.surfaces.filter((x) => x !== s),
                })
              }
            />
            {s === 'home' ? 'Public page' : 'TV display'}
          </label>
        ))}
      </div>
      {payload ? (
        <Publishing
          key={form.id}
          kind="announcement"
          id={form.id}
          payload={payload}
          version={
            notices.items.find((n) => n.id === form.id)?.version || form.version
          }
          onPublished={notices.reload}
        >
          {(draft) => (
            <>
              <p>
                {draft.startsAt} — {draft.expiresAt}
              </p>
              <Announcements
                items={[draft]}
                now={Date.parse(draft.startsAt)}
                surface={draft.surfaces[0]}
              />
            </>
          )}
        </Publishing>
      ) : (
        <Message error>Enter valid start and expiry times.</Message>
      )}
      {action.feedback}
      <h3 className="mt-8">Published notices</h3>
      {[...notices.items, ...archived.items].map((n) => (
        <div className="platform-row" key={n.id}>
          <p>
            {n.title}
            <br />
            <small>
              {Date.parse(n.expiresAt) < Date.now()
                ? 'Expired'
                : 'Scheduled / active'}
            </small>
          </p>
          <Button variant="outline" onClick={() => edit(n)}>
            Edit / reuse
          </Button>
        </div>
      ))}
    </section>
  )
}

export function CenterFinances() {
  const { center, centerId } = useCenter(),
    action = useAction(),
    [ledger, setLedger] = useState([]),
    [state, setState] = useState(null),
    [report, setReport] = useState(null)
  const [opening, setOpening] = useState('0')
  const [form, setForm] = useState({
    kind: 'funds',
    amount: '',
    note: '',
    publicDescription: '',
    category: 'General',
    id: crypto.randomUUID(),
  })
  async function reload() {
    const [f, e, s, r] = await Promise.all([
      records(centerId, 'funds'),
      records(centerId, 'expenses'),
      record(centerId, 'financeState', 'current'),
      record(centerId, 'publicFinance', 'current'),
    ])
    setLedger(
      [
        ...f.map((x) => ({ ...x, kind: 'Donation' })),
        ...e.map((x) => ({ ...x, kind: 'Expense' })),
      ].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    )
    setState(s)
    setReport(r)
  }
  useEffect(() => {
    action.run(reload, '')
  }, [centerId])
  return (
    <section className="platform-section">
      <h2>Private financial records</h2>
      <Button
        variant="outline"
        loading={action.busy}
        onClick={() =>
          action.run(async () => {
            await act('reconcileFinance', { centerId })
            await reload()
          }, 'Totals reconciled from every ledger entry. Preview and publish the updated report when ready.')
        }
      >
        Reconcile ledger totals
      </Button>
      <p>
        Record donations and expenses here. Internal notes stay private. Publish
        a reviewed summary separately.
      </p>
      {action.feedback}
      {!state && (
        <form
          className="platform-links"
          onSubmit={(e) => {
            e.preventDefault()
            action.run(async () => {
              await act('openingBalance', { centerId, amount: opening })
              await reload()
            }, 'Opening balance saved.')
          }}
        >
          <Input
            label={`Opening balance (${center.currency})`}
            value={opening}
            onChange={setOpening}
            inputMode="decimal"
          />
          <Button loading={action.busy} type="submit" variant="outline">
            Set opening balance
          </Button>
          <p className="platform-hint">
            Optional. This becomes fixed once the ledger is started.
          </p>
        </form>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          action.run(async () => {
            await act('ledger', { centerId, ...form })
            setForm({
              ...form,
              amount: '',
              note: '',
              publicDescription: '',
              id: crypto.randomUUID(),
            })
            await reload()
          }, 'Entry recorded. Review and publish an updated summary when ready.')
        }}
      >
        <div className="platform-fields">
          <Input
            label="Entry type"
            value={form.kind}
            onChange={(kind) => setForm({ ...form, kind })}
            options={[
              { value: 'funds', label: 'Donation' },
              { value: 'expenses', label: 'Expense' },
            ]}
          />
          <Input
            label={`Amount (${center.currency})`}
            inputMode="decimal"
            value={form.amount}
            onChange={(amount) => setForm({ ...form, amount })}
            required
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(category) => setForm({ ...form, category })}
            required
          />
          <Input
            label="Private note"
            value={form.note}
            maxLength={1000}
            onChange={(note) => setForm({ ...form, note })}
          />
        </div>
        <Button type="submit" loading={action.busy}>
          Record entry
        </Button>
      </form>
      {state && (
        <>
          <p className="platform-hint">
            Ledger:{' '}
            {money(state.collectedMinor, center.currency, center.locale)}{' '}
            collected ·{' '}
            {money(state.spentMinor, center.currency, center.locale)} spent.
          </p>
          <Publishing
            kind="finance"
            id="finance"
            payload={{}}
            version={report?.version || 0}
            onPublished={reload}
          >
            {(draft) => <FinanceReport center={center} report={draft} />}
          </Publishing>
        </>
      )}
      <h3 className="mt-8">Recent records</h3>
      {ledger.map((e) => (
        <div className="platform-row" key={`${e.kind}-${e.id}`}>
          <div>
            <p>
              {e.kind} · {e.category || 'General'}
            </p>
            <small>{e.note}</small>
          </div>
          <strong>
            {e.amountMinor !== undefined
              ? money(e.amountMinor, center.currency, center.locale)
              : new Intl.NumberFormat(center.locale, {
                  style: 'currency',
                  currency: center.currency,
                }).format(e.amount || 0)}
          </strong>
          {!e.reverses && !e.reversedAt && (
            <Button
              variant="ghost"
              loading={action.busy}
              onClick={() => {
                const reason = window.prompt(
                  'Reason for reversing this entry (the original is retained):',
                )
                if (reason?.trim())
                  action.run(async () => {
                    await act('reverseEntry', {
                      centerId,
                      kind: e.kind === 'Donation' ? 'funds' : 'expenses',
                      id: e.id,
                      reason,
                    })
                    await reload()
                  }, 'Correction recorded. Publish a new summary to update public totals.')
              }}
            >
              Reverse entry
            </Button>
          )}
          {e.reversedAt && <span className="status-chip">Reversed</span>}
        </div>
      ))}
    </section>
  )
}

export function CenterTeam() {
  const { refreshAccess } = useAuth()
  const { centerId } = useCenter(),
    members = useAdminRecords('members'),
    action = useAction(),
    [email, setEmail] = useState(''),
    [role, setRole] = useState('admin')
  return (
    <section className="platform-section">
      <h2>Center team</h2>
      <p>Invite sub-admins using their email address. They must sign in with that verified email and accept the invitation under My requests. Access applies only to this center.</p>
      {action.feedback}
      {members.error && <Message error>{members.error}</Message>}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          action.run(
            () => act('inviteMember', { centerId, email, role }),
            'Invitation queued. The recipient must accept with their verified email.',
          )
        }}
      >
        <div className="platform-fields">
          <Input
            label="Staff email"
            type="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Input
            label="Role"
            value={role}
            onChange={setRole}
            options={[
              { value: 'admin', label: 'Administrator' },
              { value: 'finance', label: 'Finance editor' },
              { value: 'editor', label: 'Prayer and events editor' },
            ]}
          />
        </div>
        <Button type="submit" loading={action.busy}>
          Send invitation
        </Button>
      </form>
      {members.items.map((m) => (
        <div className="platform-row" key={m.id}>
          <p>
            {m.email} · {m.role}
          </p>
          {m.role !== 'owner' && (
            <Input
              label={`Role for ${m.email}`}
              value={m.role}
              options={['admin', 'finance', 'editor']}
              disabled={action.busy}
              onChange={(role) =>
                action.run(async () => {
                  await act('changeMemberRole', { centerId, uid: m.id, role })
                  await members.reload()
                  await refreshAccess()
                }, 'Role updated.')
              }
            />
          )}
          {m.role !== 'owner' && (
            <Button
              variant="outline"
              loading={action.busy}
              onClick={() => {
                if (window.confirm('Remove this person’s center access?'))
                  action.run(async () => {
                    await act('removeMember', { centerId, uid: m.id })
                    await members.reload()
                  }, 'Access removed.')
              }}
            >
              Remove access
            </Button>
          )}
          {m.role !== 'owner' && (
            <Button
              variant="ghost"
              loading={action.busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Transfer center ownership to ${m.email}? Your own access will become administrator.`,
                  )
                )
                  action.run(async () => {
                    await act('transferOwnership', { centerId, uid: m.id })
                    await members.reload()
                    await refreshAccess()
                  }, 'Ownership transferred.')
              }}
            >
              Make owner
            </Button>
          )}
        </div>
      ))}
    </section>
  )
}
