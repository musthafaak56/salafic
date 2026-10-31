import { createContext, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { managementNavigation } from '../lib/managementNavigation'
import DashboardNav from './DashboardNav'
import { SignOut, UserCircle } from '@phosphor-icons/react'

const ManagementContext = createContext(false)
export const useManagementShell = () => useContext(ManagementContext)

export default function ManagementShell({ children }) {
  const { user, profile, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const navigation = user?.emailVerified ? managementNavigation(profile, pathname) : null
  if (!navigation) return children
  return <ManagementContext.Provider value={true}>
    <div className="management-shell">
      <aside className="management-sidebar" aria-label="Management sidebar">
        <Link className="management-brand" to={profile.role === 'superadmin' ? '/platform' : `/c/${navigation.center.slug}/admin`}>Salafic</Link>
        <div className="management-navigation">
          {profile.centers?.length > 1 && <label className="management-center-switch">Switch center
            <select value={navigation.center?.slug || ''} onChange={(event) => navigate(`/c/${event.target.value}/admin`)}>
              <option value="" disabled>Choose a center</option>
              {profile.centers.map((center) => <option key={center.id} value={center.slug}>{center.displayName}</option>)}
            </select>
          </label>}
        <DashboardNav title={navigation.title} links={navigation.links}>
          <div className="management-account">
            <div className="management-identity"><UserCircle size={32} weight="light" aria-hidden="true" /><div><strong>{user.displayName || (profile.role === 'superadmin' ? 'Super admin' : 'Center staff')}</strong><span>{user.email}</span></div></div>
            <button className="management-signout" type="button" onClick={async () => { await logout(); navigate('/') }}><SignOut size={18} aria-hidden="true" />Sign out</button>
          </div>
        </DashboardNav>
        </div>
      </aside>
      <div className="management-page">{children}</div>
    </div>
  </ManagementContext.Provider>
}
