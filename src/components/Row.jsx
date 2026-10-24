/**
 * Baris ringkasan kunci-nilai.
 */
export default function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className={strong ? 'text-sm font-semibold text-slate-700' : 'text-sm text-slate-500'}>
        {label}
      </span>
      <span className={strong ? 'text-sm font-bold text-slate-900' : 'text-sm font-medium text-slate-800'}>
        {value}
      </span>
    </div>
  )
}