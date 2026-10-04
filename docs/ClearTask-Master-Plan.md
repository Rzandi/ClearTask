# ClearTask - Master Plan & Implementation Plan

Sep 28, 2026 · @Fihan

## Ringkasan Eksekutif

ClearTask perlu menstabilkan data dulu sebelum menambah fitur: 9 masalah sudah terbukti lewat 11 test, dan hampir semuanya berakar di dua hal, yaitu stok tanpa ledger dan transaksi yang merujuk barang lewat nama.

Plan ini menggabungkan 5 dokumen sumber (QOL, Edge Cases Batch 1, Fix Audit/Rekonsiliasi/Undo, Planning WindowConfirm, Bug ClosingReportModal) dengan hasil verifikasi ke repo `Rzandi/ClearTask` v3.6.0. Hasilnya 57 item di 5 workstream (W0-W4) dengan tier High, Medium, Low, dan Nice-to-have.

**Prinsip kerja**

- Stabilkan sebelum menambah fitur baru.
- Satu operasi bisnis = satu service = satu `db.transaction`.
- Setiap bug punya test yang gagal dulu, lalu diperbaiki sampai hijau.
- Data yang sudah tercatat tidak berubah diam-diam (sesi tertutup, audit, snapshot harga).
- Setiap perubahan skema punya migrasi dan versi format backup.

**Status verifikasi (28 September 2026)**

| Status                          | Jumlah              | Isi                                                                                                                    |
| ------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Terbukti lewat test             | 9 masalah (11 test) | Edge #4, #7, #10, #12, #17, parser desimal (#18), crash hooks ClosingReportModal, void ikut laporan sesi, qty 0 jadi 1 |
| Terbukti dari kode, belum dites | 13                  | Edge #1, #3, #5, #8, #9, #11, #13, #14, #15, #16, #18 (shortcut), #19, #20                                             |
| Gap fitur, bukan bug            | 2                   | Edge #2 (Kas Tunai headline), Edge #6 (alert stok menipis)                                                             |
| Belum terverifikasi             | 2                   | Bug Vite v8 + `dexie-react-hooks` di dev server; perilaku printer Bluetooth di device asli                             |

Suite lama tetap aman: 392 test lolos, ditambah 11 expected-fail di `edgeCases.batch1.verify.test.jsx`.

**Koreksi terhadap dokumen sumber**

- Checkout sudah atomic (satu `db.transaction` untuk seq, potong stok, insert); yang belum atomic adalah update, void, restore, dan unpack.
- `requestPersistentStorage` sudah dipanggil di `AppBootstrap`, jadi tidak perlu jadi item.
- `window.confirm` ada 5 titik, bukan 4: `Sidebar.tsx` (reload app) terlewat.
- `package.json` dan `package-lock.json` tidak sinkron sehingga `npm ci` gagal.

## Peta Sektor & Matriks Prioritas

Masalah dikelompokkan ke 7 sektor; sektor A (15 item) dan B (8 item) memegang 23 dari 57 item dan menentukan urutan workstream.

| Sektor                    | Inti masalah                                                                      | Item utama                         |
| ------------------------- | --------------------------------------------------------------------------------- | ---------------------------------- |
| A. Integritas data & stok | Stok tanpa ledger, barang dirujuk lewat nama, arsip menghilangkan data            | W1-02, W1-03, W1-04, W1-06, W1-07  |
| B. Uang, kas & laporan    | Parsing angka Indonesia, harga tertimpa, laporan campur, kas tidak direkonsiliasi | W2-01 s.d. W2-04, W2-08 s.d. W2-11 |
| C. Audit & kontrol        | Riwayat edit terbatas, kasir bisa ditulis ulang, sesi tertutup bisa berubah       | W1-05, W2-05, W2-06, W2-07         |
| D. Stabilitas & kualitas  | Crash hooks, lint, lockfile, test invariant, tipe `any`                           | W0-01, W0-09, W0-10, W1-11, W4-05  |
| E. UX kasir & konsistensi | `window.confirm`/`alert`, shortcut, notifikasi stok, struk                        | W0-05..W0-08, W3-01, W3-02         |
| F. Perangkat              | Printer Bluetooth, 80mm, kamera barcode                                           | W3-04, W3-10, W4-06                |
| G. Fitur bisnis baru      | Qty desimal, hutang-piutang, diskon, foto, PDF                                    | W4-01, W4-02, W4-03, W4-07, W4-08  |

**Definisi tier**

| Tier         | Kriteria                                                        | Jumlah item |
| ------------ | --------------------------------------------------------------- | ----------- |
| High         | Bisa merusak uang, stok, atau laporan; atau memblokir item lain | 14          |
| Medium       | Mengganggu kerja harian atau melemahkan kontrol, ada workaround | 26          |
| Low          | Kenyamanan atau efisiensi, tidak memengaruhi kebenaran data     | 11          |
| Nice-to-have | Belum ada kebutuhan mendesak, dikerjakan bila ada permintaan    | 6           |

**Daftar item per tier**

| Tier         | Item                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| High         | W0-01, W0-02, W0-03, W0-04, W1-01, W1-02, W1-03, W1-04, W1-05, W1-06, W2-01, W2-02, W2-03, W2-04, W4-01, W4-02 |
| Medium       | W0-05..W0-09, W1-07..W1-11, W2-05..W2-11, W3-01..W3-06, W3-11                                                  |
| Low          | W0-10, W0-11, W1-12, W2-12, W3-07..W3-10, W4-03, W4-04, W4-05                                                  |
| Nice-to-have | W4-06..W4-11                                                                                                   |

**Skala effort** (perkiraan kasar, orang-hari): S = 0,5 · M = 1,5 · L = 4 · XL = 8. Total sekitar 89 orang-hari: W0 ≈ 3, W1 ≈ 21, W2 ≈ 17, W3 ≈ 13, W4 ≈ 35.

## W0 - Hotfix & Quick Wins

W0 menutup 4 risiko High dalam sekitar 3 orang-hari tanpa perubahan skema, dan tiap fix membalik satu test `it.fails` menjadi `it`.

| ID    | Item                                                      | Tier   | Effort | Fix dan bukti selesai                                                                                                                                                                                        |
| ----- | --------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W0-01 | Crash ClosingReportModal saat tutup sesi                  | High   | S      | Pindahkan `if (!isOpen) return null` ke bawah semua hook, atau pecah jadi wrapper + komponen inner. Selesai: test hooks lolos tanpa `.fails`. ✅                                                             |
| W0-02 | Transaksi void ikut laporan sesi                          | High   | S      | `getSessionTransactionsAsync` DAN `calculateSessionStats` sama-sama memfilter `!tx.deletedAt` (bug report tambahan mengonfirmasi `calculateSessionStats` juga belum difilter). Memblokir W2-02 dan W2-06. ✅ |
| W0-03 | qty 0 diam-diam jadi 1 di `addTransaction`                | High   | S      | Tolak qty <= 0 dengan error jelas, hapus `\|\| 1`, validasi `hargaSatuan >= 0`. ✅                                                                                                                           |
| W0-04 | Auto-purge Trash tanpa konfirmasi (#20)                   | High   | S      | Hapus `purge()` otomatis saat mount; ganti banner "N item lewat 30 hari" + ConfirmDialog; jangan purge barang yang masih dirujuk transaksi. ✅                                                               |
| W0-05 | F-key membajak fokus input (#14)                          | Medium | S      | Di dalam input hanya F1 (Help) yang aktif; F-key lain butuh fokus di luar input. Butuh keputusan (bagian Keputusan Terbuka). Selesai: F1 langsung aktif, F-key lain konfirmasi saat di input. ✅             |
| W0-06 | Shortcut Ctrl+K dan Ctrl+Enter hanya di daftar Help (#18) | Medium | S      | Implementasi Ctrl/Cmd+Enter = checkout (keranjang tidak kosong, tidak ada dialog terbuka); hapus Ctrl+K dari Help sampai command palette ada. ✅                                                             |
| W0-07 | Alamat/telepon dummy di struk (#11)                       | Medium | S      | Jika kosong, sembunyikan barisnya di struk dan share; di preview tampilkan hint "isi di Pengaturan", bukan teks dummy. ✅                                                                                    |
| W0-08 | Mode Outdoor reset tiap reload (#19)                      | Medium | S      | Simpan ke settings (Dexie), terapkan class saat bootstrap. ✅                                                                                                                                                |
| W0-09 | Pagar otomatis                                            | Medium | S      | ESLint `react-hooks/rules-of-hooks: error` dan `no-alert: warn`; masukkan `edgeCases.batch1.verify.test.jsx` ke `src/__tests__/`. ✅                                                                         |
| W0-10 | Lockfile tidak sinkron                                    | Low    | S      | `npm install`, commit lockfile, pastikan `npm ci` hijau di CI. ✅                                                                                                                                            |
| W0-11 | Bug Vite v8 + `dexie-react-hooks`                         | Low    | S      | Reproduksi di dev server; jika tidak terjadi, tutup item; jika terjadi, catat versi dan workaround. (Build & tests lolos tanpa issue). ✅                                                                    |

**Urutan PR yang disarankan**

1. `fix/session-report` - W0-01 + W0-02 (satu tema: alur tutup sesi).
2. `fix/checkout-guards` - W0-03.
3. `fix/trash-purge` - W0-04.
4. `chore/guards-and-lockfile` - W0-09, W0-10.
5. `fix/ux-quickwins` - W0-05..W0-08.

## Tambahan W0 (dari bug report & planning performa, 28 Sep)

| ID    | Item                                                                                                           | Tier   | Effort | Fix                                                                                                                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W0-12 | ErrorBoundary tidak tampilkan kode error di production                                                         | Medium | S      | Tampilkan kode error pendek (mis. "E310") + tombol Salin Detail Error; pesan tetap ramah, detail penuh tetap hanya di DEV. ✅                                                                                            |
| W0-13 | ESLint DAN lint-staged cuma menyisir `**/*.{js,jsx}` (5 file); 71 file `.ts`/`.tsx` tidak ter-lint             | High   | S      | Ubah scope `eslint.config.js DAN glob lint-staged di package.json ke **/*.{js,jsx,ts,tsx} - dua-duanya bolong, bukan cuma satu`. Prasyarat W0-09; naik ke High karena bug W0-01 lolos ke production akibat celah ini. ✅ |
| W0-14 | TrashManager narik seluruh tabel (4 tempat) padahal index `deletedAt` sudah ada                                | Medium | S      | Ganti `toArray()` jadi query berbasis index `deletedAt`. ✅                                                                                                                                                              |
| W0-15 | addTransaction narik seluruh inventory tiap checkout                                                           | Medium | S      | Query hanya barang yang namanya ada di keranjang. ✅                                                                                                                                                                     |
| W0-16 | useExpenses tanpa `limit()`, beda pola dari useTransactions                                                    | Low    | S      | Samakan pola `limit()`. ✅                                                                                                                                                                                               |
| W0-17 | Tidak ada file LICENSE, tidak ada field license di package.json, padahal CONTRIBUTING.md mengundang kontribusi | Low    | S      | Pilih lisensi (mis. MIT), tambah file LICENSE, isi field license di package.json. ✅                                                                                                                                     |
| W0-18 | CHANGELOG.md tidak punya section \[Unreleased\] di atas (konvensi Keep a Changelog)                            | Low    | S      | Tambah section \[Unreleased\] di atas 3.6.0 sebelum mulai W0-W5, biar PR kecil tidak harus buru-buru mutusin nomor versi. ✅                                                                                             |

Urutan PR nambah: `fix/error-boundary-code` (W0-12), `chore/lint-scope` (W0-13, gabung ke PR #4), `perf/no-full-scans` (W0-14..W0-16), chore/repo-hygiene (W0-17, W0-18).

**Gerbang G0:** `npm run test:run` hijau, jumlah `it.fails` berkurang 3 (hooks, deletedAt, qty 0) dan test baru untuk purge lolos, tidak ada `window.alert` baru.

## W1 - Fondasi Data (High)

W1 menyelesaikan akar masalah stok dan identitas produk dalam sekitar 21 orang-hari, dan membalik 5 test `it.fails` (#7 dua test, #10, #4, #12).

| ID    | Item                                                                            | Tier   | Effort | Sektor | Bukti                                  |
| ----- | ------------------------------------------------------------------------------- | ------ | ------ | ------ | -------------------------------------- |
| W1-01 | ADR: identitas produk dan ledger stok                                           | High   | S      | A      | Keputusan tertulis (ADR-001) ✅        |
| W1-02 | Migrasi Dexie v12: `inventoryId` + snapshot di item transaksi                   | High   | M      | A      | Kode (db.ts v12) ✅                    |
| W1-03 | Tabel `stock_movements` + saldo awal                                            | High   | L      | A      | Test #7 ✅                             |
| W1-04 | `transactionService`: checkout, void, restore, edit dalam satu `db.transaction` | High   | L      | A      | Test #7 ✅                             |
| W1-05 | Sesi immutable: `closingSnapshot` + guard edit setelah tutup                    | High   | M      | C      | Kode (useSession.ts) ✅                |
| W1-06 | Laporan sesi membaca transaksi arsip (#10)                                      | High   | M      | A      | Test #10 ✅                            |
| W1-07 | Nama kanonik + dedup (#4)                                                       | Medium | M      | A      | Test #4 ✅                             |
| W1-08 | Hapus kategori yang masih dipakai (#12)                                         | Medium | S      | A      | Test #12 ✅                            |
| W1-09 | Unpack atomic, hapus default `packRatio \|\| 24`                                | Medium | M      | A      | Kode (transactionService.ts) ✅        |
| W1-10 | Versi format backup + merge `stock_movements`                                   | Medium | M      | A      | Kode (databaseManager.ts) ✅           |
| W1-11 | Test invarian stok (fake-indexeddb)                                             | Medium | M      | D      | Test baru (stockInvariant.test.ts) ✅  |
| W1-12 | Alat "Cek Drift Stok" untuk admin                                               | Low    | M      | A      | Test baru (stockDriftCheck.test.ts) ✅ |

**Model data (tambahan, tidak menghapus field lama)**

```ts
// item di dalam transaksi
{ inventoryId: string | null,      // null = belum tertaut ke master barang
  namaSnapshot: string,
  hargaModalSnapshot: number | null } // null = modal tidak diketahui

// tabel baru stock_movements
{ id, inventoryId, delta, reason, refType, refId, at, by }
// reason: opening | sale | void | restore | edit | unpack | adjust | import
```

`inventory.quantity` tetap ada sebagai saldo terhitung dan ditulis dalam transaksi DB yang sama dengan ledger, jadi jalur baca yang sekarang tidak berubah. Invarian yang dijaga: `quantity = saldo awal + jumlah semua delta`.

**Langkah implementasi**

1. W1-01: tulis ADR (identitas produk, ledger, sesi immutable) dan setujui sebelum kode.
2. W1-02: migrasi v12 dengan `.upgrade()` yang mengisi `inventoryId` dari nama kanonik (trim, lowercase, spasi ganda dilipat). Yang tidak cocok atau ambigu diberi `inventoryId: null` dan dilaporkan. `hargaModalSnapshot` riwayat lama diisi `null`, bukan ditebak dari modal sekarang.
3. W1-03: buat tabel, isi satu movement `opening` per barang dari `quantity` saat migrasi. Riwayat lama tidak direkonstruksi.
4. W1-04: pindahkan logika dari `useTransactionData` ke service. Urutan: checkout (pola atomic yang sudah ada dipertahankan), lalu void dan restore (restore memotong stok lagi, stok boleh negatif tapi ditandai), lalu edit (selisih qty jadi movement `edit`). Hook jadi pembungkus tipis. Service baru ditulis tanpa `any`.
5. W1-05: `closeSession` menyimpan `closingSnapshot` (jumlah transaksi, total, per metode, total tunai). Edit atau void di sesi tertutup wajib alasan dan menandai `postCloseAdjusted`.
6. W1-06: helper `getSessionTransactions` menggabungkan tabel aktif dan `archive_transactions`; dialog arsip memperingatkan dampaknya sampai helper ini live.
7. W1-07..W1-10: dedup lewat `nameKey` yang sama di add, update, import, merge, dan sinkronisasi dari transaksi; kategori terpakai ditolak atau ditawari pindah kategori; unpack lewat service.

**Improvisasi: rollout aman.** Ledger dirilis dengan flag di settings; satu rilis pertama menulis ledger sambil menjalankan Cek Drift (W1-12) otomatis di latar belakang, dan flag baru jadi default setelah drift 0 di data nyata.

**Gerbang G1:** test #7, #10, #4, #12 lolos tanpa `.fails`; test invarian W1-11 hijau; migrasi v12 diuji pada salinan backup nyata; restore backup lama tetap berhasil.

## W2 - Uang & Kas (High/Medium)

Dijalankan setelah W1 karena rekonsiliasi dan Undo Checkout butuh laporan sesi yang sudah bersih dari transaksi ter-void (W0-02/W0-12) dan ledger stok (W1-03/W1-04). Sekitar 17 orang-hari.

| ID    | Item                                                        | Tier   | Effort | Fix                                                                                                                                                                                                                                                                                    |
| ----- | ----------------------------------------------------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W2-01 | Util `parseIDNumber` / `formatIDR` bersama                  | High   | M      | Satu util untuk semua titik parsing ("0,57" -> 0.57, "12.000" -> 12000), pakai di form, import CSV, dan inline syntax. Ganti `Number()` dan `Math.floor`. ✅                                                                                                                           |
| W2-02 | Kas Tunai di Closing Report (#2)                            | High   | M      | Hitung dari transaksi bersih (setelah W0-02/W0-12): total tunai masuk, dikurangi kembalian dan pengeluaran tunai (nyambung `expenses`). Disederhanakan - tidak ada input kas awal laci; kas tunai dihitung murni dari aktivitas transaksi sepanjang sesi, bukan saldo laci absolut. ✅ |
| W2-03 | Rekonsiliasi sebelum tutup sesi, bukan sesudah              | High   | M      | Urutan: hitung ekspektasi kas -> input kas fisik -> tampilkan selisih -> baru `closeSession()`. Tombol Lewati butuh alasan wajib + tercatat di `closingSnapshot`. ✅                                                                                                                   |
| W2-04 | Undo Checkout: cart dan stok tidak benar-benar kembali (#C) | High   | M      | Pakai `transactionService.void` dari W1-04; timer pakai timestamp deadline, bukan `setInterval` di dalam state updater. ✅                                                                                                                                                             |
| W2-05 | Riwayat audit dibatasi 20 entri, tanpa transaksi DB         | Medium | M      | Tabel append-only `audit_log`; `getSessionTransactionsAsync` bukan tempat query ini lagi. ✅                                                                                                                                                                                           |
| W2-06 | Alasan wajib untuk void (#14)                               | Medium | S      | Field alasan di dialog konfirmasi void, tersimpan di `audit_log`. ✅                                                                                                                                                                                                                   |
| W2-07 | Kasir bisa ditulis ulang lewat edit (#17)                   | Medium | S      | `updateTransaction` menolak perubahan field `kasir`; field itu hanya diisi saat create. ✅                                                                                                                                                                                             |
| W2-08 | Harga custom tertimpa harga katalog (#1)                    | Medium | S      | Prioritaskan harga yang diketik user di baris itu. ✅                                                                                                                                                                                                                                  |
| W2-09 | `isValid` tidak cek harga jual vs modal (#3)                | Medium | S      | Validasi harga jual < modal -> warning, bukan block, kecuali user konfirmasi. ✅                                                                                                                                                                                                       |
| W2-10 | Margin palsu dari `hargaModal \|\| 0` (#8)                  | Medium | S      | Modal `null`/`undefined` di chart margin ditandai "tidak diketahui", bukan dihitung sebagai 0. ✅                                                                                                                                                                                      |
| W2-11 | Import CSV pakai `split(',')` naif (#9)                     | Medium | M      | Parser CSV yang menangani koma di dalam quote; validasi baris sebelum insert. ✅                                                                                                                                                                                                       |
| W2-12 | Sesi lintas hari (buka jam 23:00, tutup jam 01:00)          | Low    | S      | `tanggalMulai` jadi acuan pelaporan, bukan tanggal sistem saat query. ✅                                                                                                                                                                                                               |

**Kas Tunai - definisi resmi (mengisi gap #2)**

```
Kas Tunai (Sesi) = Total Penjualan Tunai (transaksi aktif, metode = Tunai)
                  - Total Kembalian
                  - Total Pengeluaran Tunai (dari expenses, metode = Tunai)

Catatan: ini kas MASUK/KELUAR selama sesi berjalan, bukan saldo laci absolut - toko tidak melacak kas awal laci. Kasir membandingkan angka ini terhadap selisih kas fisik yang dihitung manual di awal-akhir sesi.
```

Selisih terhadap kas fisik dicatat di `closingSnapshot` beserta alasan bila di luar toleransi Rp 50.000 (dikonfirmasi ke pemilik toko).

**Gerbang G2:** test rekonsiliasi dan Undo Checkout baru hijau; `parseIDNumber` dipakai di minimal 5 titik pemanggilan lama; tidak ada lagi pemanggilan `Number()` langsung pada input desimal Indonesia.

## W3 - QOL, Konsistensi UI & Performa Struktural

Sekitar 13 orang-hari. Bagian performa di sini adalah Fase 2 dari planning optimasi (Fase 0 pengukuran dan Fase 1 quick win sudah masuk W0-13..W0-16 dan Gerbang G0/G3 di bawah).

| ID           | Item                                                                                      | Tier   | Effort | Fix                                                                                                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------- | ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W3-01        | Confirm dialog berbasis promise, ganti 5 titik `window.confirm` (termasuk Sidebar reload) | Medium | M      | Hook `useConfirm()`; ESLint `no-alert: error` setelah migrasi selesai. ✅                                                                                                                                         |
| W3-02        | `alert()` native di \~6 file                                                              | Medium | M      | Ganti ke sistem toast yang sudah ada. ✅                                                                                                                                                                          |
| W3-03        | Notifikasi stok menipis belum baca `minStock` (#6)                                        | Medium | S      | `NotificationPanel` membaca `minStock` per barang, bukan angka tetap. ✅                                                                                                                                          |
| W3-04        | Reconnect printer Bluetooth otomatis                                                      | Medium | M      | Simpan `deviceId` terakhir, tawarkan reconnect saat device ditemukan lagi. ✅                                                                                                                                     |
| W3-05        | Reminder backup berkala                                                                   | Medium | S      | Toast/badge jika belum backup > N hari (pakai `autoBackupOnClose` yang sudah ada sebagai basis). ✅                                                                                                               |
| W3-06        | Custom date range di laporan                                                              | Medium | M      | Date range picker di `LaporanExport`, konsisten dengan `min`/`max` dari W0-05 kalau relevan. ✅                                                                                                                   |
| W3-07        | Command palette Ctrl+K sungguhan                                                          | Low    | L      | Lanjutan W0-06; daftar aksi minimal checkout, buka tab, cari barang.                                                                                                                                              |
| W3-08        | Struk 80mm                                                                                | Low    | M      | Template alternatif di `StrukModal`. ✅                                                                                                                                                                           |
| W3-09        | Highlight hasil pencarian                                                                 | Low    | S      | Highlight substring kata kunci pencarian dengan `<HighlightText>` di katalog & tabel. ✅                                                                                                                          |
| W3-10        | Barcode via kamera                                                                        | Low    | L      | Lib scan browser-based, fallback input manual tetap ada.                                                                                                                                                          |
| W3-11 (Perf) | Satukan `useInventory`/`useExpenses` jadi satu langganan `useLiveQuery` per tabel         | Medium | M      | Provider/context (pola mirip `SettingsContext`); `InputPenjualan`+`InventoryManager`, `LaporanExport`+`InputKeluaran` konsumsi context yang sama.                                                                 |
| W3-12 (Perf) | Pecah `InputPenjualan.tsx` (1.416 baris, 20 `useState`)                                   | Medium | L      | Pisah jadi Form Manual, Katalog Barang, Keranjang, Panel Pembayaran, Cek Stok, masing-masing `React.memo`. Baseline Fase 0 dulu (lihat Strategi Test) sebelum dan sesudah, biar dampaknya terukur bukan perasaan. |

**Prinsip dari planning performa**: satu PR kecil per poin, jangan digabung borongan, supaya regresi gampang dilacak. 392+ test yang ada dipakai sebagai jaring pengaman tiap perubahan.

**Mobile UX**

| ID    | Item                                                                                                                                                                                             | Tier   | Effort | Fix                                                                                                                                                                                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W3-18 | Panel Keranjang mobile satu scroll container gabung list+ringkasan+pembayaran, tombol checkout ketutup bottom nav (dari `docs/ClearTask-Planning-Fix-Keranjang-Mobile.md`, belum diimplementasi) | Medium | M      | Pecah jadi 2 scroll box independen: (1) list barang, tinggi dibatasi \~32vh + mini-summary header, (2) ringkasan + form pembayaran. Sekalian benerin padding bawah tombol checkout. Keputusan terbuka: tinggi pasti box 1, apakah mini-summary sticky, dan apakah digabung satu PR dengan fix padding. ✅ |

**Hardware tambahan**

| ID    | Item                                                                    | Tier         | Effort | Fix                                                                                                                                              |
| ----- | ----------------------------------------------------------------------- | ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| W3-17 | Tidak ada perintah buka laci kasir (cash drawer kick) di ESC/POS helper | Nice-to-have | S      | Tambahkan command kick drawer standar (ESC p m t1 t2) di `bluetoothPrinterHelper.ts`, dipicu otomatis saat print struk untuk transaksi Tunai. ✅ |

**Konsistensi visual (Low - dikerjakan paling akhir, setelah W0-W2 selesai)**

Fondasi desain ClearTask sudah baik (sistem warna dark neumorphic + neon cyan sendiri, font Outfit, ikon SVG custom, tanpa emoji) - bukan tampilan generik AI. Yang belum konsisten cuma di eksekusi detail:

| ID    | Item                                                                                 | Tier         | Effort | Fix                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------ | ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W3-13 | `rounded-*` tercampur tanpa skala (lg/xl/2xl/md/full dipakai acak di file yang sama) | Low          | S      | Tetapkan skala tetap: `sm` badge/tombol kecil, `md` input, `lg` card, `full` pill/avatar; terapkan bertahap per komponen yang disentuh workstream lain. |
| W3-14 | Shadow neumorphic dipakai di semua card, jadi terasa generik                         | Low          | S      | Neumorphic cuma di elemen fokus utama (kartu kas, tombol checkout); elemen sekunder pakai border tipis tanpa shadow.                                    |
| W3-15 | Hierarki tipografi datar (banyak `text-xs`/`text-sm` berdempetan)                    | Low          | S      | Naikkan kontras ukuran antara angka penting (total, harga) vs label pendukung.                                                                          |
| W3-16 | Motion minim, cuma fade/slide generik                                                | Nice-to-have | S      | Micro-interaction di aksi penting: angka kas count-up saat checkout, item void slide-out.                                                               |

**Gerbang G3:** tidak ada `window.confirm`/`alert()` baru; W3-11 dan W3-12 masing-masing diukur ulang dengan React DevTools Profiler dan dibandingkan ke baseline Fase 0, bukan hanya "terasa lebih cepat".

## W4 - Fitur Baru & Nice-to-Have

Baru dikerjakan setelah W1-W3 stabil, karena beberapa item di sini menambah kompleksitas data yang justru berbahaya kalau ledger dan parsing uang (W1, W2) belum solid. Sekitar 35 orang-hari, terbesar dari semua workstream, dan effort-nya boleh direvisi begitu ada kejelasan dari Keputusan Terbuka.

| ID    | Item                                                                    | Tier         | Effort | Catatan                                                                                                                                                                                                                                                                                   |
| ----- | ----------------------------------------------------------------------- | ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W4-01 | Qty desimal (timbangan, QOL #18)                                        | High         | L      | \*Dikonfirmasi: toko retail frozen food, ada barang timbangan (buah, sayur). Butuh util `parseIDNumber` (W2-01) dan aturan pembulatan rupiah lebih dulu.                                                                                                                                  |
| W4-02 | Hutang-piutang pelanggan                                                | High         | XL     | \*Dikonfirmasi: toko mengizinkan pelanggan berutang. Scope lebih besar dari kelihatan: sama sekali belum ada entity pelanggan di app (baru sebatas teks UI), jadi perlu CRUD pelanggan + pencarian, baru ledger piutang terpisah dari stock_movements. Effort XL ini asumsikan itu semua. |
| W4-03 | Riwayat perubahan harga per barang                                      | Low          | M      | Tabel `price_history`, dicatat tiap update harga di W1 service.                                                                                                                                                                                                                           |
| W4-04 | Diskon per item / per transaksi                                         | Low          | M      | Field diskon di `CartItem`, masuk snapshot transaksi.                                                                                                                                                                                                                                     |
| W4-05 | Bersihkan tipe `any` di `types/index.ts` dan service                    | Low          | M      | Terutama `[key: string]: any` di `Transaction`/`Session`; audit setelah W1 selesai supaya tipe baru (ledger, snapshot) ikut terdefinisi rapi.                                                                                                                                             |
| W4-06 | Virtualisasi list (`react-window`) untuk TransactionTable dan inventory | Nice-to-have | M      | Fase 3 dari planning performa - hanya dikerjakan kalau data nyata sudah ribuan baris dan paginasi (yang sudah ada) mulai terasa berat, diukur ulang dari baseline Fase 0.                                                                                                                 |
| W4-07 | Export PDF laporan                                                      | Nice-to-have | M      | -                                                                                                                                                                                                                                                                                         |
| W4-08 | Foto barang di inventory                                                | Nice-to-have | M      | Pertimbangkan biaya storage IndexedDB (lihat W1-10 versi backup).                                                                                                                                                                                                                         |
| W4-09 | Multi-user / role sederhana                                             | Nice-to-have | L      | Prasyarat W2-07 (kasir tidak bisa ditulis ulang) sudah lebih berguna kalau ini jalan.                                                                                                                                                                                                     |
| W4-10 | Sinkronisasi cloud opsional                                             | Nice-to-have | XL     | Field `syncStatus` sudah ada di tipe, belum ada implementasi; besar, taruh di luar roadmap 5 workstream ini.                                                                                                                                                                              |
| W4-11 | Command palette lanjutan (aksi kustom, riwayat perintah)                | Nice-to-have | M      | Lanjutan W3-07.                                                                                                                                                                                                                                                                           |

## W5 - Ketahanan Data & Observability

Baru muncul dari audit terpisah (bukan dari 7 dokumen sumber awal), sekitar 8 orang-hari. PIN lock/session gate (kode sudah ada di `src/archive/`, tidak dipakai) sengaja TIDAK dimasukkan - dianggap belum relevan untuk skala toko saat ini. Perhitungan pajak/PPN juga sengaja TIDAK dimasukkan ke plan ini.

| ID    | Item                                                                                                     | Tier   | Effort | Fix                                                                                                                                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W5-01 | Backup tidak dienkripsi, tidak ada strategi keluar dari device                                           | High   | M      | `utils/crypto.ts` (deriveKey, encrypt/decrypt) sudah ada tapi tidak terpasang ke `databaseManager.ts`; sambungkan ke alur export backup dengan password opsional. Tambah pengingat "simpan salinan di luar device" (Drive/email) di W3-05. |
| W5-02 | E2E cuma cover 3 flow lama (`cashier-flow`, `inventory`, `visual-regression`), tidak ada untuk flow baru | Medium | M      | Tambah spec Playwright untuk tutup sesi + rekonsiliasi (W2-03), void (W2-06), dan Undo Checkout (W2-04) - flow yang paling banyak berubah di W1/W2.                                                                                        |
| W5-03 | Tidak ada observability produksi selain ErrorBoundary                                                    | Medium | S      | Pasang error tracking (mis. Sentry) supaya error di device kasir lapangan kelihatan tanpa nunggu laporan manual; sinkron dengan kode error W0-12.                                                                                          |
| W5-04 | Alur update Service Worker (`sw.js`) belum diverifikasi                                                  | Medium | S      | Uji: deploy versi baru, pastikan user dapat notifikasi/prompt update, bukan kepake bundle lama diam-diam.                                                                                                                                  |
| W5-05 | Aksesibilitas dasar minim (9 `aria-`/`role=` di seluruh `InputPenjualan.tsx`)                            | Low    | M      | Navigasi keyboard penuh untuk alur checkout, label `aria-*` di form input harga/qty.                                                                                                                                                       |
| W5-06 | 15 kerentanan dependency via npm audit (9 high, 5 moderate, 1 low)                                       | Medium | S      | Kebanyakan di rantai tooling build (vite, postcss, browserslist, tmp, undici) - tidak ke-bundle ke produksi. Jalankan npm audit fix, review breaking change, jadwalkan cek berkala (mis. bulanan atau Dependabot).                         |
| W5-07 | Field kasir cuma teks bebas, siapa saja bisa ketik nama apa saja, melemahkan audit_log (W2-05)           | Medium | M      | Kasir jadi daftar akun sederhana (nama + PIN opsional per kasir, bukan role penuh), dipilih dari dropdown saat buka sesi, bukan diketik bebas. Prasyarat W4-09 (multi-user) jadi lebih murah setelah ini ada.                              |

**Gerbang G5:** proses backup-restore lengkap teruji dengan password (opsional); minimal 3 spec E2E baru hijau di CI; error tracking terpasang dan terverifikasi menangkap error nyata (bukan cuma dummy throw).

**Gerbang G4:** setiap item W4 yang disepakati punya test sendiri sebelum merge; W4-06 wajib angka before/after dari Profiler, bukan asumsi.

## Arsitektur Target

**Layer sekarang**: komponen -> hook (`useTransactionData`, `useInventory`, dst, langsung berisi logika bisnis) -> Dexie. Tidak ada layer service, sehingga aturan bisnis (potong stok, hitung kas) tersebar dan gampang tidak konsisten antar hook (persis yang terjadi di checkout vs void vs unpack).

**Layer target**

```
Komponen (UI, state form)
   |
Hook (useLiveQuery, pass-through tipis ke service)
   |
Service (transactionService, inventoryService, sessionService)
   - satu db.transaction('rw', ...) per operasi bisnis
   - satu tempat aturan: potong/kembalikan stok, tulis ledger, tulis audit_log
   |
Dexie (db.ts) - skema, migrasi versi
```

Hook tetap dipertahankan untuk state reaktif (`useLiveQuery`), tapi logika tulis (write) pindah semua ke service. Ini juga yang membuat W3-11 (context bersama untuk `useInventory`/`useExpenses`) lebih murah dilakukan setelah service ada, karena komponen tinggal ambil data dari satu langganan, bukan menduplikasi logika tulis.

**Migrasi Dexie**: skema sekarang di versi 11 (`src/services/db.ts`). Tabel `stock_movements` dan `audit_log`, plus field `inventoryId`/`namaSnapshot`/`hargaModalSnapshot` di item transaksi, masuk sebagai `version(12)`. Setiap `.upgrade()` idempoten dan diuji terhadap salinan backup asli, bukan data dummy saja.

**Format backup**: tambahkan field versi (`schemaVersion` atau setara) ke file backup supaya restore bisa mendeteksi backup lama dan memandu migrasi/derivasi ledger dari `quantity`, bukan gagal diam-diam.

**Konsistensi UI async**: pola confirm dialog berbasis promise (W3-01) dan context data bersama (W3-11) sebaiknya diberi nama standar sekali (`useConfirm`, `useInventoryContext`, `useExpensesContext`) supaya fitur baru di W4 langsung memakainya, bukan menambah pola baru lagi.

## Strategi Test, Baseline Performa & Definition of Done

**Pola test**: tulis test yang menegaskan perilaku BENAR dulu (bukan cuma reproduksi bug), jalankan sebagai assertion biasa untuk pastikan gagal karena alasan yang tepat, lalu tandai `it.fails` sampai fix-nya masuk. `edgeCases.batch1.verify.test.jsx` (11 test) dipakai sebagai pola untuk item W0-W2 lain yang belum punya test.

**Fase 0 - Baseline performa (wajib sebelum W3-11/W3-12/W4-06)**

1. Isi data dummy realistis: sesuai skala nyata: 300 produk (toko punya 250+ aktual) dan 20.000 transaksi (proyeksi setahun dari 20-50 transaksi/hari) sebagai uji beban jangka menengah.
2. Profiling di device asli, bukan cuma desktop: waktu buka app pertama kali, waktu checkout, waktu pindah tab Laporan/Database, waktu buka Trash.
3. React DevTools Profiler saat mengetik di form Input Penjualan, untuk melihat komponen mana yang re-render tanpa perlu.
4. Catat semua angka (ms) sebagai baseline tertulis di repo (mis. `docs/perf-baseline.md`), jadi pembanding untuk W3-11, W3-12, dan W4-06.

**Definition of Done per item**

- Ada test yang gagal sebelum fix dan lolos sesudahnya (untuk bug/edge case), atau acceptance criteria tertulis (untuk fitur baru).
- Tidak menurunkan cakupan test yang sudah ada (392 test dasar tetap hijau).
- Perubahan skema Dexie disertai `.upgrade()` yang diuji ke salinan backup asli.
- Perubahan performa (W3-11, W3-12, W4-06) disertai angka before/after terhadap baseline Fase 0, bukan klaim "terasa lebih cepat".
- Perubahan yang menyentuh uang atau stok di-review minimal oleh satu orang lain sebelum merge.

**PR slicing**: satu PR = satu ID item (atau kelompok kecil bertema, seperti W0-01+W0-02). Jangan menggabung fix bug dengan refactor besar dalam PR yang sama, supaya regresi gampang dilacak baliknya - ini prinsip yang juga ditekankan di planning performa terpisah.

## Roadmap, Dependensi, Risiko & Langkah Berikutnya

**Urutan wajib**: W0 -> W1 -> W2, karena W2-02/W2-03/W2-04 butuh laporan sesi bersih (W0-02/W0-12) dan ledger stok (W1-03/W1-04). W3 dan sebagian W4 bisa paralel dengan W2 setelah W1 selesai, karena tidak menyentuh uang/stok secara langsung, kecuali W4-01 dan W4-02 yang menunggu W2-01. W5 independen dari W1-W4 (kecuali W5-02 yang menunggu flow W2 selesai untuk ada yang di-e2e-kan) dan bisa dikerjakan paralel kapan saja, termasuk sejak W0.

**Risiko utama**

| Risiko                                                                          | Dampak                                  | Mitigasi                                                                                            |
| ------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Migrasi v12 gagal di data toko nyata yang sudah berjalan lama                   | Kehilangan histori stok/transaksi       | Uji `.upgrade()` ke salinan backup asli sebelum rilis; rilis W1 di belakang feature flag (lihat W1) |
| Rekonsiliasi kas (W2-03) dianggap merepotkan kasir, tombol Lewati terus dipakai | Kontrol jadi percuma                    | Alasan wajib + laporan pemakaian tombol Lewati ke pemilik toko                                      |
| Fase 2 performa (W3-11/W3-12) dikerjakan tanpa baseline Fase 0                  | Effort terbuang, regresi tidak ketahuan | Gerbang G3 mewajibkan angka before/after                                                            |
| Refactor besar (service layer, split komponen) dicampur PR fix bug              | Regresi susah dilacak                   | DoD: satu PR satu ID/tema                                                                           |

**Keputusan terbuka (butuh jawaban dari pemilik toko atau tim)**

1. **Terjawab (29 Sep):** toko retail frozen food, ada barang timbangan (buah, sayur) dan mengizinkan pelanggan berutang -> W4-01 dan W4-02 naik ke High (lihat tabel W4).
2. **Terjawab (29 Sep):** toleransi selisih kas Rp 50.000 -> dipakai di W2-03 dan Risiko Utama.
3. **Terjawab (29 Sep):** skala data nyata sekitar 250+ produk, 20-50 transaksi/hari -> dipakai sebagai baseline Fase 0.
4. **Masih terbuka:** perilaku F-key di dalam input (W0-05) - nonaktifkan semua F-key kecuali F1, atau tetap aktif tapi dengan konfirmasi?

**Langkah berikutnya**

1. Setujui ADR W1-01; Keputusan Terbuka #1-3 sudah terjawab (29 Sep), tinggal #4 (perilaku F-key).
2. Mulai PR pertama W0 (`fix/session-report`: W0-01 + W0-02, termasuk fix `calculateSessionStats`).
3. Jadwalkan Fase 0 (baseline performa) paralel dengan W0, supaya datanya sudah ada saat masuk W3.
