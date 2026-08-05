import { useState } from 'react'
import { addFund } from '../../lib/firestore'
import { useAuth } from '../../context/AuthContext'

export default function DonationForm({ onSaved }) {
  const { profile } = useAuth()
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)
    try {
      await addFund('main', {
        note,
        amount: Number(amount),
        date: new Date().toISOString(),
        byUid: profile?.uid,
        byName: profile?.name,
      })
      setNote('')
      setAmount('')
      setMessage('Donation recorded')
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Note</label>
        <input
          type="text"
          required
          placeholder="e.g. Friday donation box"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Amount (₹)</label>
        <input
          type="number"
          required
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
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
        {saving ? 'Saving…' : 'Record donation'}
      </button>
    </form>
  )
}
