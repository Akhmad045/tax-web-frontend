import { formatThousands } from '../utils/format'

/**
 * Input angka dengan format ribuan (10.000.000).
 *
 * `value`  : STRING angka murni (hanya digit), mis. "10000000"
 * `onChange`: menerima STRING angka murni
 * `error`  : pesan error (string) -> border merah + teks peringatan
 *
 * Format ribuan hanya untuk tampilan; nilai asli tidak diubah.
 */
export default function CurrencyInput({
  label,
  value,
  onChange,
  name,
  hint,
  required = false,
  placeholder = '0',
  error = '',
}) {
  const handleChange = (e) => {
    // Buang semua karakter non-angka, simpan sebagai string murni.
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    // Batasi panjang agar tidak overflow (maks ~18 digit).
    onChange(rawValue.slice(0, 18))
  }

  const hasError = Boolean(error)

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-slate-400">
          Rp
        </span>
        <input
          id={name}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={formatThousands(value)}
          onChange={handleChange}
          placeholder={placeholder}
          aria-invalid={hasError}
          className={[
            'w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-right text-sm font-medium shadow-sm outline-none transition',
            hasError
              ? 'border-red-400 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
          ].join(' ')}
        />
      </div>
      {hasError ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  )
}