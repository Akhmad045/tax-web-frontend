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