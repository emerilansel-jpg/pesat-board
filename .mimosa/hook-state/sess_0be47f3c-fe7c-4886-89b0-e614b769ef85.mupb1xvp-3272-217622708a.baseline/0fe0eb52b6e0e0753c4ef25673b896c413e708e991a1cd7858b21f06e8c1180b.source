/**
 * Auth Pesat Board — token JWT di localStorage `pb_token`.
 * AuthProvider bootstrap GET /api/auth/me; RequireAuth redirect /login.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Navigate, useLocation } from 'react-router'
import { api, ApiError, getToken, setToken, type User } from './api'
import { connectSocket, disconnectSocket } from './socket'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  /** Error non-auth (jaringan/server) saat bootstrap — token tetap disimpan. */
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setError(null)
      setIsLoading(false)
      return
    }
    setError(null)
    try {
      const { user } = await api.me()
      setUser(user)
      connectSocket()
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        // Token memang tidak valid — bersihkan sesi.
        setToken(null)
        setUser(null)
      } else {
        // Blip jaringan/server: token JANGAN dihapus — tampilkan error + retry.
        setError(
          err instanceof ApiError
            ? err.message
            : 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password })
    setToken(res.token)
    setUser(res.user)
    connectSocket()
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password })
    setToken(res.token)
    setUser(res.user)
    connectSocket()
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    disconnectSocket()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, error, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}

/** Gate route ter-auth: tanpa token → redirect /login (dengan return path). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, error, refreshUser } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-canvas">
        <div className="fixed inset-x-0 top-0 h-0.5 overflow-hidden bg-brand-100">
          <div className="h-full w-1/3 animate-shimmer bg-brand-600" />
        </div>
        <img src="/logo-mark.svg" alt="Pesat Board" className="h-12 w-12 animate-pulse" />
      </div>
    )
  }
  if (!isAuthenticated) {
    // Error jaringan saat bootstrap: token masih ada — tawarkan coba lagi,
    // jangan paksa logout hanya karena koneksi blip.
    if (error) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
          <img src="/logo-mark.svg" alt="Pesat Board" className="h-12 w-12" />
          <p className="text-sm font-medium text-ink-900">Gagal memuat sesi Anda</p>
          <p className="text-[13px] text-ink-500">{error}</p>
          <button
            type="button"
            onClick={() => void refreshUser()}
            className="mt-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Coba lagi
          </button>
        </div>
      )
    }
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}
