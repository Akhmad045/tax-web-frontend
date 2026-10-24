/**
 * Login
 * -----
 * Halaman masuk. Setelah sukses, token & role disimpan lewat AuthContext
 * lalu diarahkan ke Dashboard.
 */
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function Login() {
  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Halaman asal yang ingin dituju sebelum dialihkan ke login.
  const tujuan = location.state?.from || '/'

  // Pesan sukses dari halaman verifikasi OTP / reset password.
  const info = location.state?.info || ''

  // Sudah login? Jangan tampilkan form lagi.
  useEffect(() => {
    if (isLoggedIn) navigate(tujuan, { replace: true })
  }, [isLoggedIn, navigate, tujuan])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const sesi = await login(username.trim(), password)
      navigate(sesi.role === 'admin' ? tujuan : '/', { replace: true })
    } catch (err) {
      const status = err.response?.status
      if (status === 401) {
        setError('Username atau password salah.')
      } else if (status === 403) {
        setError('Akun ini dinonaktifkan.')
      } else if (err.response) {
        setError(`Login gagal (status ${status}).`)
      } else {
        setError('Tidak dapat terhubung ke server. Periksa koneksi atau coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center py-10">
      <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <img
            src="/mu-logo.png"
            alt="MU Logo"
            className="mx-auto h-16 w-16 object-contain"
          />
          <h1 className="mt-4 text-xl font-bold text-slate-800">Masuk</h1>
          <p className="mt-1 text-sm text-slate-500">
            Halaman Riwayat hanya dapat diakses admin.
          </p>
        </div>

        {info && !error && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          >
            {info}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Lupa password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Memproses…' : 'Masuk'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-blue-700 hover:underline">
            Daftar
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-slate-400">
          Kalkulator pajak tetap bisa dipakai tanpa login.
        </p>
      </div>
    </div>
  )
}
