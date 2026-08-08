import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getForms, deleteForm } from '../../lib/firestore'
import { formatTime } from '../../lib/utils'
import Card from '../../components/Card'
import SectionHeading from '../../components/SectionHeading'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'
import Button from '../../components/Button'
import StatusBadge from '../../components/StatusBadge'

export default function Forms() {
  const navigate = useNavigate()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  async function loadData() {
    const list = await getForms('main')
    setForms(list)
    setLoading(false)
  }

  useEffect(() => {
    loadData().catch(() => setLoading(false))
  }, [])

  async function handleDelete(id) {
    if (!window.confirm('Delete this form and keep its submissions?')) return
    setDeletingId(id)
    try {
      await deleteForm('main', id)
      await loadData()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Forms</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Create registration forms for your events and collect
            submissions from the public.
          </p>
        </div>
        <Button onClick={() => navigate('new')}>+ New form</Button>
      </section>

      <Card className="p-6">
        <SectionHeading title="All forms" />
        {loading ? (
          <LoadingState rows={4} />
        ) : forms.length === 0 ? (
          <EmptyState
            title="No forms yet"
            description="Create the first form with the button above."
          />
        ) : (
          <ul className="divide-y divide-line">
            {forms.map((form) => {
              const questionCount = (form.fields ?? []).length
              const created = formatTime(form.createdAt)
              return (
                <li key={form.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink">{form.title}</p>
                      <StatusBadge tone={form.open ? 'positive' : 'neutral'}>
                        {form.open ? 'Open' : 'Closed'}
                      </StatusBadge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      {form.event ? `${form.event} · ` : ''}
                      {questionCount} question{questionCount === 1 ? '' : 's'}
                      {created !== '—' ? ` · created ${created}` : ''}
                    </p>
                    {form.description ? (
                      <p className="mt-1 line-clamp-1 text-xs text-ink-secondary">
                        {form.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to={`/forms/${form.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-subtle"
                    >
                      Public link
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/forms/${form.id}/submissions`)}
                    >
                      Submissions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/forms/${form.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={deletingId === form.id}
                      onClick={() => handleDelete(form.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}