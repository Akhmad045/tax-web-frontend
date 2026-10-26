import { useEffect } from 'react'
import { FileDown, X } from 'lucide-react'
import { LABEL_MODUL } from '../utils/riwayat'
import { formatRupiah } from '../utils/format'

/**
 * DetailRiwayatModal — desain Fintech (gradien indigo, hierarki jelas).
 *
 * Struktur: backdrop blur -> card flex-col (header gradien fixed,
 * body scrollable, footer fixed) sehingga tombol footer selalu terlihat
 * tanpa scroll — ini memperbaiki keluhan tombol terpotong di bawah.
 *
 * Data berasal dari baris riwayat yang dipilih: kolom baris untuk
 * identitas, dan objek `detail` tersimpan (form + hasil API) untuk
 * rincian input & hasil. Tidak ada JSON.parse() di sini karena `detail`
 * sudah berupa objek (backend + axios mem-parse JSON).
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

const rp = (nilai) => formatRupiah(nilai ?? 0)

function JudulSeksi({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </h3>
  )
}

function Baris({ label, nilai }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-800">
        {nilai}
      </span>
    </div>
  )
}

/** Baris hero: angka utama di bawah hasil — gradien penuh, teks putih. */
function BarisHero({ label, nilai }) {
  return (
    <div className="mt-3 flex items-baseline justify-between gap-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-3.5">
      <span className="text-sm font-medium text-indigo-100">{label}</span>
      <span className="text-right text-lg font-bold text-white">{nilai}</span>
    </div>
  )
}

function ItemIdentitas({ label, nilai }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 break-words">
        {nilai || '-'}
      </p>
    </div>
  )
}

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
  // Baris hero (gradien) selalu paling bawah: THP untuk Bulanan,
  // PPh Terutang untuk Tahunan & Badan — angka utama tiap modul.
  let input = null
  let hasilBiasa = null
  let hero = null
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
    hasilBiasa = (
      <>
        <Baris label="Bruto" nilai={rp(pb.bruto)} />
        <Baris label="Neto" nilai={rp(pb.neto)} />
        <Baris label="PKP" nilai={rp(ps.pkp)} />
        <Baris label="PPh 21 per Bulan" nilai={rp(hs.pph21_per_bulan)} />
      </>
    )
    hero = <BarisHero label="Take Home Pay (THP)" nilai={rp(hs.take_home_pay)} />
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
    hasilBiasa = (
      <>
        <Baris label="Bruto Setahun" nilai={rp(ps.bruto_setahun)} />
        <Baris label="Neto Setahun" nilai={rp(ps.neto_setahun)} />
        <Baris label="PTKP" nilai={rp(ps.ptkp)} />
        <Baris label="PKP" nilai={rp(ps.pkp)} />
        <Baris label="Total PPh Dipotong" nilai={rp(hs.total_pph_dipotong)} />
        <Baris
          label={`Selisih (${statusSelisih})`}
          nilai={rp(Math.abs(hs.selisih ?? 0))}
        />
      </>
    )
    hero = (
      <BarisHero
        label="PPh 21 Terutang Setahun"
        nilai={rp(hs.pph21_terutang_setahun)}
      />
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
    hasilBiasa = (
      <>
        <Baris label="Laba Bersih Sebelum Pajak" nilai={rp(pl.laba_bersih)} />
        <Baris label="PKP" nilai={rp(pl.pkp)} />
        <Baris label="Total Kredit Pajak" nilai={rp(hs.total_kredit_pajak)} />
        <Baris
          label={`PPh Pasal 29 (${status29})`}
          nilai={rp(Math.abs(hs.pph_29_kurang_bayar ?? 0))}
        />
      </>
    )
    hero = (
      <BarisHero
        label="PPh Terutang Setahun"
        nilai={rp(hs.pph_terutang_setahun)}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detail riwayat"
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeInUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER (fixed) */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-5 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">
              {row ? `Detail Riwayat #${row.id}` : 'Memuat detail…'}
            </h2>
            {row && (
              <p className="mt-1 text-sm text-indigo-100">
                {formatWaktu(row.dibuat_pada)}
              </p>
            )}
            {row?.ringkasan && (
              <p className="mt-1 text-sm text-indigo-100">{row.ringkasan}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {row && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                {LABEL_MODUL[row.modul] || row.modul}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Tutup"
              aria-label="Tutup"
              className="p-2 rounded-lg transition-all text-white/80 hover:bg-white/20 hover:text-white hover:rotate-90"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BODY (scrollable) */}
        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          {loading || !row ? (
            <p className="py-8 text-center text-sm text-slate-500">Memuat…</p>
          ) : (
            <>
              {/* Identitas */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <JudulSeksi>Identitas</JudulSeksi>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <ItemIdentitas label="Nama" nilai={row.nama_wajib || row.judul} />
                  <ItemIdentitas label="NIK" nilai={row.identitas} />
                  <ItemIdentitas label="PTKP" nilai={row.status_ptkp} />
                  <ItemIdentitas label="Tahun" nilai={row.tahun_pajak} />
                </div>
              </div>

              {lengkap ? (
                <>
                  {/* Rincian Input */}
                  <div>
                    <JudulSeksi>Rincian Input</JudulSeksi>
                    <div className="mt-1 divide-y divide-slate-100">{input}</div>
                  </div>

                  {/* Hasil Perhitungan */}
                  <div>
                    <JudulSeksi>Hasil Perhitungan</JudulSeksi>
                    <div className="mt-1 divide-y divide-slate-100">
                      {hasilBiasa}
                    </div>
                    {hero}
                  </div>
                </>
              ) : (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Detail lengkap tidak tersedia untuk baris ini (disimpan tanpa
                  detail perhitungan).
                </p>
              )}
            </>
          )}
        </div>

        {/* FOOTER (fixed) */}
        <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => row && onExport(row, row.detail)}
            disabled={!lengkap || exporting}
            title={lengkap ? 'Export PDF' : 'Detail tidak lengkap'}
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <FileDown size={18} />
            {exporting ? 'Mengekspor…' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
