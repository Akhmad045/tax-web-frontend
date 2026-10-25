import { formatRupiah, formatAngkaTabel } from '../utils/format'
import { COMPANY_NAME, COMPANY_NPWP } from '../utils/company'


const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/**
 * Baris tabel penghitungan: nomor, uraian, nilai.
 *
 * PENTING: pewarnaan hanya memakai class bupot-* (HEX), bukan utility
 * warna Tailwind, agar dokumen tetap hitam-putih formal saat dicetak.
 */
function Baris({ no, uraian, jumlah, tebal = false, highlight = false }) {
  return (
    <tr
      className={[
        'bupot-row',
        highlight ? 'bupot-highlight' : '',
        tebal ? 'bupot-strong' : '',
      ].join(' ')}
    >
      <td className="bupot-td bupot-td-kode bupot-td-no">{no}</td>
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
 * Format resmi 1721-A1 — Bukti Pemotongan Tahunan PPh 21 (Coretax DJP).
 * Ditampilkan di area off-screen agar tidak terlihat di layar.
 */
export default function Form1721A1({
  namaPenerima,
  npwp,
  tahunPajak,
  statusPtkp,
  statusPegawai,
  data,
  tanggal,
}) {
  const tgl = tanggal || new Date()
  const tanggalCetak = `${tgl.getDate()} ${NAMA_BULAN[tgl.getMonth()]} ${tgl.getFullYear()}`

  const ps = data.perhitungan_setahun
  const hasil = data.hasil

  const bruto = Number(ps.bruto_setahun || 0)
  const biayaJabatan = Number(ps.biaya_jabatan || 0)
  const bpjs = Number(ps.total_bpjs || 0)
  const jht = Number(ps.total_jht || 0)
  const neto = Number(ps.neto_setahun || 0)
  const ptkp = Number(ps.ptkp || 0)
  const pkp = Number(ps.pkp || 0)
  const pphTerutang = Number(hasil.pph21_terutang_setahun || 0)
  const pphDipotong = Number(hasil.total_pph_dipotong || 0)
  const selisih = Number(hasil.selisih || 0)

  const statusLabel =
    selisih > 0 ? 'Kurang Bayar' : selisih < 0 ? 'Lebih Bayar' : 'Nihil'

  return (
    <div className="bupot-root bupot-offscreen">
      {/* ---------- HEADER ---------- */}
      <div className="bupot-header">
        <div className="bupot-header-title">
          BUKTI PEMOTONGAN PAJAK PENGHASILAN PASAL 21 (FORM 1721-A1)
        </div>
        <div className="bupot-header-sub">Tahun Pajak: {tahunPajak || '-'}</div>

        <table className="bupot-header-meta">
          <tbody>
            <tr className="bupot-row">
              <td className="bupot-meta-label">Nama Pemotong</td>
              <td className="bupot-meta-sep">:</td>
              <td className="bupot-meta-val">{COMPANY_NAME}</td>
              <td className="bupot-meta-label bupot-meta-label-2">NPWP Pemotong</td>
              <td className="bupot-meta-sep">:</td>
              <td className="bupot-meta-val">{COMPANY_NPWP}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---------- IDENTITAS PENERIMA ---------- */}
      <div className="bupot-section">
        <div className="bupot-section-title">A. IDENTITAS PENERIMA PENGHASILAN</div>
        <table className="bupot-ident">
          <tbody>
            <Identitas label="Nama Penerima" nilai={namaPenerima} />
            <Identitas label="NPWP / NIK Penerima" nilai={npwp} />
            <Identitas label="Status PTKP" nilai={statusPtkp} />
            <Identitas label="Posisi / Jabatan" nilai={statusPegawai} />
            <Identitas label="Tahun Pajak" nilai={tahunPajak} />
          </tbody>
        </table>
      </div>

      {/* ---------- B. PENGHASILAN BRUTO & PENGURANG ---------- */}
      <div className="bupot-section">
        <div className="bupot-section-title">B. PENGHITUNGAN PENGHASILAN BRUTO DAN PENGURANG</div>
        <table className="bupot-table">
          <thead>
            <tr className="bupot-row">
              <th className="bupot-th bupot-th-kode bupot-th-no">No</th>
              <th className="bupot-th">Uraian</th>
              <th className="bupot-th bupot-th-angka">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <Baris no="1" uraian="Penghasilan Bruto (Gaji, Tunjangan, THR, Bonus, Premi)" jumlah={bruto} tebal highlight />
            <Baris no="2" uraian="Biaya Jabatan (5%, maks Rp6.000.000)" jumlah={-biayaJabatan} />
            <Baris no="3" uraian="Iuran Pensiun / BPJS" jumlah={-bpjs} />
            <Baris no="4" uraian="Iuran JHT" jumlah={-jht} />
            <Baris no="5" uraian="Jumlah Pengurang (2 + 3 + 4)" jumlah={-(biayaJabatan + bpjs + jht)} tebal />
          </tbody>
        </table>
      </div>

      {/* ---------- C. PENGHITUNGAN PPh 21 ---------- */}
      <div className="bupot-section">
        <div className="bupot-section-title">C. PENGHITUNGAN PPh PASAL 21</div>
        <table className="bupot-table">
          <thead>
            <tr className="bupot-row">
              <th className="bupot-th bupot-th-kode bupot-th-no">No</th>
              <th className="bupot-th">Uraian</th>
              <th className="bupot-th bupot-th-angka">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <Baris no="6" uraian="Penghasilan Neto (1 - 5)" jumlah={neto} tebal highlight />
            <Baris no="7" uraian={`PTKP (Status ${statusPtkp || '-'})`} jumlah={-ptkp} />
            <Baris no="8" uraian="Penghasilan Kena Pajak (PKP)" jumlah={pkp} tebal highlight />
            <Baris no="9" uraian="PPh 21 Terutang Setahun (Tarif Pasal 17)" jumlah={pphTerutang} tebal highlight />
            <Baris no="10" uraian="PPh 21 yang Sudah Dipotong" jumlah={pphDipotong} />
            <Baris
              no="11"
              uraian={`Selisih PPh 21 — ${statusLabel}`}
              jumlah={Math.abs(selisih)}
              tebal
              highlight
            />
          </tbody>
        </table>
        <div className="bupot-note">
          Status: <strong className="bupot-strong">{statusLabel}</strong>
          {hasil.keterangan ? ` — ${hasil.keterangan}` : ''}
        </div>
      </div>

      {/* ---------- FOOTER TANDA TANGAN ---------- */}
      <div className="bupot-footer">
        <div className="bupot-ttd-kiri">
          <div className="bupot-ttd-tempat">{tanggalCetak}</div>
          <div className="bupot-ttd-nama">Penerima Penghasilan</div>
          <div className="bupot-meterai">[Tanda Tangan]</div>
          <div className="bupot-ttd-garis" />
          <div className="bupot-ttd-jabatan">{namaPenerima || '(............................)'}</div>
          <div className="bupot-ttd-npwp">NPWP: {npwp || '-'}</div>
        </div>
        <div className="bupot-ttd-kanan">
          <div className="bupot-ttd-tempat">{tanggalCetak}</div>
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
