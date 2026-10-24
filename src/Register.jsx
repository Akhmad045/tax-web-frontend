/**
 * Register
 * --------
 * Form pendaftaran akun baru bertahap.
 *
 * Backend TIDAK langsung membuat user di langkah ini: data ditahan dulu
 * (tabel pending_registrasi) dan kode OTP dikirim ke email. User baru
 * dibuat setelah kode diverifikasi di halaman /verify-otp.
 *
 * Email pendaftaran disimpan di localStorage agar halaman verifikasi bisa
 * membacanya walau user me-refresh browser.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from './api/client'
import { simpanEmailProses, inputKelas } from './authFlow'

export default function Register() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== konfirmasi) {
      setError('Konfirmasi password tidak sama.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/register', {
        username: username.trim(),
        email: email.trim(),
        password,
      })
      // Simpan email untuk halaman /verify-otp.
      simpanEmailProses('verify_email', email.trim())
      navigate('/verify-otp', { replace: true })
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      if (status === 409) {
        setError(typeof detail === 'string' ? detail : 'Username atau email sudah terdaftar.')
      } else if (status === 422) {
        setError(
          typeof detail === 'string'
            ? detail
            : 'Data belum valid. Periksa email dan panjang password (minimal 6 karakter).',
        )
      } else if (status === 503) {
        setError('Server gagal mengirim email verifikasi. Coba lagi beberapa saat.')
      } else if (err.response) {
        setError(`Pendaftaran gagal (status ${status}).`)
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
          <h1 className="text-xl font-bold text-slate-800">Daftar Akun</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kami akan mengirim kode verifikasi ke email Anda.
          </p>
        </div>

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
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={50}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Minimal 3 karakter"
              className={inputKelas}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className={inputKelas}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className={inputKelas}
            />
          </div>

          <div>
            <label htmlFor="konfirmasi" className="mb-1.5 block text-sm font-medium text-slate-700">
              Ulangi Password
            </label>
            <input
              id="konfirmasi"
              name="konfirmasi"
              type="password"
              autoComplete="new-password"
              required
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              placeholder="Ketik ulang password"
              className={inputKelas}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Memproses…' : 'Daftar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-blue-700 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  )
}
