import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider } from './context/ThemeContext'
import CenterRoute, { useCenter } from './context/CenterContext'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import { lazy, Suspense } from 'react'
const Quran = lazy(() => import('./pages/Quran'))
import QhlsDocuments from './pages/QhlsDocuments'
import Centers from './pages/Centers'
import Home from './pages/Home'
import CenterHome from './pages/CenterHome'
import CenterRequests from './pages/CenterRequests'
import {
  CenterAdminLayout,
  CenterOverview,
  CenterSettings,
  CenterPrayers,
  CenterAnnouncements,
  CenterFinances,
  CenterTeam,
} from './pages/CenterAdmin'
import Events from './pages/admin/Events'
import Forms from './pages/admin/Forms'
import FormBuilder from './pages/admin/FormBuilder'
import FormSubmissions from './pages/admin/FormSubmissions'
import PublicForm from './pages/PublicForm'
import CenterTimetable, { ManualTimetable } from './pages/CenterTimetable'

function Access({ platform = false, children }) {
  const { user, profile, loading } = useAuth()
  const context = useCenter(),
    location = useLocation()
  if (loading)
    return (
      <main className="platform-page">
        <p role="status">Checking access…</p>
      </main>
    )
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!user.emailVerified)
    return (
      <main className="platform-page">
        <h1>Verify your email first</h1>
        <p>Open the verification link in your inbox, then return to sign in before requesting or managing a center.</p>
        <a className="platform-button" href="/login">Return to sign in</a>
      </main>
    )
  if (platform && profile?.role !== 'superadmin')
    return <Navigate to="/onboarding" replace />
  if (
    context &&
    profile?.role !== 'superadmin' &&
    !profile?.centers?.some((c) => c.id === context.centerId)
  )
    return (
      <main className="platform-page">
        <h1>Access unavailable</h1>
        <p>You need a staff invitation for this center.</p>
      </main>
    )
  return children
}
function Legacy({ admin = false, form = false }) {
  const params = useParams()
  const path = form
    ? 'forms/' + params.formId
    : admin
      ? 'admin/' + (params['*'] || '')
      : 'tv'
  return <Navigate to={'/c/cherukunnu-salafi-center/' + path} replace />
}
export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/centers" element={<Centers />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/quran"
                element={
                  <Suspense
                    fallback={
                      <main className="platform-page">
                        <p role="status">Loading Quran tools…</p>
                      </main>
                    }
                  >
                    <Quran />
                  </Suspense>
                }
              />
              <Route path="/qhl-documents" element={<QhlsDocuments />} />
              <Route
                path="/onboarding"
                element={
                  <Access>
                    <CenterRequests />
                  </Access>
                }
              />
              <Route
                path="/platform"
                element={
                  <Access platform>
                    <CenterRequests review />
                  </Access>
                }
              />
              <Route path="/c/:slug" element={<CenterRoute />}>
                <Route index element={<CenterHome />} />
                <Route path="prayer-times" element={<CenterTimetable />} />
                <Route path="finances" element={<CenterHome />} />
                <Route path="events" element={<CenterHome />} />
                <Route path="tv" element={<CenterHome tv />} />
                <Route path="forms/:formId" element={<PublicForm />} />
                <Route
                  path="admin"
                  element={
                    <Access>
                      <CenterAdminLayout />
                    </Access>
                  }
                >
                  <Route index element={<CenterOverview />} />
                  <Route path="settings" element={<CenterSettings />} />
                  <Route
                    path="prayer-times"
                    element={
                      <>
                        <CenterPrayers />
                        <ManualTimetable />
                      </>
                    }
                  />
                  <Route
                    path="announcements"
                    element={<CenterAnnouncements />}
                  />
                  <Route path="finances" element={<CenterFinances />} />
                  <Route
                    path="donations"
                    element={<Navigate to="../finances" replace />}
                  />
                  <Route
                    path="expenses"
                    element={<Navigate to="../finances" replace />}
                  />
                  <Route path="team" element={<CenterTeam />} />
                  <Route path="events" element={<Events />} />
                  <Route path="forms" element={<Forms />} />
                  <Route path="forms/new" element={<FormBuilder />} />
                  <Route path="forms/:formId/edit" element={<FormBuilder />} />
                  <Route
                    path="forms/:formId/submissions"
                    element={<FormSubmissions />}
                  />
                </Route>
              </Route>
              <Route path="/tv" element={<Legacy />} />
              <Route path="/forms/:formId" element={<Legacy form />} />
              <Route path="/admin/*" element={<Legacy admin />} />
              <Route
                path="/superadmin/*"
                element={<Navigate to="/platform" replace />}
              />
              <Route path="*" element={<Navigate to="/centers" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
