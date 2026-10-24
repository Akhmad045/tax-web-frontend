import { useEffect } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Login from './Login'
import Register from './Register'
import VerifyOTP from './VerifyOTP'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PPh21Bulanan from './pages/PPh21Bulanan'
import PPh21Tahunan from './pages/PPh21Tahunan'
import PPhBadan from './pages/PPhBadan'
import RiwayatData from './pages/RiwayatData'

/**
 * Baca token langsung dari localStorage.
 *
 * Sumber utama guard: keberadaan token di localStorage. Nilai kosong,
 * spasi, atau string "null"/"undefined" dianggap TIDAK login — supaya
 * sisa data rusak tidak membuka halaman terlarang.
 */
const KEY_TOKEN = 'access_token'

function adaToken() {
  try {
    const token = localStorage.getItem(KEY_TOKEN)
    if (!token) return false
    const bersih = token.trim()
    return bersih !== '' && bersih !== 'null' && bersih !== 'undefined'
  } catch {
    // Storage diblokir (mode privat) -> diperlakukan sebagai guest.
    return false
  }
}

/**
 * Auth Guard: bungkus route yang wajib login.
 *
 * Dua lapis pengecekan:
 *   1. `adaToken()` langsung ke localStorage (sumber utama, sinkron).
 *   2. `isLoggedIn` dari AuthContext (jaring pengaman bila token dihapus
 *      di tempat lain tanpa reload).
 *
 * Guest langsung diarahkan ke /login secara sinkron — komponen anak TIDAK
 * pernah dirender, jadi isi halaman tidak sempat terlihat. `replace` dipakai
 * agar tombol Back tidak kembali ke halaman terlarang.
 *
 * Catatan: effect di bawah menangani kasus token kedaluwarsa/diubah dari tab
 * lain. Bila token hilang setelah render pertama, guard mengarahkan ulang.
 */
function ProtectedRoute({ children }) {
  const { isLoggedIn, logout } = useAuth()
  const location = useLocation()
  const punyaToken = adaToken()

  useEffect(() => {
    if (!punyaToken && isLoggedIn) logout()
  }, [punyaToken, isLoggedIn, logout])

  if (!punyaToken || !isLoggedIn) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  return children
}

/** Pesan untuk user yang login tapi role-nya bukan admin. */
function AksesDitolak() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-10 shadow-sm">
        <p className="text-5xl">🚫</p>
        <h1 className="mt-4 text-2xl font-bold text-red-700">Akses Ditolak</h1>
        <p className="mt-2 text-sm text-red-600">
          Halaman Riwayat hanya dapat diakses oleh admin. Akun Anda tidak
          memiliki izin untuk membuka halaman ini.
        </p>
      </div>
    </div>
  )
}

/**
 * Khusus route /riwayat: wajib login DAN role admin.
 *
 * 403 dari backend juga akan sampai ke sini sebagai lapis kedua, tapi
 * pengecekan di frontend mencegah request yang pasti gagal.
 */
function AdminRoute({ children }) {
  const { isAdmin } = useAuth()

  // Lapis 1 (ProtectedRoute) memastikan sudah login; lapis 2 memastikan admin.
  return (
    <ProtectedRoute>
      {isAdmin ? children : <AksesDitolak />}
    </ProtectedRoute>
  )
}

/** Halaman 404 sederhana, tetap di dalam Layout. */
function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-800">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-slate-500">
        Alamat yang Anda buka tidak tersedia.{' '}
        <Link to="/" className="font-semibold text-blue-700 hover:underline">
          Kembali ke Dashboard
        </Link>
        .
      </p>
    </div>
  )
}

/**
 * Memantau token di localStorage selama aplikasi hidup.
 *
 * Skenario yang ditangani: user logout di tab lain (atau dev menghapus token
 * lewat DevTools) sehingga halaman yang sedang terbuka masih memegang state
 * login. Begitu token hilang, lakukan reload penuh ke /login agar tidak ada
 * sisa isi halaman terlindungi di layar.
 */
function PemantauToken() {
  useEffect(() => {
    const periksa = () => {
      if (!adaToken()) {
        // Reload penuh membuang seluruh state React (termasuk data sensitif).
        if (window.location.pathname !== '/login') {
          window.location.replace('/login')
        }
      }
    }

    // Tab lain mengubah localStorage.
    const onStorage = (e) => {
      if (!e.key || e.key === KEY_TOKEN) periksa()
    }
    // Kembali ke tab ini: cek ulang karena storage bisa berubah saat tidak aktif.
    const onVisible = () => {
      if (document.visibilityState === 'visible') periksa()
    }

    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    // Cek sekali saat mount/refresh.
    periksa()

    return () => {
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}

export default function App() {
  const { isLoggedIn, isAdmin } = useAuth()
  const location = useLocation()

  // Tujuan SETELAH login: halaman yang tadi ingin dibuka, bila memang boleh.
  // /riwayat hanya untuk admin — user biasa diarahkan ke Dashboard agar tidak
  // terjebak loop (login → /riwayat → Akses Ditolak).
  const dari = location.state?.from
  const tujuan =
    dari && dari.startsWith('/') && !dari.startsWith('//')
      ? dari.startsWith('/riwayat') && !isAdmin
        ? '/'
        : dari
      : '/'

  return (
    <Layout>
      {/*
        Rute privat tetap dirender DI DALAM provider. Saat localStorage
        dikosongkan di tab lain, token hilang tanpa reload halaman — provider
        React tidak otomatis tahu, jadi guard minta refresh penuh agar seluruh
        state (termasuk isi halaman terlindungi) dibuang dari memori.
      */}
      <PemantauToken />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to={tujuan} replace />
            ) : (
              <Login />
            )
          }
        />
        {/* Alur autentikasi: daftar → verifikasi OTP → login. */}
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        {/* Alur lupa password: minta OTP → reset password → login. */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/*
          Modul kalkulator wajib login. Guest yang membuka URL langsung
          (mis. /pph-badan) langsung dilempar ke /login tanpa render isi.
        */}
        <Route
          path="/pph21-bulanan"
          element={
            <ProtectedRoute>
              <PPh21Bulanan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pph21-tahunan"
          element={
            <ProtectedRoute>
              <PPh21Tahunan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pph-badan"
          element={
            <ProtectedRoute>
              <PPhBadan />
            </ProtectedRoute>
          }
        />
        {/* /riwayat: wajib login DAN admin. */}
        <Route
          path="/riwayat"
          element={
            <AdminRoute>
              <RiwayatData />
            </AdminRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
