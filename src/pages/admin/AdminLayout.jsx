import { Outlet } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import PageContainer from '../../components/PageContainer'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AppHeader area="admin" />
      <PageContainer>
        <Outlet />
      </PageContainer>
    </div>
  )
}
