import { useId } from 'react'
import { Zap } from 'lucide-react'

/**
 * Logo aplikasi: ikon petir (Zap dari lucide-react) dengan gradien
 * ungu ke biru. Gradien SVG tidak bisa ditulis lewat class Tailwind
 * saja, jadi definisi <linearGradient> diletakkan di <defs> tersembunyi
 * dan dipakai sebagai fill ikon. useId dipakai agar tiap instance punya
 * id gradien unik (tidak ada id ganda bila logo muncul berkali-kali).
 */
export default function LogoZap({ size = 40, className = '' }) {
  const id = `taxease-zap-${useId().replace(/:/g, '')}`
  return (
    <span className="inline-flex items-center justify-center" aria-hidden="true">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <Zap size={size} fill={`url(#${id})`} stroke="none" className={className} />
    </span>
  )
}
