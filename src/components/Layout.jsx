/**
 * Layout utama aplikasi: header fintech + area konten.
 *
 * Catatan: tidak ada file Header.jsx terpisah — header tinggal di file
 * ini (Layout.jsx) dan dipakai semua halaman.
 *
 * Navigasi menyesuaikan status login (conditional rendering dari
 * AuthContext.isLoggedIn, yang membaca token di localStorage):
 * - Belum login  : HANYA logo petir + tombol "Masuk" di kanan. Teks
 *   "TaxEase" dan seluruh menu (Dashboard, PPh 21
 *   Bulanan, PPh 21 Tahunan, PPh Badan) disembunyikan.
 * - Login admin  : teks + menu tampil (termasuk Riwayat), tampil nama
 *   + tombol "Logout".
 * - Login user   : teks + menu tampil (tanpa Riwayat), tampil nama
 *   + tombol "Logout".
 */
import { Link, NavLink } from 'react-router-dom'
import { Bell, User } from 'lucide-react'
import { useAuth } from '../AuthContext'
import BottomNav from './BottomNav'
import LogoZap from './LogoZap'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/pph21-bulanan', label: 'PPh 21 Bulanan' },
  { to: '/pph21-tahunan', label: 'PPh 21 Tahunan' },
  { to: '/pph-badan', label: 'PPh Badan' },
  // Riwayat ditandai adminOnly; difilter di bawah sesuai role.
  { to: '/riwayat', label: 'Riwayat', adminOnly: true },
]

const kelasNav = ({ isActive }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')

export default function Layout({ children }) {
  const { isLoggedIn, isAdmin, username, logout } = useAuth()

  const tampilNav = navItems.filter((item) => !item.adminOnly || isAdmin)

  const handleLogout = () => {
    // 1) Hapus sesi lewat AuthContext (token, role, username).
    logout()

    // 2) Hapus langsung dari localStorage sebagai jaring pengaman, bila
    //    storage sempat diblokir atau context belum ter-sync.
    try {
      localStorage.removeItem('access_token')
      localStorage.removeItem('role')
      localStorage.removeItem('username')
    } catch {
      // abaikan
    }

    // 3) Redirect penuh ke /login. Navigasi penuh (bukan SPA) memastikan
    //    semua state React dibuang sehingga isi halaman terlindungi tidak
    //    tersisa di memori/layar dan tombol Back tidak membuka halaman itu.
    if (typeof window !== 'undefined') window.location.assign('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-md">
        {/* Header khusus mobile: sapaan + profil/lonceng, bersih tanpa
            menu desktop yang berantakan. Tamu: hanya logo petir + Masuk. */}
        <div className="flex items-center justify-between px-4 py-3 md:hidden">
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Halo, {username || 'Admin'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isAdmin ? 'Admin · ' : ''}TaxEase
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Notifikasi"
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              >
                <Bell size={20} />
              </button>
            </>
          ) : (
            <>
              <LogoZap size={40} />
              <NavLink
                to="/login"
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Masuk
              </NavLink>
            </>
          )}
        </div>

        {/* Header desktop: disembunyikan total di mobile. */}
        <div className="mx-auto hidden max-w-6xl px-6 py-4 md:flex md:flex-row md:items-center md:justify-between">
          <Link to="/" className="flex items-center gap-2">
            <LogoZap size={40} />
            {isLoggedIn && (
              <span className="text-lg font-semibold text-slate-800">
                TaxEase
              </span>
            )}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {isLoggedIn && (
              <nav className="flex flex-wrap gap-1">
                {tampilNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={kelasNav}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            )}

            {isLoggedIn ? (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="hidden text-sm text-slate-600 sm:inline">
                  {username}
                  {isAdmin && (
                    <span className="ml-1.5 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                      admin
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Keluar dari akun"
                  className="rounded-lg border border-red-200 bg-transparent px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 hover:border-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Masuk
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 md:px-6 md:py-8 md:pb-8">
        {children}
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-24 pt-4 text-center text-xs text-slate-400 md:pb-10">
        Tax Web App · Frontend React + Vite + Tailwind · Backend FastAPI
      </footer>

      {/* Bottom navigation mobile, hanya untuk user yang sudah login. */}
      {isLoggedIn && <BottomNav />}
    </div>
  )
}
