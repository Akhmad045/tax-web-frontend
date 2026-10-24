/**
 * Tombol "Export PDF" yang disembunyikan saat dicetak.
 * Menjalankan `onExport` (html2pdf.js: PDF langsung terunduh,
 * tanpa dialog print browser).
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
      className="print:hidden rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="mr-1.5">{loading ? '⏳' : '⬇'}</span>
      {loading ? 'Menyiapkan…' : label}
    </button>
  )
}