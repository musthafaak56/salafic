import { activeNotices, money } from '../../functions/domain'
import { nextPrayer, timeLabel } from '../lib/centerPrayer'

const copy = {
  en: {
    prayers: 'Prayer times',
    adhan: 'Adhan',
    iqamah: 'Iqamah',
    next: 'Next prayer',
    finances: 'Community finances',
    collected: 'Donations',
    spent: 'Expenses',
    balance: 'Balance',
  },
  ml: {
    prayers: 'നമസ്കാര സമയം',
    adhan: 'ബാങ്ക്',
    iqamah: 'ഇഖാമത്ത്',
    next: 'അടുത്ത നമസ്കാരം',
    finances: 'സാമ്പത്തിക വിവരങ്ങൾ',
    collected: 'സംഭാവനകൾ',
    spent: 'ചെലവുകൾ',
    balance: 'ബാക്കി',
  },
  ar: {
    prayers: 'أوقات الصلاة',
    adhan: 'الأذان',
    iqamah: 'الإقامة',
    next: 'الصلاة القادمة',
    finances: 'مالية المركز',
    collected: 'التبرعات',
    spent: 'المصروفات',
    balance: 'الرصيد',
  },
}
export function PrayerBoard({
  center,
  schedules,
  now = Date.now(),
  preview = false,
}) {
  const t = copy[center.locale] || copy.en,
    today = schedules[0],
    next = nextPrayer(schedules, now)
  if (!today) return <p role="status">Today's schedule unavailable.</p>
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
    <section
      className="prayer-board"
      dir={center.locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="platform-row">
        <div>
          <p className="eyebrow">
            {preview ? 'Preview · ' : ''}
            {today.date} · {center.timezone}
          </p>
          <h2>{t.prayers}</h2>
        </div>
        {next && (
          <div className="next-prayer">
            <span>
              {t.next} · {next.key} · {t.adhan}
            </span>
            <strong>{countdown}</strong>
          </div>
        )}
      </div>
      <div className="prayer-table">
        <div className="prayer-table-heading">
          <span>Prayer</span>
          <span>{t.adhan}</span>
          <span>{t.iqamah}</span>
        </div>
        {today.prayers.map((p) => (
          <div key={p.key} className={next?.key === p.key ? 'is-next' : ''}>
            <strong className="capitalize">{p.key}</strong>
            <span>{timeLabel(p.at, center)}</span>
            <span>{timeLabel(p.iqama, center)}</span>
          </div>
        ))}
      </div>
      <p className="platform-hint">
        Sunrise {timeLabel(today.sunrise, center)} · {today.source}
      </p>
      {today.jumuah.length > 0 && <p>Jumuah · {today.jumuah.join(' · ')}</p>}
    </section>
  )
}
export function FinanceReport({ report, center }) {
  const t = copy[center.locale] || copy.en
  return (
    <section
      className="platform-section"
      dir={center.locale === 'ar' ? 'rtl' : 'ltr'}
    >
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
            All recorded activity ·{' '}
            {report.updatedAt
              ? `Published ${new Date(report.updatedAt).toLocaleString(center.locale, { timeZone: center.timezone })}`
              : 'Preview — not yet published'}
          </p>
        </>
      ) : (
        <p>This center has not published a financial report yet.</p>
      )}
    </section>
  )
}
export function Announcements({
  items = [],
  surface = 'home',
  now = Date.now(),
}) {
  const notices = activeNotices(items, surface, now)
  if (!notices.length) return null
  return (
    <section className="platform-section">
      <h2>Announcements</h2>
      {notices.map((n, i) => (
        <article
          className={`announcement ${n.priority === 'urgent' ? 'urgent' : ''}`}
          key={n.id || i}
        >
          {n.priority === 'urgent' && (
            <p className="eyebrow">Important notice</p>
          )}
          <h3>{n.title}</h3>
          <p>{n.message}</p>
        </article>
      ))}
    </section>
  )
}
