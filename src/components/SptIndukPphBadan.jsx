import { formatRupiah, formatRupiahKurung } from '../utils/format'

const PEMOTONG_NAMA = 'PT Apex City Indonesia'
const PEMOTONG_NPWP = '01.234.567.8-901.000'

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
function Baris({ no, uraian, jumlah, tebal = false, highlight = false, kurung = false }) {
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
        {kurung ? formatRupiahKurung(jumlah) : formatRupiah(jumlah)}
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

function labelStatus(status) {
  if (status === 'LEBIH_BAYAR') return 'Lebih Bayar'
  if (status === 'NIHIL') return 'Nihil'
  return 'Kurang Bayar'
}

/**
 * Induk SPT PPh Badan — Ringkasan Penghitungan Pajak Penghasilan Badan
 * (Coretax DJP). Ditampilkan di area off-screen agar tidak terlihat di layar.
 */
export default function SptIndukPphBadan({ form, data, tanggal }) {
  const tgl = tanggal || new Date()
  const tanggalCetak = `${tgl.getDate()} ${NAMA_BULAN[tgl.getMonth()]} ${tgl.getFullYear()}`

  const laba = data.perhitungan_laba
  const p31e = data.fasilitas_pasal_31e
  const hasil = data.hasil

  const statusLabel = labelStatus(hasil.status)
  const selisih = Number(hasil.pph_29_kurang_bayar || 0)

  return (
    <div className="bupot-root bupot-offscreen">
      {/* ---------- HEADER ---------- */}
      <div className="bupot-header">
        <div className="bupot-header-title">
          RINGKASAN PENGHITUNGAN PAJAK PENGHASILAN BADAN
        </div>
        <div className="bupot-header-sub">Tahun Pajak: {form.tahun_pajak || '-'}</div>

        <table className="bupot-header-meta">
          <tbody>
            <tr className="bupot-row">
              <td className="bupot-meta-label">Status SPT</td>
              <td className="bupot-meta-sep">:</td>
              <td className="bupot-meta-val">Normal</td>
              <td className="bupot-meta-label bupot-meta-label-2">Pembetulan Ke</td>
              <td className="bupot-meta-sep">:</td>
              <td className="bupot-meta-val">0</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---------- IDENTITAS ---------- */}
      <div className="bupot-section">
        <div className="bupot-section-title">A. IDENTITAS WAJIB PAJAK</div>
        <table className="bupot-ident">
          <tbody>
            <Identitas label="Nama Wajib Pajak" nilai={form.nama_wp} />
            <Identitas label="NPWP" nilai={form.npwp} />
            <Identitas label="Tahun Pajak" nilai={form.tahun_pajak} />
            <Identitas
              label="Peredaran Bruto"
              nilai={formatRupiah(laba.total_peredaran_bruto)}
            />
          </tbody>
        </table>
      </div>

      {/* ---------- B. PENGHITUNGAN LABA ---------- */}
      <div className="bupot-section">
        <div className="bupot-section-title">B. PENGHITUNGAN PENGHASILAN NETO DAN PKP</div>
        <table className="bupot-table">
          <thead>
            <tr className="bupot-row">
              <th className="bupot-th bupot-th-kode bupot-th-no">No</th>
              <th className="bupot-th">Uraian</th>
              <th className="bupot-th bupot-th-angka">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <Baris no="1" uraian="Peredaran Bruto Usaha" jumlah={laba.omzet} />
            <Baris no="2" uraian="Peredaran Bruto Lainnya" jumlah={laba.omzet_lain} />
            <Baris no="3" uraian="Total Peredaran Bruto (1 + 2)" jumlah={laba.total_peredaran_bruto} tebal />
            <Baris no="4" uraian="Biaya / Beban Usaha" jumlah={-laba.biaya} kurung />
            <Baris no="5" uraian="Laba / Rugi Bersih Sebelum Pajak (3 - 4)" jumlah={laba.laba_bersih} tebal highlight />
            <Baris no="6" uraian="Penghasilan Kena Pajak (PKP)" jumlah={laba.pkp} tebal highlight />
          </tbody>
        </table>
      </div>

      {/* ---------- C. FASILITAS PASAL 31E ---------- */}
      <div className="bupot-section">
        <div className="bupot-section-title">C. RINCIAN PKP FASILITAS PASAL 31E</div>
        <table className="bupot-table">
          <thead>
            <tr className="bupot-row">
              <th className="bupot-th bupot-th-kode bupot-th-no">No</th>
              <th className="bupot-th">Uraian</th>
              <th className="bupot-th bupot-th-angka">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <Baris
              no="7"
              uraian={`PKP Mendapat Fasilitas (${p31e.tarif_fasilitas})`}
              jumlah={p31e.pkp_dapat_fasilitas}
            />
            <Baris
              no="8"
              uraian={`PKP Tidak Mendapat Fasilitas (${p31e.tarif_non_fasilitas})`}
              jumlah={p31e.pkp_tidak_dapat_fasilitas}
            />
            <Baris no="9" uraian="Total PKP (7 + 8)" jumlah={laba.pkp} tebal highlight />
          </tbody>
        </table>
        <div className="bupot-note">{p31e.keterangan}</div>
      </div>

      {/* ---------- D. PPh TERUTANG ---------- */}
      <div className="bupot-section">
        <div className="bupot-section-title">D. PENGHITUNGAN PPh TERUTANG</div>
        <table className="bupot-table">
          <thead>
            <tr className="bupot-row">
              <th className="bupot-th bupot-th-kode bupot-th-no">No</th>
              <th className="bupot-th">Uraian</th>
              <th className="bupot-th bupot-th-angka">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <Baris
              no="10"
              uraian={`PPh Terutang atas PKP Fasilitas (${p31e.tarif_fasilitas})`}
              jumlah={p31e.pph_dari_fasilitas}
            />
            <Baris
              no="11"
              uraian={`PPh Terutang atas PKP Non-Fasilitas (${p31e.tarif_non_fasilitas})`}
              jumlah={p31e.pph_dari_non_fasilitas}
            />
            <Baris no="12" uraian="Jumlah PPh Terutang (10 + 11)" jumlah={hasil.pph_terutang_setahun} tebal highlight />
          </tbody>
        </table>
      </div>

      {/* ---------- E. KREDIT PAJAK & PPh 29 ---------- */}
      <div className="bupot-section">
        <div className="bupot-section-title">E. KREDIT PAJAK DAN PPh PASAL 29</div>
        <table className="bupot-table">
          <thead>
            <tr className="bupot-row">
              <th className="bupot-th bupot-th-kode bupot-th-no">No</th>
              <th className="bupot-th">Uraian</th>
              <th className="bupot-th bupot-th-angka">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <Baris no="13" uraian="Kredit Pajak PPh Pasal 25" jumlah={-hasil.kredit_pph25} kurung />
            <Baris no="14" uraian="Kredit Pajak PPh Pasal 22/23" jumlah={-hasil.kredit_pph22_23} kurung />
            <Baris no="15" uraian="Total Kredit Pajak (13 + 14)" jumlah={-hasil.total_kredit_pajak} tebal kurung />
            <Baris
              no="16"
              uraian={`PPh Pasal 29 — ${statusLabel}`}
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
          <div className="bupot-masa">
            SPT ini disampaikan dalam bentuk elektronik melalui Coretax DJP.
          </div>
        </div>
        <div className="bupot-ttd-kanan">
          <div className="bupot-ttd-tempat">{tanggalCetak}</div>
          <div className="bupot-ttd-nama">Wajib Pajak / Kuasa</div>
          <div className="bupot-meterai">[Meterai Elektronik]</div>
          <div className="bupot-ttd-garis" />
          <div className="bupot-ttd-jabatan">{form.nama_wp || '(............................)'}</div>
          <div className="bupot-ttd-npwp">NPWP: {form.npwp || '-'}</div>
        </div>
      </div>
    </div>
  )
}
