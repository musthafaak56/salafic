import { activeNotices, money } from '../../functions/domain'
import { nextPrayer, timeLabel } from '../lib/centerPrayer'

import { translations, direction } from '../lib/translations'
export function PrayerBoard({
  center,
  schedules,
  now = Date.now(),
  preview = false,
  staticDisplay = false,
}) {
  const t = translations(center.locale),
    today = schedules[0],
    next = staticDisplay ? null : nextPrayer(schedules, now)
  if (!today) return <p role="status">{t.unavailable}</p>
  const left = next
    ? Math.max(0, Math.floor((Date.parse(next.at) - now) / 1000))
    : 0
  const countdown = [
    Math.floor(left / 3600),
    Math.floor((left % 3600) / 60),
    left % 60,
  ]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
  return (
    <section className="prayer-board" dir={direction(center.locale)}>
      <div className="platform-row">
        <div>
          <p className="eyebrow">
            {preview ? `${t.preview} · ` : ''}
            {today.date} · {center.timezone}
          </p>
          <h2>{t.prayers}</h2>
        </div>
        {next && (
          <div className="next-prayer">
            <span>
              {t.next} · {t[next.key]} · {t.adhan}
            </span>
            <strong dir="ltr">{countdown}</strong>
          </div>
        )}
      </div>
      <div className="prayer-table">
        <div className="prayer-table-heading">
          <span>{t.prayer}</span>
          <span>{t.adhan}</span>
          <span>{t.iqamah}</span>
        </div>
        {today.prayers.map((p) => (
          <div key={p.key} className={next?.key === p.key ? 'is-next' : ''}>
            <strong className="capitalize">{t[p.key]}</strong>
            <span>{timeLabel(p.at, center)}</span>
            <span>{timeLabel(p.iqama, center)}</span>
          </div>
        ))}
      </div>
      <p className="platform-hint">
        {t.sunrise} {timeLabel(today.sunrise, center)} ·{' '}
        {today.source === 'Published timetable' ? t.manual : t.calculated}
      </p>
      {today.jumuah.length > 0 && (
        <p>
          {t.jumuah} · {today.jumuah.join(' · ')}
        </p>
      )}
    </section>
  )
}
export function FinanceReport({ report, center }) {
  const t = translations(center.locale)
  return (
    <section className="platform-section" dir={direction(center.locale)}>
      <h2>{t.finances}</h2>
      {report ? (
        <>
          <div className="finance-stats">
            {[
              [t.collected, report.collectedMinor],
              [t.spent, report.spentMinor],
              [t.balance, report.balanceMinor],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{money(value, report.currency, center.locale)}</strong>
              </div>
            ))}
          </div>
          <p className="platform-hint">
            {t.coverage} ·{' '}
            {report.updatedAt
              ? `${t.published} ${new Date(report.updatedAt).toLocaleString(center.locale, { timeZone: center.timezone })}`
              : t.draft}
          </p>
        </>
      ) : (
        <p>{t.unpublished}</p>
      )}
    </section>
  )
}
export function Announcements({
  items = [],
  surface = 'home',
  now = Date.now(),
  locale = 'en',
}) {
  const t = translations(locale)
  const notices = activeNotices(items, surface, now)
  if (!notices.length) return null
  return (
    <section className="platform-section" dir={direction(locale)}>
      <h2>{t.announcements}</h2>
      {notices.map((n, i) => (
        <article
          className={`announcement ${n.priority === 'urgent' ? 'urgent' : ''}`}
          key={n.id || i}
        >
          {n.priority === 'urgent' && <p className="eyebrow">{t.urgent}</p>}
          <h3>{n.title}</h3>
          <p>{n.message}</p>
        </article>
      ))}
    </section>
  )
}
