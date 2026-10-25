/**
 * Nomor bukti pemotongan BERURUTAN untuk Bupot PPh 21 Bulanan.
 *
 * Format: `BPA1-YYYYMM-NNNN` (contoh: BPA1-202610-0001). Urutan dihitung
 * per bulan berjalan dan direset tiap bulan baru (bulan berganti -> 0001).
 *
 * Kenapa counter disimpan di localStorage, bukan dihitung dari endpoint
 * `/api/riwayat`? Endpoint riwayat hanya bisa diakses admin (user biasa
 * mendapat 403), jadi penghitungan dari sana akan gagal untuk sebagian
 * besar pengguna. State counter yang di-increment + dipersist di
 * localStorage bekerja untuk semua role.
 *
 * Konsekuensi yang perlu diketahui:
 * - Urutan bersifat PER PERANGKAT/BROWSER, bukan global antar perangkat
 *   atau antar pengguna (backend belum punya endpoint counter). Bila
 *   urutan global dibutuhkan, langkah berikutnya adalah endpoint backend
 *   khusus (mis. hitung baris riwayat berawalan BPA1-YYYYMM-).
 * - Nomor diambil sekali per Hitung yang berhasil, lalu dipakai bersama
 *   untuk Simpan & Export perhitungan itu (cetak ulang nomornya sama —
 *   benar untuk dokumen yang sama). Hitung ulang = nomor baru.
 * - Hitung yang tidak jadi diekspor/disimpan tetap memakai satu nomor
 *   (celah kecil pada urutan, wajar untuk penomoran dokumen).
 * - Bila localStorage tidak tersedia (mode privat/diblokir), dipakai
 *   counter memori sesi sebagai fallback.
 */

const KUNCI = 'bupot_nomor_terakhir'

let cadanganMemori = null

function bulanBerjalan() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
}

function bacaTerakhir() {
  try {
    const mentah = window.localStorage.getItem(KUNCI)
    if (!mentah) return cadanganMemori
    const data = JSON.parse(mentah)
    if (data && typeof data.nomor === 'number') return data
    return cadanganMemori
  } catch {
    return cadanganMemori
  }
}

function simpanTerakhir(data) {
  cadanganMemori = data
  try {
    window.localStorage.setItem(KUNCI, JSON.stringify(data))
  } catch {
    // localStorage tidak tersedia: counter memori tetap jalan.
  }
}

/**
 * Ambil nomor bukti berikutnya dan simpan counter-nya.
 * @returns {string} mis. "BPA1-202610-0001"
 */
export function nomorBuktiBerikutnya() {
  const bulan = bulanBerjalan()
  const terakhir = bacaTerakhir()
  const nomor = terakhir && terakhir.bulan === bulan ? terakhir.nomor + 1 : 1
  simpanTerakhir({ bulan, nomor })
  return `BPA1-${bulan}-${String(nomor).padStart(4, '0')}`
}
