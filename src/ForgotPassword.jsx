/**
 * ForgotPassword
 * --------------
 * Meminta kode OTP reset password untuk sebuah email.
 *
 * Backend sengaja tidak membocorkan apakah email terdaftar: responsnya
 * selalu sukses. Karena itu halaman ini juga tidak menyatakan "email tidak
 * ditemukan" — user selalu diarahkan ke tahap berikutnya.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from './api/client'
import { inputKelas, simpanEmailProses } from './authFlow'
import { pesanGalatApi } from './utils/validation'

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/forgot-password', { email: email.trim() })
      simpanEmailProses('reset_email', email.trim())
      navigate('/reset-password', { replace: true })
    } catch (err) {
      const status = err.response?.status
      if (status === 422) {
        setError('Format email tidak valid.')
      } else if (status === 503) {
        setError('Server gagal mengirim email. Coba lagi beberapa saat.')
      } else {
        setError(pesanGalatApi(err, 'Permintaan gagal. Coba lagi.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center py-10">
      <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-800">Lupa Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Masukkan email akun Anda. Kami akan mengirim kode untuk reset password.
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Mengirim…' : 'Kirim Kode Reset'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Ingat password Anda?{' '}
          <Link to="/login" className="font-semibold text-blue-700 hover:underline">
            Kembali ke login
          </Link>
        </p>
      </div>
    </div>
  )
}
