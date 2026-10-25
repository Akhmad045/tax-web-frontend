/**
 * Helper format angka & parsing untuk input.
 *
 * Prinsip:
 *  - State menyimpan STRING angka murni (hanya digit), mis. "10000000".
 *  - Format ribuan hanya untuk TAMPILAN, tanpa mengubah nilai asli.
 *  - Konversi ke Number dilakukan sekali, saat submit.
 */

/** Ambil hanya digit 0-9 dari input apapun -> string angka murni. */
export function onlyDigits(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[^0-9]/g, '')
}

/** String digit -> Number (aman, 0 kalau kosong). */
export function parseNumber(value) {
  const digits = onlyDigits(value)
  if (digits === '') return 0
  const num = Number(digits)
  return Number.isFinite(num) ? num : 0
}

/**
 * Format tampilan ribuan dari string digit.
 * "10000000" -> "10.000.000". Kosong -> "".
 * Hanya memengaruhi tampilan, tidak mengubah nilai state.
 */
export function formatThousands(value) {
  const digits = onlyDigits(value)
  if (digits === '') return ''
  // Hilangkan leading zero berlebih agar rapi ("007" -> "7"), sisakan "0" tunggal.
  const normalized = digits.replace(/^0+(?=\d)/, '')
  return new Intl.NumberFormat('id-ID').format(Number(normalized))
}

/**
 * Format mata uang Rupiah penuh, untuk menampilkan hasil.
 *
 * PENTING: input di sini adalah NUMBER (boleh desimal, mis. 3791666.67),
 * BUKAN string digit. Jadi jangan lewatkan ke parseNumber() — fungsi itu
 * membuang semua non-digit dan akan membuat nilai desimal 100x lipat.
 */
export function formatRupiah(value) {
  const n = typeof value === 'number' ? value : Number(value)
  const num = Number.isFinite(n) ? n : 0
  // Format nilai absolut dulu, lalu beri tanda minus manual tanpa spasi
  // agar konsisten "-Rp 500.000" (dempet, bukan "- Rp 500.000").
  const teks = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.abs(num))
  return num < 0 ? `-${teks}` : teks
}

/**
 * Format nilai bertanda kurung. DIPERTAHANKAN agar komponen yang masih
 * mengimpornya tidak error, tetapi kini mengembalikan format minus dempet
 * yang sama seperti formatRupiah: -500000 -> "-Rp 500.000".
 */
export function formatRupiahKurung(value) {
  return formatRupiah(value)
}

/**
 * Format angka untuk KOLOM TABEL dokumen PDF (Bupot / 1721-A1 / SPT).
 *
 * Berbeda dengan formatRupiah: tanpa awalan "Rp" (header kolom sudah
 * bertuliskan "Jumlah (Rp)") dan nilai negatif memakai kurung gaya
 * akuntansi, bukan "-Rp". Hasilnya: "20.000.000" / "(500.000)" — semua
 * sel punya bentuk yang sama sehingga kolom angka sejajar rapi dan
 * digitnya lurus (dipakai bersama tabular-nums di CSS).
 */
export function formatAngkaTabel(value) {
  const n = typeof value === 'number' ? value : Number(value)
  const num = Number.isFinite(n) ? n : 0
  const teks = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Math.abs(num))
  return num < 0 ? `(${teks})` : teks
}
