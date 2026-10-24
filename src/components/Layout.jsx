/**
 * Layout utama aplikasi: header biru + area konten.
 *
 * Navigasi menyesuaikan status login:
 * - Belum login  : link Riwayat disembunyikan, tampil tombol "Masuk".
 * - Login admin  : link Riwayat tampil, tampil nama + tombol "Keluar".
 * - Login user   : link Riwayat tetap disembunyikan (hanya admin).
 */
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../AuthContext'

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
      ? 'bg-white text-blue-700 shadow'
      : 'text-blue-100 hover:bg-blue-600 hover:text-white',
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
      <header className="bg-blue-700 shadow-lg">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/mu-logo.png"
              alt="MU Logo"
              className="h-12 w-12 object-contain"
            />
            <span className="text-lg font-semibold text-white">
              Tim 3 Kalkulator Pajak
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
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

            {isLoggedIn ? (
              <div className="flex items-center gap-2 border-l border-blue-500 pl-3">
                <span className="hidden text-sm text-blue-100 sm:inline">
                  {username}
                  {isAdmin && (
                    <span className="ml-1.5 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
                      admin
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Keluar dari akun"
                  className="rounded-lg border border-red-300 bg-transparent px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-600 hover:text-white hover:border-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow transition hover:bg-blue-50"
              >
                Masuk
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 pt-4 text-center text-xs text-slate-400">
        Tax Web App · Frontend React + Vite + Tailwind · Backend FastAPI
      </footer>
    </div>
  )
}
