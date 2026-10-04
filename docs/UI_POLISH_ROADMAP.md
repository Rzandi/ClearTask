# 🎨 ClearTask: UI/UX Micro-Polish & Data Logic Specification

Dokumen ini merupakan panduan penyempurnaan visual, hirarki UI, interaksi mikro (_micro-interactions_), dan perbaikan logika data (_data logic fixes_) untuk aplikasi **ClearTask (POS & Sales Tracker)** berbasis _screenshot review_.

---

## 🛍️ 1. Input Penjualan & Katalog Barang

### A. Hirarki Warna & Visual Badge [SELESAI ✅]

- **Masukan:** Badge kategori (`Makanan`, `Minuman`) menggunakan warna hijau terang yang serupa dengan nominal harga (`Rp 25.000`), membuat mata kasir terdistraksi.
- **Solusi UI:** Ubah warna background badge kategori menjadi lebih netral (contoh: _dark muted grey_ `#2A2D35` dengan teks abu-abu terang `#A0AEC0`). Biarkan warna hijau menyala (_emerald green_) khusus digunakan pada **Harga Jual** dan **Tombol Aksi Utama**.
- **Status:** ~~Telah disesuaikan menggunakan `text-text-muted` dan border netral pada `CatalogItemCard`.~~

### B. Indikator Harga Modal Kosong (`Rp 0`) [SELESAI ✅]

- **Masukan:** Di panel _Cek Stok_, item tanpa modal menampilkan `Modal: Rp 0`. Hal ini berpotensi membuat laporan _Net Profit_ menjadi bias (profit terhitung 100%).
- **Solusi Data & UI:** Jika `hargaModal === 0` atau `null`, tampilkan format strip `Modal: -` serta berikan indikator _warning_ kecil di Master Barang untuk mengingatkan kasir/owner agar mengisi modal barang.
- **Status:** ~~Telah diperbarui pada panel Cek Stok `InputPenjualan.tsx` dengan indikator `Modal: - ⚠️` ketika modal belum diisi.~~

### C. Logic Filtering (AND Operations) [SELESAI ✅]

- **Masukan:** Penggunaan _search bar_ bersamaan dengan filter dropdown kategori rentan mengalami konflik pencarian.
- **Solusi Logic:** Pastikan query filter menggunakan operasi matematika **AND** (`kategori === selectedKategori && nama.includes(searchQuery)`), bukan operasi OR.
- **Status:** ~~Filter `filteredCatalog` pada `InputPenjualan.tsx` telah menerapkan operasi sekuensial AND.~~

### D. Session Banner Truncation (Header) [SELESAI ✅]

- **Masukan (preventif — belum terobservasi di data, tapi berisiko):** Nama shift yang panjang (contoh: _"Shift Pagi Mas Budi Utomo"_) berisiko menggeser tombol `Tutup Session` hingga keluar layar (_layout break_) pada perangkat mobile.
- **Solusi UI:** Terapkan properti CSS `max-width` dan `text-overflow: ellipsis` (`overflow: hidden; white-space: nowrap;`) pada nama shift di header atas.
- **Status:** ~~Telah di-handle menggunakan flex layout responsif pada `SessionBanner.tsx`.~~

---

## 📊 2. Laporan & Grafik Ikhtisar Bisnis

### A. Pembulatan Nilai Y-Axis Grafik (Chart Clean-up) [SELESAI ✅]

- **Masukan:** Sumbu Y pada grafik performa bisnis menampilkan pecahan desimal Rupiah yang kurang rapi (`Rp 549.412,5` atau `Rp 183.137,5`).
- **Solusi UI:** Bungkus nilai kalkulasi Y-Axis menggunakan pembulatan ke ribuan terdekat (`Math.round(val / 1000) * 1000`) agar tampilan grafik terlihat bersih (_clean chart area_).
- **Status:** ~~Skala Y-Axis `yTicks` di `ReportingChart.tsx` telah menggunakan pembulatan `Math.round((maxVal * frac) / 1000) * 1000`.~~

### B. Tooltip Margin Keuntungan (Profit Badge) [SELESAI ✅]

- **Masukan:** Persentase margin bersih (contoh: `93.9%`) di kartu _Keuntungan Bersih_ belum memiliki penjelasan formula secara eksplisit.
- **Solusi UX:** Tambahkan _tooltip_ atau teks bantuan berukuran kecil (_micro-caption_) di bawahnya:
  ```
  Margin (%) = (Keuntungan Bersih / Total Pemasukan) × 100
  ```
- **Status:** ~~Caption penjelasan formula margin telah tercantum di bawah Profit Card pada `LaporanExport.tsx`.~~

### C. Konsistensi Bahasa Label Grafik [SELESAI ✅]

- **Masukan:** Terdapat pencampuran bahasa pada legenda grafik (`Pemasukan`, `Keluaran`, dan `Net Profit`).
- **Solusi UI:** Disamakan menjadi Bahasa Indonesia penuh: `Pemasukan`, `Pengeluaran`, dan `Laba Bersih`.
- **Status:** ~~Legenda grafik pada `ReportingChart.tsx` telah disatukan ke Bahasa Indonesia: Pemasukan, Pengeluaran, Laba Bersih.~~

### D. Sumbu X Grafik Tidak Merepresentasikan Interval Waktu Riil [SELESAI ✅]

- **Masukan:** Label sumbu X (`05-27`, `06-11`, `06-13`, `06-18` ... `09-14`) menampilkan tanggal-tanggal dengan jarak kalender yang tidak rata.
- **Solusi UI/Copy:** Ubah caption grafik dari "Tren performa harian hingga 10 hari terakhir" menjadi "Tren performa bisnis (Pemasukan, Pengeluaran & Laba Bersih)".
- **Status:** ~~Sub-caption grafik di `ReportingChart.tsx` telah diperbarui.~~

---

## 🧾 3. Manajemen Data & Riwayat Sesi

### A. Normalisasi String Kategori (Case Insensitivity) [SELESAI ✅]

- **Masukan:** Di modal _Closing Report_, terjadi duplikasi grup kategori akibat perbedaan kapitalisasi huruf (contoh: `Kebutuhan pokok` terpisah dari `kebutuhan pokok`).
- **Solusi Logic:** Lakukan proses sanitasi/normalisasi _string_ sebelum pengelompokan (_aggregation_):
  ```typescript
  const key = categoryName.trim().toLowerCase();
  ```
- **Status:** ~~Telah diperbarui pada `calculateSessionStats` (`sessionStats.ts`) dengan normalisasi `(item.kategori || 'Lainnya').trim().toLowerCase()` sehingga pengelompokan kategori pada Closing Report kini digabung secara tepat.~~

### B. Aksi Edit pada Tabel Pengeluaran [SELESAI ✅]

- **Masukan:** Kolom `AKSI` pada tabel Riwayat Pengeluaran hanya menyediakan opsi hapus (ikon Tong Sampah).
- **Solusi Feature:** Tambahkan ikon Edit (Pensil) di samping ikon hapus untuk memfasilitasi koreksi salah ketik nominal tanpa harus menghapus dan membuat data dari awal.
- **Status:** ~~Telah diimplementasikan tombol Edit (Pensil) di desktop & mobile, didukung oleh modal `EditExpenseModal` dan fungsi `updateExpense` pada hook `useExpenses`.~~

---

## 📱 4. Mobile Usability & Form Controls

### A. Format Input Nominal Otomatis (Currency Formatter) [SELESAI ✅]

- **Masukan:** Input nominal di formulir manual masih menerima format angka polos (`15000`), rawan kesalahan pengetikan angka nol oleh kasir.
- **Solusi UX:** Terapkan _real-time mask formatter_ pada event `onChange` input:
  ```typescript
  const formatRupiah = (val: string) =>
    'Rp ' + val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  ```
- **Status:** ~~Telah diterapkan menggunakan helper `maskRupiah` dan `unmaskRupiah` pada input nominal pengeluaran dan modal edit pengeluaran.~~

### B. Clear Button (X) pada Input Pencarian [SELESAI ✅]

- **Masukan:** Mengosongkan kata kunci pencarian pada search bar mengharuskan kasir menekan tombol backspace berulang kali.
- **Solusi UX:** Tampilkan tombol (X) transparan di ujung kanan search input saat `value.length > 0` untuk mereset pencarian dalam 1 kali tap.
- **Status:** ~~Tombol reset (X) 1-tap telah ditambahkan pada search bar `TopBar.tsx`.~~

### C. Safety Bottom Padding (Mobile Navigation) [SELESAI ✅]

- **Masukan:** Konten paling bawah pada halaman Master Barang dan Database versi mobile mepet/tertutup oleh Bottom Navigation Bar.
- **Solusi UI:** Tambahkan `padding-bottom: 80px` atau `90px` pada container utama layout khusus tampilan mobile.
- **Status:** ~~Main container di `AppShell.tsx` telah memiliki `pb-24` (96px) safety margin untuk mobile nav bar.~~

### D. Hitbox Touch Target Size [SELESAI ✅]

- **Masukan:** Tombol modal edit/hapus pada tabel Master Barang versi mobile memiliki ukuran area sentuh yang relatif kecil.
- **Solusi UX:** Terapkan batas area sentuh minimal 44×44 pixel (`min-w-[44px] min-h-[44px] flex items-center justify-center`) pada semua clickable icons di mobile view.
- **Status:** ~~Seluruh clickable icon & tombol aksi mobile telah menggunakan `min-h-[44px]`.~~

---

## 🔔 5. Notifikasi, Pengaturan & Tabel Data

### A. Timestamp Notifikasi Tidak Akurat ("Baru saja") [SELESAI ✅]

- **Masukan:** Semua item di dropdown Notifikasi Transaksi menampilkan label waktu relatif yang sama persis `Baru saja`.
- **Solusi Logic:** Cek fungsi _relative time formatter_ — pastikan setiap item notifikasi menyimpan dan menggunakan timestamp aslinya sendiri (`createdAt`).
- **Status:** ~~Telah menggunakan timestamp relatif berbasis `createdAt` transaksi asli.~~

### B. Input "Pesan Kaki Struk" Terpotong [SELESAI ✅]

- **Masukan:** Di modal Pengaturan, field `Pesan Kaki Struk (Footer)` menampilkan teks yang terpotong karena memakai `<input>` single-line.
- **Solusi UI:** Ganti elemen menjadi `<textarea rows={3}>` agar admin bisa melihat dan mengedit keseluruhan teks pesan footer struk tanpa terpotong.
- **Status:** ~~Field `Pesan Kaki Struk` pada `SettingsModal.tsx` telah diubah menjadi `<textarea rows={3}>`.~~

### C. Tabel Riwayat Laporan Terlalu Padat (Desktop) [SELESAI ✅]

- **Masukan:** Tabel Riwayat Laporan menampilkan 13 kolom sekaligus dalam satu baris.
- **Solusi UI:** Kelompokkan kolom sekunder ke dalam expandable row atau sediakan toggle "Tampilkan Detail".
- **Status:** ~~Telah diimplementasikan fitur Mode Ringkas vs Mode Lengkap (13 Kolom) beserta baris expandable (chevron ›) pada `TransactionTable.tsx` yang menampilkan rincian komprehensif per item (nama item, subkategori, qty, harga satuan, harga modal, subtotal, catatan, dan total keuntungan).~~

### D. Inkonsistensi Warna Semantik Tombol Aksi [SELESAI ✅]

- **Masukan:** Tombol-tombol aksi di halaman Master Barang memakai warna tanpa pola yang jelas.
- **Solusi UI:** Tetapkan sistem warna semantik yang konsisten di seluruh aplikasi (Hijau = utama, Kuning = warning, Merah = destruktif, Abu-abu = sekunder).
- **Status:** ~~Sistem warna semantik tombol aksi telah diseragamkan di seluruh antarmuka.~~

---

## ⚡ 6. Preventive Edge Cases (Form & Transaksi)

### A. Focus State & Auto-Select pada Input Field Kasir [SELESAI ✅]

- **Masukan:** Saat kasir mengklik input `Harga Satuan`, `Qty`, atau `Uang Diterima`, mereka harus menghapus angka `0` secara manual sebelum mengetik nominal baru.
- **Solusi UX:** Terapkan `onFocus={(e) => e.target.select()}` di semua form input nominal.
- **Status:** ~~Seluruh komponen `<Input>` di `src/components/ui/Input.tsx` kini otomatis me-select isi teks saat diklik/difokuskan (`onFocus={(e) => e.target.select()}`).~~

### B. State Form Tidak Ter-reset Saat Modal/Tab Ditutup [SELESAI ✅]

- **Masukan:** Data ketikan lama masih tertinggal saat modal dibuka kembali.
- **Solusi Logic:** Pastikan setiap komponen Modal/Form memiliki fungsi cleanup (`resetForm()`).
- **Status:** ~~Modal form (`InventoryModal`, `SettingsModal`, `EditTransactionModal`) telah di-reset otomatis saat dibuka/ditutup.~~

### C. Handling Nilai Kembalian Minus (Uang Kurang) [SELESAI ✅]

- **Masukan:** Uang Diterima yang lebih kecil dari total tagihan memicu kembalian minus dan risiko ter-checkout.
- **Solusi UX & Validation:** Uang Kurang ditampilkan dalam teks merah tegas dan tombol Bayar di-disable jika uang kurang.
- **Status:** ~~Telah dicek & di-block di `InputPenjualan.tsx` dengan Hero Alert `Uang Kurang Rp X` (merah).~~

---

## 🛡️ 7. Validasi Stok & Data Safety

### A. Tombol "+ Keranjang" Tetap Aktif Meski Stok Habis [SELESAI ✅]

- **Masukan:** Item dengan `Stok: 0` masih menampilkan tombol `+ Keranjang` dalam kondisi aktif.
- **Solusi Logic & UX:** Jika `stok <= 0`, disable tombol `+ Keranjang`.
- **Status:** ~~Tombol tambah pada `CatalogItemCard` otomatis bernilai `disabled={isOutOfStock}`.~~

### B. Aksi Destruktif Tanpa Dialog Konfirmasi [SELESAI ✅]

- **Masukan:** Tombol `Tutup Session` dan `Tutup Buku (Arsip)` membutuhkan modal konfirmasi.
- **Solusi UX:** Tambahkan modal konfirmasi sebelum kedua aksi ini benar-benar dieksekusi.
- **Status:** ~~Telah dibungkus dengan `ConfirmDialog` di `App.tsx`.~~

### C. Ambang "Stok Menipis" Terlalu Agresif [SELESAI ✅]

- **Masukan:** Badge `Stok Menipis` muncul terlalu banyak akibat threshold global.
- **Solusi Logic:** Jadikan `stokMinimum` sebagai field yang bisa dikustomisasi per barang di Master Barang.
- **Status:** ~~Field `minStock` (Stok Minim) telah menjadi properti khusus per barang di `InventoryModal.tsx` & `InventoryManager.tsx`.~~

---

## 📋 Summary Checklist Polesan

- [x] ~~Normalisasi `toLowerCase()` pada agregasi nama kategori di Closing Report~~
- [x] ~~Implementasi mask Rp otomatis pada input nominal pengeluaran & harga manual~~
- [x] ~~Perapihan warna badge kategori katalog (mengurangi kontras hijau)~~
- [x] ~~Pembulatan desimal Y-Axis grafik performa ke ribuan terdekat~~
- [x] ~~Perbaikan caption/representasi sumbu X & legenda grafik performa bisnis~~
- [x] ~~Penambahan padding-bottom 80px pada wrapper halaman mobile~~
- [x] ~~Penambahan tombol Clear (X) di seluruh input pencarian~~
- [x] ~~Penambahan tombol Edit pada tabel Riwayat Pengeluaran~~
- [x] ~~Perbaikan hitbox tombol aksi mobile ke minimal 44×44px~~
- [x] ~~Perbaikan bug timestamp "Baru saja" di semua notifikasi~~
- [x] ~~Ganti field Pesan Kaki Struk dari `<input>` ke `<textarea>`~~
- [x] ~~Strategi collapse/expandable row untuk tabel Riwayat Laporan~~
- [x] ~~Standardisasi sistem warna semantik tombol aksi di seluruh aplikasi~~
- [x] ~~Indikator visual untuk barang dengan Harga Modal `Rp 0` / kosong (`Modal: - ⚠️`)~~
- [x] ~~Pastikan logic filter search + kategori memakai operasi AND~~
- [x] ~~Auto-select (`onFocus` → `select()`) pada semua input nominal kasir~~
- [x] ~~Reset state form/modal saat ditutup (Esc, klik X, klik luar modal)~~
- [x] ~~Validasi & disable tombol Bayar saat Uang Diterima < Total Tagihan (kembalian minus)~~
- [x] ~~Disable tombol "+ Keranjang" untuk barang dengan Stok: 0~~
- [x] ~~Tambahkan modal konfirmasi untuk aksi "Tutup Session" dan "Tutup Buku (Arsip)"~~
- [x] ~~Jadikan Stok Minimum sebagai field per-barang, bukan default global~~
