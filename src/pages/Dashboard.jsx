import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Card from '../components/Card'

const modules = [
  {
    to: '/pph21-bulanan',
    title: 'PPh 21 Bulanan',
    desc: 'Hitung pemotongan PPh 21 pegawai tetap untuk satu bulan beserta Take Home Pay.',
    icon: '📅',
  },
  {
    to: '/pph21-tahunan',
    title: 'PPh 21 Tahunan',
    desc: 'Rekap 12 bulan, biaya jabatan, PTKP, dan status Kurang/Lebih bayar.',
    icon: '🗓️',
  },
  {
    to: '/pph-badan',
    title: 'PPh Badan',
    desc: 'Hitung PPh Badan (PPh 29) dengan fasilitas Pasal 31E.',
    icon: '🏢',
  },
  {
    to: '/riwayat',
    title: 'Riwayat Perhitungan',
    desc: 'Lihat, telusuri detail, dan kelola seluruh perhitungan yang sudah disimpan.',
    icon: '🗂️',
    // Hanya dirender untuk admin. Guest & role "user" tidak melihat card ini
    // sama sekali (bukan sekadar disabled).
    adminOnly: true,
  },
]

export default function Dashboard() {
  const { isAdmin } = useAuth()

  const tampil = modules.filter((m) => !m.adminOnly || isAdmin)

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-5 text-white shadow-lg md:p-8">
        <h1 className="text-xl font-bold md:text-3xl">Dashboard Kalkulator Pajak</h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100 md:text-base">
          Pilih modul perhitungan pajak di bawah ini. Semua perhitungan dikirim ke
          backend FastAPI dan hasilnya ditampilkan secara rinci.
        </p>
      </div>

      {/*
        Layout adaptif mengikuti jumlah card yang terlihat:
        - Mobile: selalu 2 kolom (gaya aplikasi fintech), font diperkecil.
        - Guest / user (3 card): 2 -> 2 -> 3, sehingga baris terakhir
          selalu terisi penuh dan tidak ada card menggantung.
        - Admin (4 card)       : 2 -> 2 -> 4, tampil memanjang ke kanan.
        Container dibatasi `max-w-5xl` + `mx-auto` agar grid tetap di tengah
        dan tidak melebar berlebihan di layar ultrawide.
      */}
      <div
        className={`mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-2 md:gap-5 ${
          isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        }`}
      >
        {tampil.map((m) => (
          <Link key={m.to} to={m.to} className="group h-full w-full">
            <Card className="flex h-full flex-col transition group-hover:-translate-y-1 group-hover:border-blue-200 group-hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl md:h-12 md:w-12 md:text-2xl">
                {m.icon}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 md:text-base">{m.title}</h3>
              <p className="mt-1 text-xs text-slate-500 md:text-sm">{m.desc}</p>
              {/* mt-auto mendorong link ke dasar card agar sejajar antar card. */}
              <span className="mt-auto inline-block pt-3 text-xs font-medium text-blue-600 group-hover:underline md:pt-4 md:text-sm">
                Buka modul →
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}