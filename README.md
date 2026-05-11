# ClearTask — Pencatatan Penjualan Digital

ClearTask adalah aplikasi Progressive Web App (PWA) berbasis React untuk mencatat transaksi penjualan harian. Dirancang dengan antarmuka "Neon Terminal" yang gelap dan modern, aplikasi ini membantu kasir dan pemilik bisnis memantau pemasukan secara real-time dan mengekspor laporan ke format Excel.

## 🌟 Fitur Utama

- **Pencatatan Transaksi**: Form 2-kolom yang responsif dengan perhitungan total otomatis.
- **Dashboard Metrik**: Pantau total pemasukan hari ini beserta tren perbandingan dari hari sebelumnya.
- **Manajemen Riwayat**: Tabel transaksi lengkap dengan fitur pencarian, filter tanggal, dan pengurutan (sorting).
- **Export to Excel**: Unduh laporan penjualan harian dengan format Excel (.xlsx) yang sudah di-styling rapi.
- **Progressive Web App (PWA)**: Bisa di-install di HP/Desktop sebagai native app dan memiliki fallback saat offline.
- **Penyimpanan Lokal**: Menggunakan LocalStorage untuk MVP yang cepat tanpa memerlukan setup backend/database (privasi data terjamin di device).

## 🚀 Teknologi yang Digunakan

- **Frontend Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4
- **Export Engine**: ExcelJS
- **Desain**: Dark Mode (Glassmorphism) dengan aksen `#00ffa3` (Neon Green)

## 📦 Cara Install & Menjalankan (Development)

Pastikan kamu sudah menginstal [Node.js](https://nodejs.org/) di komputermu.

1. Clone repository ini:
   ```bash
   git clone https://github.com/Rzandi/ClearTask.git
   ```
2. Masuk ke direktori proyek:
   ```bash
   cd ClearTask
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Jalankan server development:
   ```bash
   npm run dev
   ```
5. Buka `http://localhost:5173/` di browsermu.

## 📱 PWA & Instalasi (Mobile/Desktop)

Untuk mendapatkan pengalaman terbaik:
1. Buka aplikasi ini via browser (Chrome/Safari).
2. Klik opsi **"Add to Home Screen"** atau klik icon install di address bar.
3. Aplikasi akan terpasang dan bisa dibuka layaknya aplikasi native.

## 📄 Lisensi
MIT License
