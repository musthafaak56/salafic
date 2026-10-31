import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { useCenter } from '../context/CenterContext'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { act } from '../lib/platform'
import { EDUCATION_COLLECTIONS, MAX_CLASS_ASSIGNMENTS } from '../lib/education'
import { Input, Message, useAction } from '../components/PlatformUI'
import Button from '../components/Button'
import EducationSchedule, { MinutesInput } from '../components/EducationSchedule'

// Operate: extend Salafic’s white/blue, dark-mode dashboard. A flat directory
// with inline editing; private rosters stay separate from public Madrasa copy.
const typeOptions = [{ value: 'madrasa', label: 'Madrasa' }, { value: 'center', label: 'Center' }]
const singular = { classes: 'class', teachers: 'teacher', students: 'student' }
const labelKind = kind => kind === 'madrasa' ? 'Madrasa' : 'Center'
const countLabel = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

export default function CenterEducation() {
  const { centerId } = useCenter()
  return <EducationWorkspace key={centerId} />
}

function EducationWorkspace() {
  const { centerId, base } = useCenter()
  const { profile } = useAuth()
  const allowed = profile?.role === 'superadmin' || ['owner', 'admin'].includes(profile?.centers?.find(c => c.id === centerId)?.role)
  const [data, setData] = useState({ classes: [], teachers: [], students: [] })
  const [loaded, setLoaded] = useState({})
  const [error, setError] = useState('')
  const [tab, setTab] = useState('classes')
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const [roster, setRoster] = useState(null)
  useEffect(() => {
    if (!allowed) return
    const stops = Object.entries(EDUCATION_COLLECTIONS).map(([entity, name]) =>
      onSnapshot(collection(db, 'masjids', centerId, name), snap => {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => a.name.localeCompare(b.name))
        setData(previous => ({ ...previous, [entity]: items }))
        setLoaded(previous => ({ ...previous, [entity]: true }))
      }, () => setError('Education records could not be loaded. Check your connection and reload the page.')))
    return () => stops.forEach(stop => stop())
  }, [centerId, allowed])
  if (!allowed) return <Message error>Only the superadmin, center owner or center admin can manage Education.</Message>
  const loading = !loaded.classes || !loaded.teachers || !loaded.students
  const visible = data[tab].filter(item => item.name.toLowerCase().includes(search.toLowerCase()) && (tab === 'teachers' || kind === 'all' || item.kind === kind))
  const names = ids => ids.map(id => data.classes.find(c => c.id === id)?.name || 'Unavailable class').join(', ')
  return <section className="platform-section education-section">
    <div className="education-heading">
      <div><h2>Education</h2><p>Manage your madrasa and center learning programs. Phone numbers stay private. Publish selected class schedules on the Hifdh page.</p></div>
      <Link to={`${base}/admin/madrasa`}>Edit public madrasa information</Link>
    </div>
    <nav className="education-tabs" aria-label="Education sections">
      {Object.keys(EDUCATION_COLLECTIONS).map(entity => <button key={entity} type="button" aria-current={tab === entity ? 'page' : undefined} onClick={() => { setTab(entity); setEditing(null); setSearch(''); setKind('all'); setRoster(null) }}>
        {entity[0].toUpperCase() + entity.slice(1)} <span>{loading ? '—' : data[entity].length}</span>
      </button>)}
    </nav>
    {error && <Message error>{error}</Message>}
    {loading && !error && <p role="status" className="platform-hint">Loading education records…</p>}
    {!loading && !error && <>
      <div className="education-toolbar">
        <Input label={`Search ${tab}`} type="search" value={search} onChange={setSearch} placeholder={`Find a ${singular[tab]}…`} />
        {tab !== 'teachers' && <Input label="Program" value={kind} onChange={setKind} options={[{ value: 'all', label: 'All programs' }, ...typeOptions]} />}
        <Button type="button" disabled={!!editing} onClick={() => setEditing({})}>Add {singular[tab]}</Button>
      </div>
      {editing && <EducationForm key={`${tab}-${editing.id || 'new'}`} entity={tab} item={editing} classes={data.classes} centerId={centerId} onClose={() => setEditing(null)} />}
      {!data[tab].length ? <div className="education-empty">
        <h3>{tab === 'classes' ? 'Start with a class' : `No ${tab} added yet`}</h3>
        <p>{tab === 'classes' ? 'Create separate Madrasa and Center classes, then add teachers and enroll students.' : tab === 'teachers' ? 'Add a teacher and assign them to one or more classes. This does not create a sign-in account.' : 'Madrasa students join exactly one madrasa class. Center students can join several center classes.'}</p>
      </div> : !visible.length ? <p className="platform-empty">No {tab} match your search. Try another name or program.</p> : <ul className="education-list" aria-label={tab}>
        {visible.map(item => <li key={item.id}>
          <div className="education-record"><h3>{item.name}</h3>
            {tab === 'classes' ? <><p>{labelKind(item.kind)}{item.schedule && ` · ${item.schedule}`}{item.timing && ` · ${item.timing.start}–${item.timing.end}`}</p><p className="platform-hint">{countLabel(data.teachers.filter(t => t.classIds.includes(item.id)).length, 'teacher')} · {countLabel(data.students.filter(s => s.classIds.includes(item.id)).length, 'student')}</p></> : <><p>{tab === 'students' && `${labelKind(item.kind)} · `}{item.classIds.length ? names(item.classIds) : 'No classes assigned'}</p>{item.phone && <p>+{item.phone}</p>}</>}
          </div>
          <div className="education-row-actions">
            {tab === 'classes' && <Button type="button" variant="outline" onClick={() => setRoster(roster === item.id ? null : item.id)} aria-controls={`roster-${item.id}`} aria-expanded={roster === item.id}>{roster === item.id ? 'Close roster' : 'View roster'}<span className="sr-only"> for {item.name}</span></Button>}
            <Button type="button" variant="ghost" disabled={!!editing} onClick={() => setEditing(item)}>Edit<span className="sr-only"> {item.name}</span></Button>
          </div>
          {tab === 'classes' && roster === item.id && <section id={`roster-${item.id}`} className="education-roster" aria-label={`${item.name} roster`}>
            <h3>{item.name} roster</h3>
            {(item.kind === 'center' ? ['teachers'] : ['teachers', 'students']).map(entity => { const items = data[entity].filter(person => person.classIds.includes(item.id)); return <div key={entity}><h4>{entity === 'teachers' ? 'Teachers' : 'Students'}</h4>{items.length ? <ul>{items.map(person => <li key={person.id}>{person.name}</li>)}</ul> : <p className="platform-hint">No {entity} assigned yet.</p>}</div> })}
            {item.kind === 'center' && <EducationSchedule item={item} students={data.students} />}
          </section>}
        </li>)}
      </ul>}
    </>}
  </section>
}

function EducationForm({ entity, item, classes, centerId, onClose }) {
  const [fields, setFields] = useState({ name: item.name || '', kind: item.kind || 'madrasa', schedule: item.schedule || '', phone: item.phone || '', classIds: item.classIds || [], classTimings: item.classTimings || {}, timing: item.timing || { date: '', start: '17:00', end: '19:00', minutes: 10, gap: 0 } })
  const [hasTiming, setHasTiming] = useState(!!item.timing)
  const action = useAction()
  const set = name => value => setFields(previous => ({ ...previous, [name]: value }))
  const available = classes.filter(c => entity === 'teachers' || c.kind === fields.kind)
  function toggle(id, checked) {
    setFields(previous => ({ ...previous, classIds: entity === 'students' && previous.kind === 'madrasa' ? [id] : checked ? [...previous.classIds, id] : previous.classIds.filter(value => value !== id) }))
  }
  return <form className="education-editor" onSubmit={e => {
    e.preventDefault()
    action.run(async () => {
      await act('saveEducation', { centerId, entity, id: item.id, version: item.version || 0, fields: { ...fields, timing: hasTiming ? fields.timing : undefined } })
      onClose()
    })
  }}>
    <h3>{item.id ? 'Edit' : 'Add'} {singular[entity]}</h3>
    {action.feedback}
    <fieldset disabled={action.busy}>
      <div className="platform-fields">
        <Input label={entity === 'classes' ? 'Class name' : 'Full name'} value={fields.name} onChange={set('name')} required maxLength={120} />
        {entity !== 'teachers' && <Input label="Program type" value={fields.kind} onChange={value => setFields(previous => ({ ...previous, kind: value, classIds: [] }))} options={typeOptions} disabled={!!item.id} />}
        {entity === 'classes' && <Input label="Days and times (optional)" value={fields.schedule} onChange={set('schedule')} maxLength={300} placeholder="Saturday, 9–11 am" />}
        {entity !== 'classes' && <Input label="Phone number (optional)" type="tel" value={fields.phone} onChange={set('phone')} maxLength={25} placeholder="+971 50 123 4567" />}
      </div>
      {entity !== 'classes' && <p className="platform-hint">Include the country code. Student attendance uses this number; phone numbers are never shown on the public page.</p>}
      {entity === 'classes' && fields.kind === 'center' && <>
        <label className="platform-check"><input type="checkbox" checked={hasTiming} onChange={e => setHasTiming(e.target.checked)} />Set class and student times</label>
        {hasTiming && <div className="platform-fields">
          <Input label="Next class date" type="date" required value={fields.timing.date} onChange={value => set('timing')({ ...fields.timing, date: value })} />
          <Input label="Class start time" type="time" required value={fields.timing.start} onChange={value => set('timing')({ ...fields.timing, start: value })} />
          <Input label="Class end time" type="time" required value={fields.timing.end} onChange={value => set('timing')({ ...fields.timing, end: value })} />
          <MinutesInput label="Minutes per student" value={fields.timing.minutes} onChange={value => set('timing')({ ...fields.timing, minutes: value })} />
          <MinutesInput label="Gap between students" min={0} value={fields.timing.gap} onChange={value => set('timing')({ ...fields.timing, gap: value })} />
        </div>}
      </>}
      {entity !== 'classes' && <fieldset className="education-assignment">
        <legend>{entity === 'students' && fields.kind === 'madrasa' ? 'Madrasa class (required)' : 'Assign classes'}</legend>
        <p className="platform-hint">{entity === 'students' && fields.kind === 'madrasa' ? 'Select exactly one madrasa class.' : `Select up to ${MAX_CLASS_ASSIGNMENTS} classes.${entity === 'students' ? ' Only center classes are available.' : ' Teachers can teach both programs, or be added before assigning a class.'}`}</p>
        {!available.length && <p className="platform-hint">Create {entity === 'teachers' ? 'a class' : `a ${labelKind(fields.kind).toLowerCase()} class`} in the Classes tab first.</p>}
        <div className="education-choices">{available.map(c => <label key={c.id} className="platform-check">
          <input type={entity === 'students' && fields.kind === 'madrasa' ? 'radio' : 'checkbox'} name="class-assignment" checked={fields.classIds.includes(c.id)} disabled={!(entity === 'students' && fields.kind === 'madrasa') && !fields.classIds.includes(c.id) && fields.classIds.length >= MAX_CLASS_ASSIGNMENTS} onChange={e => toggle(c.id, e.target.checked)} />
          <span>{c.name}{entity === 'teachers' && <small>{labelKind(c.kind)}</small>}</span>
        </label>)}</div>
      </fieldset>}
      <div className="platform-links"><Button type="submit" loading={action.busy} disabled={entity === 'students' && !fields.classIds.length}>Save {singular[entity]}</Button><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button></div>
    </fieldset>
  </form>
}
