/**
 * riwayat.js
 * ----------
 * Helper untuk menyimpan hasil perhitungan ke database backend
 * (endpoint POST /api/riwayat) sesuai format tabel riwayat.
 *
 * Setiap modul mengirim payload DAN hasil perhitungan sekaligus di field
 * `detail`, sehingga halaman Riwayat bisa memulihkan konteks lengkap.
 */
import api from '../api/client'

/**
 * Pesan galat saat backend tidak dapat dihubungi.
 * Alamat diambil dari konfigurasi axios agar tidak menyesatkan bila
 * VITE_API_BASE_URL di-override.
 */
export function pesanBackendMati() {
  return `Tidak dapat terhubung ke backend. Pastikan FastAPI berjalan di ${api.defaults.baseURL} dan CORS sudah diaktifkan.`
}

/** Ubah nilai angka menjadi format Rupiah ringkas untuk ringkasan. */
function rupiahSingkat(nilai) {
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(Number(nilai) || 0))}`
}

/**
 * Simpan perhitungan ke database.
 *
 * @param {object} data
 * @param {string} data.modul        pph21_bulanan | pph21_tahunan | pph_badan
 * @param {string} data.judul        Judul baris riwayat
 * @param {string} data.nama_wajib   Nama pegawai / wajib pajak
 * @param {string} data.identitas    NIK / NPWP
 * @param {string} data.tahun_pajak
 * @param {string} data.status_ptkp
 * @param {string} data.ringkasan
 * @param {number} data.total_pph
 * @param {object} data.detail       Payload & hasil lengkap
 * @returns {Promise<object>} baris riwayat tersimpan
 */
export async function simpanPerhitungan(data) {
  const payload = {
    modul: data.modul,
    judul: data.judul || data.nama_wajib || 'Tanpa Nama',
    nama_wajib: data.nama_wajib || '',
    identitas: data.identitas || '',
    tahun_pajak: String(data.tahun_pajak || ''),
    status_ptkp: data.status_ptkp || '',
    ringkasan: data.ringkasan || '',
    // Backend menolak nilai minus; PPh tidak pernah negatif, tapi jaga-jaga.
    total_pph: Math.max(0, Number(data.total_pph) || 0),
    detail: data.detail || {},
  }

  const { data: tersimpan } = await api.post('/api/riwayat', payload)
  return tersimpan
}

/** Ambil daftar riwayat (terbaru lebih dulu). */
export async function ambilRiwayat({ modul, limit = 100 } = {}) {
  const params = { limit }
  if (modul) params.modul = modul
  const { data } = await api.get('/api/riwayat', { params })
  return data
}

/** Ambil satu riwayat beserta detail lengkapnya. */
export async function ambilDetailRiwayat(id) {
  const { data } = await api.get(`/api/riwayat/${id}`)
  return data
}

/** Hapus satu riwayat. */
export async function hapusRiwayat(id) {
  const { data } = await api.delete(`/api/riwayat/${id}`)
  return data
}

/** Label manusiawi untuk tiap modul. */
export const LABEL_MODUL = {
  pph21_bulanan: 'PPh 21 Bulanan',
  pph21_tahunan: 'PPh 21 Tahunan',
  pph_badan: 'PPh Badan',
}

export { rupiahSingkat }
