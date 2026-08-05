import { useEffect, useState } from 'react'
import { getLatestPrayerTimes } from '../../lib/firestore'
import {
  PRAYER_KEYS,
  formatTime,
  getNextPrayer,
  isStalePrayerTimes,
  relativeDayLabel,
} from '../../lib/utils'
import Card from '../../components/Card'
import SectionHeading from '../../components/SectionHeading'
import StatusBadge from '../../components/StatusBadge'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'
import PrayerTimesForm from './PrayerTimesForm'

export default function PrayerTimes() {
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    const t = await getLatestPrayerTimes()
    setCurrent(t)
    setLoading(false)
  }

  useEffect(() => {
    loadData().catch(() => setLoading(false))
  }, [])

  const now = new Date()
  const next = getNextPrayer(current, now)
  const stale = current ? isStalePrayerTimes(current, now) : false

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Prayer times
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Publish the daily schedule. Visitors see it on the home page.
        </p>
      </section>

      <Card className="p-6">
        <SectionHeading
          title="Currently published"
          subtitle={
            current
              ? `${relativeDayLabel(current.date)} · Updated ${formatTime(current.updatedAt)}`
              : 'Nothing published yet'
          }
          action={
            current ? (
              <StatusBadge tone={stale ? 'default' : 'positive'}>
                {stale ? 'Needs update' : 'Current'}
              </StatusBadge>
            ) : null
          }
        />
        {loading ? (
          <LoadingState rows={1} />
        ) : current ? (
          <div className="space-y-3">
            {next ? (
              <p className="text-sm text-ink">
                Next:{' '}
                <span className="font-semibold">{next.label}</span> at{' '}
                <span className="font-semibold tabular-nums">{next.time}</span>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {PRAYER_KEYS.map((p) => (
                <span
                  key={p.key}
                  className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm"
                >
                  <span className="text-ink-secondary">{p.label}</span>{' '}
                  <span className="font-semibold tabular-nums text-ink">
                    {current[p.key] || '—'}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No prayer times published"
            description="Use the form to publish today's schedule."
          />
        )}
      </Card>

      <Card className="p-6">
        <SectionHeading title="Publish times" />
        <PrayerTimesForm onSaved={loadData} />
      </Card>
    </div>
  )
}
