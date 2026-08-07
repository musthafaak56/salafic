import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import StatusBadge from './StatusBadge'
import Button from './Button'

const adminNav = (base) => [
  { to: `${base}`, label: 'Overview', end: true },
  { to: `${base}/donations`, label: 'Donations' },
  { to: `${base}/expenses`, label: 'Expenses' },
  { to: `${base}/prayer-times`, label: 'Prayer Times' },
]

const menuIconProps = {
  'aria-hidden': 'true',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export default function AppHeader({ area = 'public', onMenuClick, menuOpen }) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const showAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
  const isAdminArea = area === 'admin'
  const adminBase = profile?.role === 'superadmin' ? '/superadmin' : '/admin'

  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 rounded-2xl border border-line/80 bg-surface/80 px-3 shadow-[0_12px_40px_-12px_rgba(7,24,18,0.35)] backdrop-blur-xl">
        {isAdminArea && onMenuClick ? (
          <button
            id="admin-menu-button"
            type="button"
            onClick={onMenuClick}
            aria-label="Open admin menu"
            aria-expanded={menuOpen}
            aria-controls="admin-sidebar"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink transition-colors duration-200 hover:bg-surface-subtle md:hidden"
          >
            <svg {...menuIconProps} className="h-5 w-5">
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        ) : null}

        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-xl px-1.5 font-display text-lg font-bold tracking-tight text-ink"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-canvas transition-transform duration-500 group-hover:rotate-12">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4.5 w-4.5"
              aria-hidden="true"
            >
              <path
                d="M20.5 14.2A8.7 8.7 0 1 1 9.8 3.5a7.2 7.2 0 1 0 10.7 10.7Z"
                fill="currentColor"
              />
              <circle cx="16.4" cy="7.6" r="1.1" fill="currentColor" />
            </svg>
          </span>
          <span className="hidden sm:inline">Salafi Center</span>
          <span className="hidden text-ink-secondary md:inline">Cherukunnu</span>
        </Link>

        {!isAdminArea && showAdmin ? (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Admin">
            {adminNav(adminBase).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex h-10 items-center rounded-xl px-3 text-sm font-medium transition-colors duration-200 ${
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

        <nav className="hidden items-center gap-1 md:flex" aria-label="Public">
          <NavLink
            to="/quran"
            className={({ isActive }) =>
              `flex h-10 items-center rounded-xl px-3 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-primary-soft text-primary'
                  : 'text-ink-secondary hover:text-ink'
              }`
            }
          >
            Quran
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {isAdminArea ? (
            <NavLink
              to="/"
              className="flex h-10 items-center rounded-xl px-3 text-sm font-medium text-ink-secondary transition-colors duration-200 hover:text-ink"
            >
              View site
            </NavLink>
          ) : null}

          {profile ? (
            <>
              {!isAdminArea && showAdmin ? (
                <Link
                  to={adminBase}
                  className="hidden h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-canvas transition-colors duration-200 hover:bg-primary-hover sm:flex"
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
              className="flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors duration-200 hover:bg-surface-subtle"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
