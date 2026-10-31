import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { useCenter } from '../context/CenterContext'
import { db } from '../lib/firebase'
import { confirmAttendance, decryptSchedule } from '../lib/hifdh'
import { Shell, Input, Message, useAction } from '../components/PlatformUI'
import Button from '../components/Button'

export default function CenterHifdh() {
  const { center, centerId, base } = useCenter()
  const [password, setPassword] = useState('')
  const [schedules, setSchedules] = useState(null)
  const [now, setNow] = useState(Date.now())
  const action = useAction()
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  return <Shell title="Hifdh classes" description={center.displayName}>
    <nav className="center-tabs" aria-label="Center navigation"><Link to={base}>Overview</Link><Link to={`${base}/madrasa`}>Madrasa</Link><Link to={`${base}/hifdh`} aria-current="page">Hifdh</Link><Link to={`${base}/committee`}>Committee</Link></nav>
    <section className="platform-section education-section hifdh-page">
      {schedules === null ? <form className="hifdh-unlock" onSubmit={e => {
        e.preventDefault()
        action.run(async () => {
          const snapshots = await getDocs(collection(db, 'masjids', centerId, 'hifdhSchedules'))
          if (snapshots.empty) throw new Error('This center has not published a Hifdh schedule yet.')
          const result = await Promise.all(snapshots.docs.map(async document => {
            try { return { ...await decryptSchedule(document.data(), password), id: document.id, sessionAt: document.data().sessionAt.toMillis() } } catch { return null }
          }))
          const opened = result.filter(Boolean).sort((a, b) => a.sessionAt - b.sessionAt)
          if (!opened.length) throw new Error('The password did not open a schedule. Please check it and try again.')
          setSchedules(opened); setPassword(''); setNow(Date.now())
        })
      }}>
        <h2>Your next class</h2><p>Enter the class password to see the student order, assigned times and confirm attendance.</p>
        {action.feedback}<Input label="Class password" type="password" value={password} onChange={setPassword} required autoComplete="current-password" maxLength={100} />
        <Button type="submit" loading={action.busy}>View class schedule</Button>
      </form> : <>
        <div className="platform-links"><p className="platform-hint">Times are shown in {center.timezone}. Confirmations are for the date shown.</p><Button variant="ghost" onClick={() => setSchedules(null)}>Lock page</Button></div>
        {schedules.map(schedule => <section key={schedule.id} className="hifdh-class">
          <h2>{schedule.name}</h2><p className="hifdh-session">{new Date(`${schedule.date}T12:00:00Z`).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} · {schedule.start}–{schedule.end}</p>
          {schedule.sessionAt <= now && <Message>This class has started or ended. The center will publish the next session; attendance confirmation is closed.</Message>}
          <ol className="student-schedule">{schedule.students.map((student, index) => <li key={student.id}>
            <span className="student-position">{index + 1}</span><div className="student-public-details"><h3>{student.name}</h3><p>{student.start}–{student.end}</p></div>
            {schedule.sessionAt > now && <AttendanceForm centerId={centerId} schedule={schedule} student={student} />}
          </li>)}</ol>
        </section>)}
      </>}
    </section>
  </Shell>
}

function AttendanceForm({ centerId, schedule, student }) {
  const [open, setOpen] = useState(false), [phone, setPhone] = useState(''), [confirmed, setConfirmed] = useState(false)
  const action = useAction()
  if (confirmed) return <p className="attendance-confirmed" role="status">You’re confirmed for {schedule.date}.</p>
  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}>I will attend<span className="sr-only"> · {student.name}</span></Button>
  return <form className="attendance-form" onSubmit={e => {
    e.preventDefault()
    action.run(async () => {
      try { await confirmAttendance(db, centerId, schedule.id, schedule, student.id, phone) }
      catch (error) { if (error.code === 'permission-denied') throw new Error('We could not confirm this attendance. Check your registered phone number, or unlock the page again if the schedule changed.'); throw error }
      setConfirmed(true); setPhone('')
    })
  }}>
    {action.feedback}<Input label={`Registered phone number for ${student.name}`} type="tel" autoComplete="tel" value={phone} onChange={setPhone} required maxLength={25} placeholder="Include country code" />
    <p className="platform-hint">Use the number held by the center. It will not appear publicly.</p>
    <div className="platform-links"><Button type="submit" loading={action.busy}>Confirm attendance</Button><Button type="button" variant="ghost" disabled={action.busy} onClick={() => { setOpen(false); setPhone('') }}>Cancel</Button></div>
  </form>
}
