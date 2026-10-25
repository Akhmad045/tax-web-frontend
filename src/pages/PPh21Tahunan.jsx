import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/client'
import Card from '../components/Card'
import Form1721A1 from '../components/Form1721A1'
import PrintButton from '../components/PrintButton'
import Row from '../components/Row'
import SimpanButton from '../components/SimpanButton'
import StatusBadge from '../components/StatusBadge'
import { formatRupiah, formatThousands, parseNumber } from '../utils/format'
import { exportElementToPdf } from '../utils/exportPdf'
import { pesanBackendMati, simpanPerhitungan } from '../utils/riwayat'
import {
  bersihkanErrors,
  fokusFieldPertama,
  hanyaAngka16,
  validasiNikNpwp,
  validasiTeksWajib,
} from '../utils/validation'

const PTKP_OPTIONS = [
  { value: 'TK/0', label: 'TK/0 — Tidak kawin, 0 tanggungan', nilai: 54_000_000 },
  { value: 'TK/1', label: 'TK/1 — Tidak kawin, 1 tanggungan', nilai: 58_500_000 },
  { value: 'TK/2', label: 'TK/2 — Tidak kawin, 2 tanggungan', nilai: 63_000_000 },
  { value: 'TK/3', label: 'TK/3 — Tidak kawin, 3 tanggungan', nilai: 67_500_000 },
  { value: 'K/0', label: 'K/0 — Kawin, 0 tanggungan', nilai: 58_500_000 },
  { value: 'K/1', label: 'K/1 — Kawin, 1 tanggungan', nilai: 63_000_000 },
  { value: 'K/2', label: 'K/2 — Kawin, 2 tanggungan', nilai: 67_500_000 },
  { value: 'K/3', label: 'K/3 — Kawin, 3 tanggungan', nilai: 72_000_000 },
]

const PTKP_TABLE = PTKP_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.nilai }),
  {},
)

const BIAYA_JABATAN_PERSEN = 0.05
const BIAYA_JABATAN_MAKS = 6_000_000

// Lapisan tarif progresif PPh 21 (Pasal 17 UU HPP) -> [batas_atas, tarif]
// batas_atas = null berarti lapisan terakhir (tak terbatas).
const LAPISAN_TARIF = [
  [60_000_000, 0.05],
  [250_000_000, 0.15],
  [500_000_000, 0.25],
  [5_000_000_000, 0.30],
  [null, 0.35],
]

/** Bulatkan ke bawah ke ribuan terdekat. */
function bulatKeBawahRibuan(nilai) {
  return Math.floor(nilai / 1000) * 1000
}

/** Hitung PPh dengan tarif progresif berlapis. */
function hitungPajakProgresif(pkp) {
  let sisa = pkp
  let batasBawah = 0
  let total = 0
  for (const [batasAtas, tarif] of LAPISAN_TARIF) {
    if (sisa <= 0) break
    const lebar = batasAtas === null ? sisa : batasAtas - batasBawah
    const kena = Math.min(sisa, lebar)
    total += kena * tarif
    sisa -= kena
    if (batasAtas !== null) batasBawah = batasAtas
  }
  return total
}

/**
 * Kalkulasi PPh 21 setahun dari 12 bulan data (real-time, sisi client).
 * Mengikuti logika backend agar hasil konsisten.
 *
 * BRUTO = Gaji + Tunj Tetap + Tunj PPh 21 + JKK + JKM + THR + Bonus
 * (BPJS & JHT TIDAK masuk bruto; keduanya hanya pengurang.)
 */
export function hitungPPh21TahunanClient(monthData, statusPtkp) {
  let bruto = 0
  let totalBpjs = 0
  let totalJht = 0

  for (const r of monthData) {
    bruto +=
      parseNumber(r.gaji_pokok) +
      parseNumber(r.tunj_tetap) +
      parseNumber(r.tunj_pph21) +
      parseNumber(r.jkk) +
      parseNumber(r.jkm) +
      parseNumber(r.thr) +
      parseNumber(r.bonus)
    totalBpjs += parseNumber(r.bpjs)
    totalJht += parseNumber(r.jht)
  }

  const biayaJabatan = Math.min(bruto * BIAYA_JABATAN_PERSEN, BIAYA_JABATAN_MAKS)
  const neto = bruto - biayaJabatan - totalBpjs - totalJht
  const ptkp = PTKP_TABLE[statusPtkp] ?? PTKP_TABLE['TK/0']
  const pkp = bulatKeBawahRibuan(Math.max(neto - ptkp, 0))
  const pphTerutangSetahun = hitungPajakProgresif(pkp)
  const pphPerBulan = Math.round(pphTerutangSetahun / 12)

  return {
    bruto,
    biayaJabatan,
    totalBpjs,
    totalJht,
    neto,
    ptkp,
    pkp,
    pphTerutangSetahun,
    pphPerBulan,
  }
}

const STATUS_PEGAWAI_OPTIONS = ['Tetap', 'Kontrak', 'Magang', 'Harian']

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/**
 * 10 kolom input per bulan (selain kolom "Bulan").
 * Semua nilai disimpan sebagai STRING digit.
 *
 * Catatan: backend hanya menerima `tunjangan`, sehingga saat submit
 * Tunj. Tetap + Tunj. PPh 21 + JKK + JKM digabung menjadi satu `tunjangan`.
 */
const KOLOM = [
  { key: 'gaji_pokok', label: 'Gaji Pokok' },
  { key: 'tunj_tetap', label: 'Tunj. Tetap' },
  { key: 'tunj_pph21', label: 'Tunj. PPh 21' },
  { key: 'bpjs', label: 'BPJS' },
  { key: 'jht', label: 'JHT' },
  { key: 'jkk', label: 'JKK' },
  { key: 'jkm', label: 'JKM' },
  { key: 'thr', label: 'THR' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'pph_dipotong', label: 'PPh 21 Dipotong' },
]

/** Buat satu baris bulan kosong (10 field). */
function buatBulanKosong() {
  return KOLOM.reduce((row, k) => ({ ...row, [k.key]: '' }), {})
}

/** 12 baris bulanan kosong. */
function buatSemuaBulan() {
  return Array.from({ length: 12 }, buatBulanKosong)
}

/** Input sel tabel: text + format ribuan, simpan string digit. */
function CellInput({ value, onChange, readOnly = false }) {
  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    onChange(rawValue.slice(0, 18))
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      readOnly={readOnly}
      value={formatThousands(value)}
      onChange={readOnly ? undefined : handleChange}
      placeholder="0"
      className={[
        'w-full rounded-lg border px-2 py-1.5 text-right text-sm outline-none transition',
        readOnly
          ? 'cursor-not-allowed border-slate-100 bg-slate-100 font-semibold text-blue-700'
          : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
      ].join(' ')}
    />
  )
}

/** Input teks identitas di atas form. */
function TextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  numeric = false,
  maxLength,
  error = '',
  hint = '',
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={name} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint && (
          <span
            className={[
              'text-xs font-medium',
              error ? 'text-red-500' : 'text-slate-400',
            ].join(' ')}
          >
            {hint}
          </span>
        )}
      </div>
      <input
        id={name}
        name={name}
        type="text"
        inputMode={numeric ? 'numeric' : 'text'}
        autoComplete="off"
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        onChange={(e) =>
          onChange(
            numeric
              ? e.target.value.replace(/[^0-9]/g, '').slice(0, maxLength ?? 20)
              : e.target.value,
          )
        }
        placeholder={placeholder}
        className={[
          'w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium shadow-sm outline-none transition',
          error
            ? 'border-red-400 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
        ].join(' ')}
      />
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

export default function PPh21Tahunan() {
  // Identitas (tampilan saja, tidak dikirim ke API).
  const [namaPegawai, setNamaPegawai] = useState('')
  const [npwp, setNpwp] = useState('')
  const [tahunPajak, setTahunPajak] = useState(String(new Date().getFullYear()))
  const [statusPegawai, setStatusPegawai] = useState('Tetap')
  const [statusPtkp, setStatusPtkp] = useState('TK/0')

  const [monthData, setMonthData] = useState(buatSemuaBulan)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [exporting, setExporting] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [tersimpan, setTersimpan] = useState(false)

  // Ref ke UI aplikasi dan ke dokumen 1721-A1.
  const componentRef = useRef(null)
  const bupotRef = useRef(null)

  /** Unduh PDF form 1721-A1 secara otomatis (tanpa dialog print). */
  const handleExport = async () => {
    setExporting(true)
    try {
      await exportElementToPdf(
        bupotRef.current || componentRef.current,
        `1721-A1-${(namaPegawai || 'Pegawai').replace(/\s+/g, '-')}${tahunPajak ? `-${tahunPajak}` : ''}`,
      )
    } catch (err) {
      setError(err.message || 'Gagal membuat PDF.')
    } finally {
      setExporting(false)
    }
  }

  const setCell = (idx, key) => (value) =>
    setMonthData((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    )

  /** Isi satu nilai ke kolom yang sama untuk semua 12 bulan. */
  const isiSemuaBulan = (key, value) =>
    setMonthData((rows) => rows.map((r) => ({ ...r, [key]: value })))

  /**
   * REAL-TIME: setiap kali monthData atau statusPtkp berubah,
   * hitung ulang PPh per bulan lalu isi otomatis kolom "PPh 21 Dipotong"
   * untuk semua 12 baris (Jan-Des), persis seperti Excel.
   */
  useEffect(() => {
    const { pphPerBulan } = hitungPPh21TahunanClient(monthData, statusPtkp)
    const nilaiBaru = String(pphPerBulan)

    setMonthData((rows) => {
      // Hindari loop tak terbatas: hanya update bila nilainya berubah.
      if (rows.every((r) => r.pph_dipotong === nilaiBaru)) return rows
      return rows.map((r) => ({ ...r, pph_dipotong: nilaiBaru }))
    })
  }, [monthData, statusPtkp])

  /**
   * Pratinjau Bruto Setahun (client-side, sama dengan backend):
   * Gaji + Tunj. Tetap + Tunj. PPh 21 + JKK + JKM + THR + Bonus.
   * BPJS & JHT hanya pengurang, tidak masuk bruto.
   */
  const totalBrutoPreview = useMemo(
    () =>
      monthData.reduce(
        (sum, r) =>
          sum +
          parseNumber(r.gaji_pokok) +
          parseNumber(r.tunj_tetap) +
          parseNumber(r.tunj_pph21) +
          parseNumber(r.jkk) +
          parseNumber(r.jkm) +
          parseNumber(r.thr) +
          parseNumber(r.bonus),
        0,
      ),
    [monthData],
  )

  /**
   * Validasi: PTKP wajib dipilih, dan minimal ada 1 bulan berpenghasilan.
   * Mengembalikan objek error (kosong = valid).
   */
  const validate = () => {
    const e = {}

    e.nama_pegawai = validasiTeksWajib(namaPegawai, 'Nama Pegawai')

    if (!String(statusPtkp ?? '').trim()) {
      e.status_ptkp = 'Status PTKP wajib dipilih'
    }

    // NPWP wajib tepat 16 digit angka.
    // PENTING: validasiNikNpwp() mengembalikan '' saat VALID. Jangan
    // masukkan hasilnya langsung ke objek error, karena objek akan tetap
    // punya key `npwp` -> Object.keys().length > 0 -> submit selalu
    // dianggap gagal sehingga perhitungan tidak pernah berjalan.
    const errNpwp = validasiNikNpwp(npwp)
    if (errNpwp) e.npwp = errNpwp

    if (totalBrutoPreview <= 0) {
      e.bulanan = 'Isi minimal satu bulan dengan penghasilan (Gaji Pokok / THR / Bonus)'
    }

    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Buang entri bernilai kosong: validate() mengisi semua key, termasuk
    // key yang valid dengan string ''. Tanpa ini submit selalu dianggap gagal.
    const validationErrors = bersihkanErrors(validate())
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setError('')
      setResult(null)
      fokusFieldPertama(validationErrors)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    try {
      const payload = {
        status_ptkp: statusPtkp,
        bulanan: monthData.map((r) => ({
          gaji_pokok: parseNumber(r.gaji_pokok),
          // Backend hanya punya satu field `tunjangan`:
          // gabungkan Tunj. Tetap + Tunj. PPh 21 + JKK + JKM.
          tunjangan:
            parseNumber(r.tunj_tetap) +
            parseNumber(r.tunj_pph21) +
            parseNumber(r.jkk) +
            parseNumber(r.jkm),
          thr: parseNumber(r.thr),
          bonus: parseNumber(r.bonus),
          bpjs: parseNumber(r.bpjs),
          jht: parseNumber(r.jht),
          pph_dipotong: parseNumber(r.pph_dipotong),
        })),
      }
      const { data } = await api.post('/api/pph21/tahunan', payload)
      setResult(data)
      setTersimpan(false)
    } catch (err) {
      if (err.response) {
        const detail = err.response.data?.detail
        setError(
          Array.isArray(detail)
            ? detail.map((d) => d.msg).join(', ')
            : typeof detail === 'string'
              ? detail
              : `Server merespons dengan status ${err.response.status}.`,
        )
      } else if (err.request) {
        setError(
          pesanBackendMati(),
        )
      } else {
        setError(err.message || 'Terjadi kesalahan tak terduga.')
      }
    } finally {
      setLoading(false)
    }
  }

  /** Simpan hasil perhitungan setahun ini ke database (tabel riwayat). */
  const handleSimpan = async () => {
    if (!result) return
    setMenyimpan(true)
    try {
      const bulananPayload = monthData.map((r) => ({
        gaji_pokok: parseNumber(r.gaji_pokok),
        tunjangan:
          parseNumber(r.tunj_tetap) +
          parseNumber(r.tunj_pph21) +
          parseNumber(r.jkk) +
          parseNumber(r.jkm),
        thr: parseNumber(r.thr),
        bonus: parseNumber(r.bonus),
        bpjs: parseNumber(r.bpjs),
        jht: parseNumber(r.jht),
        pph_dipotong: parseNumber(r.pph_dipotong),
      }))

      await simpanPerhitungan({
        modul: 'pph21_tahunan',
        judul: namaPegawai || 'Pegawai',
        nama_wajib: namaPegawai,
        identitas: npwp,
        tahun_pajak: tahunPajak,
        status_ptkp: statusPtkp,
        ringkasan: `PPh 21 setahun ${formatRupiah(
          result.hasil?.pph21_terutang_setahun,
        )} · ${result.hasil?.status || '-'}`,
        total_pph: Math.round(Number(result.hasil?.pph21_terutang_setahun) || 0),
        detail: {
          form: {
            nama_pegawai: namaPegawai,
            npwp,
            tahun_pajak: tahunPajak,
            status_pegawai: statusPegawai,
            status_ptkp: statusPtkp,
            bulanan: bulananPayload,
          },
          hasil: result,
        },
      })
      setTersimpan(true)
      setError('')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : 'Gagal menyimpan data ke database. Pastikan backend berjalan.',
      )
    } finally {
      setMenyimpan(false)
    }
  }

  const handleReset = () => {
    setMonthData(buatSemuaBulan())
    setStatusPtkp('TK/0')
    setStatusPegawai('Tetap')
    setNamaPegawai('')
    setNpwp('')
    setTahunPajak(String(new Date().getFullYear()))
    setResult(null)
    setError('')
    setErrors({})
    setTersimpan(false)
  }

  return (
    <div className="space-y-6 animate-fadeInUp" ref={componentRef}>
      {/* ===== UI APLIKASI (tidak ikut dicetak) ===== */}
      <div className="app-ui space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
        <div>
          <h1 className="text-xl font-bold text-slate-800 md:text-2xl">PPh 21 Tahunan</h1>
          <p className="mt-1 text-sm text-slate-500 print:hidden">
            Rekap 12 bulan, biaya jabatan 5%, PTKP, dan status Kurang/Lebih bayar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <SimpanButton
            onSimpan={handleSimpan}
            loading={menyimpan}
            tersimpan={tersimpan}
            disabled={!result}
          />
          <PrintButton onExport={handleExport} disabled={!result} loading={exporting} />
        </div>
      </div>

      {/* FORM: identitas + tabel 12 bulan */}
      <Card title="Rekap Penghasilan 12 Bulan" subtitle="Isi angka dalam Rupiah">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identitas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextField
              label="Nama Pegawai"
              name="nama_pegawai"
              value={namaPegawai}
              onChange={setNamaPegawai}
              placeholder="Mis. Budi Santoso"
              error={errors.nama_pegawai}
            />
            <TextField
              label="NPWP"
              name="npwp"
              value={npwp}
              onChange={(v) => setNpwp(hanyaAngka16(v))}
              placeholder="16 digit angka"
              numeric
              maxLength={16}
              error={errors.npwp}
              hint={`${String(npwp || '').length}/16 digit`}
            />
            <TextField
              label="Tahun Pajak"
              name="tahun_pajak"
              value={tahunPajak}
              onChange={(v) => setTahunPajak(v.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="2026"
              numeric
            />
            <div>
              <label htmlFor="status_pegawai" className="mb-1.5 block text-sm font-medium text-slate-700">
                Status Pegawai
              </label>
              <select
                id="status_pegawai"
                name="status_pegawai"
                value={statusPegawai}
                onChange={(e) => setStatusPegawai(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {STATUS_PEGAWAI_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status PTKP + pratinjau bruto */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status_ptkp" className="mb-1.5 block text-sm font-medium text-slate-700">
                Status PTKP <span className="text-red-500">*</span>
              </label>
              <select
                id="status_ptkp"
                value={statusPtkp}
                onChange={(e) => {
                  setStatusPtkp(e.target.value)
                  setErrors((prev) => {
                    if (!prev.status_ptkp) return prev
                    const next = { ...prev }
                    delete next.status_ptkp
                    return next
                  })
                }}
                aria-invalid={Boolean(errors.status_ptkp)}
                className={[
                  'w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium shadow-sm outline-none transition',
                  errors.status_ptkp
                    ? 'border-red-400 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                ].join(' ')}
              >
                {PTKP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {errors.status_ptkp && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.status_ptkp}</p>
              )}
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-xl bg-blue-50 px-4 py-2.5">
                <p className="text-xs text-blue-600">Pratinjau Bruto Setahun</p>
                <p className="text-sm font-bold text-blue-800">
                  {formatRupiah(totalBrutoPreview)}
                </p>
              </div>
            </div>
          </div>

          {/* Isi cepat (tidak ikut tercetak) */}
          <div className="print:hidden rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">
              Isi cepat (terapkan ke semua 12 bulan)
            </p>
            <div className="flex flex-wrap gap-2">
              {KOLOM.filter((k) => k.key !== 'pph_dipotong').map((k) => (
                <QuickFill
                  key={k.key}
                  label={k.label}
                  onApply={(v) => isiSemuaBulan(k.key, v)}
                />
              ))}
            </div>
          </div>

          {/* Tabel 12 bulan */}
          {errors.bulanan && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {errors.bulanan}
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-slate-100 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Bulan</th>
                  {KOLOM.map((k) => (
                    <th key={k.key} className="px-2 py-2 text-right font-semibold">
                      {k.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-100">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {idx + 1}. {NAMA_BULAN[idx]}
                    </td>
                    {KOLOM.map((k) => (
                      <td key={k.key} className="px-1.5 py-1.5">
                        <CellInput
                          value={row[k.key]}
                          onChange={setCell(idx, k.key)}
                          readOnly={k.key === 'pph_dipotong'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print:hidden flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Menghitung…' : 'Hitung Pajak'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </form>
      </Card>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Gagal menghitung</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!result && !error && (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🗓️
            </div>
            <p className="text-sm font-medium text-slate-600">
              Hasil perhitungan tahunan akan muncul di sini
            </p>
          </div>
        </Card>
      )}

      {result && (
        <>
          {/* Identitas pegawai (tampilan saja) */}
          {(namaPegawai || npwp || tahunPajak) && (
            <Card title="Identitas Pegawai">
              <div className="divide-y divide-slate-100">
                <Row label="Nama Pegawai" value={namaPegawai || '-'} />
                <Row label="NPWP" value={npwp || '-'} />
                <Row label="Tahun Pajak" value={tahunPajak || '-'} />
                <Row label="Status Pegawai" value={statusPegawai || '-'} />
                <Row label="Status PTKP" value={result.status_ptkp} />
              </div>
            </Card>
          )}

          {/* Kartu utama */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-blue-100">
                  {result.hasil.selisih >= 0 ? 'PPh 21 Kurang Bayar' : 'PPh 21 Lebih Bayar'}
                </p>
                <p className="mt-1 text-2xl font-bold break-words md:text-3xl">
                  {formatRupiah(Math.abs(result.hasil.selisih))}
                </p>
              </div>
              <StatusBadge status={result.hasil.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderTopColor: 'rgba(255, 255, 255, 0.2)' }}>
              <div>
                <p className="text-xs text-blue-100">PPh 21 Terutang Setahun</p>
                <p className="mt-0.5 text-lg font-semibold">
                  {formatRupiah(result.hasil.pph21_terutang_setahun)}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-100">Total PPh Sudah Dipotong</p>
                <p className="mt-0.5 text-lg font-semibold">
                  {formatRupiah(result.hasil.total_pph_dipotong)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-blue-100">{result.hasil.keterangan}</p>
          </div>

          {/* Perhitungan setahun */}
          <Card title={`Perhitungan Setahun · Status ${result.status_ptkp}`}>
            <div className="divide-y divide-slate-100">
              <Row label="Total Gaji Pokok" value={formatRupiah(result.perhitungan_setahun.total_gaji_pokok)} />
              <Row label="Total Tunjangan" value={formatRupiah(result.perhitungan_setahun.total_tunjangan)} />
              <Row label="Total THR" value={formatRupiah(result.perhitungan_setahun.total_thr)} />
              <Row label="Total Bonus" value={formatRupiah(result.perhitungan_setahun.total_bonus)} />
              <Row label="Bruto Setahun" value={formatRupiah(result.perhitungan_setahun.bruto_setahun)} strong />
              <Row label="Biaya Jabatan (5%, maks 6jt)" value={`- ${formatRupiah(result.perhitungan_setahun.biaya_jabatan)}`} />
              <Row label="Total BPJS" value={`- ${formatRupiah(result.perhitungan_setahun.total_bpjs)}`} />
              <Row label="Total JHT" value={`- ${formatRupiah(result.perhitungan_setahun.total_jht)}`} />
              <Row label="Neto Setahun" value={formatRupiah(result.perhitungan_setahun.neto_setahun)} strong />
              <Row label="PTKP" value={`- ${formatRupiah(result.perhitungan_setahun.ptkp)}`} />
              <Row label="PKP" value={formatRupiah(result.perhitungan_setahun.pkp)} strong />
            </div>

            {result.perhitungan_setahun.detail_tarif_progresif?.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Lapisan</th>
                      <th className="px-3 py-2 text-center font-semibold">Tarif</th>
                      <th className="px-3 py-2 text-right font-semibold">Dasar</th>
                      <th className="px-3 py-2 text-right font-semibold">Pajak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.perhitungan_setahun.detail_tarif_progresif.map((d, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-600">{d.lapisan}</td>
                        <td className="px-3 py-2 text-center font-medium text-blue-600">{d.tarif}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{formatRupiah(d.dasar_pengenaan)}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">{formatRupiah(d.pajak)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Rekap bulanan dari server */}
          <Card title="Rekap Bulanan (dari server)">
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Bulan</th>
                    <th className="px-3 py-2 text-right font-semibold">Bruto</th>
                    <th className="px-3 py-2 text-right font-semibold">PPh Dipotong</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rekap_bulanan.map((r) => (
                    <tr key={r.bulan_ke} className="hover:bg-slate-100">
                      <td className="px-3 py-2 text-slate-600">
                        {r.bulan_ke}. {NAMA_BULAN[r.bulan_ke - 1]}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatRupiah(r.bruto)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatRupiah(r.pph_dipotong)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      </div>
      {/* ===== AKHIR UI APLIKASI ===== */}

      {/* ===== FORM 1721-A1 (hanya saat export/print) ===== */}
      {result && (
        <div ref={bupotRef} className="bupot-offscreen-wrap" style={{ paddingBottom: '80px' }}>
          <Form1721A1
            namaPenerima={namaPegawai}
            npwp={npwp}
            tahunPajak={tahunPajak}
            statusPtkp={result.status_ptkp || statusPtkp}
            statusPegawai={statusPegawai}
            data={result}
            tanggal={new Date()}
          />
        </div>
      )}
    </div>
  )
}

/** Tombol isi cepat: buka input kecil lalu terapkan ke semua bulan. */
function QuickFill({ label, onApply }) {
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState('')

  const apply = () => {
    onApply(val.replace(/[^0-9]/g, ''))
    setOpen(false)
    setVal('')
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
      >
        {label}
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-2 py-1">
      <span className="text-xs text-slate-500">{label}:</span>
      <input
        type="text"
        inputMode="numeric"
        autoFocus
        value={formatThousands(val)}
        onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, '').slice(0, 18))}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        className="w-24 rounded border border-slate-200 px-1.5 py-0.5 text-right text-xs outline-none focus:border-blue-500"
      />
      <button
        type="button"
        onClick={apply}
        className="rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-indigo-700"
      >
        OK
      </button>
    </span>
  )
}