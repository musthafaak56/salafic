import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useCenter } from '../context/CenterContext'
import { centerDocument, record } from '../lib/platform'
import { calculateSchedule, localDate, timeLabel } from '../lib/centerPrayer'
import { PRAYERS } from '../../functions/domain'
import { Input, Message, Shell } from '../components/PlatformUI'
import { PrayerBoard } from '../components/CenterPublicParts'
import { Publishing } from './CenterAdmin'
import Button from '../components/Button'

export default function CenterTimetable() {
  const { center, centerId } = useCenter(),
    [month, setMonth] = useState(localDate(center.timezone).slice(0, 7)),
    [manual, setManual] = useState({}),
    [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setError('')
    setManual({})
    getDocs(
      query(
        collection(centerDocument(centerId), 'prayerTimes'),
        where('date', '>=', `${month}-01`),
        where('date', '<=', `${month}-31`),
      ),
    )
      .then((s) => {
        if (active)
          setManual(Object.fromEntries(s.docs.map((d) => [d.id, d.data()])))
      })
      .catch(() => {
        if (active)
          setError(
            'Published timetable could not be loaded. Calculated times below may not include manual overrides.',
          )
      })
    return () => {
      active = false
    }
  }, [centerId, month])
  const [year, m] = month.split('-').map(Number),
    count = new Date(year, m, 0).getDate()
  let rows = []
  try {
    rows = Array.from({ length: count }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, '0')}`
      return calculateSchedule(center, date, manual[date])
    })
  } catch {}
  return (
    <Shell
      title="Monthly prayer timetable"
      eyebrow={center.displayName}
      description={`Times are shown in ${center.timezone}. Published manual schedules take precedence over calculated times.`}
    >
      <div className="platform-row">
        <Input label="Month" type="month" value={month} onChange={setMonth} />
        <Button variant="outline" onClick={() => window.print()}>
          Print / save PDF
        </Button>
      </div>
      {error && <Message error>{error}</Message>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="text-start py-4">
            {center.displayName} · {month} · Adhan / Iqamah
          </caption>
          <thead>
            <tr>
              <th className="p-3 text-start">Date</th>
              {PRAYERS.map((p) => (
                <th key={p} className="p-3 capitalize text-start">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.date} className="border-t border-line">
                <th className="p-3 text-start">
                  {s.date.slice(-2)}
                  {manual[s.date] ? ' *' : ''}
                </th>
                {s.prayers.map((p) => (
                  <td
                    className="p-3 whitespace-nowrap tabular-nums"
                    key={p.key}
                  >
                    {timeLabel(p.at, center)}
                    <br />
                    <span className="text-ink-secondary">
                      {timeLabel(p.iqama, center)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="platform-hint">
        * Published manual timetable. Other dates use the location and saved
        adjustments.
      </p>
    </Shell>
  )
}

export function ManualTimetable() {
  const { center, centerId } = useCenter(),
    [date, setDate] = useState(localDate(center.timezone)),
    [form, setForm] = useState(null),
    [version, setVersion] = useState(0),
    [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setForm(null)
    setError('')
    record(centerId, 'prayerTimes', date)
      .then((saved) => {
        if (!active) return
        const schedule = calculateSchedule(center, date, saved)
        const fmt = (iso) =>
          new Intl.DateTimeFormat('en-GB', {
            timeZone: center.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          }).format(new Date(iso))
        setForm({
          date,
          ...Object.fromEntries(
            schedule.prayers.map((p) => [
              p.key,
              { adhaan: fmt(p.at), iqama: fmt(p.iqama) },
            ]),
          ),
        })
        setVersion(saved?.version || 0)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
  }, [centerId, date])
  return (
    <section className="platform-section">
      <h2>Date-specific timetable</h2>
      <p>
        Override a single date with exact local times. Saved minute offsets will
        not be applied again.
      </p>
      <Input
        label="Schedule date"
        type="date"
        value={date}
        onChange={setDate}
      />
      {error && <Message error>{error}</Message>}
      {form && (
        <>
          <div className="adjustment-grid">
            {PRAYERS.map((key) => (
              <div key={key}>
                <Input
                  label={`${key} adhan`}
                  type="time"
                  value={form[key].adhaan}
                  onChange={(adhaan) =>
                    setForm({ ...form, [key]: { ...form[key], adhaan } })
                  }
                />
                <Input
                  label={`${key} iqamah`}
                  type="time"
                  value={form[key].iqama}
                  onChange={(iqama) =>
                    setForm({ ...form, [key]: { ...form[key], iqama } })
                  }
                />
              </div>
            ))}
          </div>
          <Publishing
            key={date}
            kind="manual"
            id={date}
            payload={form}
            version={version}
            onPublished={async () => {
              setVersion(
                (await record(centerId, 'prayerTimes', date))?.version || 0,
              )
            }}
          >
            {(draft) => (
              <PrayerBoard
                center={center}
                schedules={[calculateSchedule(center, date, draft)]}
                preview
              />
            )}
          </Publishing>
        </>
      )}
    </section>
  )
}
