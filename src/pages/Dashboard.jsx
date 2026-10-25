import { Link } from 'react-router-dom'
import { Calculator, FileDown, History } from 'lucide-react'
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

// Gaya desain landing ala template premium (Zorven): gradien indigo,
// tipografi besar dengan banyak whitespace, dan animasi halus.
// Tombol CTA: transition-all duration-300, hover naik + bayangan,
// klik mengecil (active:scale-95). Card fitur: hover naik + bayangan besar.
const kelasCtaPutih =
  'inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg active:scale-95'

const fiturLanding = [
  {
    icon: Calculator,
    title: 'Perhitungan Akurat',
    desc: 'Tarif progresif, PTKP, dan fasilitas Pasal 31E dihitung otomatis sesuai regulasi terbaru UU HPP.',
  },
  {
    icon: FileDown,
    title: 'Export PDF Resmi',
    desc: 'Hasil perhitungan dapat diunduh sebagai dokumen PDF yang rapi dan siap dilampirkan.',
  },
  {
    icon: History,
    title: 'Riwayat Tersimpan',
    desc: 'Setiap perhitungan tersimpan per akun, mudah ditelusuri ulang dan diekspor kapan saja.',
  },
]

const langkahKerja = [
  {
    nomor: '1',
    title: 'Daftar Akun',
    desc: 'Buat akun gratis dan verifikasi email Anda.',
  },
  {
    nomor: '2',
    title: 'Pilih Modul',
    desc: 'Pilih PPh 21 Bulanan, Tahunan, atau PPh Badan.',
  },
  {
    nomor: '3',
    title: 'Input Data',
    desc: 'Masukkan gaji, tunjangan, dan pengurang sesuai data Anda.',
  },
  {
    nomor: '4',
    title: 'Simpan & Export',
    desc: 'Lihat hasilnya, simpan ke riwayat, dan export ke PDF.',
  },
]

// Testimoni placeholder/fiktif sesuai permintaan desain — ganti dengan
// testimoni asli sebelum dipakai untuk publikasi luas.
const testimoni = [
  {
    kutipan:
      'Perhitungan PPh 21 bulanan yang dulu memakan waktu berjam-jam kini selesai dalam hitungan menit, dan angkanya selalu cocok dengan rekonsiliasi kami.',
    peran: 'Praktisi Pajak',
  },
  {
    kutipan:
      'Export PDF-nya rapi dan riwayatnya mudah ditelusuri. Tim keuangan kami tidak lagi mengulang hitung yang sama setiap bulan.',
    peran: 'Tim Keuangan',
  },
]

export default function Dashboard() {
  const { isAdmin, isLoggedIn } = useAuth()

  const tampil = modules.filter((m) => !m.adminOnly || isAdmin)

  // LANDING PAGE GUEST (gaya premium Zorven): tamu yang belum login
  // tidak melihat card kalkulator sama sekali.
  // Catatan: di aplikasi mobile (APK), tamu tetap diarahkan ke /login
  // oleh gerbang Beranda di App.jsx sesuai permintaan sebelumnya, jadi
  // landing ini tampil untuk tamu web/desktop. isLoggedIn di sini
  // berasal dari AuthContext (token di localStorage).
  if (!isLoggedIn) {
    return (
      <div className="space-y-10">
        {/* HERO */}
        <section className="animate-fadeInUp rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-20 text-white shadow-lg md:px-12 md:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-100">
            Dipercaya oleh berbagai tim keuangan &amp; praktisi pajak
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            Kalkulator Pajak Terpadu untuk Profesional Modern.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-indigo-100 md:text-lg">
            Hitung PPh 21 &amp; PPh Badan secara akurat, otomatis, dan sesuai
            regulasi terbaru UU HPP.
          </p>
          <div className="mt-10">
            <Link to="/register" className={kelasCtaPutih}>
              Mulai Sekarang
            </Link>
          </div>
        </section>

        {/* FITUR */}
        <section className="animate-fadeInUp rounded-2xl bg-white px-6 py-20 md:px-10 md:py-32" style={{ animationDelay: '100ms' }}>
          <h2 className="text-center text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Kenapa Memilih Kami?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-slate-500 md:text-base">
            Semua yang dibutuhkan untuk menghitung pajak dengan percaya diri,
            dalam satu tempat.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {fiturLanding.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon size={20} />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 md:text-base">{title}</h3>
                <p className="mt-1 text-xs text-slate-500 md:text-sm">{desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* CARA KERJA */}
        <section className="animate-fadeInUp rounded-2xl bg-white px-6 py-20 md:px-10 md:py-32" style={{ animationDelay: '200ms' }}>
          <h2 className="text-center text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Cara Kerja
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-slate-500 md:text-base">
            Empat langkah sederhana dari akun baru sampai hasil siap pakai.
          </p>
          <div className="relative mt-12">
            <div className="absolute left-0 right-0 top-5 hidden h-px bg-slate-200 md:block" aria-hidden="true" />
            <div className="relative grid gap-8 md:grid-cols-4 md:gap-4">
              {langkahKerja.map(({ nomor, title, desc }) => (
                <div key={nomor} className="text-center">
                  <div className="relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow">
                    {nomor}
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-800 md:text-base">{title}</h3>
                  <p className="mx-auto mt-1 max-w-[220px] text-xs text-slate-500 md:text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONI */}
        <section className="animate-fadeInUp rounded-2xl bg-slate-100 px-6 py-20 md:px-10 md:py-32" style={{ animationDelay: '300ms' }}>
          <h2 className="text-center text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Dipercaya Para Profesional
          </h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
            {testimoni.map(({ kutipan, peran }) => (
              <Card key={peran} className="transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                <p className="text-sm leading-relaxed text-slate-700 md:text-base">
                  &ldquo;{kutipan}&rdquo;
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  — {peran}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="animate-fadeInUp rounded-2xl bg-indigo-600 px-6 py-20 text-center text-white shadow-lg md:py-32" style={{ animationDelay: '400ms' }}>
          <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight md:text-6xl">
            Siap Menghitung Pajak Lebih Cepat?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-indigo-100 md:text-base">
            Daftar sekarang dan hitung PPh 21 serta PPh Badan pertama Anda
            dalam hitungan menit.
          </p>
          <div className="mt-10">
            <Link to="/register" className={kelasCtaPutih}>
              Mulai Sekarang
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-700 to-indigo-500 p-5 text-white shadow-lg md:p-8">
        <h1 className="text-xl font-bold md:text-3xl">Dashboard Kalkulator Pajak</h1>
        <p className="mt-2 max-w-2xl text-sm text-indigo-100 md:text-base">
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
            <Card className="flex h-full flex-col transition group-hover:-translate-y-1 group-hover:border-indigo-200 group-hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl md:h-12 md:w-12 md:text-2xl">
                {m.icon}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 md:text-base">{m.title}</h3>
              <p className="mt-1 text-xs text-slate-500 md:text-sm">{m.desc}</p>
              {/* mt-auto mendorong link ke dasar card agar sejajar antar card. */}
              <span className="mt-auto inline-block pt-3 text-xs font-medium text-indigo-600 group-hover:underline md:pt-4 md:text-sm">
                Buka modul →
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
