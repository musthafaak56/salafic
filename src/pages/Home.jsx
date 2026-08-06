import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getLatestPrayerTimes,
  getFunds,
  getAllFunds,
  getExpenses,
  getAllExpenses,
} from '../lib/firestore'
import {
  PRAYER_KEYS,
  format12h,
  formatCurrency,
  formatDateTime,
  formatHMS,
  fullDateLabel,
  getNextPrayer,
  iqamaGapLabel,
  isStalePrayerTimes,
  prayerEntry,
  relativeDayLabel,
  secondsUntil,
} from '../lib/utils'
import AppHeader from '../components/AppHeader'
import PageContainer from '../components/PageContainer'
import Card from '../components/Card'
import Stat from '../components/Stat'
import StatusBadge from '../components/StatusBadge'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'

function useHomeData() {
  const [prayerTimes, setPrayerTimes] = useState(null)
  const [recentFunds, setRecentFunds] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [totals, setTotals] = useState({ collected: 0, spent: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [times, recentF, recentE, allF, allE] = await Promise.all([
          getLatestPrayerTimes(),
          getFunds(),
          getExpenses(),
          getAllFunds(),
          getAllExpenses(),
        ])
        setPrayerTimes(times)
        setRecentFunds(recentF)
        setRecentExpenses(recentE)
        setTotals({
          collected: allF.reduce((s, f) => s + (Number(f.amount) || 0), 0),
          spent: allE.reduce((s, e) => s + (Number(e.amount) || 0), 0),
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { prayerTimes, recentFunds, recentExpenses, totals, loading, error }
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function NextPrayerPanel({ prayerTimes }) {
  const now = useNow()
  const next = getNextPrayer(prayerTimes, now)
  if (!next) return null
  const usesIqama = Boolean(next.iqama)
  const toAdhaan = secondsUntil(next.adhaan, !next.isToday, now)
  const toIqama = secondsUntil(next.iqama, !next.isToday, now)
  const phase =
    usesIqama && (toAdhaan === null || toAdhaan === 0) ? 'iqama' : 'adhaan'
  const remaining = phase === 'adhaan' ? toAdhaan : toIqama
  const targetTime = phase === 'adhaan' ? next.adhaan : next.iqama
  return (
    <Card className="border-primary/40 bg-surface-subtle p-6">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-ink-secondary">Next prayer</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight text-ink tabular-nums sm:text-6xl">
            {format12h(targetTime)}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {next.label} {phase === 'adhaan' ? 'adhaan' : 'iqama'} ·{' '}
            {next.isToday ? 'Today' : 'Tomorrow'}
          </p>
          {usesIqama ? (
            <p className="mt-0.5 text-xs text-ink-secondary">
              {phase === 'adhaan' ? 'Iqama' : 'Adhaan'} at{' '}
              <span className="font-medium tabular-nums">
                {format12h(phase === 'adhaan' ? next.iqama : next.adhaan)}
              </span>
            </p>
          ) : null}
        </div>
        <div className="text-left sm:text-right">
          <p
            className="text-5xl font-semibold tracking-tight text-negative tabular-nums sm:text-6xl"
            role="timer"
            aria-live="off"
          >
            -{formatHMS(remaining ?? 0)}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {phase === 'adhaan' ? 'Adhaan' : 'Iqama'} remaining
          </p>
        </div>
      </div>
    </Card>
  )
}

function PrayerTable({ prayerTimes, next, loading }) {
  if (loading) return <LoadingState rows={1} />
  if (!prayerTimes) {
    return (
      <EmptyState
        title="No prayer times published yet"
        description="Times will appear here once an admin publishes today's schedule."
      />
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {PRAYER_KEYS.map((p) => {
        const isNext = next?.key === p.key
        const { adhaan, iqama } = prayerEntry(prayerTimes[p.key])
        const gap = iqamaGapLabel(adhaan, iqama)
        return (
          <div
            key={p.key}
            className={`relative rounded-lg border p-3 ${
              isNext
                ? 'border-primary bg-primary-soft'
                : 'border-line bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-secondary">{p.label}</p>
              {isNext ? <StatusBadge tone="primary">Next</StatusBadge> : null}
            </div>
            <div className="mt-2 space-y-1.5">
              <p className="flex items-baseline justify-between gap-1 text-sm">
                <span className="text-xs text-ink-secondary">Adhaan</span>
                <span className="font-semibold tabular-nums text-ink">
                  {format12h(adhaan)}
                </span>
              </p>
              <p className="flex items-baseline justify-between gap-1 text-sm">
                <span className="text-xs text-ink-secondary">Iqama</span>
                <span className="font-semibold tabular-nums text-ink">
                  {format12h(iqama)}
                </span>
              </p>
              {gap ? (
                <p className="border-t border-line/70 pt-1.5 text-xs font-medium text-primary tabular-nums">
                  {gap} after adhaan
                </p>
              ) : null}
            </div>
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
              {formatTime(item.createdAt) === '—'
                ? relativeDayLabel(item.date)
                : formatTime(item.createdAt)}
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
  const { prayerTimes, recentFunds, recentExpenses, totals, loading, error } =
    useHomeData()

  const now = new Date()
  const next = getNextPrayer(prayerTimes, now)
  const stale = !loading && prayerTimes ? isStalePrayerTimes(prayerTimes, now) : false

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AppHeader />
      <PageContainer className="space-y-10">
        <section className="max-w-2xl">
          <p className="text-sm font-medium text-ink-secondary">{fullDateLabel(now)}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Welcome to Salafic Masjid
          </h1>
          <p className="mt-3 text-base text-ink-secondary">
            Prayer times, community funds, and expenses — kept open and transparent.
          </p>
        </section>

        {error ? (
          <p className="rounded-lg border border-negative/30 bg-negative/10 p-4 text-sm text-negative" role="alert">
            Could not load data. Check your Firebase configuration.
          </p>
        ) : null}

        <section aria-label="Next prayer">
          {loading ? (
            <LoadingState rows={1} />
          ) : prayerTimes ? (
            <NextPrayerPanel prayerTimes={prayerTimes} />
          ) : null}
        </section>

        <section aria-labelledby="prayer-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="prayer-heading" className="text-xl font-semibold text-ink">
              Prayer times
            </h2>
            {prayerTimes ? (
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={stale ? 'default' : 'positive'}>
                  {relativeDayLabel(prayerTimes.date)}
                </StatusBadge>
                <span className="text-xs text-ink-secondary">
                  Updated {formatDateTime(prayerTimes.updatedAt)}
                </span>
              </div>
            ) : null}
          </div>
          {stale && prayerTimes ? (
            <p className="mb-4 rounded-lg border border-line bg-surface-subtle p-3 text-sm text-ink-secondary">
              These times are for an earlier date. An admin may not have published
              today&apos;s schedule yet.
            </p>
          ) : null}
          <PrayerTable prayerTimes={prayerTimes} next={next} loading={loading} />
        </section>

        <section aria-labelledby="finance-heading">
          <div className="mb-4">
            <h2 id="finance-heading" className="text-xl font-semibold text-ink">
              Community finances
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Money collected and spent, visible to everyone.
            </p>
          </div>
          <Card className="p-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <Stat
                label="Collected"
                value={loading ? '…' : formatCurrency(totals.collected)}
                tone="positive"
              />
              <Stat
                label="Spent"
                value={loading ? '…' : formatCurrency(totals.spent)}
                tone="negative"
              />
              <Stat
                label="Current balance"
                value={loading ? '…' : formatCurrency(totals.collected - totals.spent)}
              />
            </div>
          </Card>
        </section>

        <section className="grid gap-8 lg:grid-cols-2" aria-label="Latest activity">
          <Card className="p-6">
            <h3 className="mb-2 text-lg font-semibold text-ink">Recent donations</h3>
            <ActivityList items={recentFunds} kind="funds" loading={loading} />
          </Card>
          <Card className="p-6">
            <h3 className="mb-2 text-lg font-semibold text-ink">Recent expenses</h3>
            <ActivityList items={recentExpenses} kind="expenses" loading={loading} />
          </Card>
        </section>

        {!profile ? (
          <p className="text-center text-sm text-ink-secondary">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>{' '}
            to manage this masjid&apos;s data.
          </p>
        ) : null}
      </PageContainer>
    </div>
  )
}
