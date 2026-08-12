import { useState } from 'react'
import { addEvent, updateEvent } from '../../lib/firestore'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/Button'
import Field, { inputClass } from '../../components/Field'

const today = () => new Date().toISOString().slice(0, 10)

export default function EventForm({ onSaved, onCancel, initial }) {
  const { profile } = useAuth()
  const editing = Boolean(initial?.id)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [titleMl, setTitleMl] = useState(initial?.titleMl ?? '')
  const [date, setDate] = useState(initial?.eventAt?.slice(0, 10) ?? today())
  const [time, setTime] = useState(initial?.eventAt?.slice(11, 16) ?? '')
  const [repeat, setRepeat] = useState(initial?.repeat === 'weekly' ? 'weekly' : 'once')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [descriptionMl, setDescriptionMl] = useState(initial?.descriptionMl ?? '')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const repeatWeekday = repeat === 'weekly' && date
    ? new Date(`${date}T00:00`).toLocaleDateString('en-IN', { weekday: 'long' })
    : ''

  async function handleSubmit(e) {
    e.preventDefault()
    setSuccess(false)
    setError('')
    setSaving(true)
    const data = {
      title: title.trim(),
      titleMl: titleMl.trim(),
      eventAt: `${date}T${time || '00:00'}`,
      repeat,
      location: location.trim(),
      description: description.trim(),
      descriptionMl: descriptionMl.trim(),
      byUid: profile?.uid,
      byName: profile?.name,
    }
    try {
      if (editing) {
        await updateEvent('main', initial.id, data)
      } else {
        await addEvent('main', data)
        setTitle('')
        setTitleMl('')
        setTime('')
        setLocation('')
        setDescription('')
        setDescriptionMl('')
      }
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
      <Field label="Title" htmlFor="event-title" hint="e.g. Weekly Qur'an class for children.">
        <input
          id="event-title"
          type="text"
          required
          maxLength={120}
          placeholder="e.g. Weekly Qur'an class for children"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        label="Title (Malayalam)"
        htmlFor="event-title-ml"
        hint="Used on Malayalam posters. Leave empty to use the English title."
      >
        <input
          id="event-title-ml"
          type="text"
          maxLength={120}
          placeholder="ഉദാ. കുട്ടികൾക്കുള്ള ഖുർആൻ ക്ലാസ്"
          value={titleMl}
          onChange={(e) => setTitleMl(e.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="event-date">
          <input
            id="event-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Time"
          htmlFor="event-time"
          hint="Leave empty for whole-day events."
        >
          <input
            id="event-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        label="Repeats"
        htmlFor="event-repeat"
        hint={
          repeat === 'weekly' && repeatWeekday
            ? `Repeats every ${repeatWeekday}. The date above is the first occurrence.`
            : 'How often this event happens.'
        }
      >
        <select
          id="event-repeat"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          className={inputClass}
        >
          <option value="once">Once</option>
          <option value="weekly">Every week</option>
        </select>
      </Field>
      <Field
        label="Location"
        htmlFor="event-location"
        hint="e.g. Main prayer hall, or a street address."
      >
        <input
          id="event-location"
          type="text"
          maxLength={120}
          placeholder="e.g. Masjid main hall"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        label="Description"
        htmlFor="event-description"
        hint="A short note people will see on the home page."
      >
        <textarea
          id="event-description"
          rows={3}
          maxLength={300}
          placeholder="What is this event about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        label="Description (Malayalam)"
        htmlFor="event-description-ml"
        hint="Used on Malayalam posters. Leave empty to use the English description."
      >
        <textarea
          id="event-description-ml"
          rows={3}
          maxLength={300}
          placeholder="പരിപാടിയെക്കുറിച്ച്"
          value={descriptionMl}
          onChange={(e) => setDescriptionMl(e.target.value)}
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
          {editing ? 'Event updated.' : 'Event created.'}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
        </Button>
        {editing ? (
          <Button type="button" variant="ghost" onClick={() => onCancel?.()}>
            Cancel editing
          </Button>
        ) : null}
      </div>
    </form>
  )
}
