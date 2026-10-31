import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, DotsSixVertical, Minus, Plus } from '@phosphor-icons/react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { useCenter } from '../context/CenterContext'
import { db } from '../lib/firebase'
import { act } from '../lib/platform'
import { classRoster, studentSlots, minutesValue } from '../lib/education'
import { publishHifdh, unpublishHifdh } from '../lib/hifdh'
import { Input, Message, useAction } from './PlatformUI'
import Button from './Button'

export function MinutesInput({ label, value, onChange, min = 1 }) {
  const id = useId()
  return <div className="minutes-field"><label htmlFor={id}>{label}</label><div className="minutes-stepper">
    <button type="button" aria-label={`Decrease ${label}`} disabled={Number(value) <= min} onClick={() => onChange(Math.max(min, Number(value || min) - 1))}><Minus size={18} /></button>
    <input id={id} type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={3} value={value} onChange={e => onChange(e.target.value)} aria-describedby={`${id}-unit`} />
    <button type="button" aria-label={`Increase ${label}`} disabled={Number(value) >= 240} onClick={() => onChange(Math.min(240, Math.max(min, Number(value || 0) + 1)))}><Plus size={18} /></button>
  </div><small id={`${id}-unit`}>minutes{min === 0 && ' · 0 allowed'}</small></div>
}

export default function EducationSchedule({ item, students }) {
  const { center, centerId, base } = useCenter()
  const [editing, setEditing] = useState(false)
  const [password, setPassword] = useState('october')
  const [publication, setPublication] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loadError, setLoadError] = useState('')
  const action = useAction()
  useEffect(() => {
    const fail = () => setLoadError('Could not load publishing and attendance status. Reload to try again.')
    const stop = onSnapshot(doc(db, 'masjids', centerId, 'educationPublications', item.id), s => setPublication(s.data() || null), fail)
    const stopAttendance = onSnapshot(query(collection(db, 'masjids', centerId, 'educationAttendance'), where('classId', '==', item.id)), s => setAttendance(s.docs.map(d => d.data())), fail)
    return () => { stop(); stopAttendance() }
  }, [centerId, item.id])
  const roster = classRoster(item, students), slots = studentSlots(item, students)
  const publishedAt = publication?.publishedAt?.toMillis() || 0
  const stale = publication && (item.updatedAt?.toMillis() > publishedAt || roster.some(s => s.updatedAt?.toMillis() > publishedAt))
  return <div className="education-schedule">
    <h4>Student order and times</h4>
    {loadError && <Message error>{loadError}</Message>}
    {item.timing ? <p className="platform-hint">Next class: {item.timing.date} · {item.timing.start}–{item.timing.end} · {center.timezone}. {item.timing.minutes} minutes per student, {item.timing.gap} minute gap.</p> : <p className="platform-hint">Edit this class to set its next date, start and end times, student duration and gap.</p>}
    {!!roster.length && !editing && <>
      <ol className="student-schedule">{roster.map((student, index) => <li key={student.id}>
        <span className="student-position">{index + 1}</span><div><strong>{student.name}</strong><p>{slots[index] ? `${slots[index].start}–${slots[index].end}` : 'Time not set'}{attendance.some(a => a.studentId === student.id && a.date === item.timing?.date) && <span className="attendance-confirmed"> · Will attend</span>}</p></div>
      </li>)}</ol>
      <Button variant="outline" onClick={() => setEditing(true)}>Edit student order and times</Button>
    </>}
    {!roster.length && <p className="platform-hint">Assign students to this class in the Students tab.</p>}
    {editing && <RosterEditor item={item} students={roster} centerId={centerId} onClose={() => setEditing(false)} />}
    {slots.some(s => s.overflow) && <Message error>The student slots run past the class end time. Shorten the slots or extend the class before publishing.</Message>}
    <div className="hifdh-publish">
      <h4>Hifdh public page</h4>
      <p className="platform-hint">Publish this class’s names, order and times behind a shared password. Phone numbers remain private. Publish again after changing the roster or scheduling the next week.</p>
      {publication && <p role="status">{stale ? 'Changes have not been published yet.' : `Published for ${publication.date}.`}</p>}
      {action.feedback}
      <Input label="Hifdh page password" type="password" value={password} onChange={setPassword} maxLength={100} autoComplete="new-password" />
      <p className="platform-hint">Default password: october. Use the same password for every Hifdh class at this center.</p>
      <div className="platform-links">
        <Button disabled={editing || !item.timing || !roster.length || action.busy} loading={action.busy} onClick={() => action.run(() => publishHifdh(db, center, item, students, password), 'Hifdh schedule published.')}>{publication ? 'Publish updated schedule' : 'Publish Hifdh schedule'}</Button>
        {publication && <Button variant="ghost" disabled={action.busy} onClick={() => action.run(() => unpublishHifdh(db, centerId, item.id), 'Class removed from the Hifdh page.')}>Unpublish class</Button>}
        <Link to={`${base}/hifdh`}>Open Hifdh page</Link>
      </div>
    </div>
  </div>
}

function RosterEditor({ item, students, centerId, onClose }) {
  const [rows, setRows] = useState(() => students.map(s => ({ ...s, minutes: s.classTimings?.[item.id]?.minutes || item.timing?.minutes || 10 })))
  const [dragging, setDragging] = useState(null)
  const [notice, setNotice] = useState('')
  const action = useAction()
  function move(from, to) {
    if (from < 0 || to < 0 || to >= rows.length || from === to) return
    const next = [...rows], [student] = next.splice(from, 1)
    next.splice(to, 0, student); setRows(next)
    setNotice(`${student.name} moved to position ${to + 1}.`)
  }
  return <form onSubmit={e => {
    e.preventDefault()
    action.run(async () => {
      const values = rows.map(s => minutesValue(s.minutes))
      // Separate version-checked saves keep large rosters within Spark rule access limits.
      for (let i = 0; i < rows.length; i++) {
        const s = rows[i]
        await act('saveEducation', { centerId, entity: 'students', id: s.id, version: s.version, fields: { ...s, classTimings: { ...s.classTimings, [item.id]: { position: i + 1, minutes: values[i] } } } })
      }
      onClose()
    })
  }}>
    <p className="platform-hint">Drag students into order, or use the up and down buttons. Set the minutes allotted to each student.</p>
    {action.feedback}<p className="sr-only" role="status">{notice}</p>
    <fieldset disabled={action.busy}>
      <ol className="student-schedule editable">{rows.map((student, index) => <li key={student.id} draggable={!action.busy} onDragStart={e => { setDragging(index); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', student.id) }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (dragging !== null) move(dragging, index); setDragging(null) }} onDragEnd={() => setDragging(null)}>
        <DotsSixVertical size={22} aria-hidden="true" /><span className="student-position">{index + 1}</span><strong>{student.name}</strong>
        <MinutesInput label={`Minutes for ${student.name}`} value={student.minutes} onChange={minutes => setRows(previous => previous.map(s => s.id === student.id ? { ...s, minutes } : s))} />
        <div className="student-order-buttons"><button type="button" disabled={index === 0} aria-label={`Move ${student.name} up`} onClick={() => move(index, index - 1)}><ArrowUp size={18} /></button><button type="button" disabled={index === rows.length - 1} aria-label={`Move ${student.name} down`} onClick={() => move(index, index + 1)}><ArrowDown size={18} /></button></div>
      </li>)}</ol>
      <p className="platform-hint">If saving is interrupted, close and reopen this editor to review saved students before retrying.</p>
      <div className="platform-links"><Button type="submit" loading={action.busy}>Save order and times</Button><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button></div>
    </fieldset>
  </form>
}
