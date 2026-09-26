import { Link, useLocation } from 'react-router-dom'
import { useCenter } from '../context/CenterContext'
import useCenterPublic from '../hooks/useCenterPublic'
import { Shell, Message } from '../components/PlatformUI'
import {
  Announcements,
  FinanceReport,
  PrayerBoard,
} from '../components/CenterPublicParts'

export default function CenterHome({ tv = false }) {
  const { center, base } = useCenter(),
    data = useCenterPublic(center),
    location = useLocation()
  const section = location.pathname.split('/').at(-1)
  const content = (
    <>
      {data.loading && <p role="status">Loading published information…</p>}
      {data.error && <Message error>{data.error}</Message>}
      {data.offline && (
        <Message>
          Offline · last synced{' '}
          {data.savedAt ? new Date(data.savedAt).toLocaleString() : 'never'}.
          Displayed information may be out of date.
        </Message>
      )}
      {data.scheduleError && <Message error>{data.scheduleError}</Message>}
      {section !== 'finances' && section !== 'events' && (
        <PrayerBoard
          center={center}
          schedules={data.schedules}
          now={data.now}
        />
      )}
      <Announcements
        items={data.announcements}
        surface={tv ? 'tv' : 'home'}
        now={data.now}
      />
      {!tv && section !== 'prayer-times' && section !== 'events' && (
        <FinanceReport report={data.finance} center={center} />
      )}
      {!tv && section !== 'prayer-times' && section !== 'finances' && (
        <section className="platform-section">
          <h2>Community events</h2>
          {data.events?.length ? (
            data.events.map((e) => (
              <article className="platform-row" key={e.id}>
                <div>
                  <h3>{e.title}</h3>
                  <p>{e.description}</p>
                  <p className="platform-hint">
                    {e.eventAt} · {center.timezone}
                    {e.repeat === 'weekly' ? ' · Repeats weekly' : ''} ·{' '}
                    {e.location}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <p>No events published yet.</p>
          )}
        </section>
      )}
      {!tv && !!data.forms?.filter((f) => f.open).length && (
        <section className="platform-section">
          <h2>Get involved</h2>
          {data.forms
            .filter((f) => f.open)
            .map((f) => (
              <p key={f.id}>
                <Link to={`${base}/forms/${f.id}`}>{f.title} →</Link>
              </p>
            ))}
        </section>
      )}
    </>
  )
  if (tv)
    return (
      <main className="center-tv">
        <header className="platform-row">
          <div>
            <p className="eyebrow">
              {center.city} · {center.countryCode}
            </p>
            <h1>{center.displayName}</h1>
          </div>
          <div>
            <strong>
              {new Date(data.now).toLocaleTimeString(center.locale, {
                timeZone: center.timezone,
              })}
            </strong>
            <p>{center.timezone}</p>
            <Link to={base}>Exit TV</Link>
          </div>
        </header>
        {content}
      </main>
    )
  return (
    <Shell
      eyebrow={`${center.type} · ${center.city}, ${center.countryCode}`}
      title={center.displayName}
      description={center.description || center.address}
      actions={
        <Link className="platform-button" to={`${base}/tv`}>
          Open TV display
        </Link>
      }
    >
      <nav className="center-tabs" aria-label="Center navigation">
        {[
          ['', 'Overview'],
          ['prayer-times', 'Prayer times'],
          ['finances', 'Finances'],
          ['events', 'Events'],
        ].map(([path, label]) => (
          <Link key={path} to={`${base}/${path}`}>
            {label}
          </Link>
        ))}
      </nav>
      {content}
    </Shell>
  )
}
