import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getLatestPrayerTimes,
  getAllFunds,
  getAllExpenses,
} from '../../lib/firestore'
import {
  format12h,
  formatCurrency,
  formatTime,
  fullDateLabel,
  getNextPrayer,
  isStalePrayerTimes,
  todayISODate,
} from '../../lib/utils'
import Card from '../../components/Card'
import Stat from '../../components/Stat'
import StatusBadge from '../../components/StatusBadge'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'
import SectionHeading from '../../components/SectionHeading'

function isToday(dateStr) {
  return String(dateStr ?? '').slice(0, 10) === todayISODate()
}

export default function Overview() {
  const [prayerTimes, setPrayerTimes] = useState(null)
  const [funds, setFunds] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [times, allF, allE] = await Promise.all([
          getLatestPrayerTimes(),
          getAllFunds(),
          getAllExpenses(),
        ])
        setPrayerTimes(times)
        setFunds(allF)
        setExpenses(allE)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const now = new Date()
  const next = getNextPrayer(prayerTimes, now)
  const stale = prayerTimes ? isStalePrayerTimes(prayerTimes, now) : false
  const collected = funds.reduce((s, f) => s + (Number(f.amount) || 0), 0)
  const spent = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const todayFunds = funds.filter((f) => isToday(f.date))
  const todayExpenses = expenses.filter((e) => isToday(e.date))

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-ink-secondary">{fullDateLabel(now)}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Overview
        </h1>
      </section>

      <section aria-label="Balance snapshot">
        <Card className="p-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <Stat
              label="Collected"
              value={loading ? '…' : formatCurrency(collected)}
              tone="positive"
            />
            <Stat
              label="Spent"
              value={loading ? '…' : formatCurrency(spent)}
              tone="negative"
            />
            <Stat
              label="Current balance"
              value={loading ? '…' : formatCurrency(collected - spent)}
            />
          </div>
        </Card>
      </section>

      <section className="grid gap-8 lg:grid-cols-2" aria-label="Prayer status and quick actions">
        <Card className="p-6">
          <SectionHeading
            title="Prayer times"
            subtitle={prayerTimes ? `For ${prayerTimes.date}` : 'No schedule yet'}
          />
          {loading ? (
            <LoadingState rows={1} />
          ) : prayerTimes ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {next ? (
                  <p className="text-sm text-ink">
                    Next:{' '}
                    <span className="font-semibold">{next.label}</span> at{' '}
                    <span className="font-semibold tabular-nums">{format12h(next.time)}</span>
                  </p>
                ) : null}
                <StatusBadge tone={stale ? 'default' : 'positive'}>
                  {stale ? 'Needs update' : 'Current'}
                </StatusBadge>
              </div>
              <p className="text-xs text-ink-secondary">
                Last updated {formatTime(prayerTimes.updatedAt)}
              </p>
            </div>
          ) : (
            <EmptyState
              title="No prayer times published"
              description="Publish a schedule so visitors see today's times."
              action={
                <Link
                  to="/admin/prayer-times"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  Add prayer times
                </Link>
              }
            />
          )}
        </Card>

        <Card className="p-6">
          <SectionHeading title="Quick actions" />
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/donations"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Record donation
            </Link>
            <Link
              to="/admin/expenses"
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-subtle"
            >
              Record expense
            </Link>
            <Link
              to="/admin/prayer-times"
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-subtle"
            >
              Update prayer times
            </Link>
          </div>
        </Card>
      </section>

      <section className="grid gap-8 lg:grid-cols-2" aria-label="Today's records">
        <Card className="p-6">
          <SectionHeading
            title="Today's donations"
            action={
              <span className="text-sm font-semibold tabular-nums text-positive">
                {loading ? '' : formatCurrency(todayFunds.reduce((s, f) => s + (Number(f.amount) || 0), 0))}
              </span>
            }
          />
          <TodayList
            items={todayFunds}
            kind="funds"
            loading={loading}
            emptyTitle="No donations recorded today"
            emptyDescription="Record the day's donations to keep totals current."
          />
        </Card>
        <Card className="p-6">
          <SectionHeading
            title="Today's expenses"
            action={
              <span className="text-sm font-semibold tabular-nums text-negative">
                {loading ? '' : formatCurrency(todayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0))}
              </span>
            }
          />
          <TodayList
            items={todayExpenses}
            kind="expenses"
            loading={loading}
            emptyTitle="No expenses recorded today"
            emptyDescription="Record any spending to keep the ledger complete."
          />
        </Card>
      </section>
    </div>
  )
}

function TodayList({ items, kind, loading, emptyTitle, emptyDescription }) {
  if (loading) return <LoadingState rows={3} />
  if (items.length === 0)
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    )
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4 py-3">
          <p className="min-w-0 truncate text-sm font-medium text-ink">{item.note}</p>
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
