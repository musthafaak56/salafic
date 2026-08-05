import { useEffect, useState } from 'react'
import { getLatestPrayerTimes } from '../../lib/firestore'
import {
  PRAYER_KEYS,
  format12h,
  formatDateTime,
  getNextPrayer,
  iqamaGapLabel,
  isStalePrayerTimes,
  prayerEntry,
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
              ? `${relativeDayLabel(current.date)} · Updated ${formatDateTime(current.updatedAt)}`
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
                <span className="font-semibold tabular-nums">
                  {format12h(next.time)}
                </span>
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PRAYER_KEYS.map((p) => {
                const { adhaan, iqama } = prayerEntry(current[p.key])
                const gap = iqamaGapLabel(adhaan, iqama)
                return (
                  <div
                    key={p.key}
                    className="rounded-lg border border-line bg-canvas px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-ink">{p.label}</p>
                    <dl className="mt-1 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-ink-secondary">Adhaan</dt>
                        <dd className="font-semibold tabular-nums text-ink">
                          {format12h(adhaan)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-secondary">Iqama</dt>
                        <dd className="font-semibold tabular-nums text-ink">
                          {format12h(iqama)}
                        </dd>
                      </div>
                    </dl>
                    {gap ? (
                      <p className="mt-1.5 border-t border-line/70 pt-1.5 text-xs font-medium text-primary tabular-nums">
                        {gap} after adhaan
                      </p>
                    ) : null}
                  </div>
                )
              })}
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
        <PrayerTimesForm
          onSaved={loadData}
          defaultGap={current?.iqamaGapMinutes ?? 10}
        />
      </Card>
    </div>
  )
}
