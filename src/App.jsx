import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { AdminRoute, SuperAdminRoute } from './components/RouteGuards'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Quran from './pages/Quran'
import AdminLayout from './pages/admin/AdminLayout'
import Overview from './pages/admin/Overview'
import Donations from './pages/admin/Donations'
import Expenses from './pages/admin/Expenses'
import PrayerTimes from './pages/admin/PrayerTimes'

const adminPages = (
  <>
    <Route index element={<Overview />} />
    <Route path="donations" element={<Donations />} />
    <Route path="expenses" element={<Expenses />} />
    <Route path="prayer-times" element={<PrayerTimes />} />
  </>
)

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Home />} />
            <Route path="/quran" element={<Quran />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              {adminPages}
            </Route>
            <Route
              path="/superadmin"
              element={
                <SuperAdminRoute>
                  <AdminLayout />
                </SuperAdminRoute>
              }
            >
              {adminPages}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
