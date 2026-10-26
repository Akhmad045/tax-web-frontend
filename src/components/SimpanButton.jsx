/**
 * SimpanButton
 * ------------
 * Tombol "Simpan Data" untuk menyimpan hasil perhitungan ke database
 * (tabel riwayat di backend).
 *
 * Props:
 *   onSimpan  : async () => void  — dipanggil saat diklik
 *   loading   : bool              — true saat penyimpanan berjalan
 *   tersimpan : bool              — true bila hasil ini sudah tersimpan
 *   disabled  : bool              — true bila belum ada hasil perhitungan
 */
export default function SimpanButton({
  onSimpan,
  loading = false,
  tersimpan = false,
  disabled = false,
}) {
  const tidakAktif = disabled || loading || tersimpan

  return (
    <button
      type="button"
      onClick={onSimpan}
      disabled={tidakAktif}
      className={[
        'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition',
        tersimpan
          ? 'bg-green-600 text-white'
          : tidakAktif
            ? 'cursor-not-allowed bg-slate-300 text-slate-500'
            : 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]',
      ].join(' ')}
    >
      <span aria-hidden="true">{tersimpan ? '✓' : loading ? '⏳' : '💾'}</span>
      <span>{tersimpan ? 'Tersimpan' : loading ? 'Menyimpan…' : 'Simpan Data'}</span>
    </button>
  )
}
