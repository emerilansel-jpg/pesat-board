/**
 * Terima undangan workspace — `/invite/:token`.
 * Route ter-auth (RequireAuth mengalihkan ke /login dengan return path bila
 * belum masuk). Memanggil api.acceptInvite lalu mengarahkan ke workspace.
 *
 * Mendukung:
 * - Email mismatch dialog (409): user bisa pilih lanjut atau ganti akun
 * - Cache invalidation via workspaces:changed event
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { api, ApiError, emitWorkspacesChanged, type InviteAcceptResponse } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'
import { toast } from '@/components/Toast'

export default function InviteAcceptPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [mismatch, setMismatch] = useState<{
    invitedEmail: string
    currentEmail: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const startedRef = useRef(false)

  const doAccept = (force?: boolean) => {
    if (!token) {
      setError('Tautan undangan tidak valid.')
      return
    }
    setLoading(true)
    api
      .acceptInvite(token, force)
      .then((res) => {
        // Check if backend returned emailMismatch (409)
        if (res.emailMismatch) {
          setMismatch({
            invitedEmail: res.invitedEmail ?? '',
            currentEmail: res.currentEmail ?? '',
          })
          setLoading(false)
          return
        }
        toast.success('Berhasil bergabung!')
        emitWorkspacesChanged()
        const slug = res.workspace?.slug
        navigate(slug ? `/w/${slug}` : '/', { replace: true })
      })
      .catch((err) => {
        setLoading(false)
        if (err instanceof ApiError && err.status === 409 && err.data?.emailMismatch) {
          setMismatch({
            invitedEmail: (err.data.invitedEmail as string) ?? '',
            currentEmail: (err.data.currentEmail as string) ?? '',
          })
          return
        }
        setError(
          err instanceof ApiError ? err.message : 'Tautan undangan tidak dapat dipakai.',
        )
      })
  }

  useEffect(() => {
    // Guard double-invoke (StrictMode): accept hanya boleh sekali — panggilan
    // kedua akan ditolak backend ("undangan sudah dipakai").
    if (startedRef.current) return
    startedRef.current = true
    doAccept()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-32"
        role="status"
        aria-label="Memproses undangan"
      >
        <Loader2 className="size-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium text-ink-900">Memproses undangan…</p>
        <p className="text-[13px] text-ink-500">Anda akan diarahkan ke workspace dalam sekejap.</p>
      </div>
    )
  }

  if (mismatch) {
    return (
      <EmptyState
        image="/empty-404.svg"
        title="Email tidak cocok"
        description={`Undangan ini ditujukan untuk ${mismatch.invitedEmail}, tetapi Anda login sebagai ${mismatch.currentEmail}.`}
        className="py-24"
        action={
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <Button onClick={() => doAccept(true)}>
              Lanjutkan dengan {mismatch.currentEmail}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await logout()
                navigate('/login', { state: { from: `/invite/${token}` } })
              }}
            >
              Ganti akun
            </Button>
          </div>
        }
      />
    )
  }

  if (error) {
    return (
      <EmptyState
        image="/empty-404.svg"
        title="Undangan tidak dapat dipakai"
        description={`${error} Tautan mungkin kedaluwarsa, sudah dipakai, atau ditujukan untuk alamat email lain.`}
        className="py-24"
        action={
          <Button asChild variant="outline">
            <Link to="/">Ke beranda</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-32"
      role="status"
      aria-label="Memproses undangan"
    >
      <Loader2 className="size-8 animate-spin text-brand-600" />
      <p className="text-sm font-medium text-ink-900">Memproses undangan…</p>
      <p className="text-[13px] text-ink-500">Anda akan diarahkan ke workspace dalam sekejap.</p>
    </div>
  )
}
