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
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
        {isAdminArea && onMenuClick ? (
          <button
            id="admin-menu-button"
            type="button"
            onClick={onMenuClick}
            aria-label="Open admin menu"
            aria-expanded={menuOpen}
            aria-controls="admin-sidebar"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors duration-200 hover:bg-surface-subtle md:hidden"
          >
            <svg {...menuIconProps} className="h-6 w-6">
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        ) : null}

        <Link
          to="/"
          className="flex h-11 items-center text-lg font-semibold tracking-tight text-ink"
        >
          Salafic
        </Link>

        {!isAdminArea && showAdmin ? (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Admin">
            {adminNav(adminBase).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-200 ${
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

          {isAdminArea ? (
            <NavLink
              to="/"
              className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-ink-secondary transition-colors duration-200 hover:text-ink"
            >
              View site
            </NavLink>
          ) : null}

          {profile ? (
            <>
              {!isAdminArea && showAdmin ? (
                <Link
                  to={adminBase}
                  className="hidden h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-hover sm:flex"
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
              className="flex h-11 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors duration-200 hover:bg-surface-subtle"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
