/**
 * AuthContext
 * -----------
 * Sumber tunggal status login di sisi frontend.
 *
 * Token & role disimpan di localStorage supaya sesi bertahan setelah
 * refresh. Yang disimpan hanya token JWT dan data ringan — password tidak
 * pernah disimpan.
 *
 * Catatan keamanan: localStorage bisa dibaca JavaScript mana pun yang
 * berjalan di halaman ini. Ini konsekuensi wajar untuk SPA tanpa cookie
 * httpOnly; jangan menyimpan data sensitif lain di sini.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from './api/client'

const KEY_TOKEN = 'access_token'
const KEY_ROLE = 'role'
const KEY_USERNAME = 'username'

const AuthContext = createContext(null)

/** Baca sesi dari localStorage. Aman terhadap nilai rusak/kosong. */
function bacaSesi() {
  const kosong = { token: '', role: '', username: '' }
  try {
    const token = bacaNilai(KEY_TOKEN)
    if (!token) return kosong
    return {
      token,
      role: bacaNilai(KEY_ROLE, ''),
      username: bacaNilai(KEY_USERNAME, ''),
    }
  } catch {
    // Mode privat / storage diblokir browser.
    return kosong
  }
}

/**
 * Ambil satu nilai dari localStorage, dengan muara aman bila storage tidak
 * tersedia (Safari mode privat, cookie/storage diblokir, SSR).
 *
 * `localStorage` saja bisa melempar SecurityError saat diakses — bukan hanya
 * saat `getItem` dipanggil — sehingga akses propertinya pun dibungkus.
 */
function bacaNilai(kunci, fallback = '') {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback
    const nilai = window.localStorage.getItem(kunci)
    if (!nilai) return fallback
    const bersih = nilai.trim()
    // Sisa data rusak dari versi lama tidak boleh dianggap sesi valid.
    if (bersih === '' || bersih === 'null' || bersih === 'undefined') {
      return fallback
    }
    return nilai
  } catch {
    return fallback
  }
}

/** Simpan sesi ke localStorage. */
function simpanSesi({ token, role, username }) {
  try {
    const ls = window.localStorage
    if (token) {
      ls.setItem(KEY_TOKEN, token)
      ls.setItem(KEY_ROLE, role || '')
      ls.setItem(KEY_USERNAME, username || '')
    } else {
      ls.removeItem(KEY_TOKEN)
      ls.removeItem(KEY_ROLE)
      ls.removeItem(KEY_USERNAME)
    }
  } catch {
    // Abaikan: aplikasi tetap berjalan, hanya sesi tidak bertahan.
  }
}

export function AuthProvider({ children }) {
  /**
   * Inisialisasi LANGSUNG dari localStorage, bukan nilai default kosong.
   *
   * `useState(bacaSesi)` (lazy initializer) dipanggil pada render pertama,
   * sinkron sebelum guard mana pun berjalan. Jadi saat halaman di-refresh
   * atau dibuka di tab baru, `isLoggedIn` sudah bernilai true sejak awal dan
   * user tidak terlempar ke /login. Kalau memakai `useState({})` biasa,
   * render pertama selalu "guest" lebih dulu — di situlah sesi hilang.
   */
  const [sesi, setSesi] = useState(bacaSesi)

  /**
   * Login ke backend.
   *
   * Endpoint memakai OAuth2PasswordRequestForm, jadi body HARUS berupa
   * `application/x-www-form-urlencoded` (URLSearchParams), bukan JSON.
   * Axios mengirim URLSearchParams sebagai form-urlencoded secara otomatis.
   */
  const login = useCallback(async (username, password) => {
    const body = new URLSearchParams()
    body.append('username', username)
    body.append('password', password)

    // Body form-urlencoded: OAuth2PasswordRequestForm TIDAK menerima JSON.
    // Tanpa header ini axios mengirim JSON dan backend membalas 422.
    const { data } = await api.post('/api/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const baru = {
      token: data.access_token,
      role: data.role || 'user',
      username: data.username || username,
    }
    simpanSesi(baru)
    setSesi(baru)
    return baru
  }, [])

  const logout = useCallback(() => {
    simpanSesi({ token: '' })
    setSesi({ token: '', role: '', username: '' })
  }, [])

  /**
   * Sinkronkan state dengan localStorage tanpa reload halaman.
   *
   * Dipakai saat token berubah dari luar React (logout di tab lain, tab
   * kembali aktif, atau sesi dibersihkan interceptor). Tanpa ini, state bisa
   * basi: halaman masih menganggap login padahal token sudah dihapus — dan
   * karena itu user "ter-logout sendiri" secara tak terduga.
   *
   * Mengembalikan sesi terbaru agar pemanggil bisa memutuskan redirect.
   */
  const sinkronkanSesi = useCallback(() => {
    const terbaru = bacaSesi()
    setSesi((lama) =>
      lama.token === terbaru.token &&
      lama.role === terbaru.role &&
      lama.username === terbaru.username
        ? lama // objek sama -> tidak memicu render ulang
        : terbaru,
    )
    return terbaru
  }, [])

  const value = useMemo(
    () => ({
      token: sesi.token,
      role: sesi.role,
      username: sesi.username,
      isLoggedIn: Boolean(sesi.token),
      isAdmin: sesi.role === 'admin',
      login,
      logout,
      sinkronkanSesi,
    }),
    [sesi, login, logout, sinkronkanSesi],
  )

  /**
   * Pasang listener storage SEKALI di provider.
   *
   * - `storage`     : tab lain login/logout -> state tab ini ikut menyesuaikan
   *                   tanpa reload, jadi tampilan tidak "nyangkut" di status
   *                   login yang lama.
   * - `focus` /
   *   `visibilitychange` : sebagian browser menahan event storage saat tab
   *                   tidak aktif; saat tab dibuka kembali kita baca ulang
   *                   localStorage sebagai jaring pengaman.
   *
   * Sengaja TIDAK melakukan redirect di sini: guard per-route yang memutuskan,
   * supaya halaman publik (login/register) tidak ikut terlempar.
   */
  useEffect(() => {
    const periksa = () => sinkronkanSesi()

    const onStorage = (e) => {
      // `key === null` terjadi saat localStorage.clear().
      if (!e.key || e.key === KEY_TOKEN || e.key === KEY_ROLE || e.key === KEY_USERNAME) {
        periksa()
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') periksa()
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', periksa)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', periksa)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sinkronkanSesi])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  }
  return ctx
}

/** Ambil token langsung dari storage (dipakai axios interceptor). */
export function ambilToken() {
  return bacaSesi().token
}

export { KEY_TOKEN, KEY_ROLE, KEY_USERNAME }
export default AuthContext
