/**
 * Kartu serbaguna dengan judul opsional.
 */
export default function Card({ title, subtitle, children, className = '' }) {
  return (
    <section
      className={[
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md print-avoid-break md:p-6',
        className,
      ].join(' ')}
    >
      {title && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}