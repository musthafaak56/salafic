import { useState } from 'react'
import { addExpense } from '../../lib/firestore'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/Button'
import Field, { inputClass } from '../../components/Field'

const CATEGORIES = [
  'General',
  'Electricity',
  'Water',
  'Maintenance',
  'Staff',
  'Ramadan',
  'Event',
  'Other',
]

export default function ExpenseForm({ onSaved }) {
  const { profile } = useAuth()
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('General')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSuccess(false)
    setError('')
    setSaving(true)
    try {
      await addExpense('main', {
        note,
        amount: Number(amount),
        category,
        date: new Date().toISOString(),
        byUid: profile?.uid,
        byName: profile?.name,
      })
      setNote('')
      setAmount('')
      setCategory('General')
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
        htmlFor="expense-note"
        hint="What was this for? e.g. Electricity bill."
      >
        <input
          id="expense-note"
          type="text"
          required
          maxLength={120}
          placeholder="e.g. Electricity bill"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Amount (₹)"
          htmlFor="expense-amount"
          hint="Whole number, e.g. 2500."
        >
          <input
            id="expense-amount"
            type="number"
            required
            min="1"
            step="1"
            placeholder="2500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Category" htmlFor="expense-category">
          <select
            id="expense-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {error ? (
        <p className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-positive/30 bg-positive/10 p-3 text-sm text-positive" role="status">
          Expense recorded.
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          {saving ? 'Saving…' : 'Record expense'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setNote('')
            setAmount('')
            setCategory('General')
            setSuccess(false)
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  )
}
