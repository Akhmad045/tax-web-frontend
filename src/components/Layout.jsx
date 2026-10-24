/**
 * Layout utama aplikasi: header biru + area konten.
 */
import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/pph21-bulanan', label: 'PPh 21 Bulanan' },
  { to: '/pph21-tahunan', label: 'PPh 21 Tahunan' },
  { to: '/pph-badan', label: 'PPh Badan' },
  { to: '/riwayat', label: 'Riwayat' },
]

export default function Layout({ children }) {
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

          <nav className="flex flex-wrap gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-white text-blue-700 shadow'
                      : 'text-blue-100 hover:bg-blue-600 hover:text-white',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 pt-4 text-center text-xs text-slate-400">
        Tax Web App · Frontend React + Vite + Tailwind · Backend FastAPI
      </footer>
    </div>
  )
}