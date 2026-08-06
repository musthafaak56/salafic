import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'

const ROLES = [
  {
    key: 'superadmin',
    label: 'Super admin',
    desc: 'Full platform control',
  },
  {
    key: 'admin',
    label: 'Admin',
    desc: 'Manage masjid data',
  },
  {
    key: 'user',
    label: 'User',
    desc: 'View transparency',
  },
]

const ROLE_PATHS = {
  superadmin: '/superadmin',
  admin: '/admin',
  user: '/',
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleLogin(role) {
    await login(role)
    navigate(ROLE_PATHS[role] || '/', { replace: true })
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Choose the role you want to explore."
      footer={
        <>
          Need an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        {ROLES.map((role) => (
          <button
            key={role.key}
            type="button"
            onClick={() => handleLogin(role.key)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-primary hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>
              <span className="block text-sm font-medium text-ink">{role.label}</span>
              <span className="block text-xs text-ink-secondary">{role.desc}</span>
            </span>
            <span className="text-ink-secondary" aria-hidden="true">
              →
            </span>
          </button>
        ))}
        <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/')}>
          Continue as visitor
        </Button>
      </div>
    </AuthLayout>
  )
}
