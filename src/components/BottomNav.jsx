/**
 * Bottom navigation khusus mobile (aplikasi Android / layar kecil).
 *
 * Hanya muncul di mobile (`md:hidden`); di desktop navigasi tetap lewat
 * header di Layout. Item Riwayat hanya tampil untuk admin, sama seperti
 * aturan di Layout — user non-admin mendapat 4 item, bukan link yang
 * berujung "Akses Ditolak".
 */
import { NavLink } from 'react-router-dom'
import { Building2, Calculator, FileText, Home, User } from 'lucide-react'
import { useAuth } from '../AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/pph21-bulanan', label: 'Bulanan', icon: Calculator },
  { to: '/pph21-tahunan', label: 'Tahunan', icon: FileText },
  { to: '/pph-badan', label: 'PPh Badan', icon: Building2 },
  { to: '/riwayat', label: 'Riwayat', icon: User, adminOnly: true },
]

export default function BottomNav() {
  const { isAdmin } = useAuth()
  const tampil = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <nav
      aria-label="Navigasi utama mobile"
      className="fixed bottom-0 z-50 flex w-full items-center justify-around border-t border-gray-200 bg-white py-3 pb-safe print:hidden md:hidden"
    >
      {tampil.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            [
              'flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-medium transition',
              isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600',
            ].join(' ')
          }
        >
          <Icon size={22} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
