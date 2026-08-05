import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AdminLayoutLoading } from '../pages/admin/AdminLayout'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink">
        <p>Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AdminLayoutLoading />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }

  return children
}
