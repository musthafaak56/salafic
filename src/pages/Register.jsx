import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'
import { GoogleLogo } from '@phosphor-icons/react'
import EmailAuth from '../components/EmailAuth'
import { accountDestination } from '../lib/accountAccess'

function googleErrorMessage(code) {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked. Allow popups for this site and try again.'
    case 'auth/operation-not-allowed':
      return 'Google sign-up is not enabled yet. Ask the site owner to enable it in the Firebase console.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in.'
    default:
      return 'Something went wrong while signing up. Please try again.'
  }
}

export default function Register() {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogle() {
    setError('')
    setBusy(true)
    try {
      const profileData = await loginWithGoogle()
      navigate(accountDestination(profileData), { replace: true })
    } catch (err) {
      const message = googleErrorMessage(err?.code)
      if (message) setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Register your masjid or center"
      subtitle="First create and verify your account. Next, send your center details and designated admin email for approval."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <EmailAuth register />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        size="lg"
        onClick={handleGoogle}
        loading={busy}
      >
        <GoogleLogo className="h-5 w-5" weight="bold" />
        Sign up with Google
      </Button>
      {error ? (
        <p
          className="mt-4 rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </AuthLayout>
  )
}
