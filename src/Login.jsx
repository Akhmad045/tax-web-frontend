/**
 * Login
 * -----
 * Halaman masuk. Setelah sukses, token & role disimpan lewat AuthContext
 * lalu diarahkan ke Dashboard.
 */
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, User } from 'lucide-react'
import { useAuth } from './AuthContext'
import { pesanGalatApi } from './utils/validation'

export default function Login() {
  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Halaman asal yang ingin dituju sebelum dialihkan ke login.
  // Guard: hanya path internal ("/...") yang dipakai. Tanpa ini,
  // `state.from` berisi "//evil.com" atau "https://evil.com" akan membuat
  // `navigate()` membuka situs luar (open redirect) setelah login berhasil.
  const mentah = location.state?.from
  const tujuan =
    typeof mentah === 'string' &&
    mentah.startsWith('/') &&
    !mentah.startsWith('//') &&
    !mentah.startsWith('/\\')
      ? mentah
      : '/'

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
      } else {
        setError(pesanGalatApi(err, 'Login gagal. Coba lagi.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center py-10">
      <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-indigo-600 text-white font-extrabold text-lg rounded-xl tracking-wider">TM3</div>
          <h1 className="mt-4 text-xl font-bold text-slate-800">TaxEase</h1>
          <p className="mt-1 text-sm text-slate-500">
            Silakan masuk untuk menghitung pajak.
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
            <div className="relative">
              <User
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
              />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="pl-10 block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
              />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="pl-10 block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Link
              to="/forgot-password"
              className="mt-2 mb-4 block text-right text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Lupa password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>
    </div>
  )
}
