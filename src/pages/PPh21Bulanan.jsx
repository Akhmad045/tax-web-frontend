import { useRef, useState } from 'react'
import api from '../api/client'
import BupotPph21 from '../components/BupotPph21'
import Card from '../components/Card'
import CurrencyInput from '../components/CurrencyInput'
import PrintButton from '../components/PrintButton'
import Row from '../components/Row'
import SimpanButton from '../components/SimpanButton'
import { formatRupiah, parseNumber } from '../utils/format'
import { exportElementToPdf } from '../utils/exportPdf'
import { nomorBuktiBerikutnya } from '../utils/nomorBukti'
import { pesanBackendMati, simpanPerhitungan } from '../utils/riwayat'
import {
  bersihkanErrors,
  fokusFieldPertama,
  hanyaAngka16,
  validasiNikNpwp,
  validasiTeksWajib,
  validasiUangOpsional,
  validasiUangWajib,
} from '../utils/validation'


// PTKP: label + nilai.
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

// State menyimpan STRING angka murni (hanya digit) untuk field uang,
// dan string biasa untuk field identitas.
const initialForm = {
  nama_karyawan: '',
  nik: '',
  status_ptkp: 'TK/0',
  gaji_pokok: '',
  tunjangan_tetap: '',
  tunjangan_tidak_tetap: '',
  bpjs: '',
  jht: '',
  status_pegawai: 'Tetap',
}

const STATUS_PEGAWAI_OPTIONS = ['Tetap', 'Kontrak', 'Magang', 'Harian']

export default function PPh21Bulanan() {
  const [form, setForm] = useState(initialForm)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [exporting, setExporting] = useState(false)
  // Nomor bukti diisi saat Hitung berhasil (lihat handleSubmit), bukan
  // saat halaman dibuka — jadi nomor hanya terpakai untuk perhitungan
  // yang benar-benar jadi dokumen. Sebelum Hitung pertama, nilainya ''.
  const [nomorBukti, setNomorBukti] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const [tersimpan, setTersimpan] = useState(false)

  // Ref ke UI aplikasi (form + hasil) dan ke dokumen Bupot.
  const componentRef = useRef(null)
  const bupotRef = useRef(null)

  /** Unduh PDF Bupot resmi secara otomatis (tanpa dialog print). */
  const handleExport = async () => {
    setExporting(true)
    try {
      await exportElementToPdf(
        bupotRef.current || componentRef.current,
        `Bupot-PPh21-${(form.nama_karyawan || 'Karyawan').replace(/\s+/g, '-')}`,
      )
    } catch (err) {
      setError(err.message || 'Gagal membuat PDF.')
    } finally {
      setExporting(false)
    }
  }

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
    // Hasil lama TIDAK BOLEH bertahan setelah input diubah: dokumen Bupot
    // mencampur input form (NIK/nama/tunjangan tetap & tidak tetap) dengan
    // angka `result` dari perhitungan sebelumnya. Bila user mengubah
    // tunjangan lalu langsung Export tanpa Hitung ulang, PDF akan
    // menampilkan tunjangan baru dengan bruto/PPh lama (tidak konsisten).
    // Karena itu setiap perubahan input menghapus hasil & status simpan,
    // sehingga user wajib Hitung ulang — tombol hasil/Export/Simpan
    // memang hanya dirender saat `result` ada.
    setResult(null)
    setTersimpan(false)
    // Hapus pesan error field ini begitu user mulai memperbaiki.
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  /** Validasi seluruh form. Mengembalikan objek error (kosong = valid). */
  const validate = () => {
    const e = {}

    e.nama_karyawan = validasiTeksWajib(form.nama_karyawan, 'Nama Karyawan')
    // PENTING: validasiNikNpwp() mengembalikan '' saat VALID. Jangan
    // masukkan hasilnya langsung ke objek error, karena objek akan tetap
    // punya key `nik` -> Object.keys().length > 0 -> submit selalu
    // dianggap gagal sehingga perhitungan tidak pernah berjalan.
    const errNik = validasiNikNpwp(form.nik)
    if (errNik) e.nik = errNik
    e.gaji_pokok = validasiUangWajib(form.gaji_pokok, 'Gaji Pokok')
    e.tunjangan_tetap = validasiUangOpsional(form.tunjangan_tetap, 'Tunjangan Tetap')
    e.tunjangan_tidak_tetap = validasiUangOpsional(
      form.tunjangan_tidak_tetap,
      'Tunjangan Tidak Tetap',
    )
    e.bpjs = validasiUangOpsional(form.bpjs, 'Iuran BPJS')
    e.jht = validasiUangOpsional(form.jht, 'Iuran JHT')

    if (!String(form.status_ptkp ?? '').trim()) {
      e.status_ptkp = 'Status PTKP wajib dipilih'
    }

    return bersihkanErrors(e)
  }

  /**
   * Nilai PPh 21 per bulan dan Take Home Pay: diambil LANGSUNG dari
   * `hasil` respons API (sudah dibulatkan HALF_UP 2 desimal di backend),
   * BUKAN dihitung ulang di frontend. Hitung ulang (totalPph/12 tanpa
   * pembulatan) bisa meleset sepersekian rupiah dari nilai API — misalnya
   * kasus 30jt+5jt: API 4.654.166,67 vs hitung ulang 4.654.166,6667 —
   * dan selisih itu ikut terbawa ke ringkasan riwayat (total_pph).
   * Fallback hanya bila `hasil` tidak ada (respons lama): PPh dari
   * total/12, THP Kas dari bruto - BPJS - JHT - PPh (biaya jabatan
   * TIDAK memotong THP kas, sesuai definisi baru backend).
   */
  const totalPphSetahun = Number(result?.perhitungan_setahun?.pph_setahun ?? 0)
  const brutoBulanan = Number(result?.perhitungan_bulanan?.bruto ?? 0)
  const bpjsBulanan = Number(result?.perhitungan_bulanan?.bpjs ?? 0)
  const jhtBulanan = Number(result?.perhitungan_bulanan?.jht ?? 0)
  const pphBulanan = result
    ? Number(result.hasil?.pph21_per_bulan ?? totalPphSetahun / 12)
    : 0
  const takeHomePay = result
    ? Number(
        result.hasil?.take_home_pay ??
          brutoBulanan - bpjsBulanan - jhtBulanan - pphBulanan,
      )
    : 0

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
      // Backend hanya menerima satu field `tunjangan`, jadi gabungkan
      // Tunjangan Tetap + Tunjangan Tidak Tetap agar bruto akurat.
      const tunjanganGabungan =
        parseNumber(form.tunjangan_tetap) + parseNumber(form.tunjangan_tidak_tetap)

      // Nama, NIK, Status Pegawai TIDAK dikirim ke API (hanya untuk tampilan).
      const payload = {
        gaji_pokok: parseNumber(form.gaji_pokok),
        tunjangan: tunjanganGabungan,
        bpjs: parseNumber(form.bpjs),
        jht: parseNumber(form.jht),
        status_ptkp: form.status_ptkp,
      }
      const { data } = await api.post('/api/pph21/bulanan', payload)
      // Satu Hitung yang berhasil = satu nomor urut berikutnya. Nomor yang
      // sama dipakai untuk Simpan & Export perhitungan ini (cetak ulang
      // tidak mengubah nomor); Hitung berikutnya mendapat nomor baru.
      setNomorBukti(nomorBuktiBerikutnya())
      setResult(data)
      setTersimpan(false)
    } catch (err) {
      if (err.response) {
        const detail = err.response.data?.detail
        setError(
          typeof detail === 'string'
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

  /** Simpan hasil perhitungan ini ke database (tabel riwayat). */
  const handleSimpan = async () => {
    if (!result) return
    setMenyimpan(true)
    try {
      await simpanPerhitungan({
        modul: 'pph21_bulanan',
        judul: form.nama_karyawan || 'Pegawai',
        nama_wajib: form.nama_karyawan,
        identitas: form.nik,
        tahun_pajak: String(new Date().getFullYear()),
        status_ptkp: form.status_ptkp,
        ringkasan: `PPh 21 ${formatRupiah(pphBulanan)} / bulan · THP ${formatRupiah(takeHomePay)}`,
        total_pph: Math.round(pphBulanan),
        detail: {
          nomor_bukti: nomorBukti,
          form: {
            nama_karyawan: form.nama_karyawan,
            nik: form.nik,
            status_ptkp: form.status_ptkp,
            status_pegawai: form.status_pegawai,
            gaji_pokok: parseNumber(form.gaji_pokok),
            tunjangan_tetap: parseNumber(form.tunjangan_tetap),
            tunjangan_tidak_tetap: parseNumber(form.tunjangan_tidak_tetap),
            bpjs: parseNumber(form.bpjs),
            jht: parseNumber(form.jht),
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
    setForm(initialForm)
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
          <h1 className="text-xl font-bold text-slate-800 md:text-2xl">PPh 21 Bulanan</h1>
          <p className="mt-1 text-sm text-slate-500 print:hidden">
            Hitung pemotongan PPh 21 pegawai tetap untuk satu bulan beserta Take Home Pay.
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

      <div className="grid gap-6 lg:grid-cols-5 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
        {/* FORM */}
        <Card className="lg:col-span-2" title="Data Penghasilan" subtitle="Masukkan angka dalam Rupiah">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Nama Karyawan */}
            <div>
              <label htmlFor="nama_karyawan" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nama Karyawan <span className="text-red-500">*</span>
              </label>
              <input
                id="nama_karyawan"
                name="nama_karyawan"
                type="text"
                autoComplete="off"
                value={form.nama_karyawan}
                onChange={(e) => setField('nama_karyawan')(e.target.value)}
                placeholder="Mis. Budi Santoso"
                aria-invalid={Boolean(errors.nama_karyawan)}
                className={[
                  'w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium shadow-sm outline-none transition',
                  errors.nama_karyawan
                    ? 'border-red-400 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                ].join(' ')}
              />
              {errors.nama_karyawan && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.nama_karyawan}</p>
              )}
            </div>

            {/* 2. NIK */}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="nik" className="block text-sm font-medium text-slate-700">
                  NIK <span className="text-red-500">*</span>
                </label>
                <span
                  className={[
                    'text-xs font-medium',
                    String(form.nik || '').length === 16 ? 'text-slate-400' : 'text-red-500',
                  ].join(' ')}
                >
                  {String(form.nik || '').length}/16 digit
                </span>
              </div>
              <input
                id="nik"
                name="nik"
                type="text"
                inputMode="numeric"
                maxLength={16}
                autoComplete="off"
                value={form.nik}
                onChange={(e) => setField('nik')(hanyaAngka16(e.target.value))}
                placeholder="16 digit angka"
                aria-invalid={Boolean(errors.nik)}
                className={[
                  'w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium shadow-sm outline-none transition',
                  errors.nik
                    ? 'border-red-400 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                ].join(' ')}
              />
              {errors.nik && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.nik}</p>
              )}
            </div>

            {/* 3. Status PTKP */}
            <div>
              <label htmlFor="status_ptkp" className="mb-1.5 block text-sm font-medium text-slate-700">
                Status PTKP <span className="text-red-500">*</span>
              </label>
              <select
                id="status_ptkp"
                name="status_ptkp"
                value={form.status_ptkp}
                onChange={(e) => setField('status_ptkp')(e.target.value)}
                aria-invalid={Boolean(errors.status_ptkp)}
                className={[
                  'w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium shadow-sm outline-none transition',
                  errors.status_ptkp
                    ? 'border-red-400 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                ].join(' ')}
              >
                {PTKP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errors.status_ptkp && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.status_ptkp}</p>
              )}
            </div>

            {/* 4. Gaji Pokok */}
            <CurrencyInput
              name="gaji_pokok"
              label="Gaji Pokok"
              value={form.gaji_pokok}
              onChange={setField('gaji_pokok')}
              required
              error={errors.gaji_pokok}
              hint="Gaji pokok per bulan"
            />

            {/* 5. Tunjangan Tetap */}
            <CurrencyInput
              name="tunjangan_tetap"
              label="Tunjangan Tetap"
              value={form.tunjangan_tetap}
              onChange={setField('tunjangan_tetap')}
              error={errors.tunjangan_tetap}
              hint="Opsional — tunjangan tetap per bulan"
            />

            {/* 6. Tunjangan Tidak Tetap */}
            <CurrencyInput
              name="tunjangan_tidak_tetap"
              label="Tunjangan Tidak Tetap"
              value={form.tunjangan_tidak_tetap}
              onChange={setField('tunjangan_tidak_tetap')}
              error={errors.tunjangan_tidak_tetap}
              hint="Opsional — mis. uang lembur, insentif"
            />

            {/* 7 & 8. Iuran BPJS & JHT */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CurrencyInput
                name="bpjs"
                label="Iuran BPJS"
                value={form.bpjs}
                onChange={setField('bpjs')}
                error={errors.bpjs}
                hint="Potongan bulanan"
              />
              <CurrencyInput
                name="jht"
                label="Iuran JHT"
                value={form.jht}
                onChange={setField('jht')}
                hint="Potongan bulanan"
              />
            </div>

            {/* 9. Status Pegawai */}
            <div>
              <label htmlFor="status_pegawai" className="mb-1.5 block text-sm font-medium text-slate-700">
                Status Pegawai
              </label>
              <select
                id="status_pegawai"
                name="status_pegawai"
                value={form.status_pegawai}
                onChange={(e) => setField('status_pegawai')(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {STATUS_PEGAWAI_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="print:hidden flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
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

        {/* HASIL */}
        <div className="space-y-6 lg:col-span-3 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Gagal menghitung</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {!result && !error && (
            <Card>
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  💰
                </div>
                <p className="text-sm font-medium text-slate-600">
                  Hasil perhitungan akan muncul di sini
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Isi form di sebelah kiri lalu klik “Hitung Pajak”.
                </p>
              </div>
            </Card>
          )}

          {result && (
            <>
              {/* Identitas karyawan (tampilan saja, tidak dikirim ke API) */}
              {(form.nama_karyawan || form.nik || form.status_pegawai) && (
                <Card title="Identitas Karyawan">
                  <div className="divide-y divide-slate-100">
                    <Row label="Nama Karyawan" value={form.nama_karyawan || '-'} />
                    <Row label="NIK" value={form.nik || '-'} />
                    <Row label="Status Pegawai" value={form.status_pegawai || '-'} />
                  </div>
                </Card>
              )}

              {/* Kartu utama */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-blue-100">PPh 21 per Bulan</p>
                    <p className="mt-1 text-2xl font-bold break-words md:text-3xl">
                      {formatRupiah(pphBulanan)}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {result.status_ptkp}
                  </span>
                </div>
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs text-blue-100">Take Home Pay (THP)</p>
                  <p className="mt-0.5 text-lg font-semibold">
                    {formatRupiah(takeHomePay)}
                  </p>
                </div>
              </div>

              {/* Perhitungan bulanan */}
              <Card title="Perhitungan Bulanan">
                <div className="divide-y divide-slate-100">
                  <Row label="Gaji Pokok" value={formatRupiah(result.perhitungan_bulanan.gaji_pokok)} />
                  <Row label="Tunjangan Tetap" value={formatRupiah(form.tunjangan_tetap)} />
                  <Row label="Tunjangan Tidak Tetap" value={formatRupiah(form.tunjangan_tidak_tetap)} />
                  <Row label="Total Tunjangan" value={formatRupiah(result.perhitungan_bulanan.tunjangan)} strong />
                  <Row label="Bruto" value={formatRupiah(result.perhitungan_bulanan.bruto)} strong />
                  <Row label="Iuran BPJS" value={`- ${formatRupiah(result.perhitungan_bulanan.bpjs)}`} />
                  <Row label="Iuran JHT" value={`- ${formatRupiah(result.perhitungan_bulanan.jht)}`} />
                  <Row label="Total Pengurang" value={`- ${formatRupiah(result.perhitungan_bulanan.total_pengurang)}`} strong />
                  <Row label="Neto" value={formatRupiah(result.perhitungan_bulanan.neto)} strong />
                </div>
              </Card>

              {/* Perhitungan setahun */}
              <Card title="Perhitungan Setahun (Disetahunkan)">
                <div className="divide-y divide-slate-100">
                  <Row label="Bruto Setahun" value={formatRupiah(result.perhitungan_setahun.bruto_setahun)} />
                  <Row label="Neto Setahun" value={formatRupiah(result.perhitungan_setahun.neto_setahun)} />
                  <Row label="PTKP" value={`- ${formatRupiah(result.perhitungan_setahun.ptkp)}`} />
                  <Row
                    label="PKP (dibulatkan ke bawah ribuan)"
                    value={formatRupiah(result.perhitungan_setahun.pkp)}
                    strong
                  />
                  <Row
                    label="PPh 21 Setahun"
                    value={formatRupiah(result.perhitungan_setahun.pph_setahun)}
                    strong
                  />
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
            </>
          )}
        </div>
      </div>
      </div>
      {/* ===== AKHIR UI APLIKASI ===== */}

      {/* ===== BUPOT RESMI (hanya saat export/print) ===== */}
      {result && (
        <div ref={bupotRef} className="bupot-offscreen-wrap" style={{ paddingBottom: '80px' }}>
          <BupotPph21
            form={form}
            result={result}
            nomorBukti={nomorBukti}
            tanggal={new Date()}
          />
        </div>
      )}
    </div>
  )
}