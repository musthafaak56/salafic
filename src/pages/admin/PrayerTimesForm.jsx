import { useState } from 'react'
import { addPrayerTimes } from '../../lib/firestore'
import { PRAYER_KEYS, addMinutes, todayISODate } from '../../lib/utils'
import { CALCULATION_METHODS, fetchPrayerTimes, getCurrentPosition } from '../../lib/prayerApi'
import Button from '../../components/Button'
import Field, { inputClass } from '../../components/Field'

function withGap(values, mins) {
  return Object.fromEntries(
    Object.entries(values).map(([key, entry]) => [
      key,
      {
        ...entry,
        gap: mins,
        iqama: entry.adhaan ? addMinutes(entry.adhaan, mins) : '',
      },
    ])
  )
}

export default function PrayerTimesForm({ onSaved, defaultGap = 10 }) {
  const [date, setDate] = useState(todayISODate())
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      PRAYER_KEYS.map((p) => [p.key, { adhaan: '', iqama: '', gap: defaultGap }])
    )
  )
  const [method, setMethod] = useState('3')
  const [gap, setGap] = useState(defaultGap)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)

  function update(key, part, value) {
    setValues((v) => {
      const entry = v[key]
      const mins = Number(value)
      if (part === 'adhaan') {
        return {
          ...v,
          [key]: {
            ...entry,
            adhaan: value,
            iqama: value ? addMinutes(value, entry.gap) : '',
          },
        }
      }
      if (part === 'gap') {
        if (!Number.isFinite(mins) || mins < 0) return v
        return {
          ...v,
          [key]: {
            ...entry,
            gap: mins,
            iqama: entry.adhaan ? addMinutes(entry.adhaan, mins) : '',
          },
        }
      }
      return { ...v, [key]: { ...entry, iqama: value } }
    })
  }

  function updateGap(e) {
    const mins = Number(e.target.value)
    if (!Number.isFinite(mins) || mins < 0) return
    setGap(mins)
    setValues((v) => withGap(v, mins))
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
          const entryGap = next[key].gap ?? gap
          next[key] = {
            ...next[key],
            gap: entryGap,
            adhaan: time,
            iqama: time ? addMinutes(time, entryGap) : '',
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
      await addPrayerTimes('main', {
        date,
        iqamaGapMinutes: gap,
        ...values,
      })
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

      <div className="flex flex-wrap items-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleFetch}
          loading={fetching}
        >
          {fetching ? 'Detecting location…' : 'Fetch times by location'}
        </Button>
        <Field
          label="Apply this gap to all prayers"
          htmlFor="pt-gap"
          hint="Overrides each prayer's individual gap below."
        >
          <input
            id="pt-gap"
            type="number"
            min="0"
            max="120"
            value={gap}
            onChange={updateGap}
            className={`${inputClass} w-28`}
          />
        </Field>
      </div>

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
            <div className="mt-2">
              <label
                htmlFor={`pt-${p.key}-gap`}
                className="mb-1 block text-xs text-ink-secondary"
              >
                Gap after adhaan (min)
              </label>
              <input
                id={`pt-${p.key}-gap`}
                type="number"
                min="0"
                max="120"
                value={values[p.key].gap}
                onChange={(e) => update(p.key, 'gap', e.target.value)}
                className={`${inputClass} w-24`}
              />
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
