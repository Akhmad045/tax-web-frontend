/**
 * Identitas perusahaan pemotong untuk dokumen PDF (Bupot / 1721-A1).
 *
 * Diambil dari environment build-time Vite (`import.meta.env`), dengan
 * fallback ke nilai default bila variabel tidak diisi. Karena nilai ini
 * dibakar ke dalam bundle saat build, mengubahnya wajib lewat `.env`
 * (pengembangan lokal) atau env langkah Build Web di workflow CI (APK).
 * `.env` sendiri tidak ikut commit (git-ignored); contohnya ada di
 * `.env.example`.
 */
const bersih = (nilai) => (typeof nilai === 'string' ? nilai.trim() : '')

export const COMPANY_NAME =
  bersih(import.meta.env.VITE_COMPANY_NAME) || 'PT Tim 3 Kalkulator Pajak'

export const COMPANY_NPWP =
  bersih(import.meta.env.VITE_COMPANY_NPWP) || '01.234.567.8-901.000'
