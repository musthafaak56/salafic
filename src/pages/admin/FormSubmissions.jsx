import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getForm, getSubmissions } from '../../lib/firestore'
import { formatDateTime } from '../../lib/utils'
import Card from '../../components/Card'
import SectionHeading from '../../components/SectionHeading'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'
import Button from '../../components/Button'

export default function FormSubmissions() {
  const { formId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getForm('main', formId), getSubmissions('main', formId)])
      .then(([f, s]) => {
        setForm(f)
        setSubmissions(s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [formId])

  if (loading) return <LoadingState rows={4} />
  if (!form)
    return (
      <EmptyState
        title="Form not found"
        description="It may have been deleted."
      />
    )

  const fields = form.fields ?? []

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {form.title}
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          {submissions.length} submission{submissions.length === 1 ? '' : 's'}
          {form.open ? ' · form open' : ' · form closed'}
        </p>
      </section>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/forms')}>
          ← All forms
        </Button>
        <Link
          to={`/forms/${form.id}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-subtle"
        >
          View public form
        </Link>
      </div>

      <Card className="p-6">
        <SectionHeading title="Submissions" />
        {submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Share the public link so people can respond."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-ink-secondary uppercase">
                  <th className="py-2 pr-4 font-semibold">When</th>
                  {fields.map((f) => (
                    <th key={f.id} className="py-2 pr-4 font-semibold">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="py-3 pr-4 whitespace-nowrap text-xs text-ink-secondary">
                      {formatDateTime(submission.createdAt)}
                    </td>
                    {fields.map((f) => {
                      const raw = submission.answers?.[f.id]
                      const value = Array.isArray(raw) ? raw.join(', ') : raw
                      return (
                        <td key={f.id} className="py-3 pr-4 text-ink">
                          {value === undefined || value === '' ? '—' : value}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}