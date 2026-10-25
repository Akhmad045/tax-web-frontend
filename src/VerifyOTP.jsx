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
import { useLocation, useNavigate } from 'react-router-dom'
import api from './api/client'
import {
  ambilEmailProses,
  hapusEmailProses,
  inputKelas,
  simpanEmailProses,
} from './authFlow'
import { pesanGalatApi } from './utils/validation'

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
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  // Cooldown kirim ulang (detik). 0 = tombol aktif.
  const [cooldown, setCooldown] = useState(0)
  const [kirimUlang, setKirimUlang] = useState(false)
  const refs = useRef([])

  // Fokus ke kotak pertama saat halaman dibuka.
  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  /**
   * Hitung mundur cooldown.
   *
   * Interval dipasang hanya saat cooldown > 0 dan selalu dibersihkan di
   * cleanup, sehingga tidak ada timer menumpuk atau berjalan setelah
   * komponen dilepas.
   */
  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setInterval(() => {
      setCooldown((sisa) => (sisa <= 1 ? 0 : sisa - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

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
      if (status === 400) {
        // Backend menyertakan sisa percobaan sebelum kode dikunci.
        setError(pesanGalatApi(err, 'Kode verifikasi salah. Periksa kembali email Anda.'))
      } else if (status === 410) {
        setError('Kode sudah kedaluwarsa. Silakan daftar ulang untuk kode baru.')
      } else if (status === 404) {
        setError('Kode tidak ditemukan. Silakan daftar ulang.')
      } else if (status === 409) {
        setError('Email ini sudah terverifikasi. Silakan langsung masuk.')
      } else if (status === 429) {
        setError('Terlalu banyak percobaan salah. Minta kode baru agar bisa mencoba lagi.')
      } else {
        setError(pesanGalatApi(err, 'Verifikasi gagal. Coba lagi.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKirimUlang = async () => {
    if (cooldown > 0 || kirimUlang) return

    setError('')
    setInfo('')

    const alamat = email.trim()
    if (!alamat) {
      setError('Email tidak ditemukan. Isi email pendaftaran Anda.')
      return
    }

    setKirimUlang(true)
    try {
      await api.post('/api/resend-otp', { email: alamat })
      // Backend membalas segera (pengiriman email berjalan di latar belakang).
      setInfo(`Kode baru sedang dikirim ke ${alamat}. Periksa juga folder spam.`)
      setCooldown(60)
      // Kosongkan kotak agar user tidak mencampur kode lama dengan yang baru.
      setDigit(Array(JUMLAH_DIGIT).fill(''))
      refs.current[0]?.focus()
    } catch (err) {
      const status = err.response?.status
      if (status === 404) {
        setError(
          pesanGalatApi(err, 'Data pendaftaran tidak ditemukan. Silakan daftar ulang.'),
        )
      } else if (status === 422) {
        setError('Format email tidak valid.')
      } else {
        setError(pesanGalatApi(err, 'Gagal mengirim ulang kode. Coba lagi.'))
      }
    } finally {
      setKirimUlang(false)
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

        {info && (
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
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Memverifikasi…' : 'Verifikasi'}
          </button>

          {/* Kirim ulang OTP dengan cooldown 60 detik. */}
          <button
            type="button"
            onClick={handleKirimUlang}
            disabled={cooldown > 0 || kirimUlang}
            aria-live="polite"
            className="w-full rounded-xl border border-blue-300 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            {cooldown > 0
              ? `Kirim ulang dalam (${cooldown}) detik`
              : kirimUlang
                ? 'Mengirim…'
                : 'Kirim Ulang Kode'}
          </button>
        </form>
      </div>
    </div>
  )
}
