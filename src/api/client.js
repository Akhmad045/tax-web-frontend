import axios from 'axios'

/**
 * Instance axios terpusat.
 *
 * Base URL backend diambil dari environment variable `VITE_API_URL`
 * (lihat `.env.example`). Semua halaman memakai instance ini, jadi cukup
 * satu tempat untuk diubah — tidak perlu menyentuh tiap halaman.
 *
 *   Lokal  : VITE_API_URL=http://127.0.0.1:8000
 *   Deploy : VITE_API_URL=https://url-backend-render-kamu.onrender.com
 *
 * Fallback ke localhost bila env belum diisi (mis. saat `npm run dev`).
 */
export const BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
)
  // Buang garis miring di akhir agar tidak muncul "//api/..." saat digabung.
  .replace(/\/+$/, '')

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Render free tier bisa "spin down" setelah idle; request pertama bisa
  // lambat (cold start). Timeout dinaikkan agar tidak gagal di 15 detik.
  timeout: 60000,
})

// ---------------------------------------------------------------------------
// INTERCEPTOR AUTENTIKASI
// ---------------------------------------------------------------------------

// Token dibaca langsung dari localStorage (bukan state React) supaya
// interceptor tidak perlu tahu soal Context dan tidak memicu render ulang.
function tokenTersimpan() {
  try {
    return localStorage.getItem('access_token') || ''
  } catch {
    return ''
  }
}

// 1) Setiap request otomatis menyertakan header Authorization bila login.
api.interceptors.request.use((config) => {
  const token = tokenTersimpan()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 2) Respons 401 berarti token tidak valid/kedaluwarsa: bersihkan sesi
//    lalu lempar ke /login. Pengecualian: request login itu sendiri,
//    karena 401 di sana berarti password salah (bukan sesi habis).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    const sedangLogin = url.includes('/api/login')

    if (status === 401 && !sedangLogin) {
      try {
        localStorage.removeItem('access_token')
        localStorage.removeItem('role')
        localStorage.removeItem('username')
      } catch {
        // storage diblokir — abaikan
      }
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default api
