import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Login from './Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PPh21Bulanan from './pages/PPh21Bulanan'
import PPh21Tahunan from './pages/PPh21Tahunan'
import PPhBadan from './pages/PPhBadan'
import RiwayatData from './pages/RiwayatData'

/**
 * Bungkus route yang wajib login.
 *
 * Belum login -> /login (dengan `state.from` agar bisa kembali ke halaman
 * asal setelah berhasil masuk).
 */
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/pph21-bulanan" element={<PPh21Bulanan />} />
        <Route path="/pph21-tahunan" element={<PPh21Tahunan />} />
        <Route path="/pph-badan" element={<PPhBadan />} />
        <Route
          path="/riwayat"
          element={
            <AdminRoute>
              <RiwayatData />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
