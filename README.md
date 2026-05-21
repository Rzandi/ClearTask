<p align="center">
  <div style="background-color: rgba(0, 255, 163, 0.15); width: 80px; height: 80px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  </div>
  <h1 align="center">ClearTask v2.5</h1>
  <p align="center"><strong>Aesthetic & Robust Point-of-Sale (POS) PWA for Modern Retailers.</strong></p>
</p>

---

## 🌟 Tentang ClearTask

ClearTask adalah aplikasi PWA (*Progressive Web App*) super-cepat dan *offline-first* yang dirancang khusus untuk memfasilitasi pencatatan transaksi harian secara modern. Membawakan visualisasi *Neon Terminal* (Dark Mode dengan Aksen Neon Hijau `#00ffa3`), ClearTask v2.5 memastikan performa kasir yang tak kenal kompromi meskipun tanpa koneksi internet.

### Fitur Unggulan (v2.5)

- 🛍️ **Smart Transaction Input**: Form dua-kolom dengan perhitungan total otomatis dan manajemen kategori/sub-kategori dinamis.
- 🕒 **Session & Shift Management**: Kelola sesi kasir harian (*Buka/Tutup Sesi*). Cetak rangkuman performa pada setiap shift yang telah berakhir dengan mudah.
- 📦 **Master Barang (Inventaris)**: Modul CRUD lengkap untuk mengelola daftar barang dagangan — nama, kategori, sub-kategori, harga, satuan, dan stok. Dilengkapi pencarian, filter, dan peringatan stok rendah.
- 🗄️ **Database Manager (Backup/Restore)**: Lindungi dan migrasikan data Anda (termasuk inventaris) menggunakan fitur impor/ekspor (*Smart Merge Validation* menolak duplikasi data secara otomatis).
- ✏️ **Edit & Delete Transaksi**: Manajemen transaksi tingkat lanjut, cegah kerugian dari *human error*.
- 📊 **Metrik Real-time**: Papan laporan harian interaktif membandingkan persentase tren pendapatan dengan hari sebelumnya.
- 📥 **Enterprise Export**: Ekspor tabel transaksi atau Sesi langsung ke dalam bentuk *Excel (.xlsx)* rapi atau *CSV* (dilengkapi Lazy-loading *ExcelJS*).
- ⚙️ **Profil Toko**: Personalisasikan nama Toko dan nama Kasir dari *Settings* untuk laporan akhir yang lebih profesional.
- 📱 **100% PWA**: Beroperasi layaknya aplikasi *Native* (bebas install di HP/Tablet/Desktop), sangat responsif, dan lolos standar *Lighthouse* yang sangat ketat (Termasuk pencegahan *iOS Auto-Zoom*).
- 📲 **Smart Install Prompt**: Tombol install PWA kustom yang muncul otomatis di *Top Bar* saat browser siap, dan menghilang setelah aplikasi berhasil terinstall.

---

## 🏗️ Arsitektur PWA (Offline First)

Data dijamin 100% menjadi milik pengguna! ClearTask menggunakan model komputasi sisi klien murni. Segala perhitungan dan penyimpanan terjadi di memori *LocalStorage* browser Anda melalui isolasi arsitektur React Hooks dan State Management. Konsep ini dipadukan bersama *Service Worker Cache-First* untuk mewujudkan latensi `0ms` ke server.

### Tech Stack
- **Framework:** React 19 + Vite 8
- **Styling:** Tailwind CSS v4 (Vanilla CSS untuk estetika Neon)
- **Persistensi Data:** Native Browser LocalStorage (No DB Config Needed)
- **Pengujian (Testing):** Vitest (Teruji 291 Unit Test Cases)
- **Ekspor Dokumen:** ExcelJS + FileSaver (Lazy Loaded)
- **Deployment:** Vercel

### Data Storage Keys
| Key | Deskripsi |
| --- | --- |
| `cleartask_transactions` | Seluruh transaksi penjualan |
| `cleartask_sessions` | Riwayat sesi/shift kasir |
| `cleartask_categories` | Kategori & sub-kategori kustom |
| `cleartask_inventory` | Master data barang (inventaris) |
| `cleartask_settings` | Pengaturan profil toko & kasir |

---

## 🚀 Memulai (Local Development)

### Syarat Pemasangan
- Node.js versi 18+
- npm versi 9+

### Instalasi Cepat

1. **Clone repositori**
   ```bash
   git clone https://github.com/Rzandi/ClearTask.git
   cd ClearTask
   ```

2. **Instal dependensi**
   *(Note: Repositori ini dilengkapi file `.npmrc` dengan bendera `legacy-peer-deps=true` untuk mencegah masalah ERESOLVE dari plugin React 19)*
   ```bash
   npm install
   ```

3. **Jalankan Development Server**
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses melalui `http://localhost:5173`. Server mendukung modul Vite HMR (*Hot Module Replacement*).

---

## 🧪 Testing & Linting

Repositori ini mengikuti standar *Code Quality* tingkat produksi.

| Perintah | Deskripsi |
| --- | --- |
| `npm test` | Menjalankan seluruh test suite menggunakan **Vitest** di folder `__tests__`. |
| `npm run lint` | Melakukan audit standar *ESLint* (mendepresiasi *dead-code* dan dependensi yang tidak tervalidasi). |
| `npm run build` | Menghasilkan bundel produksi. (Termasuk optimasi *Code Splitting* dan *Rollup Visualizer*). |

---

## 💡 Panduan Deployment

Aplikasi ini berorientasi pada kemudahan dan *Zero-config deployment* di **Vercel**. 

1. **Melalui Vercel Dashboard**:
   - Buat *New Project* dan impor repositori GitHub ini.
   - Vercel akan otomatis mendeteksi konfigurasi *Vite* dan mendeploy-nya dalam hitungan detik.

2. **Melalui Vercel CLI**:
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

> **Perhatian PWA**: Pastikan versi *production* berjalan menggunakan protokol aman **HTTPS** agar instalasi PWA (*Service Worker* dan *Web Manifest*) bekerja sesuai spesifikasi browser.

---

## 📄 Changelog & Versioning
Cek file [`CHANGELOG.md`](./CHANGELOG.md) untuk detail perubahan terbaru pada v2.1.0.

---

## ❓ FAQ (Frequently Asked Questions)

### Q: Apakah aplikasi ini masih bisa dipakai jika sedang offline (tidak ada sinyal internet)?
**A: Ya, 100% bisa!** ClearTask dirancang sebagai aplikasi *Offline-First*. Semua transaksi dan master data barang akan tersimpan dengan aman di dalam *localStorage* browser Anda. Anda tetap dapat memasukkan data dan melakukan penutupan sesi secara lancar meskipun sedang offline.

### Q: Apa yang terjadi jika saya tidak sengaja melakukan "Clear Cache" pada browser?
**A: Data Anda berpotensi hilang.** Karena ClearTask menyimpan data secara lokal di perangkat Anda (melalui *localStorage*), melakukan *Clear Cache / Clear Data* browser akan menghapus seluruh transaksi dan riwayat sesi yang ada. 
**Penanganan & Pencegahan:** 
Sangat disarankan untuk **rutin mem-backup data** menggunakan fitur "Database Manager" (ekspor ke file `.json`) atau mengekspor laporan akhir hari ke format Excel. Jika sewaktu-waktu data Anda terhapus secara tidak sengaja, Anda dapat menggunakan file `.json` tersebut untuk melakukan "Restore".

### Q: Bagaimana cara memunculkan kembali notifikasi install PWA jika sebelumnya terlewat?
**A: Tombol "Install" akan selalu muncul di Top Bar** selama Anda membuka aplikasi dari browser yang mendukung (misal: Chrome/Safari) dan aplikasi belum terinstall. Jika aplikasi sudah terinstall ke layar utama (*Home Screen*), tombol tersebut akan secara otomatis disembunyikan.

### Q: Bagaimana tampilan aplikasi di perangkat Mobile/HP?
**A: Sangat Responsif.** Seluruh antarmuka (termasuk *Closing Report Modal*, *Sidebar* yang diubah menjadi *Bottom Navigation*, dsb) telah didesain secara adaptif. Navigasi untuk pengguna HP sangat mudah diakses melalui tab bagian bawah, yang telah diperbarui dengan kontras warna aksesibilitas standar tinggi.
