import { Check, Loader2, Save } from 'lucide-react'

/**
 * Tombol "Simpan Data" untuk menyimpan hasil perhitungan ke database
 * (tabel riwayat di backend). Gaya: btn-success template.
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
      className="btn btn-success d-inline-flex align-items-center gap-2"
    >
      {tersimpan ? (
        <Check size={16} />
      ) : loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Save size={16} />
      )}
      <span>{tersimpan ? 'Tersimpan' : loading ? 'Menyimpan…' : 'Simpan Data'}</span>
    </button>
  )
}
