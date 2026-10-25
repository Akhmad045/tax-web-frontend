/**
 * RiwayatData
 * -----------
 * Menampilkan seluruh perhitungan yang sudah disimpan di database
 * (tabel riwayat di backend) + filter per modul, lihat detail, dan hapus.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
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
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Memuat…' : '↻ Muat Ulang'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5 font-semibold">Modul</th>
                  <th className="px-3 py-2.5 font-semibold">Nama</th>
                  <th className="px-3 py-2.5 font-semibold">NIK / NPWP</th>
                  <th className="px-3 py-2.5 font-semibold">Tahun</th>
                  <th className="px-3 py-2.5 text-right font-semibold">PPh</th>
                  <th className="px-3 py-2.5 font-semibold">Disimpan</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Aksi</th>
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
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800">{it.nama_wajib || it.judul}</p>
                      {it.status_ptkp && (
                        <p className="text-xs text-slate-400">PTKP {it.status_ptkp}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">
                      {it.identitas || '-'}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{it.tahun_pajak || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-800">
                      {formatRupiah(it.total_pph)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                      {formatWaktu(it.dibuat_pada)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => bukaDetail(it.id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Detail
                        </button>
                        <button
                          type="button"
                          onClick={() => konfirmasiHapus(it.id)}
                          disabled={menghapus === it.id}
                          className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {menghapus === it.id ? '…' : 'Hapus'}
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

      {/* Panel detail */}
      {(detail || loadingDetail) && (
        <Card
          title={detail ? `Detail Riwayat #${detail.id}` : 'Memuat detail…'}
          subtitle={detail ? formatWaktu(detail.dibuat_pada) : ''}
        >
          {loadingDetail ? (
            <p className="py-6 text-center text-sm text-slate-500">Memuat…</p>
          ) : (
            <div className="space-y-4 animate-fadeInUp">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-800">
                    {detail.nama_wajib || detail.judul}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {LABEL_MODUL[detail.modul] || detail.modul}
                    {detail.identitas ? ` · ${detail.identitas}` : ''}
                    {detail.tahun_pajak ? ` · Tahun ${detail.tahun_pajak}` : ''}
                  </p>
                  {detail.ringkasan && (
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {detail.ringkasan}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Tutup
                </button>
              </div>

              <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
                {JSON.stringify(detail.detail, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
