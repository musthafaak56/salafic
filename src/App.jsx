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
import Events from './pages/admin/Events'
import PrayerTimes from './pages/admin/PrayerTimes'
import Forms from './pages/admin/Forms'
import FormBuilder from './pages/admin/FormBuilder'
import FormSubmissions from './pages/admin/FormSubmissions'
import PublicForm from './pages/PublicForm'

const adminPages = (
  <>
    <Route index element={<Overview />} />
    <Route path="donations" element={<Donations />} />
    <Route path="expenses" element={<Expenses />} />
    <Route path="events" element={<Events />} />
    <Route path="prayer-times" element={<PrayerTimes />} />
    <Route path="forms" element={<Forms />} />
    <Route path="forms/:formId/edit" element={<FormBuilder />} />
    <Route path="forms/new" element={<FormBuilder />} />
    <Route path="forms/:formId/submissions" element={<FormSubmissions />} />
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
            <Route path="/forms/:formId" element={<PublicForm />} />
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
