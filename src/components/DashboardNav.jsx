import { NavLink } from 'react-router-dom'
import { Fragment, useId, useState } from 'react'
import { House, Buildings, Tray, Clock, BookOpen, Users, Gear, CalendarDots, CurrencyCircleDollar, FileText, Megaphone } from '@phosphor-icons/react'

const icons = { overview: House, centers: Buildings, requests: Tray, 'prayer-times': Clock, madrasa: BookOpen, education: BookOpen, committee: Users, settings: Gear, team: Users, events: CalendarDots, finances: CurrencyCircleDollar, forms: FileText, announcements: Megaphone }

export default function DashboardNav({ title, links, children }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <>
    <div className="dashboard-nav-heading"><p className="dashboard-nav-title">{title}</p><button type="button" className="dashboard-nav-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{open ? 'Close navigation' : 'Navigation'}</button></div>
    <nav id={id} className={`dashboard-nav${open ? ' is-open' : ''}`} aria-label={`${title} navigation`}>
      {links.map(({ to, label, icon, group, end = false }, index) => {
        const Icon = icons[icon] || House
        return <Fragment key={to}>
          {group && group !== links[index - 1]?.group && <p className="dashboard-nav-group">{group}</p>}
          <NavLink to={to} end={end} onClick={() => setOpen(false)}><Icon size={20} aria-hidden="true" /><span>{label}</span></NavLink>
        </Fragment>
      })}
    </nav>
    {children}
  </>
}
