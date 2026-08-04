import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, profile, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Salafic</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {profile?.name || user?.email} ·{' '}
              <span className="text-emerald-400">{profile?.role}</span>
            </span>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-2">Welcome to Salafic</h2>
        <p className="text-gray-400 mb-8">
          You are signed in as{' '}
          <span className="text-white">{profile?.role}</span>. Modules are coming
          next: funds &amp; expenses, events, members, and more.
        </p>
      </main>
    </div>
  )
}
