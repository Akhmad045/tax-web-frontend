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
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import api from './api/client'

const KEY_TOKEN = 'access_token'
const KEY_ROLE = 'role'
const KEY_USERNAME = 'username'

const AuthContext = createContext(null)

/** Baca sesi dari localStorage. Aman terhadap nilai rusak/kosong. */
function bacaSesi() {
  try {
    const token = localStorage.getItem(KEY_TOKEN)
    const role = localStorage.getItem(KEY_ROLE) || ''
    const username = localStorage.getItem(KEY_USERNAME) || ''
    // Token dianggap ada hanya bila benar-benar string tidak kosong.
    return token ? { token, role, username } : { token: '', role: '', username: '' }
  } catch {
    // Mode privat / storage diblokir browser.
    return { token: '', role: '', username: '' }
  }
}

/** Simpan sesi ke localStorage. */
function simpanSesi({ token, role, username }) {
  try {
    if (token) {
      localStorage.setItem(KEY_TOKEN, token)
      localStorage.setItem(KEY_ROLE, role || '')
      localStorage.setItem(KEY_USERNAME, username || '')
    } else {
      localStorage.removeItem(KEY_TOKEN)
      localStorage.removeItem(KEY_ROLE)
      localStorage.removeItem(KEY_USERNAME)
    }
  } catch {
    // Abaikan: aplikasi tetap berjalan, hanya sesi tidak bertahan.
  }
}

export function AuthProvider({ children }) {
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

  const value = useMemo(
    () => ({
      token: sesi.token,
      role: sesi.role,
      username: sesi.username,
      isLoggedIn: Boolean(sesi.token),
      isAdmin: sesi.role === 'admin',
      login,
      logout,
    }),
    [sesi, login, logout],
  )

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
