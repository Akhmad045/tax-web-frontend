/**
 * VerifyOTP
 * ---------
 * Tahap 2 registrasi: memasukkan 6 digit kode yang dikirim ke email.
 *
 * Email diambil dari `location.state` (dikirim Register.jsx) atau dari
 * localStorage bila halaman di-refresh. Bila keduanya kosong, user diminta
 * mengetik emailnya sendiri.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from './api/client'
import {
  ambilEmailProses,
  hapusEmailProses,
  inputKelas,
  simpanEmailProses,
} from './authFlow'

const JUMLAH_DIGIT = 6

export default function VerifyOTP() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState(
    () => location.state?.email || ambilEmailProses('verify_email'),
  )
  // Satu state per kotak digit agar bisa auto-pindah fokus.
  const [digit, setDigit] = useState(Array(JUMLAH_DIGIT).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const refs = useRef([])

  // Fokus ke kotak pertama saat halaman dibuka.
  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  const kode = digit.join('')

  const tulisDigit = (index, nilai) => {
    const bersih = nilai.replace(/\D/g, '')
    if (!bersih) {
      setDigit((lama) => lama.map((d, i) => (i === index ? '' : d)))
      return
    }
    // Bila user menempel 6 digit sekaligus ke satu kotak.
    if (bersih.length > 1) {
      const baru = Array(JUMLAH_DIGIT).fill('')
      bersih
        .slice(0, JUMLAH_DIGIT)
        .split('')
        .forEach((c, i) => {
          baru[i] = c
        })
      setDigit(baru)
      refs.current[Math.min(bersih.length, JUMLAH_DIGIT) - 1]?.focus()
      return
    }
    setDigit((lama) => lama.map((d, i) => (i === index ? bersih : d)))
    if (index < JUMLAH_DIGIT - 1) refs.current[index + 1]?.focus()
  }

  const tekanBackspace = (index, e) => {
    if (e.key === 'Backspace' && !digit[index] && index > 0) {
      e.preventDefault()
      setDigit((lama) => lama.map((d, i) => (i === index - 1 ? '' : d)))
      refs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email tidak ditemukan. Kembali ke halaman daftar untuk memulai ulang.')
      return
    }
    if (kode.length !== JUMLAH_DIGIT) {
      setError('Masukkan 6 digit kode verifikasi.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/verify-otp', {
        email: email.trim(),
        otp_code: kode,
      })
      hapusEmailProses('verify_email')
      navigate('/login', {
        replace: true,
        state: { info: 'Akun berhasil diverifikasi. Silakan masuk.' },
      })
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      if (status === 400) {
        setError('Kode verifikasi salah. Periksa kembali email Anda.')
      } else if (status === 410) {
        setError('Kode sudah kedaluwarsa. Silakan daftar ulang untuk kode baru.')
      } else if (status === 404) {
        setError('Kode tidak ditemukan. Silakan daftar ulang.')
      } else if (status === 409) {
        setError('Email ini sudah terverifikasi. Silakan langsung masuk.')
      } else if (err.response) {
        setError(
          typeof detail === 'string' ? detail : `Verifikasi gagal (status ${status}).`,
        )
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
          <h1 className="text-xl font-bold text-slate-800">Verifikasi Email</h1>
          <p className="mt-1 text-sm text-slate-500">
            Masukkan 6 digit kode yang dikirim ke email Anda.
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
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                simpanEmailProses('verify_email', e.target.value)
              }}
              placeholder="nama@email.com"
              className={inputKelas}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Kode OTP</span>
            <div className="flex justify-between gap-2">
              {digit.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={JUMLAH_DIGIT}
                  value={d}
                  onChange={(e) => tulisDigit(i, e.target.value)}
                  onKeyDown={(e) => tekanBackspace(i, e)}
                  aria-label={`Digit ${i + 1}`}
                  className="h-12 w-full rounded-xl border border-slate-200 text-center text-lg font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Memverifikasi…' : 'Verifikasi'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Belum menerima kode?{' '}
          <Link to="/register" className="font-semibold text-blue-700 hover:underline">
            Daftar ulang
          </Link>
        </p>
      </div>
    </div>
  )
}
