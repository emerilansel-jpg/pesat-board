import { Route, Routes } from 'react-router'
import { AuthProvider, RequireAuth, useAuth } from '@/lib/auth'
import Layout from '@/components/Layout'
import AppToaster from '@/components/Toast'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import HomePage from '@/pages/HomePage'
import StarredPage from '@/pages/StarredPage'
import WorkspacePage from '@/pages/WorkspacePage'
import BoardPage from '@/pages/BoardPage'
import InboxPage from '@/pages/InboxPage'
import SettingsPage from '@/pages/SettingsPage'
import InviteAcceptPage from '@/pages/InviteAcceptPage'
import VersionPage from '@/pages/VersionPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { BASE } from '@/lib/base'

/**
 * /version PUBLIK (footer login/register menautkannya) — namun user ter-login
 * tetap melihatnya di dalam chrome Layout agar tampilan tidak berubah.
 */
function VersionEntry() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-canvas">
        <div className="fixed inset-x-0 top-0 h-0.5 overflow-hidden bg-brand-100">
          <div className="h-full w-1/3 animate-shimmer bg-brand-600" />
        </div>
        <img src={BASE + "/logo-mark.svg"} alt="Pesat Board" className="h-12 w-12 animate-pulse" />
      </div>
    )
  }
  if (!isAuthenticated) return <VersionPage />
  return (
    <Layout>
      <VersionPage />
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Route publik */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/version" element={<VersionEntry />} />

        {/* Route ter-auth — pola nested routes: Layout merender <Outlet/> */}
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="starred" element={<StarredPage />} />
          <Route path="w/:slug" element={<WorkspacePage />} />
          <Route path="w/:slug/members" element={<WorkspacePage />} />
          <Route path="w/:slug/activity" element={<WorkspacePage />} />
          <Route path="w/:slug/settings" element={<WorkspacePage />} />
          <Route path="b/:id/:slug" element={<BoardPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="invite/:token" element={<InviteAcceptPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <AppToaster />
    </AuthProvider>
  )
}
