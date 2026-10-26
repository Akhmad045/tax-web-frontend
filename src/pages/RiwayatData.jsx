/**
 * RiwayatData
 * -----------
 * Menampilkan seluruh perhitungan yang sudah disimpan di database
 * (tabel riwayat di backend) + filter per modul, lihat detail, hapus,
 * dan export PDF langsung dari baris riwayat (memakai data tersimpan
 * di baris tersebut, bukan form input).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FileDown, Trash2 } from 'lucide-react'
import BupotPph21 from '../components/BupotPph21'
import Form1721A1 from '../components/Form1721A1'
import SptIndukPphBadan from '../components/SptIndukPphBadan'
import DetailRiwayatModal from '../components/DetailRiwayatModal'
import Card from '../components/Card'
import { exportElementToPdf } from '../utils/exportPdf'
import { formatRupiah } from '../utils/format'
import {
  LABEL_MODUL,
  ambilDetailRiwayat,
  ambilRiwayat,
  hapusRiwayat,
} from '../utils/riwayat'
import { pesanGalatApi } from '../utils/validation'

const FILTER = [
  { value: '', label: 'Semua Modul' },
  { value: 'pph21_bulanan', label: 'PPh 21 Bulanan' },
  { value: 'pph21_tahunan', label: 'PPh 21 Tahunan' },
  { value: 'pph_badan', label: 'PPh Badan' },
]

/** Format ISO UTC -> tanggal jam lokal Indonesia. */
function formatWaktu(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

const WARNA_MODUL = {
  pph21_bulanan: 'bg-blue-50 text-blue-700 ring-blue-200',
  pph21_tahunan: 'bg-slate-100 text-slate-700 ring-slate-300',
  pph_badan: 'bg-green-50 text-green-700 ring-green-200',
}

export default function RiwayatData() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [menghapus, setMenghapus] = useState(null)
  // Target export PDF dari baris tabel: { row, detail } — dirender
  // offscreen lalu diunduh lewat exportElementToPdf (template yang sama
  // dengan halaman kalkulator, tapi datanya dari baris yang diklik).
  const [exportTarget, setExportTarget] = useState(null)
  const [exportingId, setExportingId] = useState(null)
  const exportRef = useRef(null)

  const muatData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await ambilRiwayat({ limit: 100 })
      setItems(data.items || [])
    } catch (err) {
      const status = err.response?.status
      if (status === 401) {
        // Token tidak ada / kedaluwarsa. Interceptor axios sudah membersihkan
        // sesi; pindah ke login dan simpan halaman asal.
        navigate('/login', { replace: true, state: { from: '/riwayat' } })
        return
      }
      if (status === 403) {
        setError('Akses ditolak: akun Anda bukan admin.')
      } else if (!err.response) {
        setError('Tidak dapat terhubung ke backend. Pastikan FastAPI berjalan.')
      } else {
        setError(pesanGalatApi(err, `Gagal mengambil riwayat (status ${status}).`))
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    muatData()
  }, [muatData])

  // Filter dilakukan di sisi klien agar pergantian filter terasa instan.
  const tampil = useMemo(
    () => (filter ? items.filter((it) => it.modul === filter) : items),
    [items, filter],
  )

  const totalPph = useMemo(
    () => tampil.reduce((acc, it) => acc + (Number(it.total_pph) || 0), 0),
    [tampil],
  )

  const bukaDetail = async (id) => {
    setLoadingDetail(true)
    setDetail(null)
    try {
      const data = await ambilDetailRiwayat(id)
      setDetail(data)
    } catch (err) {
      setError(pesanGalatApi(err, 'Gagal memuat detail riwayat.'))
    } finally {
      setLoadingDetail(false)
    }
  }

  const konfirmasiHapus = async (id) => {
    // Cegah klik ganda: request hapus kedua untuk id yang sama diabaikan
    // selama yang pertama masih berjalan (kalau tidak, tombol bisa
    // memunculkan dua dialog dan dua request).
    if (menghapus !== null) return
    if (!window.confirm('Hapus data riwayat ini? Tindakan tidak dapat dibatalkan.')) {
      return
    }
    setMenghapus(id)
    try {
      await hapusRiwayat(id)
      setItems((prev) => prev.filter((it) => it.id !== id))
      if (detail?.id === id) setDetail(null)
    } catch (err) {
      setError(pesanGalatApi(err, 'Gagal menghapus riwayat.'))
    } finally {
      setMenghapus(null)
    }
  }

  /**
   * Export PDF dari satu baris riwayat.
   *
   * Mengambil detail lengkap baris itu dari backend (GET /api/riwayat/:id
   * — daftar tabel tidak membawa kolom detail agar ringan), kecuali bila
   * detail sudah tersedia (dari modal detail) sehingga tidak perlu
   * fetch ulang. Lalu merender template PDF modul tersebut secara
   * offscreen dengan data tersimpan itu: identitas dari kolom baris +
   * form tersimpan, angka dari hasil API tersimpan. Bukan dari form
   * input (halaman ini tidak punya form). Baris yang detailnya tidak
   * lengkap (mis. disimpan sebelum fitur detail ada) ditolak dengan
   * pesan, bukan PDF kosong.
   */
  const exportPdfBaris = async (row, detailSiap = null) => {
    if (exportingId !== null) return
    setExportingId(row.id)
    setError('')
    try {
      const detail =
        detailSiap || (await ambilDetailRiwayat(row.id)).detail || {}
      const hasil = detail.hasil || {}
      const cukup =
        (row.modul === 'pph21_bulanan' && hasil.perhitungan_bulanan && hasil.hasil) ||
        (row.modul === 'pph21_tahunan' && hasil.perhitungan_setahun && hasil.hasil) ||
        (row.modul === 'pph_badan' && hasil.perhitungan_laba && hasil.hasil)
      if (!cukup) {
        throw new Error(
          'Data lengkap baris ini tidak tersedia (disimpan tanpa detail perhitungan).',
        )
      }
      setExportTarget({ row, detail })
    } catch (err) {
      setError(pesanGalatApi(err, 'Gagal mengekspor PDF.'))
      setExportingId(null)
    }
  }

  // Begitu target export dirender offscreen, langsung unduh PDF-nya
  // lalu bersihkan target (sama polanya dengan tombol Export di halaman
  // kalkulator, hanya saja pemicunya dari baris tabel).
  useEffect(() => {
    if (!exportTarget || !exportRef.current) return undefined
    const { row } = exportTarget
    const nama = (row.nama_wajib || row.judul || 'WajibPajak').replace(/\s+/g, '-')
    const namaFile =
      row.modul === 'pph21_bulanan'
        ? `Bupot-PPh21-${nama}`
        : row.modul === 'pph21_tahunan'
          ? `1721-A1-${nama}${row.tahun_pajak ? `-${row.tahun_pajak}` : ''}`
          : `SPT-PPh-Badan-${nama}${row.tahun_pajak ? `-${row.tahun_pajak}` : ''}`
    let batal = false
    exportElementToPdf(exportRef.current, namaFile)
      .catch((err) => {
        if (!batal) setError(err.message || 'Gagal membuat PDF.')
      })
      .finally(() => {
        if (!batal) {
          setExportTarget(null)
          setExportingId(null)
        }
      })
    return () => {
      batal = true
    }
  }, [exportTarget])

  // Tanggal dokumen untuk export: pakai tanggal simpan baris (lebih
  // setia daripada tanggal hari ini), jatuh ke hari ini bila tak valid.
  const tanggalExport = exportTarget
    ? (() => {
        const d = new Date(exportTarget.row.dibuat_pada)
        return Number.isNaN(d.getTime()) ? new Date() : d
      })()
    : null

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex flex-wrap items-start justify-between gap-3 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Riwayat Perhitungan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Semua perhitungan yang tersimpan di database backend.
          </p>
        </div>
        <button
          type="button"
          onClick={muatData}
          disabled={loading}
          className="btn btn-outline-secondary"
        >
          {loading ? 'Memuat…' : '↻ Muat Ulang'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Ringkasan */}
      <div className="grid gap-4 sm:grid-cols-3 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Jumlah Data
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{tampil.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Total PPh Tersimpan
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{formatRupiah(totalPph)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Filter Aktif
          </p>
          <p className="mt-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-select text-sm font-medium"
            >
              {FILTER.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </p>
        </Card>
      </div>

      {/* Tabel */}
      <Card title="Daftar Riwayat" subtitle="Terbaru ditampilkan lebih dulu">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Memuat data…</p>
        ) : tampil.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-slate-600">Belum ada data tersimpan.</p>
            <p className="mt-1 text-sm text-slate-400">
              Hitung pajak pada salah satu modul lalu klik <strong>Simpan Data</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto animate-fadeInUp" style={{ animationDelay: '300ms' }}>
            <table className="table table-hover align-middle w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Modul</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Nama</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">NIK / NPWP</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Tahun</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">PPh</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((it) => (
                  <tr
                    key={it.id}
                    className="border-b border-slate-100 align-top hover:bg-slate-50"
                  >
                    <td className="px-3 py-3">
                      <span
                        className={[
                          'inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                          WARNA_MODUL[it.modul] || 'bg-slate-50 text-slate-700 ring-slate-200',
                        ].join(' ')}
                      >
                        {LABEL_MODUL[it.modul] || it.modul}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-800">
                      <p className="font-medium">{it.nama_wajib || it.judul}</p>
                      {it.status_ptkp && (
                        <p className="text-xs text-slate-400">PTKP {it.status_ptkp}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-sm text-slate-800">
                      {it.identitas || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-800">{it.tahun_pajak || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-semibold text-slate-800">
                      {formatRupiah(it.total_pph)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-800">
                      {formatWaktu(it.dibuat_pada)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => bukaDetail(it.id)}
                          title="Lihat detail"
                          aria-label="Lihat detail"
                          className="p-2 rounded-lg transition-colors text-indigo-600 hover:bg-indigo-50"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => exportPdfBaris(it)}
                          disabled={exportingId === it.id}
                          title="Export PDF"
                          aria-label="Export PDF"
                          className="p-2 rounded-lg transition-colors text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          <FileDown size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => konfirmasiHapus(it.id)}
                          disabled={menghapus === it.id}
                          title="Hapus riwayat"
                          aria-label="Hapus riwayat"
                          className="p-2 rounded-lg transition-colors text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal detail: layout terstruktur per modul, bukan JSON mentah. */}
      {(detail || loadingDetail) && (
        <DetailRiwayatModal
          row={detail}
          loading={loadingDetail}
          onClose={() => setDetail(null)}
          onExport={exportPdfBaris}
          exporting={exportingId === detail?.id}
        />
      )}

      {/* Dokumen PDF offscreen untuk export dari baris tabel: hanya
          dirender saat ada target export, memakai template & CSS yang
          sama dengan halaman kalkulator (bupot-offscreen-wrap). */}
      {exportTarget && (
        <div ref={exportRef} className="bupot-offscreen-wrap" style={{ paddingBottom: '80px' }}>
          {exportTarget.row.modul === 'pph21_bulanan' && (
            <BupotPph21
              form={exportTarget.detail.form || {}}
              result={exportTarget.detail.hasil}
              nomorBukti={exportTarget.detail.nomor_bukti || '-'}
              tanggal={tanggalExport}
            />
          )}
          {exportTarget.row.modul === 'pph21_tahunan' && (
            <Form1721A1
              namaPenerima={exportTarget.detail.form?.nama_pegawai || exportTarget.row.nama_wajib || ''}
              npwp={exportTarget.detail.form?.npwp || exportTarget.row.identitas || ''}
              tahunPajak={exportTarget.detail.form?.tahun_pajak || exportTarget.row.tahun_pajak || ''}
              statusPtkp={
                exportTarget.detail.hasil?.status_ptkp ||
                exportTarget.detail.form?.status_ptkp ||
                exportTarget.row.status_ptkp ||
                ''
              }
              statusPegawai={exportTarget.detail.form?.status_pegawai || ''}
              data={exportTarget.detail.hasil}
              tanggal={tanggalExport}
            />
          )}
          {exportTarget.row.modul === 'pph_badan' && (
            <SptIndukPphBadan
              form={exportTarget.detail.form || {}}
              data={exportTarget.detail.hasil}
              tanggal={tanggalExport}
            />
          )}
        </div>
      )}
    </div>
  )
}
