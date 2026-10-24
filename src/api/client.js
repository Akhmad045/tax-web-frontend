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

export default api
