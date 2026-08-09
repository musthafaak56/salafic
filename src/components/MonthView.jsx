import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDots,
  CaretLeft,
  CaretRight,
  Clock,
  MapPin,
  X,
} from '@phosphor-icons/react'
import { occursOnDay } from '../lib/utils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function timeLabelAt(event) {
  const t = String(event.eventAt ?? '')
  const hhmm = t.slice(11, 16)
  if (!hhmm || hhmm === '00:00') return null
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(2026, 0, 1, h, m).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function MonthView({ events }) {
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(null)

  function openModal() {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelected(null)
    setOpen(true)
  }

  function closeModal() {
    setSelected(null)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const cells = useMemo(() => {
    const y = month.getFullYear()
    const m = month.getMonth()
    const startOffset = new Date(y, m, 1).getDay()
    return Array.from({ length: 42 }, (_, i) => new Date(y, m, i - startOffset + 1))
  }, [month])

  const agenda = useMemo(() => {
    const rows = []
    const seen = new Set()
    for (const event of events ?? []) {
      const anchor = new Date(event.eventAt)
      if (Number.isNaN(anchor.getTime())) continue
      if (event.repeat === 'weekly') {
        const y = month.getFullYear()
        const m = month.getMonth()
        const daysInMonth = new Date(y, m + 1, 0).getDate()
        for (let d = 1; d <= daysInMonth; d++) {
          const day = new Date(y, m, d)
          if (!occursOnDay(event, day)) continue
          rows.push({
            date: day,
            title: event.title,
            event,
            weekly: true,
            weeklyTag: !seen.has(event.id),
          })
          seen.add(event.id)
        }
      } else {
        const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
        if (
          start.getFullYear() === month.getFullYear() &&
          start.getMonth() === month.getMonth()
        ) {
          rows.push({
            date: anchor,
            title: event.title,
            event,
            weekly: false,
            weeklyTag: false,
          })
        }
      }
    }
    return rows.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [events, month])

  const monthLabel = month.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  function openEvent(event, date) {
    setSelected({ kind: 'event', event, date })
  }

  function openDay(date, dayEvents) {
    if (dayEvents.length === 1) {
      openEvent(dayEvents[0], date)
    } else {
      setSelected({ kind: 'day', date, events: dayEvents })
    }
  }

  return (
    <div className="mt-4 flex justify-center">
      <button
        type="button"
        onClick={openModal}
        aria-haspopup="dialog"
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep"
      >
        <CalendarDots className="h-4 w-4 text-gold" weight="bold" />
        Month view
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-deep/80 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Events calendar"
            className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              {selected ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-full px-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-surface-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <CaretLeft className="h-4 w-4" weight="bold" />
                    Back to calendar
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    aria-label="Close calendar"
                    className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <X className="h-4 w-4" weight="bold" />
                  </button>
                </>
              ) : (
                <>
                  <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                    {monthLabel}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                      aria-label="Previous month"
                      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <CaretLeft className="h-4 w-4" weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
                      className="inline-flex h-10 cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-surface-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                      aria-label="Next month"
                      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <CaretRight className="h-4 w-4" weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      autoFocus
                      aria-label="Close calendar"
                      className="ml-1 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <X className="h-4 w-4" weight="bold" />
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {selected ? (
                selected.kind === 'event' ? (
                  <EventDetails event={selected.event} date={selected.date} />
                ) : (
                  <DayEvents date={selected.date} events={selected.events} onOpen={openEvent} />
                )
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {WEEKDAYS.map((w) => (
                      <div
                        key={w}
                        className="pb-1 text-center text-[10px] font-semibold tracking-widest text-ink-secondary uppercase"
                      >
                        {w}
                      </div>
                    ))}
                    {cells.map((day) => {
                      const inMonth = day.getMonth() === month.getMonth()
                      const isToday = sameDay(day, today)
                      const dayEvents = (events ?? []).filter((e) => occursOnDay(e, day))
                      const base = `flex min-h-12 flex-col items-center gap-0.5 rounded-xl border px-1 py-1.5 text-center transition-colors duration-200 sm:min-h-16 ${
                        isToday
                          ? 'border-gold/60 bg-gold-soft'
                          : 'border-transparent bg-transparent'
                      } ${dayEvents.length > 0 && !isToday ? 'cursor-pointer hover:bg-surface-subtle' : ''} ${
                        inMonth || isToday ? '' : 'opacity-40'
                      }`
                      const inner = (
                        <>
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              isToday ? 'text-gold' : inMonth ? 'text-ink' : 'text-ink-secondary'
                            }`}
                          >
                            {day.getDate()}
                          </span>
                          {dayEvents.length > 0 ? (
                            <span className="flex flex-col items-center gap-0.5">
                              <span className="h-1 w-1 rounded-full bg-gold" />
                              {dayEvents.slice(0, 2).map((e) => (
                                <span
                                  key={e.id}
                                  className="hidden w-full truncate text-[9px] leading-tight font-medium text-gold sm:block"
                                >
                                  {e.title}
                                </span>
                              ))}
                              {dayEvents.length > 2 ? (
                                <span className="hidden text-[9px] font-semibold text-gold sm:block">
                                  +{dayEvents.length - 2} more
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </>
                      )
                      return dayEvents.length > 0 ? (
                        <button
                          key={day.getTime()}
                          type="button"
                          onClick={() => openDay(day, dayEvents)}
                          className={`${base} focus:outline-none focus-visible:ring-2 focus-visible:ring-gold`}
                        >
                          {inner}
                        </button>
                      ) : (
                        <div key={day.getTime()} className={base}>
                          {inner}
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-5 border-t border-line pt-4">
                    <p className="text-xs font-semibold tracking-widest text-gold uppercase">
                      Events in {monthLabel}
                    </p>
                    {agenda.length === 0 ? (
                      <p className="mt-3 text-sm text-ink-secondary">
                        No events this month.
                      </p>
                    ) : (
                      <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto">
                        {agenda.map((row, i) => (
                          <li key={`${row.date.getTime()}-${i}`} className="py-1">
                            <button
                              type="button"
                              onClick={() => openEvent(row.event, row.date)}
                              className="flex w-full cursor-pointer items-baseline gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 hover:bg-surface-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                            >
                              <span className="w-20 shrink-0 font-display text-sm font-bold tabular-nums text-ink">
                                {row.date.toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                                {row.title}
                                {row.weeklyTag ? (
                                  <span className="ml-2 text-[10px] font-semibold tracking-wide text-gold uppercase">
                                    Every{' '}
                                    {row.date.toLocaleDateString('en-IN', {
                                      weekday: 'short',
                                    })}
                                  </span>
                                ) : null}
                              </span>
                              {timeLabelAt(row.event) ? (
                                <span className="shrink-0 text-xs tabular-nums text-ink-secondary">
                                  {timeLabelAt(row.event)}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EventDetails({ event, date }) {
  const timeText = timeLabelAt(event)
  const dayLabel = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return (
    <div className="rounded-2xl border border-line bg-cream/60 p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-widest text-gold uppercase">
        {dayLabel}
      </p>
      <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
        {event.title}
      </h3>
      {event.repeat === 'weekly' ? (
        <p className="mt-1.5 text-xs font-semibold tracking-wide text-gold uppercase">
          Repeats every {date.toLocaleDateString('en-IN', { weekday: 'long' })}
        </p>
      ) : null}
      {timeText ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <Clock className="h-4 w-4 text-gold" weight="bold" />
          {timeText}
        </p>
      ) : null}
      {event.location ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-ink-secondary">
          <MapPin className="h-4 w-4 text-gold" weight="bold" />
          {event.location}
        </p>
      ) : null}
      {event.description ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
          {event.description}
        </p>
      ) : null}
    </div>
  )
}

function DayEvents({ date, events, onOpen }) {
  const dayLabel = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return (
    <div className="rounded-2xl border border-line bg-cream/60 p-5">
      <p className="text-xs font-semibold tracking-widest text-gold uppercase">
        {dayLabel}
      </p>
      <ul className="mt-3 divide-y divide-line">
        {events.map((event) => {
          const t = timeLabelAt(event)
          return (
            <li key={event.id} className="py-1">
              <button
                type="button"
                onClick={() => onOpen(event, date)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors duration-200 hover:bg-surface-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span className="font-display text-base font-semibold text-ink">
                  {event.title}
                </span>
                {t ? (
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-secondary">
                    {t}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}