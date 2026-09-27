import { Link } from 'react-router-dom'
import { Headphones, MagnifyingGlass } from '@phosphor-icons/react'
import { Shell } from '../components/PlatformUI'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()
  return (
    <Shell
      title="A place for every community."
      description="Stay connected to your masjid or center. Find prayer times, community announcements, donations and expenses—all without signing in."
    >
      <div className="landing-actions">
        <Link className="platform-button" to="/centers">
          <MagnifyingGlass size={20} /> Find a masjid or center
        </Link>
        <Link className="landing-secondary" to="/quran">
          <Headphones size={20} /> Listen to the Quran
        </Link>
        <Link className="landing-secondary" to={user ? '/onboarding' : '/register'}>
          Register your masjid or center
        </Link>
      </div>
      <section className="platform-section landing-registration">
        <h2>Your community, your own page.</h2>
        <p>Register a masjid or center anywhere in the world. Prayer times use its location, with minute adjustments available to its administrators.</p>
        <ol className="registration-steps">
          <li><strong>Register with your email</strong><p>Create and verify your account, then enter the center’s details and its designated admin email.</p></li>
          <li><strong>Get approval</strong><p>The super admin reviews your request. Once approved, the designated email receives owner access, or an invitation to accept after signing in.</p></li>
          <li><strong>Manage and invite your team</strong><p>Open your center’s dashboard to publish information. In Team, invite sub-admins by email and choose their permissions.</p></li>
        </ol>
        <Link className="platform-button" to={user ? '/onboarding' : '/register'}>Register your center</Link>
      </section>
    </Shell>
  )
}
