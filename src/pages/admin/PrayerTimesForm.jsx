import { useEffect, useState } from 'react'
import { addPrayerTimes } from '../../lib/firestore'
import {
  PRAYER_KEYS,
  addMinutes,
  isFriday,
  prayerEntry,
  prayerKeysForDate,
  toMinutes,
  todayISODate,
} from '../../lib/utils'
import { CALCULATION_METHODS, fetchPrayerTimes, getCurrentPosition } from '../../lib/prayerApi'
import Button from '../../components/Button'
import Field, { inputClass } from '../../components/Field'

function withGap(values, mins) {
  return Object.fromEntries(
    Object.entries(values).map(([key, entry]) =>
      key === 'jumuah'
        ? [key, entry]
        : [
            key,
            {
              ...entry,
              gap: mins,
              iqama: entry.adhaan ? addMinutes(entry.adhaan, mins) : '',
            },
          ]
    )
  )
}

function toGap(value, fallback = 10) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function toOffset(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function PrayerTimesForm({ onSaved, initialValues }) {
  const current = initialValues ?? {}
  const defaultGap = toGap(current.iqamaGapMinutes, 10)
  const [date, setDate] = useState(current.date || todayISODate())
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      PRAYER_KEYS.map((p) => {
        const entry = prayerEntry(current[p.key])
        return [
          p.key,
          {
            adhaan: entry.adhaan,
            iqama: entry.iqama,
            gap: toGap(current[p.key]?.gap, defaultGap),
            offset: toOffset(current[p.key]?.offset),
          },
        ]
      })
    )
  )
  const [method, setMethod] = useState('3')
  const [gap, setGap] = useState(defaultGap)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)

  // On Fridays the Jumuah card borrows Dhuhr's adhaan (Friday's first
  // adhaan is the dhuhr adhaan); its iqama stays a fixed manual entry.
  useEffect(() => {
    if (!isFriday(date)) return
    setValues((v) => {
      const d = v.dhuhr
      const j = v.jumuah
      if (!d.adhaan || j.adhaan) return v
      return {
        ...v,
        jumuah: { ...j, adhaan: d.adhaan, offset: d.offset ?? 0 },
      }
    })
  }, [date])

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
            iqama:
              key === 'jumuah'
                ? entry.iqama
                : value
                  ? addMinutes(value, entry.gap)
                  : '',
          },
        }
      }
      if (part === 'gap') {
        if (key === 'jumuah' || !Number.isFinite(mins) || mins < 0) return v
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

  function adjustAdhaan(key, delta) {
    setValues((v) => {
      const entry = v[key]
      const base = toMinutes(entry.adhaan)
      if (base === null) return v
      const total = base + delta
      if (total < 0 || total >= 24 * 60) return v
      const adhaan = addMinutes(entry.adhaan, delta)
      return {
        ...v,
        [key]: {
          ...entry,
          offset: (entry.offset ?? 0) + delta,
          adhaan,
          iqama:
            key === 'jumuah' ? entry.iqama : addMinutes(adhaan, entry.gap),
        },
      }
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
          const offset = next[key].offset ?? 0
          const adhaan = time ? addMinutes(time, offset) : ''
          next[key] = {
            ...next[key],
            gap: entryGap,
            offset,
            adhaan,
            iqama: adhaan ? addMinutes(adhaan, entryGap) : '',
          }
        }
        if (isFriday(date) && next.dhuhr?.adhaan && !next.jumuah?.adhaan) {
          next.jumuah = {
            ...next.jumuah,
            adhaan: next.dhuhr.adhaan,
            offset: next.dhuhr.offset ?? 0,
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
        {prayerKeysForDate(date).map((p) => {
          const isJumuah = p.key === 'jumuah'
          const offset = values[p.key].offset ?? 0
          return (
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
              {isJumuah ? (
                <p className="mt-2 rounded-md border border-gold/30 bg-gold-soft px-2 py-1.5 text-xs text-ink-secondary">
                  Jumuah iqama is a fixed time — set it directly, it does not
                  follow the adhaan.
                </p>
              ) : (
                <>
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
                  <div className="mt-3 border-t border-line/70 pt-2">
                    <p className="mb-1 text-xs text-ink-secondary">Adjust adhaan</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustAdhaan(p.key, -1)}
                        disabled={!values[p.key].adhaan}
                        aria-label={`Subtract 1 minute from ${p.label} adhaan`}
                        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-line text-lg text-ink transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span
                        className={`flex-1 text-center text-sm font-semibold tabular-nums ${
                          offset > 0
                            ? 'text-positive'
                            : offset < 0
                              ? 'text-negative'
                              : 'text-ink-secondary'
                        }`}
                      >
                        {offset > 0 ? `+${offset} min` : offset < 0 ? `${offset} min` : 'No change'}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustAdhaan(p.key, 1)}
                        disabled={!values[p.key].adhaan}
                        aria-label={`Add 1 minute to ${p.label} adhaan`}
                        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-line text-lg text-ink transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
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
