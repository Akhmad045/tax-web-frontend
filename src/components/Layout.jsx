/**
 * Layout utama aplikasi — struktur template NiceAdmin.
 *
 * Catatan: tidak ada file Header.jsx terpisah — header tinggal di file
 * ini (Layout.jsx) dan dipakai semua halaman.
 *
 * Cabang TAMU (belum login): header sederhana lama dipertahankan
 * (logo + tombol "Masuk" saja, tanpa sidebar/menu). Landing page,
 * login, register, dan alur OTP tetap memakai tampilan lamanya.
 *
 * Cabang LOGIN: chrome NiceAdmin penuh —
 * - Header atas (id="header", fixed-top): logo TaxEase + tombol
 *   hamburger (bi-list) + dropdown profil di kanan.
 * - Sidebar kiri (id="sidebar"): menu Dashboard, PPh 21 Bulanan,
 *   PPh 21 Tahunan, PPh Badan, Riwayat (admin-only, seperti dulu).
 * - Konten (id="main"): #main template sudah memberi margin kiri
 *   300px di desktop dan margin atas 60px; anaknya dibungkus
 *   max-w-6xl agar lebar baca halaman tetap seperti sebelumnya.
 * - Footer (id="footer"): hak cipta + kredit singkat.
 *
 * Toggle sidebar: NiceAdmin mengatur visibilitas lewat class
 * `toggle-sidebar` di <body> (desktop: sidebar menghilang; mobile
 * <1200px: sidebar muncul sebagai overlay). Di sini toggle itu
 * dipegang React (bukan main.js template, yang akan berebut DOM
 * dengan React) — klik hamburger, klik link di mobile, dan logout
 * semuanya membersihkan class tersebut.
 *
 * Navigasi menyesuaikan status login (AuthContext.isLoggedIn):
 * - Belum login  : hanya logo + "Masuk"; menu disembunyikan.
 * - Login admin  : menu tampil lengkap (termasuk Riwayat).
 * - Login user   : menu tampil tanpa Riwayat.
 * BottomNav mobile tetap ada untuk user login (navigasi jempol),
 * berdampingan dengan sidebar yang dibuka lewat hamburger.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../AuthContext'
import BottomNav from './BottomNav'
import LogoZap from './LogoZap'

const navItems = [
  { to: '/', label: 'Dashboard', bi: 'bi-grid' },
  { to: '/pph21-bulanan', label: 'PPh 21 Bulanan', bi: 'bi-calculator' },
  { to: '/pph21-tahunan', label: 'PPh 21 Tahunan', bi: 'bi-calendar3' },
  { to: '/pph-badan', label: 'PPh Badan', bi: 'bi-building' },
  // Riwayat ditandai adminOnly; difilter di bawah sesuai role.
  { to: '/riwayat', label: 'Riwayat', bi: 'bi-clock-history', adminOnly: true },
]

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
  const [sidebarToggled, setSidebarToggled] = useState(false)

  const tampilNav = navItems.filter((item) => !item.adminOnly || isAdmin)

  const toggleSidebar = () => {
    const berikutnya = !sidebarToggled
    setSidebarToggled(berikutnya)
    document.body.classList.toggle('toggle-sidebar', berikutnya)
  }

  // Di mobile, sidebar adalah overlay: menutupnya begitu link diklik.
  const tutupSidebarMobile = () => {
    if (window.innerWidth < 1200) {
      setSidebarToggled(false)
      document.body.classList.remove('toggle-sidebar')
    }
  }

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

    // 3) Kembalikan sidebar ke keadaan default (terbuka di desktop).
    document.body.classList.remove('toggle-sidebar')
    setSidebarToggled(false)

    // 4) Kembali ke halaman utama ('/') dengan navigasi SPA (replace).
    //    Urutan penting: logout() di atas SUDAH mengosongkan sesi di
    //    AuthContext, jadi isLoggedIn sudah false saat Beranda dirender —
    //    yang tampil adalah cabang tamu (Landing Page di desktop), bukan
    //    Dashboard user. `replace: true` menggantikan entri riwayat
    //    halaman terlindungi, sehingga tombol Back tidak membukanya lagi
    //    (lagipula ProtectedRoute akan menendang ke /login bila rute itu
    //    dibuka tanpa sesi). Navigasi penuh (window.location) tidak lagi
    //    dipakai: komponen halaman terlindungi ikut ter-unmount saat rute
    //    berganti, sehingga isinya tidak tersisa di layar.
    //    Catatan: di HP (APK), gate tamu di Beranda tetap berlaku —
    //    tamu mobile diarahkan ke /login sesuai keputusan sebelumnya.
    navigate('/', { replace: true })
  }

  // ---- Cabang TAMU: header sederhana lama, tanpa sidebar/menu. ----
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
          {/* Header khusus mobile: logo + Masuk. */}
          <div className="flex items-center justify-between px-4 py-3 md:hidden">
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
            <NavLink
              to="/login"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Masuk
            </NavLink>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 md:px-6 md:py-8 md:pb-8">
          {children}
        </main>

        <footer className="mx-auto max-w-6xl px-6 pb-24 pt-4 text-center text-xs text-slate-400 md:pb-10">
          Tax Web App · Frontend React + Vite + Tailwind · Backend FastAPI
        </footer>
      </div>
    )
  }

  // ---- Cabang LOGIN: chrome NiceAdmin (header + sidebar + main). ----
  return (
    <>
      <header id="header" className="header fixed-top d-flex align-items-center">
        <div className="d-flex align-items-center justify-content-between">
          <Link to="/" className="logo d-flex align-items-center">
            <LogoZap size={32} />
            <span className="d-none d-lg-block">TaxEase</span>
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Buka/tutup menu"
            aria-expanded={sidebarToggled}
            className="toggle-sidebar-btn bg-transparent border-0"
          >
            <i className="bi bi-list" />
          </button>
        </div>

        <nav className="header-nav ms-auto">
          <ul className="d-flex align-items-center m-0 p-0">
            <li className="nav-item dropdown pe-3">
              <UserDropdown username={username} role={role} onLogout={handleLogout} />
            </li>
          </ul>
        </nav>
      </header>

      <aside id="sidebar" className="sidebar">
        <ul className="sidebar-nav" id="sidebar-nav">
          <li className="nav-heading">Menu Utama</li>
          {tampilNav.map((item) => (
            <li className="nav-item" key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={tutupSidebarMobile}
                className={({ isActive }) =>
                  `nav-link${isActive ? '' : ' collapsed'}`
                }
              >
                <i className={`bi ${item.bi}`} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>

      <main id="main" className="main">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <footer id="footer" className="footer pb-24 md:pb-5">
        <div className="copyright">
          © {new Date().getFullYear()}{' '}
          <strong>
            <span>TaxEase</span>
          </strong>{' '}
          — Kalkulator Pajak Terpadu
        </div>
        <div className="credits">Frontend React + Vite · Backend FastAPI</div>
      </footer>

      {/* Bottom navigation mobile, hanya untuk user yang sudah login. */}
      <BottomNav />
    </>
  )
}
