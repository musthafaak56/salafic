import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Input, Message } from './PlatformUI'
import Button from './Button'
import { accountDestination } from '../lib/accountAccess'

export default function EmailAuth({ register = false, destination }) {
  const { refreshAccess } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [verification, setVerification] = useState(null)

  async function run(task) {
    setBusy(true)
    setError('')
    setMessage('')
    try { await task() } catch (e) {
      const messages = {
        'auth/email-already-in-use': 'This email already has an account. Sign in, or reset your password.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
        'auth/invalid-credential': 'The email or password is incorrect. Try again or reset your password.',
        'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
        'auth/operation-not-allowed': 'Email/password sign-in is not enabled yet. Contact the site owner, or use Google below.',
        'auth/network-request-failed': 'Could not connect. Check your connection and try again.',
      }
      setError(messages[e.code] || 'Unable to complete this step. Please try again.')
    } finally { setBusy(false) }
  }
  async function finish(firebaseUser) {
    if (!firebaseUser.emailVerified) {
      setVerification(firebaseUser)
      setMessage('Verify your email before requesting or managing a center. Open the verification link, then return here.')
      return
    }
    const profile = await refreshAccess(firebaseUser)
    navigate(destination || accountDestination(profile), { replace: true })
  }
  return (
    <div className="mb-6">
      {!verification ? (
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          run(async () => {
            const credential = await (register ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(auth, email.trim(), password)
            if (register) {
              // Retain the recovery controls even if sending the email fails.
              setVerification(credential.user)
              await sendEmailVerification(credential.user)
            }
            await finish(credential.user)
          })
        }}>
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} required />
          <Input label="Password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} value={password} onChange={setPassword} required />
          {register && <p className="platform-hint">Use at least 8 characters. We’ll send a link to verify your email. Registering an account does not grant center access until approval.</p>}
          <Button className="w-full" type="submit" loading={busy}>{register ? 'Create account with email' : 'Sign in with email'}</Button>
          {!register && <Button type="button" variant="ghost" loading={busy} onClick={() => run(async () => {
            if (!email.trim()) { setError('Enter your email above to reset your password.'); return }
            await sendPasswordResetEmail(auth, email.trim())
            setMessage('If this email has an account, check its inbox for a password reset link.')
          })}>Forgot password?</Button>}
        </form>
      ) : (
        <div className="space-y-4">
          <p>Verify <strong>{verification.email}</strong> using the link in your inbox, then continue.</p>
          <Button className="w-full" loading={busy} onClick={() => run(async () => {
            await reload(verification)
            await verification.getIdToken(true)
            await finish(verification)
          })}>I’ve verified my email — continue</Button>
          <Button variant="outline" loading={busy} onClick={() => run(async () => {
            await sendEmailVerification(verification)
            setMessage('Verification email sent. Check your inbox and spam folder.')
          })}>Resend verification email</Button>
        </div>
      )}
      {error && <Message error>{error}</Message>}
      {message && <Message>{message}</Message>}
      <p className="mt-6 text-center text-sm text-ink-secondary">Or continue with Google</p>
    </div>
  )
}
