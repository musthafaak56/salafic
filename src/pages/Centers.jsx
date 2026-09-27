import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { directory } from '../lib/platform'
import { useAuth } from '../context/AuthContext'
import { Shell, Input, Message } from '../components/PlatformUI'
import Button from '../components/Button'

export default function Centers() {
  const { profile } = useAuth()
  const [preferred] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('preferred-center'))
    } catch {
      return null
    }
  })
  const [filters, setFilters] = useState({ name: '', country: '', city: '' })
  const [result, setResult] = useState({ items: [] }),
    [busy, setBusy] = useState(true),
    [error, setError] = useState('')
  async function load(more = false) {
    setBusy(true)
    setError('')
    try {
      const page = await directory({
        ...filters,
        cursor: more ? result.cursor : null,
      })
      setResult((old) => ({
        ...page,
        items: more ? [...old.items, ...page.items] : page.items,
      }))
    } catch {
      setError('The directory could not be loaded. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    load()
  }, [])
  return (
    <Shell
      eyebrow="Your community, wherever you are"
      title="Find your center."
      description="Prayer times, community news, and transparent finances. Open to everyone."
      actions={
        <Link className="platform-button" to="/onboarding">
          Register your center
        </Link>
      }
    >
      {preferred?.slug && (
        <section className="platform-section">
          <p>Your preferred center</p>
          <Link to={`/c/${encodeURIComponent(preferred.slug)}`}>
            {preferred.displayName} →
          </Link>
          <p className="platform-hint">
            Choose another center below at any time.
          </p>
        </section>
      )}
      {!!profile?.centers?.length && (
        <section className="platform-section">
          <h2>Your centers</h2>
          <div className="platform-links">
            {profile.centers.map((c) => (
              <Link key={c.id} to={`/c/${c.slug}/admin`}>
                {c.displayName} →
              </Link>
            ))}
          </div>
        </section>
      )}
      <form
        className="directory-search"
        onSubmit={(e) => {
          e.preventDefault()
          load()
        }}
      >
        <Input
          label="Search by name"
          value={filters.name}
          onChange={(name) => setFilters({ ...filters, name })}
          placeholder="Start typing a center name"
        />
        <Input
          label="Country code"
          value={filters.country}
          onChange={(country) => setFilters({ ...filters, country })}
          maxLength={2}
          placeholder="Any country"
        />
        <Input
          label="City"
          value={filters.city}
          onChange={(city) => setFilters({ ...filters, city })}
          placeholder="Any city"
        />
        <Button loading={busy} type="submit">
          Find centers
        </Button>
      </form>
      {error && <Message error>{error}</Message>}
      <section aria-label="Centers" className="center-results">
        {result.items.map((c) => (
          <Link className="center-result" to={`/c/${c.slug}`} key={c.id}>
            <span className="center-monogram" aria-hidden="true">
              {c.displayName.slice(0, 1)}
            </span>
            <div>
              <p className="eyebrow">
                {c.type} · {c.countryCode}
              </p>
              <h2>{c.displayName}</h2>
              <p>
                {c.city} · {c.address}
              </p>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </section>
      {!busy && !error && !result.items.length && (
        <div className="platform-empty">
          <h2>No centers found</h2>
          <p>
            Try a different name or location, or register your community's
            center.
          </p>
          <Link to="/c/cherukunnu-salafi-center">
            Looking for Cherukunnu? →
          </Link>
        </div>
      )}
      {busy && <p role="status">Loading centers…</p>}
      {result.more && (
        <Button variant="outline" loading={busy} onClick={() => load(true)}>
          Load more
        </Button>
      )}
    </Shell>
  )
}
