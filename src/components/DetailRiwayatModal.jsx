import { useEffect } from 'react'
import { FileDown, X } from 'lucide-react'
import { LABEL_MODUL } from '../utils/riwayat'
import { formatRupiah } from '../utils/format'

/**
 * DetailRiwayatModal — tampilan Detail Riwayat yang rapi (bukan JSON).
 *
 * Menggantikan panel `<pre>{JSON.stringify(...)}</pre>` lama. Data yang
 * ditampilkan berasal dari baris riwayat yang dipilih: kolom baris untuk
 * identitas, dan objek `detail` tersimpan (form + hasil API) untuk
 * rincian input & hasil — per modul bentuknya berbeda, jadi tiap seksi
 * dirender sesuai modul.
 *
 * Catatan: tidak ada JSON.parse() di sini karena `detail` sudah berupa
 * objek — backend mem-parse kolom JSON-nya dan axios mem-parse respons
 * HTTP-nya. Memanggil JSON.parse pada objek justru akan melempar error.
 */

/** Format ISO UTC -> tanggal jam lokal Indonesia (sama dgn RiwayatData). */
function formatWaktu(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

function Seksi({ judul, children }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {judul}
      </h3>
      <div className="mt-2 divide-y divide-slate-100">{children}</div>
    </section>
  )
}

function Baris({ label, nilai, highlight = false }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2 ${
        highlight ? 'rounded-lg bg-indigo-50 px-3' : ''
      }`}
    >
      <span className="text-sm text-slate-500">{label}</span>
      <span
        className={`text-right text-sm ${
          highlight ? 'font-bold text-indigo-700' : 'font-semibold text-slate-800'
        }`}
      >
        {nilai}
      </span>
    </div>
  )
}

function ItemIdentitas({ label, nilai }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-800 break-words">
        {nilai || '-'}
      </p>
    </div>
  )
}

const rp = (nilai) => formatRupiah(nilai ?? 0)

export default function DetailRiwayatModal({
  row,
  loading,
  onClose,
  onExport,
  exporting,
}) {
  // Escape menutup modal; scroll body dikunci selama modal terbuka.
  useEffect(() => {
    const tombolEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', tombolEsc)
    const overflowLama = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tombolEsc)
      document.body.style.overflow = overflowLama
    }
  }, [onClose])

  const detail = row?.detail || {}
  const form = detail.form || {}
  const api = detail.hasil || {}
  const lengkap = Boolean(api.hasil) && Boolean(row)

  // Rincian input & hasil per modul (angka dari data tersimpan).
  let input = null
  let hasil = null
  if (row?.modul === 'pph21_bulanan') {
    const pb = api.perhitungan_bulanan || {}
    const ps = api.perhitungan_setahun || {}
    const hs = api.hasil || {}
    input = (
      <>
        <Baris label="Gaji Pokok" nilai={rp(form.gaji_pokok)} />
        <Baris label="Tunjangan Tetap" nilai={rp(form.tunjangan_tetap)} />
        <Baris label="Tunjangan Tidak Tetap" nilai={rp(form.tunjangan_tidak_tetap)} />
        <Baris label="BPJS" nilai={rp(form.bpjs)} />
        <Baris label="JHT" nilai={rp(form.jht)} />
      </>
    )
    hasil = (
      <>
        <Baris label="Bruto" nilai={rp(pb.bruto)} />
        <Baris label="Neto" nilai={rp(pb.neto)} />
        <Baris label="PKP" nilai={rp(ps.pkp)} />
        <Baris label="PPh 21 per Bulan" nilai={rp(hs.pph21_per_bulan)} />
        <Baris label="Take Home Pay (THP)" nilai={rp(hs.take_home_pay)} highlight />
      </>
    )
  } else if (row?.modul === 'pph21_tahunan') {
    const ps = api.perhitungan_setahun || {}
    const hs = api.hasil || {}
    const statusSelisih =
      hs.status === 'KURANG_BAYAR'
        ? 'Kurang Bayar'
        : hs.status === 'LEBIH_BAYAR'
          ? 'Lebih Bayar'
          : 'Nihil'
    input = (
      <>
        <Baris label="Total Gaji Pokok" nilai={rp(ps.total_gaji_pokok)} />
        <Baris label="Total Tunjangan" nilai={rp(ps.total_tunjangan)} />
        <Baris label="Total THR" nilai={rp(ps.total_thr)} />
        <Baris label="Total Bonus" nilai={rp(ps.total_bonus)} />
        <Baris label="Total BPJS" nilai={rp(ps.total_bpjs)} />
        <Baris label="Total JHT" nilai={rp(ps.total_jht)} />
      </>
    )
    hasil = (
      <>
        <Baris label="Bruto Setahun" nilai={rp(ps.bruto_setahun)} />
        <Baris label="Neto Setahun" nilai={rp(ps.neto_setahun)} />
        <Baris label="PTKP" nilai={rp(ps.ptkp)} />
        <Baris label="PKP" nilai={rp(ps.pkp)} />
        <Baris
          label="PPh 21 Terutang Setahun"
          nilai={rp(hs.pph21_terutang_setahun)}
          highlight
        />
        <Baris label="Total PPh Dipotong" nilai={rp(hs.total_pph_dipotong)} />
        <Baris
          label={`Selisih (${statusSelisih})`}
          nilai={rp(Math.abs(hs.selisih ?? 0))}
        />
      </>
    )
  } else if (row?.modul === 'pph_badan') {
    const pl = api.perhitungan_laba || {}
    const hs = api.hasil || {}
    const status29 =
      hs.status === 'LEBIH_BAYAR'
        ? 'Lebih Bayar'
        : hs.status === 'KURANG_BAYAR'
          ? 'Kurang Bayar'
          : 'Nihil'
    input = (
      <>
        <Baris label="Omzet" nilai={rp(form.omzet)} />
        <Baris label="Penghasilan Lain" nilai={rp(form.omzet_lain)} />
        <Baris label="Biaya / Beban Usaha" nilai={rp(form.biaya)} />
        <Baris label="Kredit PPh 25" nilai={rp(form.kredit_pph25)} />
        <Baris label="Kredit PPh 22 / 23" nilai={rp(form.kredit_pph22_23)} />
      </>
    )
    hasil = (
      <>
        <Baris label="Laba Bersih Sebelum Pajak" nilai={rp(pl.laba_bersih)} />
        <Baris label="PKP" nilai={rp(pl.pkp)} />
        <Baris
          label="PPh Terutang Setahun"
          nilai={rp(hs.pph_terutang_setahun)}
          highlight
        />
        <Baris label="Total Kredit Pajak" nilai={rp(hs.total_kredit_pajak)} />
        <Baris
          label={`PPh Pasal 29 (${status29})`}
          nilai={rp(Math.abs(hs.pph_29_kurang_bayar ?? 0))}
        />
      </>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detail perhitungan"
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fadeInUp"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !row ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-800">
                Memuat detail…
              </h2>
              <button
                type="button"
                onClick={onClose}
                title="Tutup"
                aria-label="Tutup"
                className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <p className="py-8 text-center text-sm text-slate-500">Memuat…</p>
          </>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Detail Perhitungan #{row.id}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {LABEL_MODUL[row.modul] || row.modul} · {formatWaktu(row.dibuat_pada)}
                </p>
                {row.ringkasan && (
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {row.ringkasan}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                title="Tutup"
                aria-label="Tutup"
                className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Identitas */}
            <Seksi judul="Identitas">
              <div className="grid grid-cols-2 gap-4 py-2">
                <ItemIdentitas label="Nama" nilai={row.nama_wajib || row.judul} />
                <ItemIdentitas label="NIK / NPWP" nilai={row.identitas} />
                <ItemIdentitas label="Status PTKP" nilai={row.status_ptkp} />
                <ItemIdentitas label="Tahun Pajak" nilai={row.tahun_pajak} />
              </div>
            </Seksi>

            {lengkap ? (
              <>
                {/* Rincian Input */}
                <Seksi judul="Rincian Input">{input}</Seksi>

                {/* Hasil Perhitungan */}
                <Seksi judul="Hasil Perhitungan">{hasil}</Seksi>
              </>
            ) : (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Detail lengkap tidak tersedia untuk baris ini (disimpan tanpa
                detail perhitungan).
              </p>
            )}

            {/* Aksi */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => onExport(row, row.detail)}
                disabled={!lengkap || exporting}
                title={lengkap ? 'Export PDF' : 'Detail tidak lengkap'}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <FileDown size={18} />
                {exporting ? 'Mengekspor…' : 'Export PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
