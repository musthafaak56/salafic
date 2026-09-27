import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  onSnapshot,
  query,
  where,
  limit,
  orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { act } from '../lib/platform'
import { useAuth } from '../context/AuthContext'
import {
  CENTER_INITIAL,
  CenterFields,
  Input,
  Message,
  Shell,
  useAction,
} from '../components/PlatformUI'
import Button from '../components/Button'

const labels = {
  pending: 'Pending review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Rejected',
}
export default function CenterRequests({ review = false }) {
  const { user, profile, refreshAccess, accessError } = useAuth()
  const [items, setItems] = useState([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  const [fields, setFields] = useState({
      ...CENTER_INITIAL,
      designatedAdminEmail: user?.email || '',
    }),
    [editing, setEditing] = useState(null),
    [filter, setFilter] = useState('all')
  const action = useAction()
  const [pageSize, setPageSize] = useState(50)
  useEffect(() => {
    if (!user) return
    const constraints = review ? [] : [where('submitterUid', '==', user.uid)]
    if (filter !== 'all') constraints.push(where('status', '==', filter))
    setLoading(true)
    setError('')
    return onSnapshot(
      query(
        collection(db, 'centerApplications'),
        ...constraints,
        orderBy('createdAt', 'desc'),
        limit(pageSize),
      ),
      (snap) => {
        setItems(
          snap.docs
            .map((d) => ({ ...d.data(), id: d.id }))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        )
        setLoading(false)
      },
      () => {
        setError('Unable to load requests. Check your access and connection.')
        setLoading(false)
      },
    )
  }, [user?.uid, review, filter, pageSize])
  return (
    <Shell
      eyebrow={
        review ? 'Platform administration' : 'Bring your community together'
      }
      title={review ? 'Center requests' : 'Register your center'}
      description={
        review
          ? 'Review applications and assign access to the designated administrator.'
          : 'Provide your center’s location and the email of the person who will manage it.'
      }
    >
      {!review && (
        <section className="platform-section">
          <h2>How registration works</h2>
          <p>Send your center’s details and designated admin email to musthafaak56@gmail.com for review. Approval gives that email owner access; other emails do not gain access automatically.</p>
          <p>After approval, sign in with the designated email, refresh access below, and accept any invitation shown here. Then open your dashboard. Use Team to invite sub-admins by email; they sign in with that same verified email and accept their invitation here.</p>
          <div className="platform-links">
            <Button variant="outline" loading={action.busy} onClick={() => action.run(() => refreshAccess(), 'Access refreshed. Check your centers and invitations below.')}>Refresh my access</Button>
          </div>
          {!!profile?.centers?.length && <div className="platform-links">{profile.centers.map((c) => <Link key={c.id} to={`/c/${c.slug}/admin`}>Manage {c.displayName} →</Link>)}</div>}
        </section>
      )}
      {accessError && (
        <Message error>
          {accessError} <button onClick={() => refreshAccess()}>Retry</button>
        </Message>
      )}
      {action.feedback}
      {error && <Message error>{error}</Message>}
      {!review && !!profile?.invitations?.length && (
        <section className="platform-section">
          <h2>Your invitations</h2>
          {profile.invitations.map((i) => (
            <div key={i.id} className="platform-row">
              <p>
                {i.centerName} · {i.role}
              </p>
              <Button
                loading={action.busy}
                onClick={() =>
                  action.run(async () => {
                    await act('acceptInvitation', { id: i.id })
                    await refreshAccess()
                  }, 'Invitation accepted. Open your center dashboard above.')
                }
              >
                Accept invitation
              </Button>
            </div>
          ))}
        </section>
      )}
      {!review && (
        <section className="platform-section">
          <h2>{editing ? 'Update your request' : 'Center details'}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              action.run(async () => {
                await act('submitApplication', {
                  fields,
                  ...(editing ? { id: editing } : {}),
                })
                setEditing(null)
                setFields({
                  ...CENTER_INITIAL,
                  designatedAdminEmail: user.email,
                })
              }, 'Request sent to the super admin for review.')
            }}
          >
            <CenterFields value={fields} onChange={setFields} request />
            <label className="platform-check">
              <input type="checkbox" required />I have confirmed the center
              coordinates and timezone.
            </label>
            <p className="platform-hint">
              Confirm the timezone and coordinates of the center. Prayer times
              will use this location. The designated administrator must verify
              their email before access is activated.
            </p>
            <Button loading={action.busy} type="submit">
              {editing ? 'Resubmit request' : 'Send request'}
            </Button>
          </form>
        </section>
      )}
      <section className="platform-section">
        <div className="platform-row">
          <h2>{review ? 'Review queue' : 'Your requests'}</h2>
          <Input
            label="Status"
            value={filter}
            onChange={(value) => {
              setFilter(value)
              setPageSize(50)
            }}
            options={[
              { value: 'all', label: 'All requests' },
              ...Object.entries(labels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </div>
        {loading && <p role="status">Loading requests…</p>}
        {!loading && !items.length && <p>No requests yet.</p>}
        {items
          .filter((i) => filter === 'all' || i.status === filter)
          .map((item) => (
            <Request
              key={item.id}
              item={item}
              review={review}
              onResend={() =>
                action.run(
                  () =>
                    act('resendInitialInvitation', { centerId: item.centerId }),
                  'Administrator invitation renewed and notification queued.',
                )
              }
              busy={action.busy}
              onReview={(status, feedback) =>
                action.run(
                  () =>
                    act('reviewApplication', { id: item.id, status, feedback }),
                  'Review saved. Notification queued.',
                )
              }
              onEdit={() => {
                setFields(item)
                setEditing(item.id)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              duplicates={
                items.filter(
                  (i) =>
                    i.id !== item.id &&
                    i.city.toLowerCase() === item.city.toLowerCase() &&
                    i.displayName.toLowerCase() ===
                      item.displayName.toLowerCase(),
                ).length
              }
            />
          ))}
        {items.length === pageSize && (
          <Button
            variant="outline"
            loading={loading}
            onClick={() => setPageSize(pageSize + 50)}
          >
            Load more requests
          </Button>
        )}
      </section>
    </Shell>
  )
}
function Request({
  item,
  review,
  busy,
  onReview,
  onEdit,
  onResend,
  duplicates,
}) {
  const [feedback, setFeedback] = useState('')
  return (
    <article className="request-item">
      <div className="platform-row">
        <h3>{item.displayName}</h3>
        <span className="status-chip">{labels[item.status]}</span>
      </div>
      <p>
        {item.city}, {item.countryCode} · {item.address}
      </p>
      <p>Admin: {item.designatedAdminEmail}</p>
      <p className="platform-hint">
        Submitted {new Date(item.createdAt).toLocaleString()} · {item.timezone}
      </p>
      {duplicates > 0 && (
        <Message>
          Another request has the same name and city. Check for duplicates.
        </Message>
      )}
      {item.feedback && <blockquote>{item.feedback}</blockquote>}
      {item.status === 'approved' && (
        <p>
          Admin access: {item.adminStatus} · Center:{' '}
          {item.centerStatus || 'draft'} ·{' '}
          <Link to={`/c/${item.slug}/admin`}>Open center</Link>
        </p>
      )}
      {review &&
        item.status === 'approved' &&
        item.adminStatus === 'invited' && (
          <Button variant="outline" loading={busy} onClick={onResend}>
            Renew admin invitation
          </Button>
        )}
      <details>
        <summary>Request history</summary>
        <ol>
          {item.history.map((h, i) => (
            <li key={i}>
              {new Date(h.at).toLocaleString()} — {labels[h.status]}
              {h.feedback ? `: ${h.feedback}` : ''}
            </li>
          ))}
        </ol>
      </details>
      {!review && item.status === 'changes_requested' && (
        <Button variant="outline" onClick={onEdit}>
          Edit and resubmit
        </Button>
      )}
      {review && item.status === 'pending' && (
        <div className="review-actions">
          <Input
            label={`Feedback for ${item.displayName}`}
            value={feedback}
            onChange={setFeedback}
            maxLength={2000}
          />
          <div className="platform-links">
            <Button
              loading={busy}
              onClick={() => onReview('approved', feedback)}
            >
              Approve
            </Button>
            <Button
              disabled={!feedback.trim()}
              loading={busy}
              variant="outline"
              onClick={() => onReview('changes_requested', feedback)}
            >
              Request corrections
            </Button>
            <Button
              disabled={!feedback.trim()}
              loading={busy}
              variant="ghost"
              onClick={() => onReview('rejected', feedback)}
            >
              Reject
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}
