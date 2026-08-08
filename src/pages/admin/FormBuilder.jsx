import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addForm, getForm, updateForm } from '../../lib/firestore'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Field, { inputClass } from '../../components/Field'
import LoadingState from '../../components/LoadingState'

export const FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone number' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Single choice' },
  { value: 'checkbox', label: 'Multiple choice' },
]

const OPTION_TYPES = ['select', 'radio', 'checkbox']

function newId() {
  return crypto.randomUUID?.() ?? `f-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function FormBuilder() {
  const { formId } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(formId) && formId !== 'new'
  const [title, setTitle] = useState('')
  const [event, setEvent] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState([])
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(editing)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) return
    getForm('main', formId)
      .then((form) => {
        if (!form) {
          setError('Form not found.')
          return
        }
        setTitle(form.title ?? '')
        setEvent(form.event ?? '')
        setDescription(form.description ?? '')
        setFields(form.fields ?? [])
        setOpen(form.open !== false)
      })
      .finally(() => setLoading(false))
  }, [formId, editing])

  function updateField(fieldId, patch) {
    setFields((list) =>
      list.map((f) => (f.id === fieldId ? { ...f, ...patch } : f))
    )
  }

  function addField() {
    setFields((list) => [
      ...list,
      { id: newId(), label: '', type: 'text', required: false, options: [] },
    ])
  }

  function removeField(fieldId) {
    setFields((list) => list.filter((f) => f.id !== fieldId))
  }

  function moveField(index, dir) {
    setFields((list) => {
      const target = index + dir
      if (target < 0 || target >= list.length) return list
      const next = [...list]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Give the form a title.')
      return
    }
    const cleanFields = fields.map((f) => ({
      ...f,
      label: f.label.trim(),
      options: OPTION_TYPES.includes(f.type)
        ? Array.isArray(f.options)
          ? f.options.map((o) => String(o).trim()).filter(Boolean)
          : []
        : [],
    }))
    if (cleanFields.some((f) => !f.label)) {
      setError('Every question needs a label.')
      return
    }
    if (
      cleanFields.some(
        (f) => OPTION_TYPES.includes(f.type) && f.options.length === 0
      )
    ) {
      setError('Choice questions need at least one option.')
      return
    }
    const data = {
      title: title.trim(),
      event: event.trim(),
      description: description.trim(),
      fields: cleanFields,
      open,
      byName: 'admin',
    }
    try {
      if (editing) {
        await updateForm('main', formId, data)
      } else {
        await addForm('main', data)
      }
      navigate('/admin/forms')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <LoadingState rows={4} />

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {editing ? 'Edit form' : 'Create a form'}
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Build a registration form for an event. The public can fill it
          at its own link, and submissions come back here.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Card className="p-6">
          <div className="space-y-4">
            <Field label="Form title" htmlFor="form-title" hint="e.g. Eid picnic registration">
              <input
                id="form-title"
                type="text"
                required
                maxLength={120}
                placeholder="e.g. Eid picnic registration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Event (optional)" htmlFor="form-event" hint="Which event this form belongs to.">
              <input
                id="form-event"
                type="text"
                maxLength={120}
                placeholder="e.g. Eid picnic"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Description (optional)" htmlFor="form-description">
              <textarea
                id="form-description"
                rows={2}
                maxLength={300}
                placeholder="What is this registration for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={open}
                onChange={(e) => setOpen(e.target.checked)}
                className="h-4 w-4 rounded border-line text-primary focus:ring-primary/30"
              />
              Open for submissions
            </label>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">Questions</h2>
            <Button type="button" variant="outline" size="sm" onClick={addField}>
              + Add question
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-secondary">
              No questions yet. Add at least one question so people can respond.
            </p>
          ) : (
            <ul className="space-y-4">
              {fields.map((field, index) => (
                <li key={field.id} className="rounded-xl border border-line bg-surface-subtle p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    <Field label={`Question ${index + 1}`} htmlFor={`field-label-${field.id}`}>
                      <input
                        id={`field-label-${field.id}`}
                        type="text"
                        required
                        maxLength={140}
                        placeholder="e.g. Full name"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Answer type" htmlFor={`field-type-${field.id}`}>
                      <select
                        id={`field-type-${field.id}`}
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value })}
                        className={inputClass}
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  {OPTION_TYPES.includes(field.type) ? (
                    <Field
                      label="Options (one per line)"
                      htmlFor={`field-options-${field.id}`}
                      hint="People choose from these."
                    >
                      <textarea
                        id={`field-options-${field.id}`}
                        rows={3}
                        placeholder={'Adults\nChildren'}
                        value={(field.options ?? []).join('\n')}
                        onChange={(e) =>
                          updateField(field.id, { options: e.target.value.split('\n') })
                        }
                        className={inputClass}
                      />
                    </Field>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-line accent-primary focus:ring-primary/30"
                      />
                      Required
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="quiet"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => moveField(index, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="quiet"
                        size="sm"
                        disabled={index === fields.length - 1}
                        onClick={() => moveField(index, 1)}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(field.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {error ? (
          <p className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit">{editing ? 'Save changes' : 'Create form'}</Button>
          <Button variant="ghost" type="button" onClick={() => navigate('/admin/forms')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}