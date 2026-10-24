/**
 * authFlow.js
 * -----------
 * Helper bersama untuk alur autentikasi bertahap (register → verify OTP,
 * forgot password → reset password).
 *
 * Email perlu terbawa antar halaman. Dua jalur dipakai:
 *   1. `state` react-router — cepat, tapi hilang bila halaman di-refresh
 *      atau dibuka di tab lain.
 *   2. localStorage — bertahan setelah refresh.
 *
 * Keduanya diisi; halaman penerima memakai `state` lebih dulu, lalu
 * jatuh ke localStorage.
 */

const KUNCI = {
  verify_email: 'auth_verify_email',
  reset_email: 'auth_reset_email',
}

/** Kelas Tailwind standar untuk input, agar konsisten di semua form auth. */
export const inputKelas =
  'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

/**
 * Simpan email untuk tahap berikutnya.
 *
 * @param {'verify_email'|'reset_email'} jenis
 * @param {string} email
 */
export function simpanEmailProses(jenis, email) {
  try {
    localStorage.setItem(KUNCI[jenis], email || '')
  } catch {
    // storage diblokir — abaikan, halaman penerima akan minta isi manual
  }
}

/** Ambil email yang disimpan untuk tahap berikutnya ('' bila tidak ada). */
export function ambilEmailProses(jenis) {
  try {
    return localStorage.getItem(KUNCI[jenis]) || ''
  } catch {
    return ''
  }
}

/** Hapus email setelah alurnya selesai, agar tidak tertinggal di perangkat. */
export function hapusEmailProses(jenis) {
  try {
    localStorage.removeItem(KUNCI[jenis])
  } catch {
    // abaikan
  }
}
