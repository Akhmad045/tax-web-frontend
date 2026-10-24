/**
 * Helper validasi form bersama untuk semua halaman kalkulator pajak.
 */

/** Cek string angka (digit murni) kosong / belum diisi. */
export function isKosong(value) {
  return String(value ?? '').replace(/[^0-9]/g, '') === ''
}

/**
 * Validasi field uang wajib:
 *  - wajib diisi (tidak kosong)
 *  - tidak boleh negatif (input sudah memblokir "-", tapi dijaga di sini)
 */
export function validasiUangWajib(value, label) {
  if (isKosong(value)) return `${label} wajib diisi`
  if (Number(value) < 0) return `${label} tidak boleh minus`
  return ''
}

/** Validasi field uang opsional: hanya cek minus bila diisi. */
export function validasiUangOpsional(value, label) {
  if (!isKosong(value) && Number(value) < 0) return `${label} tidak boleh minus`
  return ''
}

/**
 * Validasi field teks wajib (Nama, NIK, dll).
 */
export function validasiTeksWajib(value, label) {
  if (!String(value ?? '').trim()) return `${label} wajib diisi`
  return ''
}

/**
 * Validasi NIK / NPWP: wajib TEPAT 16 digit angka.
 * Pesan error seragam: "NIK/NPWP harus tepat 16 digit angka".
 */
export const PESAN_NIK_NPWP = 'NIK/NPWP harus tepat 16 digit angka'

export function validasiNikNpwp(value) {
  const digit = String(value ?? '').replace(/\D/g, '')
  if (!/^\d{16}$/.test(digit)) return PESAN_NIK_NPWP
  return ''
}

/** Bersihkan input agar hanya berisi angka, maksimal 16 digit. */
export function hanyaAngka16(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 16)
}

/** Buang entri kosong dari objek error sebelum disimpan ke state. */
export function bersihkanErrors(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => Boolean(v)))
}

/**
 * Ubah respons galat Axios menjadi satu pesan yang ramah dibaca.
 *
 * FastAPI mengirim `detail` dalam dua bentuk:
 *   - string, untuk HTTPException buatan sendiri ("Kode OTP salah")
 *   - array objek validasi Pydantic ([{loc, msg, type}]) untuk 422
 * Bentuk array dulu berakhir sebagai pesan generik "status 422" sehingga
 * pengguna tidak tahu apa yang salah. Fungsi ini merangkumnya.
 *
 * @param {unknown} err  error dari blok catch Axios
 * @param {string}  fallback  pesan bila tidak ada detail yang bisa dipakai
 */
export function pesanGalatApi(err, fallback = 'Terjadi kesalahan. Coba lagi.') {
  const res = err?.response
  if (!res) {
    // Tidak ada respons: jaringan putus, CORS, atau server mati.
    return 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.'
  }

  const detail = res.data?.detail

  if (typeof detail === 'string' && detail.trim()) return detail.trim()

  if (Array.isArray(detail)) {
    const bagian = detail
      .map((d) => {
        const lokasi = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : ''
        const pesan = String(d?.msg ?? '').replace(/^Value error,\s*/i, '')
        if (!pesan) return ''
        return lokasi ? `${lokasi}: ${pesan}` : pesan
      })
      .filter(Boolean)
    if (bagian.length) return bagian.join('; ')
  }

  if (res.status === 401) return 'Sesi berakhir. Silakan masuk kembali.'
  if (res.status === 403) return 'Anda tidak memiliki akses ke fitur ini.'
  if (res.status === 429) return 'Terlalu banyak percobaan. Coba lagi nanti.'
  if (res.status >= 500) return 'Server sedang bermasalah. Coba lagi beberapa saat.'

  return fallback
}

/** Scroll otomatis ke field error pertama. */
export function fokusFieldPertama(errors) {
  const key = Object.keys(errors)[0]
  if (!key) return
  const el = document.getElementById(key.replace(/_/g, '_'))
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus?.()
  }
}