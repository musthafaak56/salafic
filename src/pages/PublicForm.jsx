import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getForm, addSubmission } from '../lib/firestore'
import AppHeader from '../components/AppHeader'
import PageContainer from '../components/PageContainer'
import LoadingState from '../components/LoadingState'
import Button from '../components/Button'
import Field, { inputClass } from '../components/Field'

function inputForType(type) {
  if (type === 'textarea') return 'textarea'
  if (type === 'select') return 'select'
  if (type === 'radio' || type === 'checkbox') return 'choice'
  return 'input'
}

export default function PublicForm() {
  const { formId } = useParams()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    getForm('main', formId)
      .then(setForm)
      .catch(() => setForm(null))
      .finally(() => setLoading(false))
  }, [formId])

  function setAnswer(fieldId, value) {
    setAnswers((a) => ({ ...a, [fieldId]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await addSubmission('main', {
        formId,
        answers,
      })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState rows={4} />

  if (!form || form.open === false) {
    return (
      <main className="min-h-screen bg-canvas text-ink">
        <AppHeader />
        <PageContainer>
          <div className="rounded-xl border border-line bg-surface p-8 text-center">
            <h1 className="text-xl font-semibold text-ink">
              This form is not open
            </h1>
            <p className="mt-2 text-sm text-ink-secondary">
              The form may have been closed or removed. Contact the masjid
              for more information.
            </p>
          </div>
        </PageContainer>
      </main>
    )
  }

  const fields = form.fields ?? []

  if (done) {
    return (
      <main className="min-h-screen bg-canvas text-ink">
        <AppHeader />
        <PageContainer>
          <div className="rounded-xl border border-positive/30 bg-positive/10 p-8 text-center">
            <h1 className="text-xl font-semibold text-positive">Submitted</h1>
            <p className="mt-2 text-sm text-ink-secondary">
              Thank you, your response has been recorded.
            </p>
            <a
              href="/"
              className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-canvas hover:bg-primary-hover"
            >
              Back to home
            </a>
          </div>
        </PageContainer>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <AppHeader />
      <PageContainer>
        <div className="mx-auto max-w-2xl space-y-6">
          <section>
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              {form.event || 'Masjid registration'}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              {form.title}
            </h1>
            {form.description ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                {form.description}
              </p>
            ) : null}
          </section>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-line bg-surface p-6"
            noValidate
          >
            {fields.map((field, index) => {
              const kind = inputForType(field.type)
              const value = answers[field.id] ?? (kind === 'checkbox' ? [] : '')
              return (
                <Field
                  key={field.id}
                  label={`${index + 1}. ${field.label}`}
                  htmlFor={`answer-${field.id}`}
                >
                  {kind === 'textarea' ? (
                    <textarea
                      id={`answer-${field.id}`}
                      rows={3}
                      required={field.required}
                      maxLength={1000}
                      value={value}
                      onChange={(e) => setAnswer(field.id, e.target.value)}
                      className={inputClass}
                    />
                  ) : kind === 'select' ? (
                    <select
                      id={`answer-${field.id}`}
                      required={field.required}
                      value={value}
                      onChange={(e) => setAnswer(field.id, e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Choose one…</option>
                      {(field.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : kind === 'choice' ? (
                    <div className="space-y-2 pt-1">
                      {(field.options ?? []).map((o) => {
                        const checked = field.type === 'checkbox'
                          ? value.includes(o)
                          : value === o
                        return (
                          <label
                            key={o}
                            className="flex cursor-pointer items-center gap-2 text-sm text-ink"
                          >
                            <input
                              type={field.type === 'checkbox' ? 'checkbox' : 'radio'}
                              name={`answer-${field.id}`}
                              required={field.required && field.type === 'radio'}
                              checked={checked}
                              onChange={(e) => {
                                if (field.type === 'checkbox') {
                                  const next = e.target.checked
                                    ? [...value, o]
                                    : value.filter((v) => v !== o)
                                  setAnswer(field.id, next)
                                } else {
                                  setAnswer(field.id, o)
                                }
                              }}
                              className="h-4 w-4 accent-primary"
                            />
                            {o}
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <input
                      id={`answer-${field.id}`}
                      type={
                        ['email', 'tel', 'number', 'date'].includes(field.type)
                          ? field.type
                          : 'text'
                      }
                      required={field.required}
                      minLength={field.type === 'text' && field.required ? 1 : undefined}
                      value={value}
                      onChange={(e) => setAnswer(field.id, e.target.value)}
                      className={inputClass}
                    />
                  )}
                </Field>
              )
            })}

            {error ? (
              <p className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={saving}>
                {saving ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
            <p className="text-xs text-ink-secondary">
              Submissions go directly to the masjid admins.
            </p>
          </form>
        </div>
      </PageContainer>
    </main>
  )
}