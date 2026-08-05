import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getFunds, getExpenses } from '../../lib/firestore'
import { formatCurrency, formatDate } from '../../lib/utils'
import PrayerTimesForm from './PrayerTimesForm'
import DonationForm from './DonationForm'
import ExpenseForm from './ExpenseForm'

const TABS = [
  { key: 'prayer', label: 'Prayer Times' },
  { key: 'donations', label: 'Donations' },
  { key: 'expenses', label: 'Expenses' },
]

export default function AdminDashboard() {
  const { profile, logout } = useAuth()
  const [tab, setTab] = useState('donations')
  const [funds, setFunds] = useState([])
  const [expenses, setExpenses] = useState([])

  async function loadData() {
    const [f, e] = await Promise.all([getFunds('main', 20), getExpenses('main', 20)])
    setFunds(f)
    setExpenses(e)
  }

  useEffect(() => {
    loadData().catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            <Link to="/">Salafic</Link>{' '}
            <span className="text-gray-500">/ Admin</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {profile?.name} · <span className="text-emerald-400">{profile?.role}</span>
            </span>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-2 border-b border-gray-800 mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">
              {tab === 'prayer' && 'Add Prayer Times'}
              {tab === 'donations' && 'Record Donation'}
              {tab === 'expenses' && 'Record Expense'}
            </h2>
            {tab === 'prayer' && <PrayerTimesForm onSaved={loadData} />}
            {tab === 'donations' && <DonationForm onSaved={loadData} />}
            {tab === 'expenses' && <ExpenseForm onSaved={loadData} />}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            {tab === 'prayer' && (
              <>
                <h2 className="text-lg font-semibold mb-4">Saved Times</h2>
                <p className="text-gray-400 text-sm">
                  Prayer times are shown on the homepage for the matching date.
                </p>
              </>
            )}
            {tab === 'donations' && (
              <>
                <h2 className="text-lg font-semibold mb-4">Recent Donations</h2>
                <List
                  items={funds}
                  empty="No donations yet."
                  render={(f) => (
                    <>
                      <div>
                        <p className="font-medium">{f.note}</p>
                        <p className="text-xs text-gray-400">
                          {f.byName || 'Admin'} · {formatDate(f.createdAt)}
                        </p>
                      </div>
                      <span className="font-semibold text-emerald-400">
                        +{formatCurrency(f.amount)}
                      </span>
                    </>
                  )}
                />
              </>
            )}
            {tab === 'expenses' && (
              <>
                <h2 className="text-lg font-semibold mb-4">Recent Expenses</h2>
                <List
                  items={expenses}
                  empty="No expenses yet."
                  render={(e) => (
                    <>
                      <div>
                        <p className="font-medium">{e.note}</p>
                        <p className="text-xs text-gray-400">
                          {e.category} · {e.byName || 'Admin'} · {formatDate(e.createdAt)}
                        </p>
                      </div>
                      <span className="font-semibold text-red-400">
                        −{formatCurrency(e.amount)}
                      </span>
                    </>
                  )}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function List({ items, empty, render }) {
  if (items.length === 0) return <p className="text-gray-400">{empty}</p>
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
        >
          {render(item)}
        </li>
      ))}
    </ul>
  )
}
