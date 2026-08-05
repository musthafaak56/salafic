import { useState } from 'react'
import { addPrayerTimes } from '../../lib/firestore'
import { todayISODate } from '../../lib/utils'
import Button from '../../components/Button'
import Field, { inputClass } from '../../components/Field'

const PRAYER_FIELDS = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'dhuhr', label: 'Dhuhr' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha', label: 'Isha' },
  { key: 'jumuah', label: 'Jumuah' },
]

export default function PrayerTimesForm({ onSaved }) {
  const [date, setDate] = useState(todayISODate())
  const [values, setValues] = useState({
    fajr: '',
    dhuhr: '',
    asr: '',
    maghrib: '',
    isha: '',
    jumuah: '',
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }))
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
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {PRAYER_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`pt-${f.key}`}>
            <input
              id={`pt-${f.key}`}
              type="time"
              required
              value={values[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              className={inputClass}
            />
          </Field>
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
