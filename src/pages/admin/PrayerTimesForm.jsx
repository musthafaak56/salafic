import { useState } from 'react'
import { addPrayerTimes } from '../../lib/firestore'
import { PRAYER_KEYS, todayISODate } from '../../lib/utils'
import { CALCULATION_METHODS, fetchPrayerTimes, getCurrentPosition } from '../../lib/prayerApi'
import Button from '../../components/Button'
import Field, { inputClass } from '../../components/Field'

function emptyValues() {
  return Object.fromEntries(
    PRAYER_KEYS.map((p) => [p.key, { adhaan: '', iqama: '' }])
  )
}

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const total = h * 60 + m + mins
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function PrayerTimesForm({ onSaved }) {
  const [date, setDate] = useState(todayISODate())
  const [values, setValues] = useState(emptyValues)
  const [method, setMethod] = useState('3')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)

  function update(key, part, value) {
    setValues((v) => ({
      ...v,
      [key]: { ...v[key], [part]: value },
    }))
  }

  async function handleFetch() {
    setError('')
    setFetching(true)
    try {
      const { latitude, longitude } = await getCurrentPosition()
      const fetched = await fetchPrayerTimes({ latitude, longitude, date, method })
      setValues((v) => {
        const next = { ...v }
        for (const [key, time] of Object.entries(fetched)) {
          if (key === 'location' || !next[key]) continue
          next[key] = {
            adhaan: time,
            iqama: time ? addMinutes(time, 10) : '',
          }
        }
        return next
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSuccess(false)
    setError('')
    setSaving(true)
    try {
      await addPrayerTimes('main', { date, ...values })
      setSuccess(true)
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Date"
          htmlFor="pt-date"
          hint="Which day do these times apply to?"
        >
          <input
            id="pt-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Calculation method"
          htmlFor="pt-method"
          hint="Used only when fetching from the API."
        >
          <select
            id="pt-method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputClass}
          >
            {CALCULATION_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleFetch}
        loading={fetching}
      >
        {fetching ? 'Detecting location…' : 'Fetch times by location'}
      </Button>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRAYER_KEYS.map((p) => (
          <div key={p.key} className="rounded-lg border border-line bg-canvas p-3">
            <p className="mb-2 text-sm font-semibold text-ink">{p.label}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor={`pt-${p.key}-adhaan`}
                  className="mb-1 block text-xs text-ink-secondary"
                >
                  Adhaan
                </label>
                <input
                  id={`pt-${p.key}-adhaan`}
                  type="time"
                  required
                  value={values[p.key].adhaan}
                  onChange={(e) => update(p.key, 'adhaan', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor={`pt-${p.key}-iqama`}
                  className="mb-1 block text-xs text-ink-secondary"
                >
                  Iqama
                </label>
                <input
                  id={`pt-${p.key}-iqama`}
                  type="time"
                  value={values[p.key].iqama}
                  onChange={(e) => update(p.key, 'iqama', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-positive/30 bg-positive/10 p-3 text-sm text-positive" role="status">
          Prayer times saved for {date}.
        </p>
      ) : null}
      <Button type="submit" loading={saving}>
        {saving ? 'Saving…' : 'Save prayer times'}
      </Button>
    </form>
  )
}
