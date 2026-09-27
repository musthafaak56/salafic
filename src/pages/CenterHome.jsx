import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { nextEvent } from '../../functions/time'
import { hijriDate } from '../lib/centerPrayer'
import FinanceHistory from '../components/FinanceHistory'
import { useLanguage } from '../context/LanguageContext'
import { translations, direction } from '../lib/translations'
import { useCenter } from '../context/CenterContext'
import useCenterPublic from '../hooks/useCenterPublic'
import { Shell, Message } from '../components/PlatformUI'
import {
  Announcements,
  FinanceReport,
  PrayerBoard,
} from '../components/CenterPublicParts'

export default function CenterHome({ tv = false }) {
  const context = useCenter(),
    { language } = useLanguage()
  const center = {
      ...context.center,
      locale: language || context.center.locale,
    },
    base = context.base
  const t = translations(center.locale)
  const data = useCenterPublic(center),
    location = useLocation()
  const section = location.pathname.split('/').at(-1)
  const [preferred, setPreferred] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem('preferred-center'))?.id === center.id
      )
    } catch {
      return false
    }
  })
  function remember() {
    try {
      if (preferred) localStorage.removeItem('preferred-center')
      else
        localStorage.setItem(
          'preferred-center',
          JSON.stringify({
            id: center.id,
            slug: center.slug,
            displayName: center.displayName,
          }),
        )
      setPreferred(!preferred)
    } catch {}
  }
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
        locale={center.locale}
        items={data.announcements}
        surface={tv ? 'tv' : 'home'}
        now={data.now}
      />
      {!tv &&
        center.modules?.finances !== false &&
        section !== 'prayer-times' &&
        section !== 'events' && (
          <FinanceReport report={data.finance} center={center} />
        )}
      {!tv &&
        center.modules?.events !== false &&
        section !== 'prayer-times' &&
        section !== 'finances' && (
          <section className="platform-section">
            <h2>{t.events}</h2>
            {data.events?.length ? (
              data.events.map((e) => (
                <article className="platform-row" key={e.id}>
                  <div>
                    <h3>{e.title}</h3>
                    <p>{e.description}</p>
                    <p className="platform-hint">
                      {nextEvent(e, data.now)
                        ? new Date(nextEvent(e, data.now)).toLocaleString(
                            center.locale,
                            { timeZone: center.timezone },
                          )
                        : 'No upcoming occurrence'}{' '}
                      · {center.timezone}
                      {e.repeat === 'weekly' ? ' · Repeats weekly' : ''} ·{' '}
                      {e.location}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <p>{t.noEvents}</p>
            )}
          </section>
        )}
      {!tv &&
        center.modules?.forms !== false &&
        !!data.forms?.filter((f) => f.open).length && (
          <section className="platform-section">
            <h2>{t.involved}</h2>
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
      <main className="center-tv" dir={direction(center.locale)}>
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
            <p>
              {hijriDate(center, data.now)} · {center.timezone}
            </p>
            <Link to={base}>{t.exitTv}</Link>
          </div>
        </header>
        <div className="center-tv-content">{content}</div>
      </main>
    )
  return (
    <Shell
      dir={direction(center.locale)}
      lang={center.locale}
      eyebrow={`${center.type} · ${center.city}, ${center.countryCode}`}
      title={center.displayName}
      description={center.description || center.address}
      actions={
        <div className="platform-links">
          <button
            className="platform-button"
            type="button"
            aria-pressed={preferred}
            onClick={remember}
          >
            {preferred ? t.remembered : t.remember}
          </button>
          <Link className="platform-button" to={`${base}/tv`}>
            {t.openTv}
          </Link>
        </div>
      }
    >
      {center.coverUrl && (
        <img className="center-cover" src={center.coverUrl} alt="" />
      )}
      {center.logoUrl && (
        <img
          className="center-logo"
          src={center.logoUrl}
          alt={`${center.displayName} logo`}
        />
      )}
      <nav className="center-tabs" aria-label="Center navigation">
        {[
          ['', t.overview],
          ['prayer-times', t.prayers],
          ['finances', t.finances],
          ['events', t.events],
        ].map(([path, label]) => (
          <Link key={path} to={`${base}/${path}`}>
            {label}
          </Link>
        ))}
      </nav>
      {content}
      {((section === 'finances' && center.modules?.finances === false) ||
        (section === 'events' && center.modules?.events === false)) && (
        <Message>This section is not available at this center.</Message>
      )}
      {section === 'finances' && center.modules?.finances !== false && (
        <FinanceHistory center={center} />
      )}
      <section className="platform-section">
        <h2>{t.contact}</h2>
        <p>{center.address}</p>
        <div className="platform-links">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.map} ↗
          </a>
          {center.contactEmail && (
            <a href={`mailto:${center.contactEmail}`}>{center.contactEmail}</a>
          )}
          {center.phone && (
            <a href={`tel:${center.phone.replace(/[^+\d]/g, '')}`}>
              {center.phone}
            </a>
          )}
          {center.websiteUrl && (
            <a
              href={center.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Website ↗
            </a>
          )}
        </div>
      </section>
    </Shell>
  )
}
