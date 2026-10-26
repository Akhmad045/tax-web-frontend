import { Download, Loader2 } from 'lucide-react'

/**
 * Tombol "Export PDF" yang disembunyikan saat dicetak.
 * Menjalankan `onExport` (html2pdf.js: PDF langsung terunduh,
 * tanpa dialog print browser). Gaya: btn-outline-primary template.
 */
export default function PrintButton({
  onExport,
  disabled = false,
  loading = false,
  label = 'Export PDF',
}) {
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled || loading}
      className="print:hidden btn btn-outline-primary d-inline-flex align-items-center gap-2"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {loading ? 'Menyiapkan…' : label}
    </button>
  )
}
