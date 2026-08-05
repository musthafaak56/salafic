import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StatusBadge from './StatusBadge'

const iconProps = {
  'aria-hidden': 'true',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const icons = {
  overview: (
    <svg {...iconProps} className="h-5 w-5">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  ),
  donations: (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  ),
  expenses: (
    <svg {...iconProps} className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 9v6m3-3H9" />
    </svg>
  ),
  prayer: (
    <svg {...iconProps} className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
  eye: (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  logout: (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  ),
}

const adminNav = [
  { to: '/admin', label: 'Overview', end: true, icon: icons.overview },
  { to: '/admin/donations', label: 'Donations', end: false, icon: icons.donations },
  { to: '/admin/expenses', label: 'Expenses', end: false, icon: icons.expenses },
  { to: '/admin/prayer-times', label: 'Prayer Times', end: false, icon: icons.prayer },
]

export default function AdminSidebar({ onNavigate, id, className }) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <aside id={id} aria-label="Admin menu" className={className}>
      <Link
        to="/"
        onClick={onNavigate}
        className="flex h-16 shrink-0 items-center border-b border-line px-5 text-lg font-semibold tracking-tight text-ink"
      >
        Salafic
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin">
        {adminNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-primary-soft text-primary'
                  : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-line p-3">
        <div className="flex items-center gap-2 px-3 py-2">
          <StatusBadge tone="primary">{profile?.role}</StatusBadge>
          <span className="truncate text-xs text-ink-secondary">
            {profile?.name}
          </span>
        </div>
        <NavLink
          to="/"
          onClick={onNavigate}
          className="flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-ink"
        >
          {icons.eye}
          View site
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-ink"
        >
          {icons.logout}
          Sign out
        </button>
      </div>
    </aside>
  )
}
