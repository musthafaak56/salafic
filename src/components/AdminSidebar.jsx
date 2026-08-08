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
  events: (
    <svg {...iconProps} className="h-5 w-5">
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4m8-4v4M4 10h16" />
    </svg>
  ),
  forms: (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
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
  chevronLeft: (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  ),
  chevronRight: (
    <svg {...iconProps} className="h-5 w-5">
      <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  ),
}

const adminNav = (base) => [
  { to: `${base}`, label: 'Overview', end: true, icon: icons.overview },
  { to: `${base}/donations`, label: 'Donations', end: false, icon: icons.donations },
  { to: `${base}/expenses`, label: 'Expenses', end: false, icon: icons.expenses },
  { to: `${base}/events`, label: 'Events', end: false, icon: icons.events },
  { to: `${base}/forms`, label: 'Forms', end: false, icon: icons.forms },
  { to: `${base}/prayer-times`, label: 'Prayer Times', end: false, icon: icons.prayer },
]

export default function AdminSidebar({
  onNavigate,
  id,
  className,
  collapsed = false,
  onToggle,
}) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const base = profile?.role === 'superadmin' ? '/superadmin' : '/admin'

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <aside id={id} aria-label="Admin menu" className={className}>
      <Link
        to="/"
        onClick={onNavigate}
        title={collapsed ? 'Salafic' : undefined}
        className="flex h-16 shrink-0 items-center border-b border-line px-5 text-lg font-semibold tracking-tight text-ink"
      >
        {collapsed ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            S
          </span>
        ) : (
          'Salafic'
        )}
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin">
        {adminNav(base).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex h-11 cursor-pointer items-center rounded-lg text-sm font-medium transition-colors duration-200 ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } ${
                isActive
                  ? 'bg-primary-soft text-primary'
                  : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
              }`
            }
          >
            {item.icon}
            {!collapsed ? item.label : null}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-line p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <StatusBadge tone="primary">{profile?.role}</StatusBadge>
            <span className="truncate text-xs text-ink-secondary">
              {profile?.name}
            </span>
          </div>
        ) : null}
        <NavLink
          to="/"
          onClick={onNavigate}
          title={collapsed ? 'View site' : undefined}
          className={`flex h-11 cursor-pointer items-center rounded-lg text-sm font-medium text-ink-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-ink ${
            collapsed ? 'justify-center' : 'gap-3 px-3'
          }`}
        >
          {icons.eye}
          {!collapsed ? 'View site' : null}
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={`flex h-11 w-full cursor-pointer items-center rounded-lg text-sm font-medium text-ink-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-ink ${
            collapsed ? 'justify-center' : 'gap-3 px-3'
          }`}
        >
          {icons.logout}
          {!collapsed ? 'Sign out' : null}
        </button>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-ink-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-ink"
          >
            {collapsed ? icons.chevronRight : icons.chevronLeft}
          </button>
        ) : null}
      </div>
    </aside>
  )
}
