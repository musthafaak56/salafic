import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getLatestPrayerTimes,
  getFunds,
  getAllFunds,
  getExpenses,
  getAllExpenses,
} from '../lib/firestore'
import { formatCurrency, formatDate, todayISODate } from '../lib/utils'

const PRAYER_KEYS = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'dhuhr', label: 'Dhuhr' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha', label: 'Isha' },
  { key: 'jumuah', label: 'Jumuah' },
]

function useHomeData() {
  const [prayerTimes, setPrayerTimes] = useState(null)
  const [recentFunds, setRecentFunds] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [totals, setTotals] = useState({ collected: 0, spent: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [times, recentF, recentE, allF, allE] = await Promise.all([
          getLatestPrayerTimes(),
          getFunds(),
          getExpenses(),
          getAllFunds(),
          getAllExpenses(),
        ])
        setPrayerTimes(times)
        setRecentFunds(recentF)
        setRecentExpenses(recentE)
        setTotals({
          collected: allF.reduce((s, f) => s + (Number(f.amount) || 0), 0),
          spent: allE.reduce((s, e) => s + (Number(e.amount) || 0), 0),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { prayerTimes, recentFunds, recentExpenses, totals, loading }
}

export default function Home() {
  const { profile, logout } = useAuth()
  const { prayerTimes, recentFunds, recentExpenses, totals, loading } = useHomeData()

  const times = prayerTimes ?? {}
  const isToday = prayerTimes?.date === todayISODate()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Salafic</h1>
          {profile ? (
            <div className="flex items-center gap-4">
              {profile.role === 'admin' || profile.role === 'superadmin' ? (
                <Link
                  to="/admin"
                  className="text-sm bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3 py-1.5"
                >
                  Admin Dashboard
                </Link>
              ) : null}
              <span className="text-sm text-gray-400">
                {profile.name} · <span className="text-emerald-400">{profile.role}</span>
              </span>
              <button onClick={logout} className="text-sm text-gray-400 hover:text-white">
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm text-gray-400 hover:text-white">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="grid gap-6 md:grid-cols-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm text-gray-400 mb-2">Total Collected</h2>
            <p className="text-2xl font-bold text-emerald-400">
              {loading ? '…' : formatCurrency(totals.collected)}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm text-gray-400 mb-2">Total Expenses</h2>
            <p className="text-2xl font-bold text-red-400">
              {loading ? '…' : formatCurrency(totals.spent)}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm text-gray-400 mb-2">Balance</h2>
            <p className="text-2xl font-bold">
              {loading ? '…' : formatCurrency(totals.collected - totals.spent)}
            </p>
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Prayer Times</h2>
            <span className="text-xs text-gray-400">
              {isToday ? 'Today' : formatDate(prayerTimes?.date)} · Updated {formatDate(times.updatedAt)}
            </span>
          </div>
          {loading ? (
            <p className="text-gray-400">Loading…</p>
          ) : prayerTimes ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {PRAYER_KEYS.map((p) => (
                <div key={p.key} className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">{p.label}</p>
                  <p className="font-semibold">{times[p.key] || '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">
              No prayer times added yet. Ask an admin to add today&apos;s times.
            </p>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Donations</h2>
            {loading ? (
              <p className="text-gray-400">Loading…</p>
            ) : recentFunds.length === 0 ? (
              <p className="text-gray-400">No donations yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentFunds.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{f.note}</p>
                      <p className="text-xs text-gray-400">{formatDate(f.createdAt)}</p>
                    </div>
                    <span className="font-semibold text-emerald-400">
                      +{formatCurrency(f.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Expenses</h2>
            {loading ? (
              <p className="text-gray-400">Loading…</p>
            ) : recentExpenses.length === 0 ? (
              <p className="text-gray-400">No expenses yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentExpenses.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{e.note}</p>
                      <p className="text-xs text-gray-400">
                        {e.category || 'General'} · {formatDate(e.createdAt)}
                      </p>
                    </div>
                    <span className="font-semibold text-red-400">
                      −{formatCurrency(e.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
