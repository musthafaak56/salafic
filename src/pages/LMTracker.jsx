import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { localDateKey, readTrackerDay, trackerKey, trackerWeek, TRACKER_GROUPS, TRACKER_ITEMS } from '../lib/lmtracker'
import './LMTracker.css'

function loadDay(date) {
  try { return { checked: readTrackerDay(window.localStorage, date), error: '' } }
  catch { return { checked: [], error: 'Saved progress could not be read. Changes will try to save again; keep this page open if saving is unavailable.' } }
}

function DailyChecklist({ day }) {
  const [state, setState] = useState(() => loadDay(day.key))
  useEffect(() => {
    function sync(event) {
      if (event.key === trackerKey(day.key) || event.key === null) setState(loadDay(day.key))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [day.key])

  function toggle(id) {
    const checked = state.checked.includes(id) ? state.checked.filter((value) => value !== id) : [...state.checked, id]
    let error = ''
    try { window.localStorage.setItem(trackerKey(day.key), JSON.stringify(checked)) }
    catch { error = 'Progress is not saved. Your browser storage may be full or blocked. Keep this page open to retain these checks.' }
    setState({ checked, error })
  }

  return <>
    <div className="lm-day-heading">
      <h2>{day.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
      <p role="status" aria-live="polite"><strong>{state.checked.length}</strong> / {TRACKER_ITEMS.length} completed</p>
    </div>
    <progress className="lm-progress" value={state.checked.length} max={TRACKER_ITEMS.length} aria-label="Daily checklist completion" />
    {state.error && <p className="platform-error" role="alert">{state.error}</p>}
    <div className="lm-checklist">
      {TRACKER_GROUPS.map((group) => <fieldset key={group.title}>
        <legend>{group.title}</legend>
        {group.note && <p className="lm-note">{group.note}</p>}
        {group.items.map((item) => <label className="lm-item" key={item.id}>
          <input type="checkbox" checked={state.checked.includes(item.id)} onChange={() => toggle(item.id)} />
          <span>{item.label}</span>
        </label>)}
      </fieldset>)}
    </div>
    <p className="lm-total">Total marks: {state.checked.length} / {TRACKER_ITEMS.length}</p>
    <p className="lm-note">All 44 listed practices are included, with one mark per check.</p>
  </>
}

function TrackerContent() {
  const [today, setToday] = useState(() => localDateKey())
  const [selected, setSelected] = useState(() => localDateKey())
  useEffect(() => {
    const update = () => setToday(localDateKey())
    const timer = window.setInterval(update, 30_000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  const days = trackerWeek(new Date(`${today}T12:00:00`))
  const activeDay = days.find((day) => day.key === selected) || days[3]

  return <>
      <div className="lm-week" role="group" aria-label="Choose a day">
        {days.map((day) => <button key={day.key} type="button" aria-pressed={day.key === activeDay.key} aria-current={day.key === today ? 'date' : undefined} aria-label={day.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} onClick={() => setSelected(day.key)}>
          <span>{day.date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
          <strong>{day.date.getDate()}</strong>
          <small>{day.key === today ? 'Today' : day.date.toLocaleDateString(undefined, { month: 'short' })}</small>
        </button>)}
      </div>
      <DailyChecklist key={activeDay.key} day={activeDay} />
      <footer className="lm-footer">Saved only in this browser. No login needed. Clearing browser data removes your progress.</footer>
  </>
}

export default function LMTracker() {
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function unlock(event) {
    event.preventDefault()
    if (password !== 'october') {
      setError('Incorrect password. Please try again.')
      return
    }
    setPassword('')
    setError('')
    setUnlocked(true)
  }

  return <div className="lm-tracker">
    <header className="lm-header"><Link to="/">Salafic</Link><ThemeToggle /></header>
    <main className="lm-main">
      <h1>LM tracker</h1>
      {unlocked ? <>
        <div className="lm-access-row">
          <p className="lm-intro">A little intention, every day.</p>
          <button type="button" className="lm-lock" onClick={() => setUnlocked(false)}>Lock tracker</button>
        </div>
        <TrackerContent />
      </> : <form className="lm-unlock" onSubmit={unlock}>
        <p className="lm-intro">Enter the password to open your daily checklist.</p>
        <label htmlFor="lm-password">Tracker password</label>
        <input id="lm-password" type="password" autoComplete="current-password" required maxLength={100} value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} aria-invalid={!!error} aria-describedby={error ? 'lm-password-error' : undefined} />
        {error && <p id="lm-password-error" className="platform-error" role="alert">{error}</p>}
        <button className="platform-button" type="submit">Unlock tracker</button>
        <p className="lm-note">This is a shared access password, not an account login. Progress stays in this browser and is not encrypted.</p>
      </form>}
    </main>
  </div>
}
