import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BASE } from '@/lib/base'

/** 404 — ilustrasi empty-404.svg + tombol kembali (design.md §7.7, §13). */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <img
          src={BASE + "/logo.svg"}
          alt="Pesat Board"
          className="mb-8 h-9 w-auto select-none"
          draggable={false}
        />
        <motion.img
          src={BASE + "/empty-404.svg"}
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[360px] select-none"
          draggable={false}
        />
        <h1 className="mt-6 text-2xl font-bold leading-8 tracking-[-0.015em] text-ink-900">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-5 text-ink-500">
          Kartu yang Anda cari mungkin sudah dipindahkan, diarsipkan, atau tidak pernah ada.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button asChild>
            <Link to="/" className="gap-1.5">
              <ArrowLeft className="size-4" /> Kembali ke beranda
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/login">Ke halaman masuk</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
