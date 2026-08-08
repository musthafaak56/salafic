import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  HandCoins,
  Headphones,
  Heart,
  Lightning,
  Receipt,
} from '@phosphor-icons/react'
import { useAuth } from '../context/AuthContext'
import {
  getLatestPrayerTimes,
  getFunds,
  getAllFunds,
  getExpenses,
  getAllExpenses,
  getEvents,
  getForms,
} from '../lib/firestore'
import {
  PRAYER_KEYS,
  FRIDAY_SUNNAHS,
  addMinutes,
  format12h,
  formatCurrency,
  formatDateTime,
  formatHMS,
  getNextPrayer,
  iqamaGapLabel,
  isDhuhaTime,
  isFriday,
  isStalePrayerTimes,
  prayerEntry,
  publicPrayerKeys,
  recentlyPassedPrayer,
  relativeDayLabel,
  secondsUntil,
  todayISODate,
} from '../lib/utils'
import AppHeader from '../components/AppHeader'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'

function useHomeData() {
  const [prayerTimes, setPrayerTimes] = useState(null)
  const [recentFunds, setRecentFunds] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [totals, setTotals] = useState({ collected: 0, spent: 0 })
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [openForms, setOpenForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [times, recentF, recentE, allF, allE, events, forms] =
          await Promise.all([
            getLatestPrayerTimes(),
            getFunds(),
            getExpenses(),
            getAllFunds(),
            getAllExpenses(),
            getEvents(),
            getForms(),
          ])
        setPrayerTimes(times)
        setRecentFunds(recentF)
        setRecentExpenses(recentE)
        setTotals({
          collected: allF.reduce((s, f) => s + (Number(f.amount) || 0), 0),
          spent: allE.reduce((s, e) => s + (Number(e.amount) || 0), 0),
        })
        const nowMs = Date.now()
        setUpcomingEvents(
          events
            .filter((e) => new Date(e.eventAt).getTime() >= nowMs)
            .sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt))
            .slice(0, 6)
        )
        setOpenForms((forms ?? []).filter((f) => f.open !== false).slice(0, 4))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return {
    prayerTimes,
    recentFunds,
    recentExpenses,
    totals,
    upcomingEvents,
    openForms,
    loading,
    error,
  }
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function DhuhaaBanner({ prayerTimes }) {
  const now = useNow()
  if (!isDhuhaTime(prayerTimes, now)) return null
  const dhuhr = prayerEntry(prayerTimes.dhuhr).adhaan
  const end = secondsUntil(addMinutes(dhuhr, -20), false, now) ?? 0
  return (
    <div className="relative overflow-hidden rounded-3xl border border-gold/50 bg-gold-soft/15 p-5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)] sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="relative flex h-3 w-3" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-gold" />
          </span>
          <p className="font-display text-2xl font-bold tracking-tight text-gold sm:text-3xl">
            It&apos;s time for Dhuhaa prayer
          </p>
        </div>
        <div className="text-sm text-white/80">
          Ends{' '}
          <span className="font-semibold text-white/90">
            {format12h(addMinutes(dhuhr, -20))}
          </span>{' '}
          · dhuhr adhaan{' '}
          <span className="font-semibold text-white/90">{format12h(dhuhr)}</span>{' '}
          · <span className="font-semibold text-gold tabular-nums">-{formatHMS(end)}</span>
        </div>
      </div>
    </div>
  )
}

function CountdownPanel({ prayerTimes }) {
  const now = useNow()
  const passed = recentlyPassedPrayer(prayerTimes, now)
  if (passed) {
    return (
      <div className="glass relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              Iqama passed
            </p>
            <p className="mt-2 text-6xl font-bold tracking-tight text-white tabular-nums sm:text-7xl">
              {format12h(passed.time)}
            </p>
            <p className="mt-2 text-sm text-white/70">
              {passed.label} began{' '}
              <span className="font-medium text-white/80">
                {passed.elapsed >= 60
                  ? `${Math.floor(passed.elapsed / 60)} min ${passed.elapsed % 60} sec ago`
                  : `${passed.elapsed} sec ago`}
              </span>
            </p>
          </div>
          <div className="sm:text-right">
            <p
              className="text-6xl font-bold tracking-tight text-gold tabular-nums sm:text-7xl"
              role="timer"
              aria-live="off"
            >
              +{formatHMS(passed.elapsed)}
            </p>
            <p className="mt-2 text-sm text-white/70">since iqama</p>
          </div>
        </div>
      </div>
    )
  }
  const next = getNextPrayer(prayerTimes, now, publicPrayerKeys(prayerTimes))
  if (!next) return null
  const usesIqama = Boolean(next.iqama)
  const toAdhaan = secondsUntil(next.adhaan, !next.isToday, now)
  const toIqama = secondsUntil(next.iqama, !next.isToday, now)
  const phase =
    usesIqama && (toAdhaan === null || toAdhaan === 0) ? 'iqama' : 'adhaan'
  const remaining = phase === 'adhaan' ? toAdhaan : toIqama
  const targetTime = phase === 'adhaan' ? next.adhaan : next.iqama

  return (
    <div className="glass relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-xs font-semibold tracking-[0.28em] text-gold uppercase">
            Next call
          </p>
          <p className="mt-2 text-6xl font-bold tracking-tight text-white tabular-nums sm:text-7xl">
            {format12h(targetTime)}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {next.label} {phase === 'adhaan' ? 'adhaan' : 'iqama'} ·{' '}
            {next.isToday ? 'Today' : 'Tomorrow'}
            {usesIqama ? (
              <span className="text-white/50">
                {' '}
                · {phase === 'adhaan' ? 'Iqama' : 'Adhaan'} at{' '}
                <span className="font-medium tabular-nums text-white/80">
                  {format12h(phase === 'adhaan' ? next.iqama : next.adhaan)}
                </span>
              </span>
            ) : null}
          </p>
        </div>
        <div className="sm:text-right">
          <p
            className="text-6xl font-bold tracking-tight text-gold tabular-nums sm:text-7xl"
            role="timer"
            aria-live="off"
          >
            -{formatHMS(remaining ?? 0)}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {phase === 'adhaan' ? 'Adhaan' : 'Iqama'} remaining
          </p>
        </div>
      </div>
    </div>
  )
}

function MarqueeRow() {
  const friday = isFriday(todayISODate())
  const source = friday
    ? FRIDAY_SUNNAHS.map((label) => ({ key: label, label }))
    : PRAYER_KEYS.filter((p) => p.key !== 'jumuah')
  const items = [...source, ...source]
  return (
    <div className="overflow-hidden border-y border-line/70 bg-cream/60 py-5" aria-hidden="true">
      <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap">
        {items.map((p, i) => (
          <span
            key={`${p.key}-${i}`}
            className="flex items-center gap-10 font-display text-2xl font-semibold tracking-tight text-ink-secondary/70"
          >
            {p.label}
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gold/60">
              <path d="M12 2l2.4 6.9H21l-5.6 4.1 2.1 6.9L12 15.9 6.5 19.9l2.1-6.9L3 8.9h6.6z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  )
}

function BentoPrayerTimes({ prayerTimes, next, loading }) {
  if (loading) return <LoadingState rows={3} />
  if (!prayerTimes) {
    return (
      <EmptyState
        title="No prayer times published yet"
        description="Times will appear here once an admin publishes today's schedule."
      />
    )
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {prayerTimes?.sunrise ? (
        <div className="flex items-center justify-between rounded-2xl border border-gold/30 bg-gold-soft px-4 py-3">
          <p className="font-display text-sm font-semibold text-ink-secondary">
            Sunrise
          </p>
          <p className="text-lg font-semibold tabular-nums text-ink">
            {format12h(prayerEntry(prayerTimes.sunrise).adhaan)}
          </p>
        </div>
      ) : null}
      {publicPrayerKeys(prayerTimes).map((p) => {
        const isNext = next?.key === p.key
        const { adhaan, iqama } = prayerEntry(prayerTimes[p.key])
        const gap = iqamaGapLabel(adhaan, iqama)
        return (
          <div
            key={p.key}
            className={`group relative overflow-hidden rounded-2xl border p-4 transition-transform duration-700 ease-out hover:scale-[1.02] ${
              isNext
                ? 'border-gold/50 bg-gold-soft'
                : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold text-ink-secondary">
                {p.label}
              </p>
              {isNext ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold tracking-wide text-deep uppercase">
                  Next
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-ink-secondary">Adhaan</span>
              <span className="text-lg font-semibold tabular-nums text-ink">
                {format12h(adhaan)}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs text-ink-secondary">Iqama</span>
              <span className="text-lg font-semibold tabular-nums text-ink">
                {format12h(iqama)}
              </span>
            </div>
            {p.key !== 'jumuah' && gap ? (
              <p className="mt-2 border-t border-line/70 pt-2 text-xs font-medium text-gold tabular-nums">
                {gap} after adhaan
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function ActivityList({ items, kind, loading }) {
  if (loading) return <LoadingState rows={4} />
  if (items.length === 0) {
    return (
      <EmptyState
        title={`No ${kind === 'funds' ? 'donations' : 'expenses'} recorded yet`}
        description="The latest activity will appear here."
      />
    )
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{item.note}</p>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {kind === 'expenses' && item.category ? `${item.category} · ` : ''}
              {formatDateTime(item.createdAt) === '—'
                ? relativeDayLabel(item.date)
                : formatDateTime(item.createdAt)}
            </p>
          </div>
          <span
            className={`shrink-0 text-sm font-semibold tabular-nums ${
              kind === 'funds' ? 'text-positive' : 'text-negative'
            }`}
          >
            {kind === 'funds' ? '+' : '−'}
            {formatCurrency(item.amount)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function Home() {
  const { profile } = useAuth()
  const {
    prayerTimes,
    recentFunds,
    recentExpenses,
    totals,
    upcomingEvents,
    openForms,
    loading,
    error,
  } = useHomeData()

  const now = new Date()
  const next = getNextPrayer(prayerTimes, now, publicPrayerKeys(prayerTimes))
  const stale = !loading && prayerTimes ? isStalePrayerTimes(prayerTimes, now) : false

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-canvas text-ink">
      <AppHeader />

      {/* Attention — cinematic hero */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden pt-24">
        <div
          className="absolute inset-0 scale-105"
          style={{
            backgroundImage:
              'url(https://picsum.photos/seed/cherukunnu-masjid/1920/1080)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'grayscale(0.35) contrast(1.25) brightness(0.8)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(7,24,18,0.25)_0%,rgba(7,24,18,0.9)_78%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 text-center sm:py-24">
          <p className="font-display text-xs font-semibold tracking-[0.35em] text-gold uppercase">
            Cherukunnu · Kannur
          </p>
          <h1 className="mx-auto mt-6 max-w-6xl font-display text-[clamp(2.6rem,6vw,5.5rem)] font-bold leading-[1.02] tracking-tight text-white">
            The call that gathers Cherukunnu.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/75">
            Prayer times, community funds, and expenses — kept open and
            transparent for every neighbour.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#prayer-times"
              className="inline-flex h-13 items-center gap-2 rounded-full bg-gold px-8 font-display text-base font-bold text-deep transition-transform duration-500 ease-out hover:scale-105"
            >
              Today&apos;s times <ArrowUpRight className="h-4 w-4" weight="bold" />
            </a>
            <a
              href="#community"
              className="inline-flex h-13 items-center gap-2 rounded-full border border-white/30 px-8 font-display text-base font-semibold text-white transition-colors duration-300 hover:bg-white/10"
            >
              Community funds <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/quran"
              className="inline-flex h-13 items-center gap-2 rounded-full border border-gold/50 bg-white/5 px-8 font-display text-base font-semibold text-white backdrop-blur-sm transition-colors duration-300 hover:bg-gold hover:text-deep"
            >
              Listen to the Quran <Headphones className="h-4 w-4" weight="fill" />
            </Link>
          </div>

          <div className="mx-auto mt-14 max-w-3xl">
            {loading ? (
              <div className="glass rounded-3xl p-6 text-left text-white/70">
                Loading tonight&apos;s call…
              </div>
            ) : prayerTimes ? (
              <div className="space-y-4">
                <DhuhaaBanner prayerTimes={prayerTimes} />
                <CountdownPanel prayerTimes={prayerTimes} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Marquee */}
      <MarqueeRow />

      {/* Interest — gapless bento */}
      <section id="prayer-times" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-display text-xs font-semibold tracking-[0.3em] text-gold uppercase">
                The daily rhythm
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                Today&apos;s prayer times
              </h2>
            </div>
            {prayerTimes ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-positive/10 px-3 py-1 text-xs font-semibold text-positive">
                  <Compass className="h-3.5 w-3.5" />
                  {relativeDayLabel(prayerTimes.date)}
                </span>
                <span className="text-xs text-ink-secondary">
                  Updated {formatDateTime(prayerTimes.updatedAt)}
                </span>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="mb-6 rounded-2xl border border-negative/30 bg-negative/10 p-4 text-sm text-negative" role="alert">
              Could not load data. Check your Firebase configuration.
            </p>
          ) : null}
          {stale && prayerTimes ? (
            <p className="mb-6 rounded-2xl border border-line bg-surface-subtle p-4 text-sm text-ink-secondary">
              These times are for an earlier date. An admin may not have published
              today&apos;s schedule yet.
            </p>
          ) : null}

          <div className="grid grid-cols-6 grid-flow-dense gap-4">
            <div className="col-span-6 rounded-3xl border border-line bg-surface p-5 lg:col-span-4 lg:row-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-ink">
                  Prayer schedule
                </h3>
                <Lightning className="h-5 w-5 text-gold" weight="fill" />
              </div>
              <BentoPrayerTimes prayerTimes={prayerTimes} next={next} loading={loading} />
            </div>

            <div className="col-span-6 overflow-hidden rounded-3xl border border-line bg-cream p-6 sm:col-span-3 lg:col-span-2">
              <p className="text-xs font-semibold tracking-wider text-ink-secondary uppercase">
                Collected
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-positive">
                {loading ? '…' : formatCurrency(totals.collected)}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
                All contributions received by the center.
              </p>
            </div>

            <div className="col-span-6 overflow-hidden rounded-3xl border border-line bg-cream p-6 sm:col-span-3 lg:col-span-2">
              <p className="text-xs font-semibold tracking-wider text-ink-secondary uppercase">
                Spent
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-negative">
                {loading ? '…' : formatCurrency(totals.spent)}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
                Every expense, listed and visible.
              </p>
            </div>

            <div id="community" className="col-span-6 overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:col-span-3 lg:col-span-2">
              <p className="text-xs font-semibold tracking-wider text-ink-secondary uppercase">
                Current balance
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-ink">
                {loading ? '…' : formatCurrency(totals.collected - totals.spent)}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
                Open books. No mystery money.
              </p>
            </div>

            <div className="col-span-6 rounded-3xl border border-line bg-surface p-6 sm:col-span-3 lg:col-span-4">
              <div className="mb-2 flex items-center gap-2">
                <HandCoins className="h-5 w-5 text-positive" />
                <h3 className="font-display text-lg font-bold text-ink">
                  Recent donations
                </h3>
              </div>
              <ActivityList items={recentFunds} kind="funds" loading={loading} />
            </div>

            <div className="col-span-6 rounded-3xl border border-line bg-surface p-6 sm:col-span-3 lg:col-span-4">
              <div className="mb-2 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-negative" />
                <h3 className="font-display text-lg font-bold text-ink">
                  Recent expenses
                </h3>
              </div>
              <ActivityList items={recentExpenses} kind="expenses" loading={loading} />
            </div>

            <div className="col-span-6 rounded-3xl border border-gold/40 bg-gold-soft p-6 lg:col-span-2">
              <Heart className="h-6 w-6 text-gold" weight="fill" />
              <p className="mt-4 font-display text-xl font-bold leading-snug text-ink">
                Your contribution keeps the lights on for the whole street.
              </p>
              {!profile ? (
                <Link
                  to="/login"
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-canvas transition-transform duration-500 ease-out hover:scale-105"
                >
                  Sign in <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {upcomingEvents.length > 0 ? (
        <section className="relative py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="font-display text-xs font-semibold tracking-[0.3em] text-gold uppercase">
                  The community calendar
                </p>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                  Upcoming events
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => {
                const d = new Date(event.eventAt)
                const day = d.toLocaleDateString('en-IN', { day: 'numeric' })
                const month = d
                  .toLocaleDateString('en-IN', { month: 'short' })
                  .toUpperCase()
                return (
                  <div
                    key={event.id}
                    className="group flex gap-5 overflow-hidden rounded-3xl border border-line bg-surface p-6 transition-transform duration-500 ease-out hover:scale-[1.02]"
                  >
                    <div className="flex h-fit w-16 shrink-0 flex-col items-center rounded-2xl border border-gold/40 bg-gold-soft pt-3 pb-2">
                      <span className="font-display text-2xl font-bold tracking-tight text-ink">
                        {day}
                      </span>
                      <span className="text-xs font-semibold tracking-widest text-gold">
                        {month}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold leading-snug text-ink">
                        {event.title}
                      </h3>
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-ink-secondary">
                        <span>
                          {d.toLocaleTimeString('en-IN', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        {event.location ? (
                          <span>· {event.location}</span>
                        ) : null}
                      </p>
                      {event.description ? (
                        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-secondary">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {openForms.length > 0 ? (
        <section className="relative py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="font-display text-xs font-semibold tracking-[0.3em] text-gold uppercase">
                  Open registrations
                </p>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                  Sign up for what&apos;s coming
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {openForms.map((form) => (
                <Link
                  key={form.id}
                  to={`/forms/${form.id}`}
                  className="group flex flex-col rounded-3xl border border-line bg-surface p-6 transition-transform duration-500 ease-out hover:scale-[1.02]"
                >
                  <p className="text-xs font-semibold tracking-wider text-gold uppercase">
                    {form.event || 'Registration form'}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-bold leading-snug text-ink">
                    {form.title}
                  </h3>
                  {form.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-secondary">
                      {form.description}
                    </p>
                  ) : null}
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Fill the form <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}
