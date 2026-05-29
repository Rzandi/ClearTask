# 🎨 UI/UX Flow Document — ClearTask

> **Project:** ClearTask v3.1.0  
> **Status:** Pending Approval (URG-3d)  
> **Date:** 2026-05-30  
> **Language:** Bahasa Indonesia

---

## 1. User Personas (Ringkas)

### 1.1 Persona 1: Budi (Kasir Toko)

- **Karakter:** Kasir paruh waktu di retail kelontong. Terbiasa dengan teknologi handphone, namun menginginkan sistem kasir desktop yang responsif, minimal ketukan keyboard/mouse, dan penomoran tanggal transaksi otomatis yang andal.
- **Goal Utama:** Memproses checkout belanjaan pelanggan secara instan tanpa khawatir data kasir tidak sinkron atau tanggal transaksi meleset ke hari sebelumnya saat shift malam.

### 1.2 Persona 2: Fikz (Owner Toko)

- **Karakter:** Pengusaha retail yang visioner. Sangat logis, analitis, dan detail-oriented. Mengawasi stok, kategori produk, pengaturan sistem, dan membutuhkan rekomendasi prioritas restock stok tipis yang akurat secara real-time.
- **Goal Utama:** Menganalisis keputusan restock (SAW) tanpa mengalami kelambatan performa (ui freezing) pada browser desktop.

---

## 2. User Journey Map per Role

### 2.1 Journey Kasir (Operator Penjualan):

```
  ┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
  │ 1. Buka Sesi  │────►│ 2. Scan / Input  │────►│ 3. Klik Bayar /  │────►│ 4. Cetak Struk / │
  │    Kasir      │     │    Produk        │     │    Input Tunai   │     │    Tutup Sesi    │
  └───────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
```

1. **Buka Sesi:** Masuk ke tab Penjualan ➔ Muncul modal prompt "Buka Sesi Baru" ➔ Input nama sesi (shift) ➔ Sesi aktif.
2. **Scan / Input Produk:** Mengetik nama produk / SKU di form ➔ Otomatis reactive search ➔ Menentukan Qty ➔ Menekan Enter ➔ Item masuk ke Cart.
3. **Checkout / Pembayaran:** Klik tombol "Bayar" ➔ Muncul panel nominal ➔ Input nominal uang diterima ➔ Sistem menampilkan kembalian secara instan.
4. **Selesai / Tutup Sesi:** Klik "Tutup Sesi" di sidebar ➔ Muncul modal konfirmasi ➔ Sesi ditutup, sistem mengarsipkan data sesi, memicu download closing report otomatis.

### 2.2 Journey Admin / Owner (Decision Support):

```
  ┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
  │ 1. Navigasi   │────►│ 2. Atur Bobot    │────►│ 3. Hitung Ulang  │────►│ 4. Analisis &    │
  │    ke Tab SPK  │     │    Kriteria      │     │    Metode SAW    │     │    Ekspor Data   │
  └───────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
```

1. **Navigasi ke Tab SPK:** Klik tab "Restock (SPK)" di Sidebar / BottomNav.
2. **Atur Bobot Kriteria:** Membuka panel "Bobot Kriteria" ➔ Menyesuaikan slider C1 (Volume), C2 (Sisa Stok), C3 (Margin), C4 (Frekuensi Transaksi) dengan total sum 100% (1.0).
3. **Hitung Ulang SAW:** Klik tombol "Simpan & Hitung" ➔ Tampil animasi loading state asinkron (kalkulasi didelegasikan ke Web Worker).
4. **Analisis & Tindakan:** Meninjau grafik ranking prioritas restock ➔ Membaca daftar item prioritas bertanda "URGENT" (skor tertinggi) ➔ Klik tombol Ekspor Laporan.

---

## 3. Screen Inventory

Sistem memiliki antarmuka utama satu halaman (_Single Page App_) yang terbagi menjadi **5 Tab Screen Utama** yang dilazy-load dengan fallback Skeleton Screen:

1. **Tab 1: Input Penjualan (`#input`)** ➔ Form transaksi kasir utama.
2. **Tab 2: Laporan & Export (`#laporan`)** ➔ Riwayat daftar transaksi terfilter, edit/delete data, dan ekspor Excel/CSV.
3. **Tab 3: database Management (`#database`)** ➔ Manajemen backup, wipe, dan merge database JSON lokal.
4. **Tab 4: Riwayat Sesi (`#riwayat-sesi`)** ➔ Daftar rekaman shift kasir historis beserta rekapitulasi nominal.
5. **Tab 5: Restock (SPK) (`#spk`)** ➔ Halaman analisis keputusan restock (SAW) dilengkapi bagan peringkat, bobot criteria, dan history log.

---

## 4. Navigation Flow

Alur perpindahan antarmuka diatur secara tab-based client-side router yang tersinkronisasi dua arah dengan browser hash navigation:

- Klik ikon menu di **Sidebar (Desktop)** atau **BottomNav (Mobile)** ➔ Mengubah URL hash (cth: `index.html#spk`) ➔ React state `activeTab` terupdate ➔ Komponen layar merender komponen bersangkutan secara dinamis menggunakan Suspense.
- Navigasi tombol _Back_ / _Forward_ browser ➔ Memicu event listener `popstate` ➔ React state `activeTab` menyesuaikan hash baru secara otomatis.

---

## 5. Wireframe Description per Screen Utama

### 5.1 Tab Screen: Restock (SPK)

- **Visual Theme:** Premium Dark-Mode Glassmorphism.
- **Layout Grid:** 2-Column Responsive Layout (Desktop: Sidebar + Main Content Grid).
- **Komponen & Struktur UI:**
  - **Header Row:**
    - Title: "Rekomendasi Prioritas Restock" dengan badge pulse neon merah menyala jika ada item berstatus `URGENT`.
    - Selector Filter: Dropdown Periode (7 Hari, 30 Hari, 90 Hari, Tahun Ini, Kustom) dengan input Date Range jika kustom dipilih.
  - **Weight Control Panel (Glass Card):**
    - Panel slider modern untuk kustomisasi bobot kriteria C1 s/d C4.
    - Dilengkapi indikator persentase real-time (wajib total 100% atau 1.0).
    - Tombol "Simpan & Hitung" dengan visual neon-glow efek saat melayang (hover).
  - **Priority Rank Chart Card:**
    - Visualisasi grafik batang vertikal berwarna gradasi harmonis (neon-pink ke biru-glow) untuk 10 alternatif teratas.
  - **Ranking Table Card:**
    - Tabel scannable berisi kolom Peringkat, Nama Barang, Skor Akhir (SAW), Status Urgensi (Badge merah `'Urgent'`, kuning `'Perhatian'`, hijau `'Aman'`), dan detail nilai orisinal kriteria.
    - Dilengkapi tab tersendiri untuk menampilkan daftar barang tereliminasi (_excluded items_) disertai alasan eliminasi (misal: "Stok masih melimpah" atau "Tidak ada penjualan").
  - **History Logs Card:**
    - Menampilkan riwayat snapshot perhitungan terdahulu secara tabular.

### 5.2 Tab Screen: Input Penjualan

- **Visual Theme:** Clean Slate Slate-Gray & Modern Emerald HSL Accent.
- **Komponen UI:**
  - **Session Banner (Sticky Top Alert):** Mengindikasikan nama kasir aktif dan tombol pintas "Tutup Sesi".
  - **Main Cart Form (2 Columns):**
    - Kiri: Form masukan barang (Reactive autocomplete input, kuantitas, harga, diskon).
    - Kanan: Keranjang Belanja (Daftar CartItems, total nominal belanja besar, tombol checkout bayar).

---

## 6. Error States & Edge Case UI

### 6.1 Status Storage Quota Exceeded (Storage Full)

- **Visual Trigger:** IndexedDB gagal menulis data transaksi baru akibat ruang disk habis.
- **UI Element:** Muncul toast pop-up dengan warna merah tebal (assertive ARIA role), berbunyi: _"Penyimpanan Penuh! Transaksi gagal disimpan ke IndexedDB. Silakan hapus data lama atau lakukan ekspor backup."_
- **Sistem Handler:** Tombol transaksi checkout dibatalkan otomatis dan dikembalikan ke status _Ready to Save_ tanpa mengosongkan keranjang belanja kasir.

### 6.2 Status Perhitungan SAW Gagal / Data Kosong

- **Visual Trigger:** Tidak ada data penjualan sama sekali pada rentang periode terpilih.
- **UI Element:** Di dalam panel grafik dan tabel, merender animasi ilustrasi kosong yang modern berwarna redup dengan keterangan: _"Tidak ada data transaksi yang dapat diproses untuk periode ini. Silakan tambahkan transaksi baru terlebih dahulu."_
