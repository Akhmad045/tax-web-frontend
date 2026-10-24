import { Link } from 'react-router-dom'
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
  },
]

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-8 text-white shadow-lg">
        <h1 className="text-2xl font-bold md:text-3xl">Dashboard Kalkulator Pajak</h1>
        <p className="mt-2 max-w-2xl text-blue-100">
          Pilih modul perhitungan pajak di bawah ini. Semua perhitungan dikirim ke
          backend FastAPI dan hasilnya ditampilkan secara rinci.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((m) => (
          <Link key={m.to} to={m.to} className="group">
            <Card className="h-full transition group-hover:-translate-y-1 group-hover:border-blue-200 group-hover:shadow-md">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                {m.icon}
              </div>
              <h3 className="text-base font-semibold text-slate-800">{m.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{m.desc}</p>
              <span className="mt-4 inline-block text-sm font-medium text-blue-600 group-hover:underline">
                Buka modul →
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <Card title="Cara pakai" subtitle="Langkah singkat menggunakan aplikasi">
        <ol className="ml-4 list-decimal space-y-1.5 text-sm text-slate-600">
          <li>Pastikan backend FastAPI berjalan di <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">http://localhost:8000</code>.</li>
          <li>Pilih modul pajak yang ingin dihitung.</li>
          <li>Isi form, klik tombol hitung, lalu lihat detail hasilnya.</li>
          <li>Klik <strong>Simpan Data</strong> agar hasil tersimpan dan muncul di halaman <Link to="/riwayat" className="font-medium text-blue-600 hover:underline">Riwayat</Link>.</li>
        </ol>
      </Card>
    </div>
  )
}