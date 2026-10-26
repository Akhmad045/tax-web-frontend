/**
 * Kartu serbaguna dengan judul opsional — gaya template NiceAdmin.
 *
 * Memakai class template `.card` + `.card-body` (+ `.card-title` untuk
 * judul) sehingga seluruh halaman mendapat bayangan dan radius khas
 * template. className tambahan dari pemanggil tetap diteruskan (utility
 * Tailwind menang atas layer vendor bila berbenturan).
 *
 * Catatan: .card-body template tidak punya padding atas (0 20px 20px),
 * karena padding atas disumbang .card-title. Bila kartu tanpa judul,
 * ditambahkan pt-4 agar isi tidak menempel ke tepi atas kartu.
 */
export default function Card({ title, subtitle, children, className = '' }) {
  // mb-0: .card template punya margin-bottom 30px; layout aplikasi sudah
  // mengatur jarak lewat space-y/grid-gap, jadi margin template dimatikan
  // agar jarak antar kartu tidak berlipat.
  return (
    <section className={['card mb-0 print-avoid-break', className].join(' ')}>
      <div className={['card-body', title ? '' : 'pt-4'].join(' ')}>
        {title && (
          <>
            <h5 className="card-title">{title}</h5>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </>
        )}
        {children}
      </div>
    </section>
  )
}
