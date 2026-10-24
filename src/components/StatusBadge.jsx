/**
 * Badge status pembayaran pajak: KURANG_BAYAR / LEBIH_BAYAR / NIHIL.
 */
export default function StatusBadge({ status }) {
  const map = {
    KURANG_BAYAR: 'bg-red-50 text-red-700 border-red-200',
    LEBIH_BAYAR: 'bg-green-50 text-green-700 border-green-200',
    NIHIL: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        map[status] || map.NIHIL,
      ].join(' ')}
    >
      {status?.replaceAll('_', ' ') || '-'}
    </span>
  )
}