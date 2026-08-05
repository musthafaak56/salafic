import { useState } from 'react'
import { addPrayerTimes } from '../../lib/firestore'
import { todayISODate } from '../../lib/utils'

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
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)
    try {
      await addPrayerTimes('main', { date, ...values })
      setMessage('Prayer times saved')
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'fajr', label: 'Fajr' },
    { key: 'dhuhr', label: 'Dhuhr' },
    { key: 'asr', label: 'Asr' },
    { key: 'maghrib', label: 'Maghrib' },
    { key: 'isha', label: 'Isha' },
    { key: 'jumuah', label: 'Jumuah' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Date</label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
            <input
              type="time"
              required
              value={values[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 font-medium"
      >
        {saving ? 'Saving…' : 'Save prayer times'}
      </button>
    </form>
  )
}
