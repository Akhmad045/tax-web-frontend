/**
 * Ekspor elemen DOM menjadi PDF lalu LANGSUNG mengunduhnya lewat
 * html2pdf.js (tanpa dialog print browser).
 *
 * ---------------------------------------------------------------------------
 * Kenapa ada "hardening" warna?
 * ---------------------------------------------------------------------------
 * html2pdf.js memakai html2canvas di dalamnya, dan html2canvas hanya
 * mengenal warna rgb/rgba/hsl/hsla. Tailwind CSS v4 menyimpan seluruh
 * warnanya sebagai `oklch()` di dalam custom property, sehingga muncul:
 *
 *   "Attempting to parse an unsupported color function 'oklch'"
 *
 * Solusi: sebelum render, semua properti warna pada elemen target dan
 * seluruh turunannya dipaksa memakai nilai HEX eksplisit (inline style
 * `!important`), lalu dikembalikan persis seperti semula setelah selesai.
 * Class CSS `.pdf-print-safe` di index.css menjadi lapis kedua.
 */

/** Properti warna yang dibaca html2canvas. */
const PROPERTI_WARNA = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'column-rule-color',
]

/**
 * Paksa seluruh warna di dalam `root` menjadi HEX (aman untuk html2canvas).
 * Mengembalikan fungsi untuk memulihkan style semula.
 *
 * @param {HTMLElement} root
 * @returns {() => void} fungsi restore
 */
function paksaWarnaHex(root) {
  const elemen = [root, ...root.querySelectorAll('*')].filter(
    (el) => el instanceof HTMLElement || el instanceof SVGElement,
  )

  // Simpan style inline asli agar bisa dikembalikan apa adanya.
  const styleAwal = elemen.map((el) => el.getAttribute('style'))

  for (const el of elemen) {
    const s = el.style

    // Teks & garis -> hitam; latar -> putih.
    s.setProperty('color', '#000000', 'important')
    s.setProperty('background-color', '#ffffff', 'important')
    s.setProperty('border-top-color', '#cccccc', 'important')
    s.setProperty('border-right-color', '#cccccc', 'important')
    s.setProperty('border-bottom-color', '#cccccc', 'important')
    s.setProperty('border-left-color', '#cccccc', 'important')
    s.setProperty('outline-color', '#000000', 'important')
    s.setProperty('text-decoration-color', '#000000', 'important')
    s.setProperty('caret-color', '#000000', 'important')
    s.setProperty('column-rule-color', '#000000', 'important')

    // Efek yang tidak perlu & berpotensi memicu parsing warna tambahan.
    s.setProperty('box-shadow', 'none', 'important')
    s.setProperty('text-shadow', 'none', 'important')

    // Reset custom property warna Tailwind agar var() tidak mewarisi oklch().
    for (const nama of Array.from(s)) {
      if (nama.startsWith('--color-')) s.removeProperty(nama)
    }
  }

  // Kembalikan warna yang memang dibutuhkan dokumen formal.
  root.style.setProperty('background-color', '#ffffff', 'important')
  for (const el of root.querySelectorAll('.bupot-table, .bupot-td, .bupot-ident td')) {
    el.style.setProperty('background-color', '#ffffff', 'important')
  }
  for (const el of root.querySelectorAll('.bupot-td, .bupot-th, .bupot-ident td, .bupot-header-meta td')) {
    el.style.setProperty('border-top-color', '#000000', 'important')
    el.style.setProperty('border-right-color', '#000000', 'important')
    el.style.setProperty('border-bottom-color', '#000000', 'important')
    el.style.setProperty('border-left-color', '#000000', 'important')
  }
  for (const el of root.querySelectorAll('.bupot-th')) {
    el.style.setProperty('background-color', '#e8e8e8', 'important')
  }
  for (const el of root.querySelectorAll('.bupot-highlight')) {
    el.style.setProperty('background-color', '#dcdcdc', 'important')
  }
  for (const el of root.querySelectorAll('.bupot-meterai')) {
    el.style.setProperty('border-top-color', '#666666', 'important')
    el.style.setProperty('border-right-color', '#666666', 'important')
    el.style.setProperty('border-bottom-color', '#666666', 'important')
    el.style.setProperty('border-left-color', '#666666', 'important')
  }

  return () => {
    elemen.forEach((el, i) => {
      if (styleAwal[i] === null) el.removeAttribute('style')
      else el.setAttribute('style', styleAwal[i])
    })
  }
}

/**
 * Ekspor elemen menjadi PDF dan langsung mengunduhnya.
 *
 * @param {HTMLElement} element  - elemen yang akan diekspor
 * @param {string}      filename - nama file tanpa ekstensi
 */
export async function exportElementToPdf(element, filename = 'laporan-pajak') {
  if (!element) throw new Error('Area yang akan diekspor tidak ditemukan.')

  // html2pdf.js berbentuk UMD/CommonJS -> ambil default export-nya.
  const modul = await import('html2pdf.js')
  const html2pdf = modul.default || modul

  // Pastikan elemen benar-benar punya ukuran. Elemen dengan tinggi/lebar 0
  // (mis. pembungkus yang seluruh isinya position:absolute) menghasilkan
  // kanvas kosong -> PDF blank tanpa pesan error apa pun.
  const ukuran = element.getBoundingClientRect()
  if (ukuran.width < 1 || ukuran.height < 1) {
    throw new Error(
      `Area export tidak memiliki ukuran (${Math.round(ukuran.width)}x${Math.round(ukuran.height)} px). ` +
        'Periksa apakah elemen disembunyikan dengan display:none.',
    )
  }

  // Beri kesempatan browser menyelesaikan layout & paint sebelum snapshot.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

  // Pastikan elemen dan seluruh leluhurnya tidak transparan. Elemen dengan
  // opacity 0 dirender sebagai kanvas kosong oleh html2canvas -> PDF blank.
  const opacityLeluhur = []
  for (let el = element; el && el !== document.body; el = el.parentElement) {
    const nilai = Number(getComputedStyle(el).opacity)
    if (nilai < 1) opacityLeluhur.push(el)
  }
  const restoreOpacity = opacityLeluhur.map((el) => el.style.opacity)
  opacityLeluhur.forEach((el) => el.style.setProperty('opacity', '1', 'important'))

  // Pastikan blok tanda tangan (meterai, nama perusahaan, NPWP) tidak pernah
  // terbelah dua halaman. `avoid-all` saja tidak cukup: html2pdf tetap bisa
  // memotong tepat di tengah footer sehingga meterai tertinggal di halaman 1
  // sementara nama & NPWP pindah ke halaman 2 (footer "terpotong").
  // Dengan menandai footer sebagai blok utuh, seluruh footer dipindah ke
  // halaman berikutnya secara utuh.
  const footer = element.querySelector('.bupot-footer')
  if (footer) {
    footer.classList.add('bupot-jangan-pecah')
  }

  element.classList.add('pdf-print-safe')
  const restore = paksaWarnaHex(element)

  // Lebar/tinggi snapshot tidak boleh lebih kecil dari area yang dirender.
  // `width`/`height` yang dipaksa lebih kecil membuat html2canvas memotong
  // kanan/bawah (PDF terpotong); nilai 0 membuat kanvas kosong. Karena itu
  // lebar jendela tiruan juga dihitung dari ukuran elemen, bukan angka tetap.
  //
  // TAMBAHAN (perbaikan teks terpotong di tepi kanan): html2canvas
  // merender teks dengan metrik glifnya sendiri, yang bisa meleset
  // beberapa piksel dari layout CSS. Bila kanvas TEPAT selebar elemen,
  // glif paling kanan (digit terakhir kolom Jumlah) terpotong di tepi
  // kanvas — inilah yang terlihat pada Bupot bulanan/tahunan/badan.
  // Kanvas dilebihkan 32px ke kanan (area putih kosong, tidak mengubah
  // isi) dan jendela tiruan dilebihkan 72px, sehingga tidak ada lagi glif
  // yang berimpit dengan tepi kanvas.
  const lebarSnapshot = Math.max(1, Math.ceil(ukuran.width) + 32)
  const tinggiSnapshot = Math.max(1, Math.ceil(ukuran.height))

  try {
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10], // mm
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          // Paksa html2canvas merender pada ukuran dokumen yang sebenarnya,
          // bukan mengikuti posisi elemen di halaman.
          width: lebarSnapshot,
          height: tinggiSnapshot,
          // Jendela tiruan minimal selebar konten (+ruang margin) agar layout
          // responsif tidak menyusut dan memotong kolom tabel di kanan.
          windowWidth: Math.max(800, lebarSnapshot + 72),
          windowHeight: Math.max(600, tinggiSnapshot),
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['.bupot-footer', '.bupot-jangan-pecah', 'tr', '.bupot-section'],
        },
      })
      .from(element)
      .save()
  } finally {
    if (footer) footer.classList.remove('bupot-jangan-pecah')
    restore()
    opacityLeluhur.forEach((el, i) => {
      if (restoreOpacity[i]) el.style.opacity = restoreOpacity[i]
      else el.style.removeProperty('opacity')
    })
    element.classList.remove('pdf-print-safe')
  }
}
