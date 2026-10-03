import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCenter } from '../context/CenterContext'
import { useAuth } from '../context/AuthContext'
import { act } from '../lib/platform'
import { Shell, Input, Message, useAction } from '../components/PlatformUI'
import Button from '../components/Button'

const empty = { madrasa: { name: '', description: '', contactEmail: '', phone: '', classes: [] }, committee: { description: '', members: [] } }
const title = (kind) => kind === 'madrasa' ? 'Madrasa' : 'Committee'

export default function CenterCommunity({ kind }) {
  const { center, base } = useCenter()
  const fields = center[kind] || empty[kind]
  return <Shell title={title(kind)} description={center.displayName}>
    <nav className="center-tabs" aria-label="Center navigation">
      <Link to={base}>Overview</Link>
      <Link to={`${base}/prayer-times`}>Prayer times</Link>
      <Link to={`${base}/madrasa`}>Madrasa</Link>
      <Link to={`${base}/committee`}>Committee</Link>
    </nav>
    <CommunityContent kind={kind} fields={fields} />
  </Shell>
}

function CommunityContent({ kind, fields }) {
  const items = kind === 'madrasa' ? fields.classes || [] : fields.members || []
  return <section className="platform-section">
    <h2>{kind === 'madrasa' ? fields.name || 'Madrasa information' : 'Our committee'}</h2>
    {fields.description && <p className="community-description">{fields.description}</p>}
    {!fields.description && !items.length && !fields.name && <p className="platform-empty">The center has not added {kind} information yet.</p>}
    {items.map((item, i) => <article className="community-entry" key={i}>
      <h3>{item.name}</h3>
      <p>{kind === 'madrasa' ? item.schedule : item.role}</p>
      {kind === 'madrasa' && item.teacher && <p>Teacher: {item.teacher}</p>}
    </article>)}
    {kind === 'madrasa' && <div className="platform-links">
      {fields.contactEmail && <a href={`mailto:${fields.contactEmail}`}>{fields.contactEmail}</a>}
      {fields.phone && <a href={`tel:${fields.phone.replace(/[^+\d]/g, '')}`}>{fields.phone}</a>}
    </div>}
  </section>
}

export function CommunityEditor({ kind }) {
  const { center, centerId, base } = useCenter()
  const { profile } = useAuth()
  const role = profile?.role === 'superadmin' ? 'owner' : profile?.centers?.find((c) => c.id === centerId)?.role
  const allowed = kind === 'committee' ? role === 'owner' : ['owner', 'admin', 'editor'].includes(role)
  const [fields, setFields] = useState(center[kind] || empty[kind])
  const [version, setVersion] = useState(center.version)
  const action = useAction()
  const key = kind === 'madrasa' ? 'classes' : 'members'
  const items = fields[key] || []
  const set = (name) => (value) => setFields((previous) => ({ ...previous, [name]: value }))
  function edit(index, name, value) {
    setFields((previous) => ({ ...previous, [key]: previous[key].map((item, i) => i === index ? { ...item, [name]: value } : item) }))
  }
  if (!allowed) return <Message error>You do not have permission to edit this section.</Message>
  return <section className="platform-section">
    <h2>{title(kind)}</h2>
    <p>{kind === 'madrasa' ? 'Share your madrasa’s classes, schedules and public contact details.' : 'List the people serving your center and their committee roles. Listing someone here does not grant dashboard access; manage that under Team.'}</p>
    <p className="platform-hint">Saved information appears on the public page when your center is published. Only add information you have permission to share.</p>
    {action.feedback}
    {version !== center.version && <Message>The center has changed since you opened this form. <button type="button" onClick={() => { setFields(center[kind] || empty[kind]); setVersion(center.version) }}>Reload the latest information</button> before saving.</Message>}
    <form onSubmit={(e) => { e.preventDefault(); action.run(async () => {
      await act('saveCommunity', { centerId, kind, fields, version })
      setVersion(version + 1)
    }, `${title(kind)} information saved.`) }}>
      <div className="platform-fields">
        {kind === 'madrasa' && <Input label="Madrasa name" value={fields.name} onChange={set('name')} maxLength={120} />}
        <label className="platform-field"><span>Description</span><textarea rows={4} maxLength={3000} value={fields.description} onChange={(e) => set('description')(e.target.value)} /></label>
        {kind === 'madrasa' && <>
          <Input label="Public contact email" type="email" value={fields.contactEmail} onChange={set('contactEmail')} />
          <Input label="Public phone" type="tel" value={fields.phone} onChange={set('phone')} maxLength={40} />
        </>}
      </div>
      <h3>{kind === 'madrasa' ? 'Classes & schedules' : 'Members & roles'}</h3>
      {!items.length && <p className="platform-hint">No {kind === 'madrasa' ? 'classes' : 'members'} added yet.</p>}
      {items.map((item, index) => <fieldset className="community-entry" key={index}>
        <legend>{kind === 'madrasa' ? 'Class' : 'Member'} {index + 1}</legend>
        <div className="platform-fields">
          <Input id={`${kind}-name-${index}`} label={kind === 'madrasa' ? 'Class name' : 'Full name'} value={item.name} onChange={(v) => edit(index, 'name', v)} required maxLength={120} />
          <Input id={`${kind}-detail-${index}`} label={kind === 'madrasa' ? 'Days and times' : 'Committee role'} placeholder={kind === 'madrasa' ? 'Saturday & Sunday, 9–11 am' : 'President, secretary…'} value={kind === 'madrasa' ? item.schedule : item.role} onChange={(v) => edit(index, kind === 'madrasa' ? 'schedule' : 'role', v)} required maxLength={kind === 'madrasa' ? 300 : 120} />
          {kind === 'madrasa' && <Input id={`teacher-${index}`} label="Teacher (optional)" value={item.teacher} onChange={(v) => edit(index, 'teacher', v)} maxLength={120} />}
        </div>
        <Button variant="ghost" type="button" onClick={() => set(key)(items.filter((_, i) => i !== index))}>Remove {kind === 'madrasa' ? 'class' : 'member'} {index + 1}</Button>
      </fieldset>)}
      <div className="platform-links">
        <Button variant="outline" type="button" disabled={items.length >= (kind === 'madrasa' ? 30 : 50)} onClick={() => set(key)([...items, kind === 'madrasa' ? { name: '', schedule: '', teacher: '' } : { name: '', role: '' }])}>Add {kind === 'madrasa' ? 'class' : 'member'}</Button>
        <Button type="submit" loading={action.busy} disabled={version !== center.version}>Save {kind}</Button>
        <Link to={`${base}/${kind}`}>View public page</Link>
      </div>
    </form>
  </section>
}
