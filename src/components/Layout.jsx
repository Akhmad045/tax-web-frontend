/**
 * Layout utama aplikasi: header fintech + area konten.
 *
 * Catatan: tidak ada file Header.jsx terpisah — header tinggal di file
 * ini (Layout.jsx) dan dipakai semua halaman.
 *
 * Navigasi menyesuaikan status login (conditional rendering dari
 * AuthContext.isLoggedIn, yang membaca token di localStorage):
 * - Belum login  : logo petir + teks "TaxEase" selalu tampil, dan
 *   HANYA tombol "Masuk" di kanan. Seluruh menu (Dashboard, PPh 21
 *   Bulanan, PPh 21 Tahunan, PPh Badan) disembunyikan.
 * - Login admin  : teks + menu tampil (termasuk Riwayat), profil lewat
 *   dropdown (nama + role + Logout).
 * - Login user   : teks + menu tampil (tanpa Riwayat), profil lewat
 *   dropdown yang sama.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  Calculator,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import BottomNav from './BottomNav'
import LogoZap from './LogoZap'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pph21-bulanan', label: 'PPh 21 Bulanan', icon: Calculator },
  { to: '/pph21-tahunan', label: 'PPh 21 Tahunan', icon: CalendarDays },
  { to: '/pph-badan', label: 'PPh Badan', icon: Building2 },
  // Riwayat ditandai adminOnly; difilter di bawah sesuai role.
  { to: '/riwayat', label: 'Riwayat', icon: History, adminOnly: true },
]

const kelasNav = ({ isActive }) =>
  [
    'relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-300',
    'after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-indigo-600 after:transition-transform after:duration-300 after:origin-left',
    isActive
      ? 'text-indigo-600 after:scale-x-100'
      : 'text-slate-600 hover:text-indigo-600 after:scale-x-0 hover:after:scale-x-100',
  ].join(' ')

// Link panel hamburger mobile: blok penuh dengan ikon + teks, warna
// aktif senada menu desktop (tanpa underline animasi).
const kelasNavMobile = ({ isActive }) =>
  [
    'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
    isActive
      ? 'bg-indigo-50 text-indigo-600'
      : 'text-slate-700 hover:bg-slate-50 hover:text-indigo-600',
  ].join(' ')


/**
 * Dropdown profil navbar: satu tombol bulat berisi inisial huruf depan
 * nama user (bukan lagi teks username + badge role + tombol Logout yang
 * terpisah di kanan navbar). Klik di luar area atau tombol Escape menutup
 * dropdown (useRef + listener mousedown/keydown).
 */
function UserDropdown({ username, role, onLogout }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!isDropdownOpen) return
    const tutup = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsDropdownOpen(false)
      }
    }
    const tombolEsc = (e) => {
      if (e.key === 'Escape') setIsDropdownOpen(false)
    }
    document.addEventListener('mousedown', tutup)
    document.addEventListener('keydown', tombolEsc)
    return () => {
      document.removeEventListener('mousedown', tutup)
      document.removeEventListener('keydown', tombolEsc)
    }
  }, [isDropdownOpen])

  const inisial = (username || 'Pengguna').trim().charAt(0).toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen((buka) => !buka)}
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
        aria-label="Menu profil"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 p-2 font-bold text-indigo-600 transition-all duration-300 hover:bg-indigo-100 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer"
      >
        {inisial}
      </button>
      <div
          role="menu"
          aria-hidden={!isDropdownOpen}
          className={`absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 ${
            isDropdownOpen
              ? 'origin-top-right transform scale-100 opacity-100 transition-all duration-200 ease-out'
              : 'origin-top-right transform scale-95 opacity-0 pointer-events-none transition-all duration-200 ease-in'
          }`}
        >
          <div className="px-2 py-1.5">
            <p className="truncate font-bold text-slate-800">
              {username || 'Pengguna'}
            </p>
            <p className="text-xs text-indigo-600 capitalize">
              {role || 'user'}
            </p>
          </div>
          <div className="border-t border-slate-100 my-2" />
          <button
            type="button"
            tabIndex={isDropdownOpen ? 0 : -1}
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
    </div>
  )
}

export default function Layout({ children }) {
  const { isLoggedIn, isAdmin, username, role, logout } = useAuth()
  const navigate = useNavigate()
  // Panel hamburger mobile: dibuka/tutup lewat tombol Menu di header
  // mobile, dan otomatis tertutup saat salah satu link diklik.
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

    // 3) Kembali ke halaman utama ('/') dengan navigasi SPA (replace).
    //    Urutan penting: logout() di atas SUDAH mengosongkan sesi di
    //    AuthContext, jadi isLoggedIn sudah false saat Beranda dirender —
    //    yang tampil adalah cabang tamu (Landing Page di desktop), bukan
    //    Dashboard user. `replace: true` menggantikan entri riwayat
    //    halaman terlindungi, sehingga tombol Back tidak membukanya lagi
    //    (lagipula ProtectedRoute akan menendang ke /login bila rute itu
    //    dibuka tanpa sesi). Navigasi penuh (window.location) tidak lagi
    //    dipakai: komponen halaman terlindungi ikut ter-unmount saat rute
    //    berganti, jadi isinya tidak tersisa di layar.
    //    Catatan: di HP (APK), gate tamu di Beranda tetap berlaku —
    //    tamu mobile diarahkan ke /login sesuai keputusan sebelumnya.
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
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
                    Halo, {username || 'Pengguna'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isAdmin ? 'Admin · ' : ''}TaxEase
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((buka) => !buka)}
                  aria-label="Menu navigasi"
                  aria-expanded={isMobileMenuOpen}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 active:scale-95 md:hidden"
                >
                  <Menu size={22} />
                </button>
                <UserDropdown username={username} role={role} onLogout={handleLogout} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-block transition-transform duration-500 hover:rotate-12 hover:scale-110">
                  <LogoZap size={40} />
                </span>
                <span className="text-lg font-semibold text-slate-800">
                  TaxEase
                </span>
              </div>
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
            <span className="inline-block transition-transform duration-500 hover:rotate-12 hover:scale-110">
              <LogoZap size={40} />
            </span>
            <span className="text-lg font-semibold text-slate-800">
              TaxEase
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {isLoggedIn && (
              <nav className="flex flex-wrap gap-1">
                {tampilNav.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={kelasNav}
                    >
                      <Icon size={16} />
                      {item.label}
                    </NavLink>
                  )
                })}
              </nav>
            )}

            {isLoggedIn ? (
              <div className="border-l border-slate-200 pl-3">
                <UserDropdown username={username} role={role} onLogout={handleLogout} />
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

        {/* Panel hamburger mobile: daftar link yang sama dengan ikon,
            hanya untuk user login (menu memang login-only). Header itu
            sticky sehingga panel absolute top-full menempel tepat di
            bawah navbar. Panel selalu ter-mount saat login agar
            transition-all benar-benar berjalan (bukan sekadar muncul);
            saat tertutup ia tak terlihat dan tak bisa diklik. */}
        {isLoggedIn && (
          <nav
            aria-hidden={!isMobileMenuOpen}
            className={`md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg z-40 transition-all duration-300 ${
              isMobileMenuOpen
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none -translate-y-2 opacity-0'
            }`}
          >
            {tampilNav.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={kelasNavMobile}
                  tabIndex={isMobileMenuOpen ? 0 : -1}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        )}
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
