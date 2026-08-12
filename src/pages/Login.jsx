import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'
import { GoogleLogo } from '@phosphor-icons/react'

const ROLE_PATHS = {
  superadmin: '/superadmin',
  admin: '/admin',
  user: '/',
}

function googleErrorMessage(code) {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked. Allow popups for this site and try again.'
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled yet. Ask the site owner to enable it in the Firebase console.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in.'
    default:
      return 'Something went wrong while signing in. Please try again.'
  }
}

export default function Login() {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogle() {
    setError('')
    setBusy(true)
    try {
      const profileData = await loginWithGoogle()
      navigate(ROLE_PATHS[profileData.role] || '/', { replace: true })
    } catch (err) {
      const message = googleErrorMessage(err?.code)
      if (message) setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use your Google account to sign in."
      footer={
        <>
          Need an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Sign up here
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={handleGoogle}
          loading={busy}
        >
          <GoogleLogo className="h-5 w-5" weight="bold" />
          Sign in with Google
        </Button>
        {error ? (
          <p
            className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/')}>
          Continue as visitor
        </Button>
      </div>
    </AuthLayout>
  )
}