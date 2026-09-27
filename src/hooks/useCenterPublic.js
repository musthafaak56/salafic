import { useEffect, useState } from 'react'
import {
  getDocFromServer,
  getDocsFromServer,
  collection,
  query,
  limit,
  where,
  orderBy,
} from 'firebase/firestore'
import { centerDocument } from '../lib/platform'
import { calculateSchedule, localDate, shiftDate } from '../lib/centerPrayer'

export default function useCenterPublic(center) {
  const [now, setNow] = useState(Date.now()),
    [state, setState] = useState({ loading: true })
  const date = localDate(center.timezone, new Date(now))
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    let active = true,
      timer,
      attempt = 0
    let sequence = 0
    const key = `tv-public:${center.id}`
    const days = [date, shiftDate(date, 1)]
    async function refresh() {
      const request = ++sequence
      clearTimeout(timer)
      try {
        const [finance, announcements, events, forms, ...manual] =
          await Promise.all([
            getDocFromServer(
              centerDocument(center.id, 'publicFinance', 'current'),
            ),
            ...['announcements', 'events', 'forms'].map((name) =>
              getDocsFromServer(
                query(
                  collection(centerDocument(center.id), name),
                  ...(name === 'announcements'
                    ? [
                        where('expiresAt', '>', new Date().toISOString()),
                        orderBy('expiresAt'),
                      ]
                    : name === 'events'
                      ? [orderBy('eventAt', 'desc')]
                      : [orderBy('createdAt', 'desc')]),
                  limit(100),
                ),
              ),
            ),
            ...days.map((d) =>
              getDocFromServer(centerDocument(center.id, 'prayerTimes', d)),
            ),
          ])
        if (!active || request !== sequence) return
        const data = {
          centerId: center.id,
          savedAt: Date.now(),
          finance: finance.exists() ? finance.data() : null,
          announcements: announcements.docs.map((d) => ({
            ...d.data(),
            id: d.id,
          })),
          events: events.docs.map((d) => ({ ...d.data(), id: d.id })),
          forms: forms.docs.map((d) => ({ ...d.data(), id: d.id })),
          manual: Object.fromEntries(
            manual.map((s, i) => [days[i], s.exists() ? s.data() : null]),
          ),
          dates: days,
        }
        if (center.status === 'published')
          try {
            localStorage.setItem(key, JSON.stringify(data))
          } catch {}
        setState({ ...data, offline: false })
        attempt = 0
      } catch (error) {
        if (!active || request !== sequence) return
        if (error.code === 'permission-denied') {
          try {
            localStorage.removeItem(key)
          } catch {}
          setState({
            error: 'This center’s public information is unavailable.',
          })
        } else {
          let cached = null
          try {
            cached = JSON.parse(localStorage.getItem(key))
          } catch {}
          if (
            cached?.centerId === center.id &&
            Date.now() - cached.savedAt < 7 * 86400000
          )
            setState({ ...cached, offline: true })
          else
            setState({
              offline: true,
              error:
                'Public information is unavailable. Connect to load this center.',
            })
        }
        attempt++
      }
      if (active && request === sequence)
        timer = setTimeout(
          refresh,
          attempt ? Math.min(60000, 2000 * 2 ** Math.min(attempt, 5)) : 60000,
        )
    }
    refresh()
    const wake = () => {
      if (!document.hidden) refresh()
    }
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', wake)
    return () => {
      active = false
      clearTimeout(timer)
      window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [center.id, date, center.prayerVersion, center.version, center.status])
  let schedules = [],
    scheduleError = ''
  try {
    if (state.centerId === center.id && state.dates?.includes(date))
      schedules = [date, shiftDate(date, 1)]
        .filter((d) => !state.offline || state.dates?.includes(d))
        .map((d) => calculateSchedule(center, d, state.manual?.[d]))
  } catch {
    scheduleError =
      'Prayer times could not be calculated. Ask the center administrator to check its prayer settings.'
  }
  return { ...state, now, date, schedules, scheduleError }
}
