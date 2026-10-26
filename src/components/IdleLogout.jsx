import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useAuth } from '../AuthContext'
import useIdleTimer from '../hooks/useIdleTimer'

/**
 * IdleLogout — Auto-Logout (Session Timeout) di level aplikasi.
 *
 * Dipasang sekali di App.jsx (di dalam Layout, di luar Routes) sehingga
 * berlaku di semua halaman dan tetap ter-mount saat pindah rute.
 *
 * Perilaku:
 * - Timer 30 menit (1.800.000 ms) berjalan hanya saat user login.
 * - Aktivitas apa pun (gerak mouse, ketik, klik/tap, scroll, sentuh)
 *   me-reset timer lewat useIdleTimer.
 * - Saat waktu habis: logout() menghapus token/role/username, lalu
 *   tampil modal peringatan dan navigasi ke Landing Page ('/').
 * - Tombol modal mengarahkan ke '/login' untuk masuk kembali.
 * - Setelah logout, timer berhenti (active=false) sehingga modal tidak
 *   memicu logout berulang.
 */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000

export default function IdleLogout() {
  const { isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const handleIdle = useCallback(() => {
    logout()
    setShowModal(true)
    navigate('/', { replace: true })
  }, [logout, navigate])

  useIdleTimer({
    timeoutMs: IDLE_TIMEOUT_MS,
    onIdle: handleIdle,
    active: isLoggedIn,
  })

  if (!showModal) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sesi berakhir"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl animate-fadeInUp">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Clock size={28} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Sesi Berakhir</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan login
          kembali.
        </p>
        <button
          type="button"
          onClick={() => {
            setShowModal(false)
            navigate('/login')
          }}
          className="mt-5 w-full rounded-full bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
        >
          Login Kembali
        </button>
      </div>
    </div>
  )
}
