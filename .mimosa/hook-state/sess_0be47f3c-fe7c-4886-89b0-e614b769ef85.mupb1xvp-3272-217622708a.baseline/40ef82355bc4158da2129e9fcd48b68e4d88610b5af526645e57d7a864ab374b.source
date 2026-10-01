/**
 * Terima undangan workspace — `/invite/:token`.
 * Route ter-auth (RequireAuth mengalihkan ke /login dengan return path bila
 * belum masuk). Memanggil api.acceptInvite lalu mengarahkan ke workspace.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'
import { toast } from '@/components/Toast'

export default function InviteAcceptPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    // Guard double-invoke (StrictMode): accept hanya boleh sekali — panggilan
    // kedua akan ditolak backend ("undangan sudah dipakai").
    if (startedRef.current) return
    startedRef.current = true
    if (!token) {
      setError('Tautan undangan tidak valid.')
      return
    }
    api
      .acceptInvite(token)
      .then((res) => {
        toast.success('Berhasil bergabung!')
        const slug = res?.workspace?.slug
        navigate(slug ? `/w/${slug}` : '/', { replace: true })
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : 'Tautan undangan tidak dapat dipakai.',
        )
      })
  }, [token, navigate])

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
