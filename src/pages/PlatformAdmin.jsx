import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Shell, Input, Message } from '../components/PlatformUI'
import DashboardNav from '../components/DashboardNav'
import Button from '../components/Button'

export default function PlatformAdmin() {
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const centers = pathname.endsWith('/centers')
  return <Shell title={centers ? 'Centers & masjids' : 'Registration requests'}
    description={centers ? 'Manage every center, including those still preparing to publish.' : 'All center applications arrive here. Review each request and assign its designated administrator.'}
    sidebar={<DashboardNav title="Platform administration" links={[
      { to: '/platform', label: 'Registration requests', icon: 'requests', end: true },
      { to: '/platform/centers', label: 'Centers & masjids', icon: 'centers' },
      { to: '/centers', label: 'Public directory', icon: 'overview' },
    ]}><p className="dashboard-account">Super admin<br />{profile?.email}</p></DashboardNav>}>
    <Outlet />
  </Shell>
}

export function PlatformCenters() {
  const [name, setName] = useState('')
  const [count, setCount] = useState(50)
  const [state, setState] = useState({ loading: true, items: [] })
  useEffect(() => {
    setState({ loading: true, items: [] })
    const prefix = name.trim().toLowerCase()
    return onSnapshot(query(collection(db, 'masjids'),
      ...(prefix ? [where('searchName', '>=', prefix), where('searchName', '<=', prefix + '\uf8ff')] : []),
      orderBy('searchName'), limit(count)), (snap) => setState({ items: snap.docs.map((d) => ({ ...d.data(), id: d.id })) }),
    () => setState({ items: [], error: 'Centers could not be loaded. Check your connection and platform access.' }))
  }, [name, count])
  return <section className="platform-section">
    <Input label="Search centers by name" type="search" value={name} onChange={(value) => { setName(value); setCount(50) }} />
    {state.loading && <p role="status">Loading centers…</p>}
    {state.error && <Message error>{state.error}</Message>}
    {!state.loading && !state.error && !state.items.length && <p className="platform-empty">No centers found. Approve a registration request to create a center.</p>}
    {state.items.map((center) => <article className="platform-row center-management-row" key={center.id}>
      <div><h2>{center.displayName}</h2><p>{center.city}, {center.countryCode} · {center.status}</p></div>
      <div className="platform-links">
        <Link to={`/c/${center.slug}/admin`}>Manage center</Link>
        <Link to={`/c/${center.slug}/admin/prayer-times`}>Prayer times</Link>
        <Link to={`/c/${center.slug}/admin/madrasa`}>Madrasa</Link>
        <Link to={`/c/${center.slug}/admin/committee`}>Committee</Link>
      </div>
    </article>)}
    {state.items.length === count && <Button variant="outline" onClick={() => setCount(count + 50)}>Load more centers</Button>}
  </section>
}
