import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Shell, Input, Message, CenterFields, CENTER_INITIAL, useAction } from '../components/PlatformUI'
import { act } from '../lib/platform'
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
  const { profile } = useAuth()
  const [creating, setCreating] = useState(false)
  const [fields, setFields] = useState({ ...CENTER_INITIAL })
  const [created, setCreated] = useState(null)
  const action = useAction()
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
    {profile?.role === 'superadmin' && <>
      <div className="platform-links">
        <Button variant="outline" aria-expanded={creating} aria-controls="create-center-form" disabled={action.busy} onClick={() => setCreating(!creating)}>{creating ? 'Close creation form' : 'Create center / masjid'}</Button>
      </div>
      {action.feedback}
      {created && <Message>Created as a draft. <Link to={`/c/${created.slug}/admin`}>Manage your new center</Link> to add admins through Team and publish from Settings.</Message>}
      {creating && <form id="create-center-form" onSubmit={e => {
        e.preventDefault()
        action.run(async () => {
          const result = await act('createCenter', { fields })
          setCreated(result)
          setCreating(false)
          setFields({ ...CENTER_INITIAL })
        }, 'Center created. No approval or invitation is needed for your superadmin access.')
      }}>
        <h2>Create center / masjid</h2>
        <p className="platform-hint">Create a draft directly as superadmin. You can manage it immediately and add other administrators through Team.</p>
        <fieldset disabled={action.busy}>
          <CenterFields value={fields} onChange={setFields} request designatedAdmin={false} />
          <label className="platform-check"><input type="checkbox" required />This Google Maps link points to the correct masjid or center.</label>
          <p className="platform-hint">Prayer times use the location and timezone from your map link. The center stays private until you publish it in Settings.</p>
          <div className="platform-links"><Button variant="outline" type="submit" loading={action.busy}>Create draft center</Button><Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button></div>
        </fieldset>
      </form>}
    </>}
    <Input label="Search centers by name" type="search" value={name} onChange={(value) => { setName(value); setCount(50) }} />
    {state.loading && <p role="status">Loading centers…</p>}
    {state.error && <Message error>{state.error}</Message>}
    {!state.loading && !state.error && !state.items.length && <p className="platform-empty">No centers found. Create a center above or approve a registration request.</p>}
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
