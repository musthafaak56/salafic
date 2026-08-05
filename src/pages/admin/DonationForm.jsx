import { useState } from 'react'
import { addFund } from '../../lib/firestore'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/Button'
import Field, { inputClass } from '../../components/Field'

export default function DonationForm({ onSaved }) {
  const { profile } = useAuth()
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSuccess(false)
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
        label="Note"
        htmlFor="fund-note"
        hint="What is this donation for? e.g. Friday donation box."
      >
        <input
          id="fund-note"
          type="text"
          required
          maxLength={120}
          placeholder="e.g. Friday donation box"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        label="Amount (₹)"
        htmlFor="fund-amount"
        hint="Enter a whole number, e.g. 1500."
      >
        <input
          id="fund-amount"
          type="number"
          required
          min="1"
          step="1"
          placeholder="1500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
        />
      </Field>
      {error ? (
        <p className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-positive/30 bg-positive/10 p-3 text-sm text-positive" role="status">
          Donation recorded.
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          {saving ? 'Saving…' : 'Record donation'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setNote('')
            setAmount('')
            setSuccess(false)
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  )
}
