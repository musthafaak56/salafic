import { useEffect, useState } from 'react'
import { getEvents, deleteEvent } from '../../lib/firestore'
import { formatTime } from '../../lib/utils'
import Card from '../../components/Card'
import SectionHeading from '../../components/SectionHeading'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'
import Button from '../../components/Button'
import EventForm from './EventForm'

function formatEventDate(eventAt) {
  const d = new Date(eventAt)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const time = formatTime(eventAt)
  return time === '—' ? date : `${date} · ${time}`
}

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  async function loadData() {
    const list = await getEvents('main', 100)
    setEvents(list)
    setLoading(false)
  }

  useEffect(() => {
    loadData().catch(() => setLoading(false))
  }, [])

  async function handleDelete(id) {
    if (!window.confirm('Delete this event permanently?')) return
    setDeletingId(id)
    try {
      await deleteEvent('main', id)
      await loadData()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Events</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Create announcements for the community. Upcoming events
          appear on the home page.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <SectionHeading title={editing ? 'Edit event' : 'Create an event'} />
          <EventForm
            key={editing?.id ?? 'new'}
            onSaved={loadData}
            onCancel={() => setEditing(null)}
            initial={editing}
          />
        </Card>

        <Card className="p-6">
          <SectionHeading title="All events" />
          {loading ? (
            <LoadingState rows={4} />
          ) : events.length === 0 ? (
            <EmptyState
              title="No events yet"
              description="Create the first event with the form."
            />
          ) : (
            <ul className="divide-y divide-line">
              {events.map((event) => (
                <li key={event.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      {formatEventDate(event.eventAt)}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                    {event.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-secondary">
                        {event.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(event)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={deletingId === event.id}
                      onClick={() => handleDelete(event.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  )
}