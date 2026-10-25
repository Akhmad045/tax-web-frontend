import { useRef, useState } from 'react'
import api from '../api/client'
import Card from '../components/Card'
import CurrencyInput from '../components/CurrencyInput'
import PrintButton from '../components/PrintButton'
import Row from '../components/Row'
import SptIndukPphBadan from '../components/SptIndukPphBadan'
import SimpanButton from '../components/SimpanButton'
import StatusBadge from '../components/StatusBadge'
import { formatRupiah, parseNumber } from '../utils/format'
import { exportElementToPdf } from '../utils/exportPdf'
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

// State menyimpan STRING angka murni (hanya digit), bukan Number.
// Identitas (nama/npwp/tahun) hanya untuk tampilan, tidak dikirim ke API.
const initialForm = {
  nama_wp: '',
  npwp: '',
  tahun_pajak: String(new Date().getFullYear()),
  omzet: '',
  omzet_lain: '',
  biaya: '',
  kredit_pph25: '',
  kredit_pph22_23: '',
}

export default function PPhBadan() {
  const [form, setForm] = useState(initialForm)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [exporting, setExporting] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [tersimpan, setTersimpan] = useState(false)

  // Ref ke UI aplikasi dan ke dokumen SPT Induk.
  const componentRef = useRef(null)
  const bupotRef = useRef(null)

  /** Unduh PDF SPT Induk PPh Badan secara otomatis (tanpa dialog print). */
  const handleExport = async () => {
    setExporting(true)
    try {
      await exportElementToPdf(
        bupotRef.current || componentRef.current,
        `SPT-PPh-Badan-${(form.nama_wp || 'WajibPajak').replace(/\s+/g, '-')}${form.tahun_pajak ? `-${form.tahun_pajak}` : ''}`,
      )
    } catch (err) {
      setError(err.message || 'Gagal membuat PDF.')
    } finally {
      setExporting(false)
    }
  }

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
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

    e.nama_wp = validasiTeksWajib(form.nama_wp, 'Nama Wajib Pajak')
    e.omzet = validasiUangWajib(form.omzet, 'Peredaran Bruto Usaha')
    e.biaya = validasiUangWajib(form.biaya, 'Biaya / Beban Usaha')
    // PENTING: validasiNikNpwp() mengembalikan '' saat VALID. Jangan
    // masukkan hasilnya langsung ke objek error, karena objek akan tetap
    // punya key `npwp` -> Object.keys().length > 0 -> submit selalu
    // dianggap gagal sehingga perhitungan tidak pernah berjalan.
    const errNpwp = validasiNikNpwp(form.npwp)
    if (errNpwp) e.npwp = errNpwp
    e.omzet_lain = validasiUangOpsional(form.omzet_lain, 'Peredaran Bruto Lainnya')
    e.kredit_pph25 = validasiUangOpsional(form.kredit_pph25, 'Kredit Pajak PPh 25')
    e.kredit_pph22_23 = validasiUangOpsional(form.kredit_pph22_23, 'Kredit Pajak PPh 22/23')

    // Catatan: perusahaan RUGI (biaya > peredaran bruto) adalah kondisi SAH.
    // Backend sudah menangani laba negatif (PKP = 0, PPh terutang = 0).
    // Jadi ini bukan error — cukup ditampilkan sebagai peringatan di UI,
    // jangan memblokir perhitungan.

    return bersihkanErrors(e)
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
      // Konversi string digit -> Number, hanya pada saat submit.
      const payload = {
        omzet: parseNumber(form.omzet),
        omzet_lain: parseNumber(form.omzet_lain),
        biaya: parseNumber(form.biaya),
        kredit_pph25: parseNumber(form.kredit_pph25),
        kredit_pph22_23: parseNumber(form.kredit_pph22_23),
      }
      const { data } = await api.post('/api/pph-badan', payload)
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

  /** Simpan hasil perhitungan PPh Badan ini ke database (tabel riwayat). */
  const handleSimpan = async () => {
    if (!result) return
    setMenyimpan(true)
    try {
      await simpanPerhitungan({
        modul: 'pph_badan',
        judul: form.nama_wp || 'Wajib Pajak Badan',
        nama_wajib: form.nama_wp,
        identitas: form.npwp,
        tahun_pajak: form.tahun_pajak,
        status_ptkp: '',
        ringkasan: `PPh 29 ${formatRupiah(
          result.hasil?.pph_29_kurang_bayar,
        )} · ${result.hasil?.status || '-'}`,
        total_pph: Math.round(Number(result.hasil?.pph_terutang_setahun) || 0),
        detail: {
          form: {
            nama_wp: form.nama_wp,
            npwp: form.npwp,
            tahun_pajak: form.tahun_pajak,
            omzet: parseNumber(form.omzet),
            omzet_lain: parseNumber(form.omzet_lain),
            biaya: parseNumber(form.biaya),
            kredit_pph25: parseNumber(form.kredit_pph25),
            kredit_pph22_23: parseNumber(form.kredit_pph22_23),
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
    <div className="space-y-6" ref={componentRef}>
      {/* ===== UI APLIKASI (tidak ikut dicetak) ===== */}
      <div className="app-ui space-y-6">
      {/* Header: judul vertikal + tombol aksi (tidak ikut tercetak) */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 md:text-2xl">PPh Badan</h1>
          <p className="mt-1 text-sm text-slate-500 print:hidden">
            Hitung PPh Badan setahun (PPh 29) dengan fasilitas Pasal 31E.
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

      <div className="grid gap-6 lg:grid-cols-5">
        {/* FORM */}
        <Card className="lg:col-span-2" title="Data Wajib Pajak" subtitle="Identitas badan (tidak dikirim ke API)">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identitas */}
            <div>
              <label htmlFor="nama_wp" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nama Wajib Pajak
              </label>
              <input
                id="nama_wp"
                name="nama_wp"
                type="text"
                autoComplete="off"
                value={form.nama_wp}
                onChange={(e) => setField('nama_wp')(e.target.value)}
                placeholder="Mis. PT Maju Bersama"
                aria-invalid={Boolean(errors.nama_wp)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              {errors.nama_wp && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.nama_wp}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <label htmlFor="npwp" className="block text-sm font-medium text-slate-700">
                    NPWP Badan
                  </label>
                  <span
                    className={[
                      'text-xs font-medium',
                      String(form.npwp || '').length === 16 ? 'text-slate-400' : 'text-red-500',
                    ].join(' ')}
                  >
                    {String(form.npwp || '').length}/16 digit
                  </span>
                </div>
                <input
                  id="npwp"
                  name="npwp"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  autoComplete="off"
                  value={form.npwp}
                  onChange={(e) => setField('npwp')(hanyaAngka16(e.target.value))}
                  placeholder="16 digit angka"
                  aria-invalid={Boolean(errors.npwp)}
                  className={[
                    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium shadow-sm outline-none transition',
                    errors.npwp
                      ? 'border-red-400 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                  ].join(' ')}
                />
                {errors.npwp && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.npwp}</p>
                )}
              </div>
              <div>
                <label htmlFor="tahun_pajak" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tahun Pajak
                </label>
                <input
                  id="tahun_pajak"
                  name="tahun_pajak"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.tahun_pajak}
                  onChange={(e) => setField('tahun_pajak')(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="2026"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Data Keuangan</h3>
            </div>

            <CurrencyInput
              name="omzet"
              label="Peredaran Bruto Usaha"
              value={form.omzet}
              onChange={setField('omzet')}
              required
              error={errors.omzet}
              hint="Peredaran bruto dari kegiatan usaha utama"
            />
            <CurrencyInput
              name="omzet_lain"
              label="Peredaran Bruto Lainnya"
              value={form.omzet_lain}
              onChange={setField('omzet_lain')}
              error={errors.omzet_lain}
              hint="Opsional — bruto dari kegiatan lain"
            />
            <CurrencyInput
              name="biaya"
              label="Biaya / Beban Usaha"
              value={form.biaya}
              onChange={setField('biaya')}
              required
              error={errors.biaya}
              hint="Total biaya fiskal setahun"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CurrencyInput
                name="kredit_pph25"
                label="Kredit Pajak PPh 25"
                value={form.kredit_pph25}
                onChange={setField('kredit_pph25')}
                error={errors.kredit_pph25}
              />
              <CurrencyInput
                name="kredit_pph22_23"
                label="Kredit Pajak PPh 22/23"
                value={form.kredit_pph22_23}
                onChange={setField('kredit_pph22_23')}
                error={errors.kredit_pph22_23}
              />
            </div>

            <div className="print:hidden flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="space-y-6 lg:col-span-3">
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
                  🧾
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
              {/* Identitas (tampilan saja) */}
              {(form.nama_wp || form.npwp || form.tahun_pajak) && (
                <Card title="Identitas Wajib Pajak">
                  <div className="divide-y divide-slate-100">
                    <Row label="Nama Wajib Pajak" value={form.nama_wp || '-'} />
                    <Row label="NPWP Badan" value={form.npwp || '-'} />
                    <Row label="Tahun Pajak" value={form.tahun_pajak || '-'} />
                  </div>
                </Card>
              )}

              {/* Kartu utama */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-blue-100">
                      {result.hasil.status === 'LEBIH_BAYAR'
                        ? 'PPh Pasal 29 (Lebih Bayar)'
                        : 'PPh Pasal 29 (Kurang Bayar)'}
                    </p>
                    <p className="mt-1 text-2xl font-bold break-words md:text-3xl">
                      {formatRupiah(Math.abs(result.hasil.pph_29_kurang_bayar))}
                    </p>
                  </div>
                  <StatusBadge status={result.hasil.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderTopColor: 'rgba(255, 255, 255, 0.2)' }}>
                  <div>
                    <p className="text-xs text-blue-100">Laba / Rugi Bersih Sebelum Pajak</p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {formatRupiah(result.perhitungan_laba.laba_bersih)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-100">PPh Terutang</p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {formatRupiah(result.hasil.pph_terutang_setahun)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 border-t pt-3" style={{ borderTopColor: 'rgba(255, 255, 255, 0.2)' }}>
                  <div>
                    <p className="text-xs text-blue-100">Total Kredit Pajak</p>
                    <p className="mt-0.5 text-base font-semibold">
                      {formatRupiah(result.hasil.total_kredit_pajak)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-100">Status</p>
                    <p className="mt-0.5 text-base font-semibold">
                      {result.hasil.status?.replaceAll('_', ' ') || '-'}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-blue-100">{result.hasil.keterangan}</p>
              </div>

              {/* Ringkasan utama (Excel-like) */}
              <Card title="Ringkasan Perhitungan">
                <div className="divide-y divide-slate-100">
                  <Row
                    label="Total Peredaran Bruto"
                    value={formatRupiah(result.perhitungan_laba.total_peredaran_bruto)}
                  />
                  <Row
                    label="Biaya / Beban Usaha"
                    value={`- ${formatRupiah(result.perhitungan_laba.biaya)}`}
                  />
                  <Row
                    label="Laba / Rugi Bersih Sebelum Pajak"
                    value={formatRupiah(result.perhitungan_laba.laba_bersih)}
                    strong
                  />
                  <Row
                    label="PPh Terutang"
                    value={formatRupiah(result.hasil.pph_terutang_setahun)}
                    strong
                  />
                  <Row
                    label="Kredit Pajak PPh 25"
                    value={`- ${formatRupiah(result.hasil.kredit_pph25)}`}
                  />
                  <Row
                    label="Kredit Pajak PPh 22/23"
                    value={`- ${formatRupiah(result.hasil.kredit_pph22_23)}`}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">
                    PPh Pasal 29 (Kurang/Lebih Bayar)
                  </span>
                  <span
                    className={[
                      'text-lg font-bold',
                      result.hasil.pph_29_kurang_bayar > 0
                        ? 'text-red-600'
                        : result.hasil.pph_29_kurang_bayar < 0
                          ? 'text-green-600'
                          : 'text-slate-700',
                    ].join(' ')}
                  >
                    {formatRupiah(result.hasil.pph_29_kurang_bayar)}
                  </span>
                </div>
              </Card>

              {/* Laba & PKP */}
              <Card title="Perhitungan Laba & PKP">
                <div className="divide-y divide-slate-100">
                  <Row label="Peredaran Bruto Usaha" value={formatRupiah(result.perhitungan_laba.omzet)} />
                  <Row label="Peredaran Bruto Lainnya" value={formatRupiah(result.perhitungan_laba.omzet_lain)} />
                  <Row
                    label="Total Peredaran Bruto"
                    value={formatRupiah(result.perhitungan_laba.total_peredaran_bruto)}
                    strong
                  />
                  <Row label="Biaya / Beban Usaha" value={`- ${formatRupiah(result.perhitungan_laba.biaya)}`} />
                  <Row
                    label="Laba Bersih / PKP"
                    value={formatRupiah(result.perhitungan_laba.pkp)}
                    strong
                  />
                </div>
              </Card>

              {/* Fasilitas 31E */}
              <Card title="Fasilitas Pasal 31E">
                <p className="mb-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
                  {result.fasilitas_pasal_31e.keterangan}
                </p>
                <div className="divide-y divide-slate-100">
                  <Row
                    label={`PKP dapat fasilitas (${result.fasilitas_pasal_31e.tarif_fasilitas})`}
                    value={formatRupiah(result.fasilitas_pasal_31e.pkp_dapat_fasilitas)}
                  />
                  <Row
                    label={`PKP tanpa fasilitas (${result.fasilitas_pasal_31e.tarif_non_fasilitas})`}
                    value={formatRupiah(result.fasilitas_pasal_31e.pkp_tidak_dapat_fasilitas)}
                  />
                  <Row
                    label="PPh dari fasilitas"
                    value={formatRupiah(result.fasilitas_pasal_31e.pph_dari_fasilitas)}
                  />
                  <Row
                    label="PPh tanpa fasilitas"
                    value={formatRupiah(result.fasilitas_pasal_31e.pph_dari_non_fasilitas)}
                  />
                </div>
              </Card>

              {/* Kredit & PPh 29 */}
              <Card title="Kredit Pajak & PPh 29">
                <div className="divide-y divide-slate-100">
                  <Row label="PPh Terutang Setahun" value={formatRupiah(result.hasil.pph_terutang_setahun)} strong />
                  <Row label="Kredit PPh 25" value={`- ${formatRupiah(result.hasil.kredit_pph25)}`} />
                  <Row label="Kredit PPh 22/23" value={`- ${formatRupiah(result.hasil.kredit_pph22_23)}`} />
                  <Row label="Total Kredit Pajak" value={`- ${formatRupiah(result.hasil.total_kredit_pajak)}`} strong />
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">PPh 29</span>
                  <span className="text-lg font-bold text-blue-700">
                    {formatRupiah(result.hasil.pph_29_kurang_bayar)}
                  </span>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
      </div>
      {/* ===== AKHIR UI APLIKASI ===== */}

      {/* ===== SPT INDUK PPh BADAN (hanya saat export/print) ===== */}
      {result && (
        <div ref={bupotRef} className="bupot-offscreen-wrap" style={{ paddingBottom: '80px' }}>
          <SptIndukPphBadan
            form={form}
            data={result}
            tanggal={new Date()}
          />
        </div>
      )}
    </div>
  )
}