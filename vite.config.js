import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/**
 * Plugin kecil: setelah Tailwind selesai, buang sisa `color-mix()` yang
 * masih tertinggal di dalam blok `@supports` pada CSS hasil build.
 *
 * Kenapa perlu? Tailwind v4 menulis aturan placeholder sebagai:
 *
 *   @supports (color: color-mix(in lab, red, red)) {
 *     ::placeholder { color: color-mix(in oklab, currentcolor 50%, transparent) }
 *   }
 *
 * html2canvas (mesin render html2pdf.js) sama sekali tidak mengenal
 * `color-mix()` — ia hanya mendukung rgb/rgba/hsl/hsla. Walaupun aturan
 * ini sudah ditimpa oleh `::placeholder { ... !important }` di index.css
 * (sehingga nilai komputasinya aman), membiarkan sisa deklarasi
 * `color-mix()` di output menambah risiko parsing.
 *
 * Plugin ini menghapus blok @supports tersebut secara eksplisit agar CSS
 * yang disajikan benar-benar bebas dari fungsi warna yang tidak didukung.
 */
function buangColorMix() {
  return {
    name: 'buang-color-mix',
    enforce: 'post',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.css')) continue
        const asal = typeof file.source === 'string' ? file.source : Buffer.from(file.source).toString('utf8')

        if (!asal.includes('color-mix(')) continue

        // Hapus seluruh blok @supports yang isinya memakai color-mix().
        // Dilakukan berulang karena bloknya bisa bersarang.
        let hasil = asal
        let sebelum
        do {
          sebelum = hasil
          hasil = hasil.replace(/@supports\s*\(color:\s*color-mix\([^)]*\)\)\s*\{[^{}]*\{[^{}]*\}[^{}]*\}/g, '')
        } while (hasil !== sebelum)

        file.source = hasil
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), buangColorMix()],
})
