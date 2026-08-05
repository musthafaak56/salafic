import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import StatusBadge from './StatusBadge'
import Button from './Button'

const adminNav = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/donations', label: 'Donations' },
  { to: '/admin/expenses', label: 'Expenses' },
  { to: '/admin/prayer-times', label: 'Prayer Times' },
]

export default function AppHeader({ area = 'public' }) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const showAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
        <Link
          to="/"
          className="flex h-11 items-center text-lg font-semibold tracking-tight text-ink"
        >
          Salafic
        </Link>

        {area === 'admin' || showAdmin ? (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Admin">
            {adminNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-ink-secondary hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {area === 'admin' ? (
            <NavLink
              to="/"
              className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
            >
              View site
            </NavLink>
          ) : null}

          {profile ? (
            <>
              {area === 'public' && showAdmin ? (
                <Link
                  to="/admin"
                  className="hidden h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:flex"
                >
                  Admin dashboard
                </Link>
              ) : null}
              <div className="hidden items-center gap-2 sm:flex">
                <StatusBadge tone="primary">{profile.role}</StatusBadge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex h-11 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-subtle"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {area === 'admin' ? (
        <nav
          className="flex items-center gap-1 overflow-x-auto border-t border-line px-4 md:hidden"
          aria-label="Admin"
        >
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-soft text-primary' : 'text-ink-secondary'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
