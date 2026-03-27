import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { AppShell } from '@/components/AppShell'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import IncidentFormPage from '@/pages/IncidentFormPage'
import DispatchPage from '@/pages/DispatchPage'
import VehicleTrackingPage from '@/pages/VehicleTrackingPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import ProfilePage from '@/pages/ProfilePage'

/** Redirect to /login if not authenticated. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/**
 * Redirect to /dashboard with an "Unauthorised" flag if the user's role
 * does not have access to this page.
 */
function RequireRole({ page, children }: { page: string; children: React.ReactNode }) {
  const canAccess = useAuthStore((s) => s.canAccess)
  return canAccess(page) ? <>{children}</> : <Navigate to="/dashboard?unauthorised=1" replace />
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate)
  useEffect(() => { hydrate() }, [hydrate])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected shell */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* All authenticated roles */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile"   element={<ProfilePage />} />

          {/* Operational roles: operator, dispatcher, admin, super_admin */}
          <Route
            path="incidents/new"
            element={
              <RequireRole page="incidents">
                <IncidentFormPage />
              </RequireRole>
            }
          />
          <Route
            path="dispatch"
            element={
              <RequireRole page="dispatch">
                <DispatchPage />
              </RequireRole>
            }
          />
          <Route
            path="tracking"
            element={
              <RequireRole page="tracking">
                <VehicleTrackingPage />
              </RequireRole>
            }
          />

          {/* Analytics: operator, admin, super_admin, analyst */}
          <Route
            path="analytics"
            element={
              <RequireRole page="analytics">
                <AnalyticsPage />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
