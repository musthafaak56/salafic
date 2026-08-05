import { useEffect, useState } from 'react'
import { getFunds } from '../../lib/firestore'
import { formatCurrency, formatTime, relativeDayLabel } from '../../lib/utils'
import Card from '../../components/Card'
import SectionHeading from '../../components/SectionHeading'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'
import DonationForm from './DonationForm'

function TransactionList({ items, kind, loading }) {
  if (loading) return <LoadingState rows={4} />
  if (items.length === 0)
    return (
      <EmptyState
        title={`No ${kind === 'funds' ? 'donations' : 'expenses'} yet`}
        description="Use the form to record the first entry."
      />
    )
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{item.note}</p>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {kind === 'expenses' && item.category ? `${item.category} · ` : ''}
              {item.byName || 'Admin'} ·{' '}
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

export default function Donations() {
  const [funds, setFunds] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    const f = await getFunds('main', 25)
    setFunds(f)
    setLoading(false)
  }

  useEffect(() => {
    loadData().catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Donations</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Record money received. Everyone can see the totals on the home page.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <SectionHeading title="Record a donation" />
          <DonationForm onSaved={loadData} />
        </Card>

        <Card className="p-6">
          <SectionHeading title="Recent donations" />
          <TransactionList items={funds} kind="funds" loading={loading} />
        </Card>
      </section>
    </div>
  )
}
