import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Shell } from '../components/PlatformUI'
import Button from '../components/Button'
import { findPassage } from '../lib/khutba'

const editions = Object.values(import.meta.glob('../data/khutbas/*.json', { eager: true, import: 'default' }))
  .sort((a, b) => b.date.localeCompare(a.date))
const months = [...new Set(['2026-11', '2026-12', '2027-01', ...editions.map(k => k.date.slice(0, 7))])].sort()
function label(date, options) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(new Date(date + 'T12:00:00Z'))
}
const fullDate = date => label(date, { dateStyle: 'full' })

export function Uae() {
  const [params, setParams] = useSearchParams()
  const month = months.includes(params.get('month')) ? params.get('month') : editions[0].date.slice(0, 7)
  const visible = editions.filter(k => k.date.startsWith(month))
  return <Shell title="UAE Friday khutba" description="Follow the imam’s Arabic with the English translation beside it.">
    <section className="platform-section" aria-label="Khutba archive">
      <h2>Browse by month</h2>
      <div className="my-5 flex flex-wrap gap-2">
        {months.map(m => <Button key={m} variant={m === month ? 'primary' : 'outline'} aria-pressed={m === month}
          onClick={() => setParams({ month: m })}>{label(m + '-01', { month: 'short', year: 'numeric' })}</Button>)}
      </div>
      {visible.map(k => <article key={k.date} className="border-t border-line py-5">
        <time dateTime={k.date}>{fullDate(k.date)}</time>
        <h3 className="mt-2 text-xl font-semibold">{k.title}</h3>
        <p lang="ar" dir="rtl" className="w-fit">{k.arabicTitle}</p>
        <Link className="platform-button mt-4" to={'/uae/khutba/' + k.date}>Listen to khutba</Link>
      </article>)}
      {!visible.length && <p>No khutbas have been added for this month yet.</p>}
    </section>
  </Shell>
}

export function KhutbaReader() {
  const { date } = useParams()
  const khutba = date ? editions.find(k => k.date === date) : editions[0]
  if (!khutba) return <Shell title="Khutba not found"><Link to="/uae">Browse khutbas</Link></Shell>
  return <Reader key={khutba.date} khutba={khutba} />
}

function Reader({ khutba }) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const session = useRef(null)
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)
  const [heard, setHeard] = useState('')
  const [status, setStatus] = useState('')
  const passage = khutba.passages[index]

  useEffect(() => () => {
    const recognition = session.current
    session.current = null
    recognition?.abort()
  }, [])

  function stop(message) {
    const recognition = session.current
    session.current = null
    recognition?.abort()
    setActive(false)
    setStatus(message)
    setHeard('')
  }

  function start() {
    if (!Recognition || session.current) return
    const recognition = new Recognition()
    session.current = recognition
    recognition.lang = 'ar-AE'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      if (session.current !== recognition) return
      const results = event.results
      const latest = results[results.length - 1][0].transcript
      const previous = results.length > 1 ? results[results.length - 2][0].transcript : ''
      const match = findPassage(previous + ' ' + latest, khutba.passages)
      setHeard(latest)
      if (match !== -1) setIndex(match)
      setStatus(match === -1 ? 'Listening for a matching passage…' : 'Following the imam')
    }
    recognition.onerror = ({ error }) => {
      if (session.current !== recognition) return
      stop(error === 'not-allowed' || error === 'service-not-allowed'
        ? 'Microphone access was denied. Allow access or read manually.'
        : 'Speech recognition was interrupted. Try again or read manually.')
    }
    recognition.onend = () => {
      if (session.current !== recognition) return
      session.current = null
      setActive(false)
      setStatus('Listening ended. Start again or continue reading manually.')
      setHeard('')
    }
    try {
      recognition.start()
      setActive(true)
      setStatus('Waiting for Arabic speech…')
    } catch {
      stop('Could not start listening. Check microphone access or read manually.')
    }
  }

  function navigate(next) {
    stop('Reading manually.')
    setIndex(next)
  }

  return <Shell title={khutba.title} description={fullDate(khutba.date)}>
    <article className="max-w-3xl border-y border-line py-6" aria-label="Prepared passage">
      <p className="text-sm text-ink-secondary">{passage.part === 1 ? 'First khutbah' : 'Second khutbah'} · Passage {index + 1} of {khutba.passages.length}</p>
      <p lang="ar" dir="rtl" className="my-6 text-3xl leading-loose text-primary" style={{ fontFamily: '"Noto Kufi Arabic", sans-serif' }}>{passage.ar}</p>
      <p lang="en" className="text-xl leading-relaxed">{passage.en}</p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" disabled={!index} onClick={() => navigate(index - 1)}>Previous</Button>
        <Button variant="outline" disabled={index === khutba.passages.length - 1} onClick={() => navigate(index + 1)}>Next</Button>
      </div>
    </article>
    <div className="max-w-2xl py-6">
      <p className="mb-4 text-sm text-ink-secondary">{Recognition
        ? 'Use your microphone to follow the prepared text. Your browser may send audio to its speech service. This site does not save it.'
        : 'Speech recognition is unavailable in this browser. Use Previous and Next to read the khutba.'}</p>
      {Recognition && <Button onClick={active ? () => stop('Microphone stopped.') : start}>{active ? 'Stop listening' : 'Start microphone'}</Button>}
      <p className="my-3 text-sm" role="status">{status}</p>
      {heard && <div><span className="text-sm text-ink-secondary">Heard by microphone</span><p lang="ar" dir="rtl">{heard}</p></div>}
    </div>
    <Link className="landing-secondary" to={'/uae?month=' + khutba.date.slice(0, 7)}>Back to UAE khutba</Link>
  </Shell>
}
