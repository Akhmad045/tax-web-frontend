/**
 * ResetPassword
 * -------------
 * Tahap 2 reset password: memasukkan kode OTP + password baru.
 *
 * Email diambil dari `location.state` atau localStorage (diisi
 * ForgotPassword.jsx). Setelah sukses, user diarahkan ke /login.
 */
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from './api/client'
import {
  ambilEmailProses,
  hapusEmailProses,
  inputKelas,
  simpanEmailProses,
} from './authFlow'
import { pesanGalatApi } from './utils/validation'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState(
    () => location.state?.email || ambilEmailProses('reset_email'),
  )
  const [otpCode, setOtpCode] = useState('')
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
      await api.post('/api/reset-password', {
        email: email.trim(),
        otp_code: otpCode.trim(),
        new_password: password,
      })
      hapusEmailProses('reset_email')
      navigate('/login', {
        replace: true,
        state: { info: 'Password berhasil diubah. Silakan masuk dengan password baru.' },
      })
    } catch (err) {
      const status = err.response?.status
      if (status === 400) {
        // Backend menyertakan sisa percobaan ("Sisa percobaan: 3.").
        setError(pesanGalatApi(err, 'Kode OTP salah. Periksa kembali email Anda.'))
      } else if (status === 410) {
        setError('Kode sudah kedaluwarsa. Minta kode baru dari halaman Lupa Password.')
      } else if (status === 404) {
        setError('Kode tidak ditemukan atau email tidak terdaftar. Minta kode baru.')
      } else if (status === 429) {
        setError('Terlalu banyak percobaan salah. Minta kode OTP baru agar bisa mencoba lagi.')
      } else {
        setError(pesanGalatApi(err, 'Reset password gagal. Coba lagi.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center py-10">
      <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-800">Reset Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Masukkan kode dari email dan password baru Anda.
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
              onChange={(e) => {
                setEmail(e.target.value)
                simpanEmailProses('reset_email', e.target.value)
              }}
              placeholder="nama@email.com"
              className={inputKelas}
            />
          </div>

          <div>
            <label htmlFor="otp" className="mb-1.5 block text-sm font-medium text-slate-700">
              Kode OTP
            </label>
            <input
              id="otp"
              name="otp_code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              pattern="\d{6}"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6 digit kode"
              className={`${inputKelas} text-center text-lg font-semibold tracking-[0.5em]`}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Password Baru
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className={inputKelas}
            />
          </div>

          <div>
            <label htmlFor="konfirmasi" className="mb-1.5 block text-sm font-medium text-slate-700">
              Ulangi Password Baru
            </label>
            <input
              id="konfirmasi"
              name="konfirmasi"
              type="password"
              autoComplete="new-password"
              required
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              placeholder="Ketik ulang password baru"
              className={inputKelas}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Menyimpan…' : 'Simpan Password Baru'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Kode tidak masuk?{' '}
          <Link to="/forgot-password" className="font-semibold text-blue-700 hover:underline">
            Minta kode baru
          </Link>
        </p>
      </div>
    </div>
  )
}
