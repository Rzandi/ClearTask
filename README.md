<p align="center">
  <h1 align="center">ClearTask v3.4.0</h1>
  <p align="center"><strong>Aplikasi Kasir PWA Offline-First — Aman, Cepat, dan Bisa Dipakai Tanpa Internet.</strong></p>
</p>

---

## Tentang ClearTask

ClearTask adalah aplikasi Point-of-Sale (POS) berbasis PWA yang dirancang untuk kasir dan pemilik usaha kecil. Semua data tersimpan **100% lokal** di perangkat pengguna menggunakan IndexedDB — tidak ada server, tidak ada akun, tidak ada biaya langganan.

### Fitur Utama

- **Input Transaksi & Autocomplete** — Form kasir dengan kalkulasi total otomatis, autocomplete nama barang, badge pendeteksi barang terdaftar/baru, panel kanan Cek Stok cepat, dan kategori & sub-kategori dinamis.
- **Auto-Deduction & New Product Auto-Detect** — Transaksi checkout otomatis memicu pengurangan stok inventaris (clamped >= 0). Input nama barang baru saat penjualan otomatis mendaftarkan item ke database Master Barang dengan default Stok = 0 dan Modal = 0.
- **Cetak Struk Bluetooth POS** — Mencetak struk langsung dari browser ke printer termal 58mm menggunakan Web Bluetooth GATT API dengan buffer transmission chunked (20-byte write) dan fallback window.print() standar.
- **Manajemen Sesi/Shift** — Buka/tutup sesi kasir, closing report otomatis per shift lengkap dengan **rincian barang terjual terlaris**.
- **Kelola Pengeluaran (Expenses)** — Tab khusus pencatatan pengeluaran operasional toko dengan log history dan visualisasi mobile cards.
- **Rapor Laba & SVG Area Chart** — Pelacakan keuntungan bersih real-time (harian, bulanan, tahunan) didukung dengan **Grafik SVG Murni** dan tabel per faktur yang menampilkan Harga Modal & Keuntungan.
- **Master Barang (Inventaris)** — CRUD lengkap Master Barang terintegrasi dengan setelan **Harga Modal** dan peringatan stok rendah.
- **Laporan & Export** — Export ke Excel (.xlsx) dan CSV, filter rentang tanggal (Hari Ini, Mingguan, Bulanan, Tahunan), pencarian barang, dan pengaturan kustomisasi profil usaha.
- **Database Manager** — Backup/restore via JSON, Smart Merge (tolak duplikasi otomatis) untuk sinkronisasi lokal aman.
- **PWA Installable** — Bisa diinstall di Android/iOS/Desktop, 100% offline.

---

## Tech Stack

| Layer     | Teknologi                                          |
| --------- | -------------------------------------------------- |
| Framework | React 19 + Vite 8                                  |
| Styling   | Tailwind CSS v4                                    |
| Database  | IndexedDB via Dexie.js v4                          |
| Enkripsi  | Web Crypto API (AES-GCM 256 + PBKDF2)              |
| Export    | ExcelJS (lazy-loaded)                              |
| Testing   | Vitest + @testing-library/react + fast-check (PBT) |
| E2E       | Playwright                                         |
| DX        | Husky + Commitlint + lint-staged + Prettier        |

---

## Arsitektur

```
src/
├── components/         # UI components (Atomic Design)
│   └── ui/             # Base atoms: Button, Input, Card, Modal, Badge, Typography
├── contexts/           # React contexts
│   └── SettingsContext.jsx   # Theme, kasir name, preferences
├── hooks/              # Custom hooks
│   ├── useTransactions.js      # Wrapper — composes 3 sub-hooks
│   ├── useTransactionData.js   # CRUD + Dexie transactions
│   ├── useTransactionFilter.js # Search, sort, date filter
│   ├── useTransactionMetrics.js# Daily analytics (todayTotal, trend)
│   ├── useCategories.js        # Dynamic categories & sub-categories
│   ├── useInventory.js         # Master barang CRUD
│   └── useSession.js           # Sesi kasir (buka/tutup)
├── services/           # External integrations
│   ├── db.js                   # Dexie schema (v1 → v2 migration)
│   └── databaseManager.js      # Export/import/merge database
├── utils/              # Pure utility functions
│   ├── formatters.js           # formatRupiah, formatDate, toLocalDateString
│   ├── exportExcel.js          # ExcelJS export
│   ├── exportCSV.js            # CSV export (RFC 4180)
│   ├── downloadHelper.js       # Native browser File API download
│   └── migration.js            # localStorage → IndexedDB migration
└── __tests__/          # Unit + PBT test suite
```

**Provider nesting:**

```
ErrorBoundary
└── AppBootstrap (migration)
    └── SettingsProvider
        └── App
```

---

## 🏃 Panduan Menjalankan Project (Run Guide)

### 📋 Prasyarat

Sebelum memulai, pastikan perangkat Anda memiliki:

- **Node.js** versi `≥ 20.0.0`
- **npm** versi `≥ 10.0.0`

### 💻 Instalasi Lokal & Development

Ikuti langkah-langkah di bawah ini untuk mengkloning dan menjalankan server development:

```bash
# 1. Kloning Repositori
git clone https://github.com/fikz/ClearTask.git
cd ClearTask

# 2. Instalasi Dependensi
npm install

# 3. Salin Environment Variables
cp .env.example .env

# 4. Jalankan Dev Server
npm run dev
```

Setelah dev server aktif, buka **[http://localhost:5173](http://localhost:5173)** di browser Anda.

---

## 🧪 Panduan Pengujian (Testing Guide)

ClearTask memiliki pertahanan testing berlapis untuk menjamin integritas data offline:

```bash
# 1. Jalankan Semua Unit & Component Tests (Single Run)
npm run test:run

# 2. Jalankan Tests dalam Mode Interaktif (Watch Mode)
npm run test

# 3. Jalankan Pengujian dengan Laporan Cakupan (Coverage Report)
npm run test:coverage
# Hasil laporan cakupan dapat dibuka di browser melalui berkas: `coverage/index.html`

# 4. Jalankan Pengujian Browser End-to-End (E2E)
# Pastikan server dev aktif (npm run dev) sebelum menjalankan perintah ini:
npm run test:e2e
```

### 🎯 Batas Minimal Cakupan Kode (Coverage Targets)

Setiap kontribusi kode baru wajib memenuhi kriteria cakupan minimal berikut:

- **Statements:** `≥ 80%`
- **Branches:** `≥ 75%`
- **Functions:** `≥ 80%`
- **Lines:** `≥ 80%`

---

## 📦 Bundling & Deployment

### 1. Build untuk Production

Untuk membuat bundle optimal siap rilis ke web server production:

```bash
npm run build
```

Bundle hasil kompilasi akan tersimpan di dalam direktori `dist/`.

### 2. Preview Hasil Build

Untuk meninjau bundle production secara lokal sebelum deploy:

```bash
npm run preview
```

### 3. Analisis Ukuran Bundle

Untuk menganalisis ukuran file JS dan mendeteksi dependensi yang terlalu berat:

```bash
ANALYZE=true npm run build
# Hasil visualisasi interaktif akan ter-generate di: `dist/stats.html`
```

### 🚀 Deploy ke Vercel (Rekomendasi)

ClearTask siap di-deploy secara instan ke platform serverless Vercel:

```bash
# Instal Vercel CLI global
npm i -g vercel

# Login & Deploy
vercel login
vercel --prod
```

> ⚠️ **PENTING:** Progressive Web App (PWA), Service Worker, dan Web Manifest mewajibkan koneksi **HTTPS** yang aman agar dapat berfungsi dan di-install di perangkat pengguna (Android, iOS, macOS, Windows). Vercel menyediakan SSL HTTPS secara otomatis secara gratis.

---

## 📝 Kontribusi & Changelog

- Untuk panduan kontribusi kode, silakan baca [CONTRIBUTING.md](./CONTRIBUTING.md).
- Riwayat rilis dan daftar perubahan detail dapat dilihat di [CHANGELOG.md](./CHANGELOG.md).
