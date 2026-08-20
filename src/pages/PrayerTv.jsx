import { useEffect, useMemo, useState } from 'react'
import { getLatestPrayerTimes, getEvents } from '../lib/firestore'
import { computePrayerTimes } from '../lib/computePrayerTimes'
import {
  format12h,
  formatDateTime,
  formatHMS,
  getNextPrayer,
  isStalePrayerTimes,
  occursOnDay,
  prayerEntry,
  prayerKeysForDate,
  secondsUntil,
  todayISODate,
} from '../lib/utils'

// Coordinates used for the default "Cherukunnu Salafi Center" schedule and
// the fallback when the published plan is out of date.
const CHERUKUNNU = { lat: 11.9204, lng: 75.4991, name: 'Cherukunnu' }

// TV screensaver for the masjid: a fullscreen, burn-in-safe display that
// lives on its own fixed dark palette (theme-independent) and shows the
// current time, the next prayer countdown, and today's salah schedule.
// Data is re-fetched every minute so the published plan always reflects.

const GOLD = '#d8b468'
const CREAM = '#f3ecd9'

const HIJRI = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

// Fetches the schedule for the active source. `masjid` mode loads the
// published plan and falls back to computed Cherukunnu times when it is
// stale or missing; `current` mode uses the device location (the `geo`
// note) and falls back to the masjid plan while locating or when access
// is denied. A note string describes what is actually being shown.
function useTvData(source, coords, geoStatus) {
  const [times, setTimes] = useState(null)
  const [events, setEvents] = useState(null)
  const [note, setNote] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        if (alive) {
          setEvents(await getEvents())
        }
        if (alive) setError(false)
        if (source === 'current' && coords) {
          if (alive) {
            setTimes(computePrayerTimes(coords.lat, coords.lng, todayISODate()))
            setNote('geo')
          }
          return
        }
        if (source === 'current' && !coords) {
          // Still locating (or access denied) — show the masjid plan with a
          // hint until the location resolves.
          if (alive) setNote(geoStatus === 'denied' ? 'geo-denied' : 'locating')
        }
        const t = await getLatestPrayerTimes()
        if (!alive) return
        if (t && !isStalePrayerTimes(t)) {
          setTimes(t)
          if (source !== 'current') setNote(null)
        } else {
          setTimes(
            computePrayerTimes(CHERUKUNNU.lat, CHERUKUNNU.lng, todayISODate()),
          )
          if (source !== 'current') setNote('computed')
        }
      } catch {
        if (alive) setError(true)
      }
    }
    load()
    const id = setInterval(load, 60000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [source, coords, geoStatus])
  return { times, events, note, error }
}

// Two overlapping squares form the eight-point star behind the clock.
function StarOrnament() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
      <div className="animate-tv-spin absolute h-[78vmin] w-[78vmin]">
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <rect
            x="26"
            y="26"
            width="48"
            height="48"
            fill="none"
            stroke={GOLD}
            strokeWidth="0.35"
            opacity="0.5"
          />
          <rect
            x="26"
            y="26"
            width="48"
            height="48"
            fill="none"
            stroke={GOLD}
            strokeWidth="0.35"
            opacity="0.5"
            transform="rotate(45 50 50)"
          />
          <circle
            cx="50"
            cy="50"
            r="10.5"
            fill="none"
            stroke={GOLD}
            strokeWidth="0.35"
            opacity="0.5"
          />
        </svg>
      </div>
      <div className="animate-tv-spin-rev absolute h-[58vmin] w-[58vmin]">
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={GOLD}
            strokeWidth="0.2"
            strokeDasharray="1.2 3"
            opacity="0.45"
          />
        </svg>
      </div>
    </div>
  )
}

const LATTICE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cpath d='M0 240L240 0M-70 310L310-70M70 310L310 70' stroke='%23d8b468' stroke-width='1'/%3E%3C/svg%3E\")"

function PrayerTv() {
  const now = useNow(1000)
  const [source, setSource] = useState(() => {
    try {
      return localStorage.getItem('salaficTvSource') || 'masjid'
    } catch {
      return 'masjid'
    }
  })
  const [coords, setCoords] = useState(null)
  const [geoStatus, setGeoStatus] = useState('idle')
  const { times, events, note, error } = useTvData(source, coords, geoStatus)
  const [hint, setHint] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  const switchSource = (s) => {
    setSource(s)
    try {
      localStorage.setItem('salaficTvSource', s)
    } catch {}
  }

  // Locate the device once when "current location" mode is activated.
  useEffect(() => {
    if (source !== 'current' || coords) return
    if (!('geolocation' in navigator)) {
      setGeoStatus('denied')
      return
    }
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'current location',
        })
        setGeoStatus('ok')
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }, [source, coords])

  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Prayer Times — Salafi Center Cherukunnu'
    const t = setTimeout(() => setHint(false), 8000)
    const onKey = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      }
    }
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFs)
      document.title = prevTitle
    }
  }, [])

  const keys = useMemo(
    () => prayerKeysForDate(times?.date || todayISODate()),
    [times],
  )
  const next = useMemo(
    () => (times ? getNextPrayer(times, now, keys) : null),
    [times, now, keys],
  )
  // What the schedule header above the clock says, depending on the source.
  const scheduleLabel =
    note === 'geo'
      ? 'Times for your location'
      : note === 'computed'
        ? 'Computed for today'
        : note === 'locating'
          ? 'Locating your position…'
          : note === 'geo-denied'
            ? 'Location unavailable'
            : 'Salah times for today'

  // Events occurring today, earliest first; the first not-yet-started one is
  // the "up next" highlight. Weekly events store an anchor date in eventAt,
  // so their effective time is rolled forward onto today before comparing.
  const todaysEvents = useMemo(() => {
    if (!events) return []
    const today = new Date()
    const effective = (ev) => {
      const d = new Date(ev.eventAt)
      if (ev.repeat === 'weekly') {
        return new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          d.getHours(),
          d.getMinutes(),
        )
      }
      return d
    }
    return events
      .filter((e) => occursOnDay(e, today))
      .map((e) => ({ ...e, effective: effective(e) }))
      .sort((a, b) => a.effective - b.effective)
  }, [events])
  const nextEventIndex = useMemo(() => {
    const t = now.getTime()
    return todaysEvents.findIndex((e) => e.effective.getTime() >= t)
  }, [todaysEvents, now])

  // Two-phase countdown: toward the adhaan first, then toward the iqama,
  // then the next (or tomorrow's) prayer takes over.
  const phase = useMemo(() => {
    if (!next || !next.isToday) return null
    const adhaanSecs = secondsUntil(next.adhaan, false, now)
    const iqamaSecs = secondsUntil(next.iqama, false, now)
    if (adhaanSecs !== null && adhaanSecs > 0) {
      return { kind: 'adhaan', secs: adhaanSecs, at: next.adhaan }
    }
    if (iqamaSecs !== null && iqamaSecs > 0) {
      return { kind: 'iqama', secs: iqamaSecs, at: next.iqama }
    }
    return null
  }, [next, now])

  const clock = useMemo(() => {
    const h = now.getHours()
    const hh = h % 12 === 0 ? 12 : h % 12
    const mm = String(now.getMinutes()).padStart(2, '0')
    return { hh, mm, ampm: h < 12 ? 'AM' : 'PM' }
  }, [now])

  // Seconds sweep + day progress for the bottom timeline hairline.
  const secOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const dayFrac = (secOfDay / 86400) * 100
  const secFrac = (now.getSeconds() / 60) * 100

  // Prayer ticks on the day timeline: minutes-of-day for each adhaan/iqama.
  const ticks = useMemo(() => {
    if (!times) return []
    const out = []
    const push = (hhmm) => {
      if (!hhmm) return
      const [h, m] = hhmm.split(':').map(Number)
      if (Number.isFinite(h) && Number.isFinite(m)) {
        out.push(((h * 60 + m) / 1440) * 100)
      }
    }
    for (const p of keys) {
      const { adhaan, iqama } = prayerEntry(times[p.key])
      push(adhaan)
      push(iqama)
    }
    return out
  }, [times, keys])

  return (
    <div className="relative flex min-h-[100svh] select-none flex-col overflow-hidden bg-[#040a07] text-[#f3ecd9]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-12%,#0d241b_0%,#071812_48%,#040a07_100%)]" />
      <div
        className="animate-tv-drift pointer-events-none absolute inset-[-6%] opacity-[0.05]"
        style={{ backgroundImage: LATTICE, backgroundSize: '240px 240px' }}
      />
      <StarOrnament />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_115%,transparent_35%,rgba(2,6,4,0.6)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="absolute top-[3.6vh] left-1/2 z-20 hidden -translate-x-1/2 overflow-hidden rounded-full border border-white/12 bg-white/[0.04] text-[11px] font-semibold tracking-[0.2em] text-[#9db0a2] uppercase backdrop-blur-sm lg:block">
        <button
          type="button"
          onClick={() => switchSource('masjid')}
          className={`px-5 py-2 transition-colors ${
            source === 'masjid' ? 'text-[#f3ecd9]' : 'hover:text-[#f3ecd9]'
          }`}
          style={
            source === 'masjid'
              ? { color: '#f3ecd9', background: 'rgba(216,180,104,0.16)' }
              : undefined
          }
        >
          Cherukunnu Masjid
        </button>
        <button
          type="button"
          onClick={() => switchSource('current')}
          className={`px-5 py-2 transition-colors ${
            source === 'current' ? 'text-[#f3ecd9]' : 'hover:text-[#f3ecd9]'
          }`}
          style={
            source === 'current'
              ? { color: '#f3ecd9', background: 'rgba(216,180,104,0.16)' }
              : undefined
          }
        >
          Current Location
        </button>
      </div>

      <header className="relative z-10 flex items-start justify-between px-[4vw] pt-[3.2vh]">
        <div className="flex items-center gap-4">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: GOLD, boxShadow: `0 0 18px ${GOLD}` }}
          />
          <p className="text-[11px] font-medium tracking-[0.42em] text-[#9db0a2] uppercase">
            Salafi Masjid · Cherukunnu
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-semibold text-[#f3ecd9]">
            {now.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <p className="mt-0.5 text-[13px] font-medium tracking-[0.18em] text-[#d8b468]/85 uppercase">
            {HIJRI.format(now)}
          </p>
        </div>
      </header>

      <main className="relative z-10 grid flex-1 grid-cols-12 items-center gap-6 px-[4vw] py-[4vh]">
        <section className="col-span-12 grid grid-cols-12 items-center gap-6">
          {/* Today's salah schedule */}
          <div className="col-span-12 lg:col-span-4">
            <p className="mb-[2.2vh] text-[11px] font-semibold tracking-[0.42em] text-[#9db0a2] uppercase">
              Today&rsquo;s Salah
            </p>
            <ul className="space-y-[1.5vh]">
              {keys.map((p) => {
                const { adhaan, iqama } = prayerEntry(times?.[p.key])
                const active = next?.key === p.key && next?.isToday
                return (
                  <li
                    key={p.key}
                    className={`flex items-baseline gap-x-6 rounded-xl px-5 py-[1.1vh] transition-colors duration-500 ${
                      active ? 'bg-white/[0.045]' : 'opacity-70 hover:opacity-90'
                    }`}
                  >
                    <span className="w-24 shrink-0">
                      <span
                        className={`font-display text-xl font-semibold uppercase ${
                          active ? 'text-[#e8c98c]' : 'text-[#f3ecd9]'
                        }`}
                      >
                        {p.label}
                      </span>
                      {active ? (
                        <span
                          className="ml-2 inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: GOLD }}
                        />
                      ) : null}
                    </span>
                    <span className="font-display w-24 shrink-0 text-xl font-medium tabular-nums text-[#f3ecd9]">
                      {format12h(adhaan)}
                    </span>
                    <span className="text-sm tabular-nums text-[#9db0a2]">
                      Iqama {format12h(iqama)}
                    </span>
                  </li>
                )
              })}
            </ul>

            {todaysEvents.length > 0 ? (
              <div className="mt-[3.2vh]">
                <p className="mb-[1.6vh] text-[11px] font-semibold tracking-[0.42em] text-[#9db0a2] uppercase">
                  Today&rsquo;s Events
                </p>
                <ul className="space-y-[1.1vh]">
                  {todaysEvents.map((ev, i) => {
                    const upcoming = i === nextEventIndex
                    const pending = i > nextEventIndex
                    return (
                      <li
                        key={ev.id}
                        className={`flex items-baseline gap-x-4 rounded-xl px-5 py-[0.8vh] transition-opacity duration-500 ${
                          upcoming
                            ? 'border border-[#d8b468]/25 bg-white/[0.045]'
                            : 'opacity-60'
                        }`}
                      >
                        <span className="font-display w-28 shrink-0 text-lg font-semibold tabular-nums text-[#e8c98c]">
                          {ev.effective.toLocaleTimeString('en-IN', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[17px] font-medium text-[#f3ecd9]">
                            {ev.titleMl || ev.title}
                          </span>
                          {upcoming ? (
                            <span className="mt-0.5 block text-[11px] tracking-[0.24em] text-[#d8b468]/80 uppercase">
                              Up next
                            </span>
                          ) : null}
                          {pending ? (
                            <span className="mt-0.5 block truncate text-[12px] text-[#9db0a2]">
                              {ev.titleMl && ev.title !== ev.titleMl ? ev.title : ''}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          {/* The clock */}
          <div className="col-span-12 order-first lg:order-none lg:col-span-4">
            <div key={clock.mm} className="animate-tv-fade-up text-center">
              <p className="mb-[1vh] text-[11px] font-semibold tracking-[0.42em] text-[#9db0a2] uppercase">
                {scheduleLabel}
              </p>
              <div className="font-display flex items-baseline justify-center font-extrabold tabular-nums leading-none text-[#f3ecd9]">
                <span className="text-[clamp(6.5rem,17vh,14rem)] tracking-tight">
                  {clock.hh}
                </span>
                <span className="px-[0.6vw] text-[clamp(6.5rem,17vh,14rem)] text-[#d8b468]/75">
                  :
                </span>
                <span className="text-[clamp(6.5rem,17vh,14rem)] tracking-tight">
                  {clock.mm}
                </span>
                <span className="ml-[1vw] text-[clamp(1.4rem,3.4vh,2.4rem)] font-semibold text-[#9db0a2]">
                  {clock.ampm}
                </span>
              </div>
              <div className="mx-auto mt-[2.2vh] h-[3px] w-[62%] overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${secFrac}%`,
                    background: `linear-gradient(90deg, transparent, ${GOLD})`,
                    boxShadow: `0 0 14px ${GOLD}`,
                    transition: 'width 0.3s linear',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Next prayer */}
          <div className="col-span-12 lg:col-span-4">
            {next ? (
              <div key={`${next.key}-${phase?.kind ?? 'tomorrow'}`} className="animate-tv-fade-up">
                <p className="mb-[2.2vh] text-center text-[11px] font-semibold tracking-[0.42em] text-[#9db0a2] uppercase">
                  Next prayer
                </p>
                <div className="animate-tv-breathe relative mx-auto max-w-[26rem] rounded-2xl border border-[#d8b468]/25 bg-white/[0.03] px-10 py-[3vh] text-center shadow-[0_24px_80px_-28px_rgba(216,180,104,0.35)]">
                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(70%_60%_at_50%_0%,rgba(216,180,104,0.12),transparent_70%)]" />
                  <p className="font-display relative text-[clamp(2.6rem,6.5vh,4.6rem)] font-bold uppercase leading-none text-[#e8c98c]">
                    {next.label}
                  </p>
                  <p className="relative mt-[1.4vh] text-[12px] font-medium tracking-[0.3em] text-[#9db0a2] uppercase">
                    {next.isToday
                      ? phase?.kind === 'iqama'
                        ? `Iqama at ${format12h(next.iqama)}`
                        : `Adhaan at ${format12h(next.adhaan)}`
                      : `Fajr tomorrow · ${format12h(next.adhaan)}`}
                  </p>
                  <p
                    className="relative mt-[1.6vh] font-display text-[clamp(3rem,7.5vh,5.2rem)] font-extrabold tabular-nums leading-none text-[#f3ecd9]"
                    style={{ textShadow: `0 0 40px rgba(216,180,104,0.35)` }}
                  >
                    {next.isToday && phase
                      ? `-${formatHMS(phase.secs)}`
                      : '—'}
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="mx-auto max-w-[26rem] rounded-2xl border border-white/10 bg-white/[0.03] px-10 py-[4vh] text-center">
                <p className="font-display text-2xl font-bold text-[#f3ecd9]">
                  Salah times unavailable
                </p>
                <p className="mt-2 text-sm text-[#9db0a2]">
                  Retrying automatically…
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      {/* Day timeline with prayer ticks */}
      <footer className="relative z-10 px-[4vw] pb-[3.2vh]">
        <div className="relative h-[5px] rounded-full bg-white/[0.06]">
          <div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: `${dayFrac}%`,
              background: `linear-gradient(90deg, rgba(216,180,104,0.4), ${GOLD})`,
              transition: 'width 0.6s linear',
            }}
          />
          {ticks.map((x, i) => (
            <span
              key={i}
              className="absolute top-1/2 h-[11px] w-[2px] -translate-y-1/2 rounded-full bg-[#e8c98c]"
              style={{ left: `${x}%`, opacity: 0.55 }}
            />
          ))}
        </div>
        <div className="mt-[1.4vh] flex items-center justify-between gap-4">
          <p className="text-[10px] tracking-[0.3em] text-[#9db0a2]/70 uppercase">
            {times ? `Updated ${formatDateTime(times.updatedAt)}` : 'Loading…'}
          </p>
          <p className="hidden truncate text-[10px] tracking-[0.3em] text-[#9db0a2]/70 uppercase sm:block">
            {note === 'computed'
              ? 'Published plan pending update · computed for Cherukunnu'
              : note === 'geo' && coords
                ? `Computed for your location · ${coords.lat.toFixed(2)}°N ${coords.lng.toFixed(2)}°E`
                : note === 'geo-denied'
                  ? 'Location access denied · showing Cherukunnu times'
                  : note === 'locating'
                    ? 'Locating your position…'
                    : 'Salafi Center Cherukunnu'}
          </p>
        </div>
      </footer>

      {hint && !fullscreen && (
        <p className="animate-tv-fade-up absolute right-[2vw] bottom-[7vh] z-20 text-[11px] tracking-[0.2em] text-white/40 uppercase">
          Press F for fullscreen
        </p>
      )}
    </div>
  )
}

export default PrayerTv