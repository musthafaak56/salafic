import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { key: 'superadmin', label: 'Super Admin', desc: 'Full platform control' },
  { key: 'admin', label: 'Admin', desc: 'Manage masjid data' },
  { key: 'user', label: 'User', desc: 'View transparency' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleLogin(role) {
    await login(role)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">Salafic</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-3">
          <h2 className="text-xl font-semibold text-white mb-4">Sign in as</h2>
          {ROLES.map((role) => (
            <button
              key={role.key}
              type="button"
              onClick={() => handleLogin(role.key)}
              className="w-full rounded-lg bg-gray-800 hover:bg-emerald-600 border border-gray-700 px-4 py-3 text-white text-left transition-colors"
            >
              <span className="block font-medium">{role.label}</span>
              <span className="block text-sm text-gray-400">{role.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
