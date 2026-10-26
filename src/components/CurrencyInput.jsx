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
      <label htmlFor={name} className="form-label mb-1.5 text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-sm font-medium text-slate-400">
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
          // form-control template (padding/border/radius/fokus khas
          // Bootstrap); pl-10 memberi ruang awalan "Rp", text-right
          // menjaga angka rata kanan seperti sebelumnya.
          className={[
            'form-control pl-10 pr-3 text-right text-sm font-medium',
            hasError ? 'is-invalid' : '',
          ].join(' ')}
        />
      </div>
      {hasError ? (
        <div className="invalid-feedback d-block text-xs font-medium">{error}</div>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  )
}