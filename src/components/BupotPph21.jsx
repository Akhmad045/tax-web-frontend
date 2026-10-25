import { formatRupiah, formatAngkaTabel } from '../utils/format'
import { COMPANY_NAME, COMPANY_NPWP } from '../utils/company'

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]


/**
 * Baris tabel rincian.
 *
 * PENTING: seluruh pewarnaan memakai class bupot-* (HEX), BUKAN utility
 * warna Tailwind, agar dokumen tetap hitam-putih formal saat dicetak.
 *
 * Kolom angka memakai formatAngkaTabel: tanpa awalan "Rp" (header kolom
 * sudah bertuliskan "Jumlah (Rp)") dan pengurang tampil sebagai (500.000)
 * gaya akuntansi, sehingga semua angka sejajar rapi.
 */
function Baris({ kode, uraian, jumlah, tebal = false, highlight = false }) {
  return (
    <tr
      className={[
        'bupot-row',
        highlight ? 'bupot-highlight' : '',
        tebal ? 'bupot-strong' : '',
      ].join(' ')}
    >
      <td className="bupot-td bupot-td-kode">{kode}</td>
      <td className="bupot-td">{uraian}</td>
      <td className="bupot-td bupot-td-angka">
        {formatAngkaTabel(jumlah)}
      </td>
    </tr>
  )
}

/** Baris identitas dua kolom (label : nilai). */
function Identitas({ label, nilai }) {
  return (
    <tr className="bupot-row">
      <td className="bupot-ident-label">{label}</td>
      <td className="bupot-ident-sep">:</td>
      <td className="bupot-ident-nilai">{nilai || '-'}</td>
    </tr>
  )
}

/**
 * Format resmi Bukti Pemotongan (Bupot) PPh 21 - Coretax DJP (BPA1/BP21).
 * Tampil hanya saat dicetak (dirender off-screen agar tidak terlihat di layar).
 */
export default function BupotPph21({ form, result, nomorBukti, tanggal }) {
  const tgl = tanggal || new Date()
  const masaPajak = `${NAMA_BULAN[tgl.getMonth()]} ${tgl.getFullYear()}`

  // Semua angka diambil dari hasil backend agar konsisten satu sama lain.
  const pb = result.perhitungan_bulanan
  const ps = result.perhitungan_setahun

  // Biaya jabatan & neto dihitung backend (neto = bruto - biaya jabatan
  // - bpjs - jht). Jangan hitung ulang di sini supaya tidak terjadi drift.
  const brutoBulan = Number(pb.bruto || 0)
  const biayaJabatanBulan = Number(pb.biaya_jabatan ?? 0)
  const netoBulan = Number(pb.neto ?? 0)

  // PPh bulanan memakai nilai resmi dari backend (`hasil`).
  const pphBulanan = Number(result.hasil?.pph21_per_bulan ?? 0)
  const pphSetahun = Number(ps.pph_setahun ?? 0)
  const pkpSetahun = Number(ps.pkp ?? 0)

  // THR/bonus tidak ada di form bulanan; disiapkan agar mudah dikembangkan.
  const thrBonus = 0

  return (
    <div className="bupot-root bupot-offscreen">
      {/* ---------- HEADER ---------- */}
      <div className="bupot-header">
        <div className="bupot-header-title">
          BUKTI PEMOTONGAN PAJAK PENGHASILAN PASAL 21
        </div>
        <div className="bupot-header-sub">Masa Pajak: {masaPajak}</div>

        <table className="bupot-header-meta">
          <tbody>
            <tr className="bupot-row">
              <td className="bupot-meta-label">Nomor Bukti</td>
              <td className="bupot-meta-sep">:</td>
              <td className="bupot-meta-val">{nomorBukti}</td>
              <td className="bupot-meta-label bupot-meta-label-2">Status Bukti</td>
              <td className="bupot-meta-sep">:</td>
              <td className="bupot-meta-val">Normal</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---------- BAGIAN UMUM ---------- */}
      <div className="bupot-section">
        <div className="bupot-section-title">A. BAGIAN UMUM</div>
        <table className="bupot-ident">
          <tbody>
            <Identitas label="Nama Pemotong" nilai={COMPANY_NAME} />
            <Identitas label="NPWP Pemotong" nilai={COMPANY_NPWP} />
            <Identitas label="NIK/NPWP Penerima" nilai={form.nik} />
            <Identitas label="Nama Penerima" nilai={form.nama_karyawan} />
            <Identitas label="Status PTKP" nilai={result.status_ptkp || form.status_ptkp} />
            <Identitas label="Posisi/Jabatan" nilai={form.status_pegawai} />
          </tbody>
        </table>
      </div>

      {/* ---------- RINCIAN PENGHASILAN ---------- */}
      <div className="bupot-section">
        <div className="bupot-section-title">B. RINCIAN PENGHASILAN DAN PENGHITUNGAN PPh PASAL 21</div>
        <table className="bupot-table">
          <thead>
            <tr className="bupot-row">
              <th className="bupot-th bupot-th-kode">Kode Objek Pajak</th>
              <th className="bupot-th">Uraian Penghasilan</th>
              <th className="bupot-th bupot-th-angka">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <Baris kode="21-100-01" uraian="Gaji Pokok" jumlah={pb.gaji_pokok} />
            <Baris kode="21-100-02" uraian="Tunjangan Tetap" jumlah={form.tunjangan_tetap} />
            <Baris kode="21-100-03" uraian="Tunjangan Tidak Tetap" jumlah={form.tunjangan_tidak_tetap} />
            {thrBonus > 0 && (
              <Baris kode="21-100-04" uraian="THR / Bonus" jumlah={thrBonus} />
            )}
            <Baris kode="" uraian="Penghasilan Bruto" jumlah={pb.bruto} tebal highlight />

            <Baris kode="" uraian="Biaya Jabatan (5%)" jumlah={-biayaJabatanBulan} />
            <Baris kode="" uraian="Iuran BPJS" jumlah={-pb.bpjs} />
            <Baris kode="" uraian="Iuran JHT" jumlah={-pb.jht} />
            <Baris kode="" uraian="Penghasilan Neto" jumlah={netoBulan} tebal highlight />

            <Baris kode="" uraian="PTKP" jumlah={-ps.ptkp} />
            <Baris kode="" uraian="Penghasilan Kena Pajak (PKP)" jumlah={pkpSetahun} tebal highlight />

            <Baris
              kode=""
              uraian="PPh 21 yang Dipotong (Tarif Pasal 17)"
              jumlah={pphBulanan}
              tebal
              highlight
            />
          </tbody>
        </table>
        <div className="bupot-note">
          PPh 21 dihitung dari PKP (PKP setahun: {formatRupiah(pkpSetahun)};
          PPh setahun: {formatRupiah(pphSetahun)}) dibagi 12 bulan.
        </div>
      </div>

      {/* ---------- TANDA TANGAN ---------- */}
      <div className="bupot-footer bupot-footer-end">
        <div className="bupot-ttd-kanan">
          <div className="bupot-ttd-tempat">
            {tanggal ? `${tgl.getDate()} ${NAMA_BULAN[tgl.getMonth()]} ${tgl.getFullYear()}` : ''}
          </div>
          <div className="bupot-ttd-nama">Pemotong Pajak</div>
          <div className="bupot-meterai">[Meterai Elektronik]</div>
          <div className="bupot-ttd-garis" />
          <div className="bupot-ttd-jabatan">{COMPANY_NAME}</div>
          <div className="bupot-ttd-npwp">NPWP: {COMPANY_NPWP}</div>
        </div>
      </div>
    </div>
  )
}
