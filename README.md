# ClearTask — Pencatatan Penjualan Digital

ClearTask adalah aplikasi Progressive Web App (PWA) berbasis React untuk mencatat transaksi penjualan harian. Dirancang dengan antarmuka "Neon Terminal" yang gelap dan modern, aplikasi ini membantu kasir dan pemilik bisnis memantau pemasukan secara real-time dan mengekspor laporan ke format Excel.

## Key Features

- **Pencatatan Transaksi Cepat**: Form 2-kolom responsif dengan kalkulasi total otomatis.
- **Dashboard Metrik Real-time**: Pantau total pemasukan hari ini beserta persentase tren perbandingan vs kemarin.
- **Manajemen Riwayat**: Tabel transaksi lengkap dengan fitur pencarian, filter tanggal, dan pengurutan (sorting).
- **Export to Excel**: Unduh laporan penjualan harian dengan format Excel (.xlsx) yang rapi dengan satu klik.
- **Progressive Web App (PWA)**: Install di HP atau Desktop sebagai aplikasi native dengan fitur offline fallback.
- **Penyimpanan Lokal (Offline-first)**: Data disimpan langsung di device pengguna via LocalStorage untuk kecepatan dan privasi.

---

## Tech Stack

- **Language**: JavaScript (ES6+)
- **Framework**: React 19
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4
- **Export Engine**: ExcelJS (replaces deprecated SheetJS)
- **File Downloader**: file-saver
- **Deployment**: Vercel

---

## Prerequisites

Pastikan Anda sudah menginstal perangkat lunak berikut sebelum memulai pengembangan:

- Node.js 18 atau lebih baru
- npm 9 atau lebih baru
- Git

---

## Getting Started

Panduan lengkap untuk menjalankan ClearTask di komputer lokal Anda:

### 1. Clone the Repository

```bash
git clone https://github.com/Rzandi/ClearTask.git
cd ClearTask
```

### 2. Install Dependencies

Install seluruh modul yang dibutuhkan oleh React, Vite, Tailwind, dan ExcelJS:

```bash
npm install
```

### 3. Start Development Server

Jalankan Vite development server:

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173) di browser Anda. Server mendukung Hot Module Replacement (HMR) sehingga perubahan kode akan langsung terlihat.

---

## Architecture Overview

Aplikasi ini menggunakan arsitektur komponen React yang modular dengan styling utilitas dari Tailwind CSS v4.

### Directory Structure

```text
ClearTask/
├── public/                 # Static assets & PWA files
│   ├── manifest.json       # PWA app metadata
│   ├── sw.js               # Service Worker logic
│   ├── offline.html        # Fallback offline page
│   └── assets/icons/       # PWA icons (192x192 & 512x512)
├── src/
│   ├── components/         # Reusable React components
│   │   ├── layout/         # Shell, Sidebar, TopBar, BottomNav
│   │   ├── InputPenjualan  # Form input logic
│   │   ├── LaporanExport   # Report & export container
│   │   ├── TransactionTable# Data table display
│   │   ├── MetrikCard      # Revenue summary widget
│   │   └── Toast           # Notification system
│   ├── hooks/              # Custom React hooks
│   │   └── useTransactions # Core state & business logic
│   ├── utils/              # Pure utility functions
│   │   ├── storage.js      # LocalStorage wrapper
│   │   ├── exportExcel.js  # ExcelJS configuration
│   │   └── formatters.js   # Currency and date formatters
│   ├── App.jsx             # Main routing & state provider
│   ├── main.jsx            # React root & SW registration
│   └── index.css           # Tailwind tokens & custom CSS
├── index.html              # App entry point
├── tailwind.config.js      # Tailwind configuration
└── vite.config.js          # Vite configuration
```

### Data Flow

```text
User Input → InputPenjualan Form → useTransactions Hook → storage.js → LocalStorage
   ↓
MetrikCard & TransactionTable ← useTransactions Hook ← LocalStorage
   ↓
User Clicks Export → exportExcel.js → ExcelJS generates Blob → file-saver downloads .xlsx
```

### Key Components

**State Management (`useTransactions`)**
- Mengelola data transaksi global, pencarian, filter, dan sorting.
- Melakukan perhitungan metrik harian (Total Pemasukan dan persentase tren) secara dinamis menggunakan `useMemo`.

**Persistence (`storage.js`)**
- Berfungsi sebagai "database" MVP menggunakan LocalStorage browser (`cleartask_transactions`).
- Meng-generate ID unik sekuensial (e.g. `TRX-00001`) dan menambahkan timestamp pada setiap transaksi.

**PWA Implementation (`sw.js` & `manifest.json`)**
- **Cache-First**: File statis (CSS, JS, Gambar) diambil dari cache agar performa maksimal.
- **Network-First**: Dokumen HTML (`index.html`) memprioritaskan jaringan untuk update terbaru.
- **Offline Fallback**: Jika jaringan terputus, Service Worker akan me-routing pengguna ke `offline.html`.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Menjalankan Vite development server di port 5173 |
| `npm run build` | Melakukan compile dan bundle aplikasi untuk production ke folder `dist/` |
| `npm run preview` | Menjalankan server lokal untuk melakukan test pada hasil build production |
| `npm run lint` | Menjalankan ESLint untuk mengecek potensi error pada kode |

---

## Deployment

Aplikasi ini dioptimalkan untuk di-deploy ke Vercel dengan setup *zero-config*.

### Vercel (Recommended)

1. Pastikan Anda sudah menginstal Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Login ke Vercel (jika belum):
   ```bash
   vercel login
   ```
3. Deploy aplikasi:
   ```bash
   # Deploy ke environment preview
   vercel

   # Deploy ke production
   vercel --prod
   ```

Atau, Anda dapat mendeploy langsung dengan menyambungkan repository GitHub ini ke dashboard Vercel (Import Project). Framework (Vite) dan Output Directory (`dist`) akan otomatis terdeteksi.

---

## Troubleshooting

### Data Tidak Tersimpan / Hilang
**Solusi:**
ClearTask menyimpan data di LocalStorage browser. Pastikan browser Anda tidak dalam mode "Incognito/Private" yang akan menghapus LocalStorage saat ditutup.

### Gagal Export ke Excel
**Solusi:**
Pastikan browser mengizinkan pengunduhan file (pop-up/download blocker dinonaktifkan). Jika tabel transaksi kosong, tombol export akan dinonaktifkan.

### PWA Tidak Bisa Di-install
**Solusi:**
1. Pastikan Anda mengakses aplikasi melalui HTTPS (kecuali `localhost` saat development).
2. Cek console browser untuk melihat error pada Service Worker (`sw.js`).
3. Buka Chrome DevTools > Application > Manifest, pastikan tidak ada peringatan (warnings) berwarna kuning.
