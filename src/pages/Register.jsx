import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleRegister(e) {
    e.preventDefault()
    await register()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">Salafic</h1>
        <form
          onSubmit={handleRegister}
          className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-4"
        >
          <h2 className="text-xl font-semibold text-white">Create account</h2>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 text-white font-medium"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}