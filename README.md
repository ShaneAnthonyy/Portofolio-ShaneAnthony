# Portfolio — Shane Anthony

Website portofolio pribadi dibangun dengan React + Vite. Tema: futuristik, dengan
network-graph animasi di hero, custom cursor, dan tombol "magnetic" yang mengikuti
cursor saat di-hover.

## Menjalankan di komputer kamu

Pastikan Node.js (versi 18 ke atas) sudah terpasang, lalu jalankan:

```bash
npm install
npm run dev
```

Buka alamat yang muncul di terminal (biasanya `http://localhost:5173`).

## Build untuk production

```bash
npm run build
npm run preview   # untuk mengecek hasil build secara lokal
```

Hasil build ada di folder `dist/` — folder ini yang di-upload ke hosting
(Vercel, Netlify, GitHub Pages, dsb).

## Struktur proyek

```
src/
  components/     -> semua bagian UI (Navbar, Hero, About, Skills, Projects, Contact, dst.)
  data/
    content.js    -> semua isi teks (profil, pendidikan, skill, proyek, kontak)
  index.css       -> semua styling & variabel warna
  App.jsx         -> menyusun semua section jadi satu halaman
```

## Cara mengedit konten

Semua teks (nama, pendidikan, skill, deskripsi proyek, kontak) ada di satu
file: `src/data/content.js`. Edit di situ, tidak perlu menyentuh komponen.

## Cara mengganti warna/tema

Semua warna didefinisikan sebagai CSS variable di bagian atas
`src/index.css` (`:root { ... }`):

- `--bg` — warna latar utama
- `--accent` — warna aksen utama (amber), dipakai di tombol utama & CTA
- `--accent-2` — warna aksen kedua (teal), dipakai di network graph & link
- `--accent-3` — warna aksen ketiga (violet), dipakai di tag skill

Ubah nilai hex-nya untuk mengganti keseluruhan tema warna.

## Menambah proyek baru

Tambahkan objek baru ke array `projects` di `src/data/content.js`:

```js
{
  title: 'Judul proyek',
  stack: 'Tech stack singkat',
  description: 'Deskripsi singkat proyek.',
}
```

Card baru akan otomatis muncul di section Proyek.
