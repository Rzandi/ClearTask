# Bug Report: Audit Manual v3.7.0 (W0–W3)

**Lingkup:** audit kode manual (bukan cuma baca checklist) terhadap rilis v3.7.0, menyasar area paling berisiko: uang (kas, pengeluaran), stok (ledger, void/restore), dan integritas data (audit log, backup).
**Metode:** baca langsung source + cross-check terhadap test suite yang ada, bukan menjalankan aplikasi.
**Tanggal:** 5 Oktober 2026 (temuan #1-9), dilanjutkan 6 Oktober 2026 (temuan #10-14, menuntaskan daftar "Belum dicek")

> **Update 11 Oktober 2026:** Cross-check manual ke kode aktual selesai. Dari 14 temuan, **7 sudah diperbaiki** di kode terkini (kemungkinan dipatch selama sprint W3-W4). **7 sisanya** belum diperbaiki dan sudah masuk ke rencana fix di [`docs/W4-BUG-FIX-PLAN.md`](docs/W4-BUG-FIX-PLAN.md).
>
> **Update 11 Oktober 2026 (malam):** Bug-01 s/d Bug-05 selesai diperbaiki (commit b4f3923, 50e374d, 53079f3, c5efc1f, 21f848a). Tersisa: **#4** (audit log UI — backlog W5).
>
> **Update 12 Oktober 2026:** Refactor-01 (#14 inline parser dead code) selesai — `parseInlineCommand` di-wire ke `ManualItemForm.tsx` dengan preview real-time + auto-fill on submit. Test: 29/29 passed.

---

## Ringkasan Prioritas

| #   | Severity                     | Judul                                                                            | File Utama                                          | Status                                                                                                                     |
| --- | ---------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | 🔴 Critical                  | Restore transaksi dari Trash bypass `transactionService`                         | `TrashManager.tsx`                                  | ✅ Diperbaiki                                                                                                              |
| 2   | 🟠 High (uang)               | `sessionId` gak nempel ke data Pengeluaran                                       | `useExpenses.ts`, `InputKeluaran.tsx`               | ✅ Diperbaiki                                                                                                              |
| 3   | 🟠 High (data)               | Backup JSON gak include `audit_log`                                              | `databaseManager.ts`                                | ✅ Diperbaiki                                                                                                              |
| 4   | 🟡 Medium                    | Audit log write-only, nol UI buat liatnya                                        | `auditService.ts`                                   | ⏳ Backlog (W5)                                                                                                            |
| 5   | 🟡 Medium                    | Import CSV rawan `\r` di kolom terakhir                                          | `InventoryManager.tsx`, `csvParser.ts`              | ✅ Diperbaiki                                                                                                              |
| 6   | 🟢 Low                       | Permanent purge gak nulis `audit_log`                                            | `TrashManager.tsx`                                  | ✅ Diperbaiki                                                                                                              |
| 7   | 🔵 Kosmetik                  | Type `filterDate` kedaluwarsa                                                    | `useTransactionFilter.ts`                           | ✅ Diperbaiki                                                                                                              |
| 8   | 🟠 High (data)               | `EditTransactionModal` nama barang teks bebas, `inventoryId` lama kebawa         | `EditTransactionModal.tsx`                          | 🔴 [Rencana fix](docs/W4-BUG-FIX-PLAN.md#-bug-02--fix-edittransactionmodal--null-kan-inventoryid-saat-nama-barang-berubah) |
| 9   | 🟡 Medium                    | Counter jumlah transaksi di `RiwayatSesi` gak filter void & gak include arsip    | `RiwayatSesi.tsx`                                   | 🟡 [Rencana fix](docs/W4-BUG-FIX-PLAN.md#-bug-03--fix-counter-badge-riwayatsesi--filter-void--include-arsip)               |
| 10  | 🟠 High (uang)               | `ReportingChart.tsx` masih pakai `hargaModal\|\|0`, margin palsu 100% masih ada  | `ReportingChart.tsx`, `transactionService.ts`       | 🔴 [Rencana fix](docs/W4-BUG-FIX-PLAN.md#-bug-01--fix-reportingchart-margin-palsu--hargamodalsnapshotx-0-di-auto-detect)   |
| 11  | 🟡 Medium                    | Dashboard "hari pertama" bisa salah nyala di toko yang transaksinya udah diarsip | `useTransactionMetrics.ts`                          | 🟡 [Rencana fix](docs/W4-BUG-FIX-PLAN.md#-bug-04--fix-usetransactionmetrics-isfirstday--include-archive_transactions)      |
| 12  | 🟠 High (integritas roadmap) | Command Palette (Ctrl+K) diklaim ✅ di `HelpModal`, nol implementasi             | `HelpModal.tsx`, Master Plan W3-07                  | ✅ Diperbaiki (sudah ada `CommandPalette.tsx` + `useCommandPalette.ts`)                                                    |
| 13  | 🟡 Medium                    | Upload foto QRIS gak ada batas ukuran/kompresi                                   | `SetupWizardModal.tsx`, `SettingsModal.tsx`         | 🟡 [Rencana fix](docs/W4-BUG-FIX-PLAN.md#-bug-05--fix-upload-qris--validasi-ukuran--kompresi-canvas)                       |
| 14  | 🟠 High (fitur)              | Inline Syntax Parser ("Susu 2x @15000") dead code — nol dipanggil dari UI        | `inlineSyntaxParser.ts`, `ManualItemForm.tsx`       | ✅ Diperbaiki (wired ke `ManualItemForm.tsx`)                                                                              |
| 4   | 🟡 Medium                    | Audit log write-only, nol UI buat liatnya                                        | `auditService.ts`                                   |
| 5   | 🟡 Medium                    | Import CSV rawan `\r` di kolom terakhir                                          | `InventoryManager.tsx`, `csvParser.ts`              |
| 6   | 🟢 Low                       | Permanent purge gak nulis `audit_log`                                            | `TrashManager.tsx`                                  |
| 7   | 🔵 Kosmetik                  | Type `filterDate` kedaluwarsa                                                    | `useTransactionFilter.ts`                           |
| 8   | 🟠 High (data)               | `EditTransactionModal` nama barang teks bebas, `inventoryId` lama kebawa         | `EditTransactionModal.tsx`, `transactionService.ts` |
| 9   | 🟡 Medium                    | Counter jumlah transaksi di `RiwayatSesi` gak filter void & gak include arsip    | `RiwayatSesi.tsx`                                   |
| 10  | 🟠 High (uang)               | `ReportingChart.tsx` masih pakai `hargaModal\|\|0`, margin palsu 100% masih ada  | `ReportingChart.tsx`, `transactionService.ts`       |
| 11  | 🟡 Medium                    | Dashboard "hari pertama" bisa salah nyala di toko yang transaksinya udah diarsip | `useTransactionMetrics.ts`                          |
| 12  | 🟠 High (integritas roadmap) | Command Palette (Ctrl+K) diklaim ✅ di `HelpModal`, nol implementasi             | `HelpModal.tsx`, Master Plan W3-07                  |
| 13  | 🟡 Medium                    | Upload foto QRIS gak ada batas ukuran/kompresi                                   | `SetupWizardModal.tsx`, `SettingsModal.tsx`         |
| 14  | 🟠 High (fitur)              | Inline Syntax Parser ("Susu 2x @15000") dead code — nol dipanggil dari UI        | `inlineSyntaxParser.ts`, `InputPenjualan.tsx`       |
| —   | ⚠️ Lihat catatan             | Pola sistemik: 3 item W3 "Perf" dicentang ✅, nol diimplementasi                 | Master Plan (bagian bawah dokumen)                  |

---

## 1. 🔴 CRITICAL — Restore transaksi dari Trash Manager bypass `transactionService.restoreTransaction()`

> **Status: ✅ Diperbaiki** — `handleRestoreTx` sekarang memanggil `transactionService.restoreTransaction(id, 'Admin')`. Dikonfirmasi dari kode aktual (`TrashManager.tsx` baris ~115-128).

**File:** `src/components/TrashManager.tsx` (fungsi `handleRestoreTx`, dipanggil dari tombol "Pulihkan" baris ~391)

### Gejala

Transaksi yang di-void (soft-delete) lalu dipulihkan lewat menu Trash/Database **tidak mengembalikan potongan stok**, dan **tidak tercatat** di ledger `stock_movements` maupun `audit_log`.

### Akar Masalah

`transactionService.ts` (W1-04) sudah punya fungsi `restoreTransaction()` yang benar — re-deduct stok, tulis movement `reason: 'restore'`, tulis `audit_log`. Tapi `TrashManager.tsx` punya implementasi restore sendiri, independen, yang isinya cuma:

```js
const handleRestoreTx = useCallback(
  async (id: number) => {
    const record = await db.transactions.get(id);
    if (!record) return;
    delete record.deletedAt;
    record.updatedAt = new Date().toISOString();
    await db.transactions.put(record);
    // ...
  },
  [onRestore]
);
```

Tidak ada panggilan ke `transactionService.restoreTransaction()` sama sekali. `App.tsx` me-mount `<TrashManager />` tanpa props apapun (`src/App.tsx` baris ~365), jadi tidak ada jalur untuk memakai fungsi hook `useTransactions().restoreTransaction` yang sudah benar (yang sudah dipakai di tempat lain lewat `useTransactionData.ts`).

### Kenapa Lolos dari 485 Baris Test Invariant

`src/__tests__/stockInvariant.test.ts` punya test "should hold invariant after checkout + void + restore" — tapi test itu memanggil `transactionService.restoreTransaction()` langsung, bukan lewat komponen `TrashManager`. Test-nya menguji service yang benar; UI-nya diam-diam pakai jalur lama yang tidak pernah disentuh saat refactor W1.

### Dampak

1. Admin void transaksi → stok balik ke inventory, ledger `void` tercatat (ini sudah benar).
2. Admin klik "Pulihkan" di Trash → transaksi aktif lagi (ikut kehitung di laporan & kas), **tapi stok tidak ikut terpotong ulang**.
3. Hasil: `inventory.quantity` lebih besar dari yang seharusnya, tanpa ada `stock_movements` yang menjelaskan kenapa — persis jenis "drift tak terjelaskan" yang W1-12 (`stockDriftCheck.ts`) coba cegah, tapi dalam kasus ini **drift-nya tidak akan terdeteksi oleh `stockDriftCheck.ts`** karena yang salah bukan angka ledgernya (ledger memang tidak tertulis apa-apa), tapi state transaksinya yang kembali aktif tanpa delta stok yang menyertainya.
4. Tidak ada entri `audit_log` untuk aksi restore ini — kontradiksi dengan tujuan W2-05/06.

### Fix

Ganti isi `handleRestoreTx` untuk memanggil service yang benar:

```tsx
import { transactionService } from '../services/transactionService';
// ...

const handleRestoreTx = useCallback(
  async (id: number) => {
    try {
      await transactionService.restoreTransaction(id, /* currentUser */ 'Admin');
      setFeedback('✅ Transaksi berhasil dipulihkan!');
      setTimeout(() => setFeedback(''), 3000);
      onRestore?.();
    } catch (err: any) {
      setFeedback(`❌ Gagal memulihkan: ${err.message}`);
      setTimeout(() => setFeedback(''), 5000);
    }
  },
  [onRestore]
);
```

Kalau `TrashManager` butuh tahu `currentUser` yang sedang login (bukan hardcode `'Admin'`), paling sederhana terima sebagai prop baru dari `App.tsx` (sejalan dengan pola `kasirName` yang sudah dipakai di komponen lain).

### Cara Verifikasi

1. Tambah test baru: render alur TrashManager (atau test langsung terhadap `handleRestoreTx` kalau diekspos), void 1 transaksi, restore lewat Trash, lalu assert `stock_movements` punya entri `reason: 'restore'` dan `inventory.quantity` kembali terpotong.
2. Manual: checkout 1 barang (qty 2), cek stok berkurang 2. Void transaksi itu, cek stok balik +2. Restore dari Trash, cek stok **harus** berkurang 2 lagi — saat ini tidak terjadi.

---

## 2. 🟠 HIGH (uang) — `sessionId` tidak pernah ditempel ke data Pengeluaran, bikin Rekonsiliasi Kas salah di sesi lintas hari

> **Status: ✅ Diperbaiki** — `useExpenses.ts` sudah punya field `sessionId?: string`, dan `InputKeluaran.tsx` sudah mengisi `expenseData.sessionId = activeSession.id`. Dikonfirmasi dari kode aktual.

**File:** `src/hooks/useExpenses.ts`, `src/components/InputKeluaran.tsx`, `src/utils/sessionStats.ts`

### Gejala

`kasTunaiBersih` (dipakai di W2-02/W2-03, Closing Report & Rekonsiliasi Kas) bisa ter-overstate (pengeluaran tunai tidak terhitung) pada sesi yang melewati tengah malam.

### Akar Masalah

`calculateSessionStats` di `sessionStats.ts` punya 2 jalur matching pengeluaran ke sesi:

```js
if (exp.sessionId && exp.sessionId === session.id) return sum + ...
if (session.tanggalMulai && exp.tanggal === session.tanggalMulai) return sum + ...
```

Tapi `ExpenseItem` interface di `useExpenses.ts` **tidak punya field `sessionId` sama sekali**, dan `addExpense()` tidak pernah mengisinya. `InputKeluaran.tsx` juga tidak pernah menerima atau mengirim `sessionId`. Jadi jalur pertama (`exp.sessionId`) selalu `false` — sistem 100% bergantung pada fallback pencocokan tanggal string.

Masalahnya: `InputKeluaran.tsx` default `tanggal: getTodayISO()` — tanggal sistem **saat itu**, bukan `tanggalMulai` sesi yang sedang aktif. Pada sesi lintas hari (shift buka 23:00, tutup 01:00 — skenario yang W2-12 secara eksplisit dibuat untuk menangani), pengeluaran yang dicatat setelah tengah malam akan punya `exp.tanggal` = besok, sementara `session.tanggalMulai` = kemarin. **Tidak match** → pengeluaran itu tidak terhitung di `totalPengeluaranTunai`.

### Dampak

`kasTunaiBersih = totalPenjualanTunai - totalKembalian - totalPengeluaranTunai` jadi lebih besar dari seharusnya (pengeluaran tidak dikurangi). Saat rekonsiliasi kas fisik (W2-03, toleransi Rp 50.000), sistem akan menunjukkan "kas kurang" yang sebenarnya tidak ada — padahal uangnya memang sudah keluar, cuma tidak tertangkap sistem. Paling kena di shift malam.

### Fix

1. `src/hooks/useExpenses.ts`: tambah `sessionId?: string` ke interface `ExpenseItem`, isi dari parameter saat `addExpense()` dipanggil.
2. `src/components/InputKeluaran.tsx`: terima `activeSession` sebagai prop (pola yang sama seperti `InputPenjualan`), kirim `sessionId: activeSession?.id` saat submit. Pertimbangkan juga default `tanggal` form memakai `activeSession?.tanggalMulai` alih-alih `getTodayISO()` kalau sesi sedang aktif, supaya konsisten dengan prinsip W2-12.
3. Data lama (tanpa `sessionId`) tetap aman lewat fallback tanggal — tidak perlu migrasi data.

### Cara Verifikasi

Test: buka sesi dengan `tanggalMulai` = hari X, simulasikan pengeluaran dengan `tanggal` = hari X+1 (lewat tengah malam) tapi `sessionId` = sesi tersebut. Assert `calculateSessionStats` tetap menghitung pengeluaran itu.

---

## 3. 🟠 HIGH (data) — Backup JSON tidak pernah menyertakan `audit_log`

> **Status: ✅ Diperbaiki** — `databaseManager.ts` sudah export/import/merge `audit_log` dengan dedup by UUID, `schemaVersion` dinaikkan ke 13. Dikonfirmasi dari kode aktual.

**File:** `src/services/databaseManager.ts` (`exportDatabase()` dan fungsi import/merge)

### Gejala

File backup (`ClearTask_DB_*.json`) tidak memuat riwayat `audit_log` sama sekali.

### Akar Masalah

```js
const transactions = await db.transactions.toArray();
const sessions = await db.sessions.toArray();
const categoriesDb = await db.categories.toArray();
const inventory = await db.inventory.toArray();
const expenses = await db.expenses.toArray();
const archiveTransactions = await db.archive_transactions.toArray();
const stockMovements = await db.stock_movements.toArray();
// audit_log TIDAK ADA di sini
```

`stock_movements` (ledger yang dibuat di rilis yang sama) sudah benar dibaca, dimasukkan ke `exportData`, dan ditangani di jalur import/merge (`existingStockMovements`/`importStockMovements`). `audit_log` tidak punya penanganan sama sekali di export maupun import.

### Dampak

Kalau device toko hilang, rusak, atau di-reset lalu dipulihkan dari backup, **seluruh riwayat audit (siapa void apa, kapan, kenapa alasan void) hilang permanen**. Ini bertentangan langsung dengan tujuan W2-05/06: audit log memang didesain append-only supaya tidak bisa diubah diam-diam, tapi kalau backup-nya sendiri tidak menyimpannya, jaminan itu tidak bertahan lewat siklus backup-restore — yang justru skenario paling penting untuk sebuah audit trail.

### Fix

Di `exportDatabase()`, tambahkan:

```js
const auditLog = await db.audit_log.toArray();
// ...
exportData.audit_log = Array.isArray(auditLog) ? auditLog : [];
```

Di jalur import/merge, tambahkan penanganan `audit_log` setara dengan `stock_movements` — biasanya cukup `bulkAdd` tanpa dedup kompleks karena sifatnya append-only dan ber-UUID unik. Pertimbangkan juga menaikkan `schemaVersion` di export dari `12` ke `13` supaya mencerminkan skema aktual (tabel `audit_log` masuk di `version(13)` di `db.ts`).

### Cara Verifikasi

Export database yang sudah punya minimal 1 entri `audit_log` (misal setelah void 1 transaksi), buka file JSON hasil export, pastikan ada key `audit_log` dengan isi yang sesuai.

---

## 4. 🟡 MEDIUM — Audit log (W2-05/06) write-only, tidak ada UI untuk melihatnya

> **Status: ⏳ Backlog (W5)** — Belum ada UI. Masuk ke backlog W5 sebagai fitur "Riwayat Audit" di TabDatabase/TrashManager. Tidak blocking sprint saat ini.

**File:** `src/services/auditService.ts`, seluruh `src/components/*.tsx`

### Gejala

`db.audit_log` terisi dengan benar setiap kali ada void/restore/edit transaksi (lewat `transactionService.ts`), tapi **tidak ada satupun layar di aplikasi yang menampilkan isinya**.

### Detail

- `auditService.ts` punya fungsi `getRecentLogs(limit, entity?)` yang didesain untuk query log — tapi fungsi ini **tidak dipanggil dari mana pun** di seluruh codebase (dicek dengan grep ke semua `.tsx`/`.ts`, nol hasil di luar file itu sendiri).
- `transactionService.ts` sendiri tidak memakai `auditService.log()` — dia menulis langsung ke `db.audit_log.add(...)` inline di tiap fungsi (void/restore/update). Jadi `auditService.ts` secara de facto adalah dead code.
- `EditTransactionModal.tsx` masih cuma menampilkan 1 snapshot terakhir (`updatedBy`/`updatedAt`), bukan histori dari `audit_log`.

### Dampak

Fitur yang jadi salah satu centerpiece rilis ini ("setiap transaksi keuangan... memiliki jejak audit yang tidak dapat diubah diam-diam" — CHANGELOG v3.7.0) saat ini tidak bisa dipakai sama sekali oleh pemilik toko untuk benar-benar menginvestigasi kejanggalan, karena tidak ada cara melihatnya tanpa buka DevTools/IndexedDB manual.

### Fix (saran, bukan wajib segera)

Tambah tab/modal baru "Riwayat Audit" (bisa di dalam `TrashManager.tsx` atau sebagai tab terpisah) yang memanggil `auditService.getRecentLogs()`, ditampilkan sebagai daftar sederhana: aksi, entitas, waktu, pelaku, alasan. Bisa juga ditampilkan sebagai section tambahan di `EditTransactionModal.tsx` saat melihat riwayat 1 transaksi tertentu (filter `getRecentLogs(50, 'transaction')` lalu filter lagi by `entityId`).

---

## 5. 🟡 MEDIUM — Import CSV barang rawan karakter `\r` nempel di kolom terakhir (file dari Excel Windows)

> **Status: ✅ Diperbaiki** — `InventoryManager.tsx` sudah ada normalisasi CRLF sebelum split: `text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')`. Dikonfirmasi dari kode aktual.

**File:** `src/components/InventoryManager.tsx` (`handleImportCSV`), `src/utils/csvParser.ts`

### Gejala

Kolom terakhir (`satuan`) pada barang hasil import CSV berpotensi memuat karakter `\r` tersembunyi di akhir string kalau file CSV diekspor dari Excel di Windows.

### Akar Masalah

`handleImportCSV` memisah baris dengan:

```js
const lines = text.split('\n').filter((l) => l.trim().length > 0);
```

Ini **tidak** memakai wrapper `parseCSV()` dari `csvParser.ts` yang sudah menangani normalisasi CRLF (`.replace(/\r\n/g, '\n').replace(/\r/g, '\n')`). File CSV dari Excel Windows pakai `\r\n` sebagai pemisah baris — `split('\n')` saja menyisakan `\r` di akhir setiap baris sebelum newline.

Kolom angka (`hargaModal`, `harga`, `quantity`, `minStock`) aman karena diproses lewat `parseIDNumber()` yang melakukan `.trim()` (dan `\r` termasuk whitespace yang di-trim). Tapi kolom terakhir:

```js
const satuan = cols[8] || 'Pcs';
```

adalah string polos tanpa `.trim()` — bisa jadi `"Pcs\r"`.

Catatan tambahan: `parseCSV()` (wrapper multi-baris yang benar) ternyata **tidak dipakai di mana pun** di codebase — sama seperti `auditService.ts`, ini kode yang sudah ditulis dengan benar tapi tidak pernah di-wire ke pemanggilnya.

### Dampak

`satuan = "Pcs\r"` bisa bikin perbandingan string ketat (`satuan === 'Pcs'`) di tempat lain gagal diam-diam — misalnya logic terkait unit yang mengandalkan nilai `satuan` persis. Severity medium karena hanya muncul untuk file dari Excel Windows (skenario yang cukup umum untuk pemilik toko kecil yang mengelola stok di Excel), dan hanya memengaruhi kolom string terakhir, bukan angka.

### Fix

Ganti baris pemisahan di `handleImportCSV`:

```js
// Sebelum:
const lines = text.split('\n').filter((l) => l.trim().length > 0);

// Sesudah:
const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
```

Atau, lebih baik, pakai `parseCSV(text)` dari `csvParser.ts` secara langsung (fungsi ini sudah melakukan normalisasi + parsing per baris sekaligus), supaya wrapper yang sudah ditulis dan diklaim "RFC 4180-compliant" benar-benar terpakai.

---

## 6. 🟢 LOW — Permanent purge di Trash Manager tidak menulis `audit_log`

> **Status: ✅ Diperbaiki** — `promptPermanentDeleteTx` dan `promptPermanentDeleteInv` sudah ada `db.audit_log.add({ action: 'purge', ... })` sebelum delete. Dikonfirmasi dari kode aktual.

**File:** `src/components/TrashManager.tsx` (`promptPermanentDeleteTx`, `promptPermanentDeleteInv`)

### Gejala

Aksi hapus permanen (purge) dari Trash — baik transaksi maupun barang — tidak meninggalkan jejak di `audit_log`, walau sudah ada `ConfirmDialog` sebagai konfirmasi (W0-04 sudah terpenuhi dari sisi itu).

### Dampak

Severity rendah karena item yang di-purge memang sudah soft-deleted lebih dulu (stoknya sudah dikembalikan saat void), jadi purge tidak mengubah stok/kas. Tapi untuk kelengkapan audit trail ("siapa menghapus apa secara permanen, kapan"), ini masih ada baiknya dicatat — terutama kalau nanti W5-07 (multi-kasir dengan akun) jadi, supaya ada histori siapa yang punya akses purge.

### Fix (opsional, prioritas rendah)

Tambah `await db.audit_log.add({ action: 'purge', entity: 'transaction'|'inventory', entityId, timestamp, actor, ... })` di kedua handler sebelum/sesudah `db.transactions.delete(id)` / `db.inventory.delete(item.id)`.

---

## 7. 🔵 KOSMETIK — Type `filterDate: string` di `useTransactionFilter.ts` sudah kedaluwarsa

> **Status: ✅ Diperbaiki** — `FilterDateValue` type sudah didefinisikan dan dipakai di `useTransactionFilter.ts`. Dikonfirmasi dari kode aktual.

**File:** `src/hooks/useTransactionFilter.ts`

### Detail

Interface `TransactionFilterState` masih mendeklarasikan `filterDate: string`, padahal sejak W3-06 (custom date range), nilai runtime-nya bisa berupa object `{ start, end, label }`. Konsumen yang benar (`useTransactionData.ts`, `LaporanExport.tsx`) sudah menangani kedua bentuk dengan benar (`typeof filterDate === 'object'` check) — jadi **ini bukan bug fungsional**, cuma anotasi tipe yang menyesatkan kalau ada yang membaca interface ini sebagai dokumentasi. _(Masih sama persis per 6 Oktober — belum diperbaiki.)_

### Fix (opsional)

```ts
export type FilterDateValue = string | { start: string; end: string; label?: string } | '';

export interface TransactionFilterState {
  // ...
  filterDate: FilterDateValue;
  setFilterDate: React.Dispatch<React.SetStateAction<FilterDateValue>>;
  // ...
}
```

---

## 8. 🟠 HIGH (data) — `EditTransactionModal` pakai input teks bebas untuk nama barang, `inventoryId` lama ikut kebawa

> **Status: ✅ Diperbaiki — commit `50e374d`** — `handleSubmit` sekarang null-kan `inventoryId` kalau `namaBarang` berubah, agar `transactionService.updateTransaction()` fallback ke lookup by nama baru.

**File:** `src/components/EditTransactionModal.tsx`, `src/services/transactionService.ts` (`updateTransaction`)

### Gejala

Kalau transaksi yang sudah tersimpan diedit lewat menu "Edit Transaksi" dan field **Nama Barang** diganti ke produk yang benar-benar berbeda (bukan cuma betulin typo), penyesuaian stok yang terjadi di belakang layar tetap mengarah ke barang inventaris yang **lama**, bukan barang yang namanya baru diketik.

### Akar Masalah

Berbeda dari `InputPenjualan.tsx` yang memilih barang lewat picker/autocomplete terhubung ke inventaris (sehingga `inventoryId` selalu akurat), `EditTransactionModal.tsx` punya field `namaBarang` sebagai **input teks polos**:

```tsx
<input type="text" id="edit-namaBarang" name="namaBarang" value={form.namaBarang} onChange={handleChange} ... />
```

Saat disimpan, item yang diupdate dibentuk dengan men-spread item lama (yang sudah punya `inventoryId` dari produk aslinya) lalu hanya menimpa `namaBarang`-nya:

```js
const updatedItem = {
  ...(transaction.items && transaction.items[0] ? transaction.items[0] : {}),
  kategori: form.kategori,
  namaBarang: form.namaBarang.trim(), // bisa diganti ke produk lain
  qty: parseInt(form.qty, 10),
  hargaSatuan: parseInt(form.hargaSatuan, 10),
  total,
};
```

`inventoryId` ikut terbawa dari item lama karena tidak pernah dihapus/diganti. Di `transactionService.updateTransaction()`, perhitungan selisih stok memprioritaskan `inventoryId` di atas nama:

```js
const key = item.inventoryId || canonicalize(item.namaBarang);
```

Jadi kalau `namaBarang` diganti ke produk lain tapi `inventoryId` lama tetap nempel, sistem akan tetap menyesuaikan stok barang yang **lama** — bukan barang yang sekarang tertulis di nama.

### Dampak

Ini melanggar invariant _product identity_ yang baru diformalkan lewat ADR-001 (item transaksi harus konsisten antara `namaBarang`/`namaSnapshot` dan `inventoryId` yang dirujuk). Kalau kasir salah input barang saat checkout dan coba dikoreksi lewat Edit Transaksi (bukan void+ulang), hasilnya:

1. Nama yang tersimpan sudah benar (produk B).
2. Tapi penyesuaian stok tetap mengarah ke produk A (barang lama) — stok A jadi salah, stok B tidak pernah tersentuh walau sebenarnya itu yang terjual.
3. Tidak ada validasi/peringatan apapun yang memberi tahu user bahwa ini terjadi.

Aman dipakai selama user hanya mengoreksi qty/harga/typo nama tanpa benar-benar mengganti ke produk yang berbeda secara fisik — tapi modal ini tidak membedakan kedua kasus itu sama sekali.

### Fix

Opsi paling konsisten dengan pola yang sudah ada di `InputPenjualan.tsx`: ganti field nama barang jadi dropdown/autocomplete yang terhubung ke `useInventory()`, sehingga `inventoryId` selalu ikut ter-update saat produk diganti. Kalau mau tetap sederhana (minimal change), tambahkan guard di `handleSubmit`: kalau `namaBarang` baru tidak sama (setelah canonicalize) dengan `namaBarang` lama, hapus/null-kan `inventoryId` pada `updatedItem` supaya `transactionService.updateTransaction()` fallback ke pencarian berdasarkan nama baru, bukan ID lama.

### Cara Verifikasi

Checkout barang A (qty 2) → cek stok A berkurang 2. Edit transaksi itu, ganti nama barang ke barang B (qty tetap 2) lalu simpan. Cek: stok A seharusnya balik +2 dan stok B berkurang 2 — saat ini stok A yang malah berkurang lagi (atau tidak ada perubahan di B sama sekali).

---

## 9. 🟡 MEDIUM — Counter jumlah transaksi di `RiwayatSesi` tidak filter void & tidak hitung transaksi yang sudah diarsip

> **Status: ✅ Diperbaiki — commit `53079f3`** — `loadCounts()` sekarang filter `deletedAt` dan include `archive_transactions`.

**File:** `src/components/RiwayatSesi.tsx`

### Gejala

Badge "X transaksi" yang tampil di tiap kartu sesi pada halaman Riwayat Sesi bisa berbeda dari jumlah transaksi yang sebenarnya ditampilkan saat kartu itu diklik (buka `ClosingReportModal`).

### Akar Masalah

`RiwayatSesi.tsx` menghitung sendiri jumlah transaksi per sesi lewat query langsung:

```js
map[session.id] = await db.transactions.where('sessionId').equals(session.id).count();
```

Query ini **tidak** memfilter `deletedAt` (transaksi yang sudah di-void tetap ikut terhitung) dan **tidak** menyertakan `db.archive_transactions` (transaksi yang sudah dipindah ke arsip lewat "Tutup Buku" jadi tidak terhitung sama sekali). Bandingkan dengan `useSession.getSessionTransactionsAsync()` — yang dipakai tepat di komponen yang sama saat user klik sesi untuk buka modal detail — yang sudah benar menggabungkan `transactions` + `archive_transactions` dan memfilter `deletedAt`.

### Dampak

Severity sedang karena ini cuma soal angka tampilan (bukan stok/kas), tapi bisa membingungkan: sesi yang punya transaksi void akan terlihat punya lebih banyak transaksi di badge daripada yang sebenarnya valid, dan sesi lama yang transaksinya sudah diarsipkan bisa terlihat badge-nya anjlok ke angka kecil/nol padahal sesi itu sebenarnya punya banyak riwayat (yang hanya pindah tabel, bukan hilang).

### Fix

Ganti logic `loadCounts()` agar konsisten dengan `getSessionTransactionsAsync`, misal terima fungsi itu sebagai prop (sudah tersedia dari `useSession()`) dan hitung `(await getSessionTransactions(session.id)).length` per sesi, atau query langsung ke kedua tabel dengan filter `!tx.deletedAt` yang sama.

### Cara Verifikasi

Buka sesi, checkout 2 transaksi, void 1 di antaranya. Badge seharusnya tampil "1 transaksi" (bukan 2). Lalu arsipkan transaksi sesi lama lewat "Tutup Buku" — badge sesi itu seharusnya tetap menunjukkan jumlah transaksi aslinya, bukan 0.

---

## 10. 🟠 HIGH (uang) — `ReportingChart.tsx` masih pakai `hargaModal || 0`, bukan `hargaModalSnapshot` — margin palsu 100% masih ada

> **Status: ✅ Diperbaiki — commit `b4f3923`** — `transactionService.ts` auto-detect sekarang tulis `hargaModalSnapshot: null`, dan `ReportingChart.tsx` skip item dengan `null` snapshot dari kalkulasi modal.

**File:** `src/components/ReportingChart.tsx` baris 78, `src/services/transactionService.ts` baris 194

### Gejala

Grafik Profit di laporan bisa menampilkan margin 100% untuk barang yang sebenarnya belum punya harga modal tercatat (barang hasil "auto-detect produk baru" saat checkout).

### Akar Masalah

Master Plan menyentang **W2-10** selesai ("Modal `null`/`undefined` di chart margin ditandai 'tidak diketahui', bukan dihitung sebagai 0"). Itu benar diterapkan, tapi **cuma di `TransactionTable.tsx`** (baris 177-184, sudah benar cek `hargaModalSnapshot === null`). `ReportingChart.tsx` tidak ikut diupdate — masih:

```js
entry.modal += (item.hargaModal || 0) * (item.qty || 1);
```

Field `hargaModal` lama, bukan `hargaModalSnapshot` yang baru. Barang tanpa modal tercatat tetap terhitung modal = 0.

Lebih dalam lagi, akar masalahnya juga ada di titik penulisan data itu sendiri. Di `transactionService.ts`, jalur auto-detect produk baru menulis:

```js
hargaModalSnapshot: 0,   // harusnya null, bukan 0
```

Padahal di jalur lain (baris 148) yang benar sudah pakai `match.hargaModal !== undefined ? match.hargaModal : null`. Jadi walau `ReportingChart.tsx` dibenerin untuk membaca `hargaModalSnapshot`, barang hasil auto-detect tetap akan terbaca "modal = 0 (diketahui)", bukan "tidak diketahui" — karena yang menulis datanya sendiri salah.

### Dampak

Grafik Profit menampilkan margin keuntungan yang lebih tinggi dari kenyataan untuk barang-barang yang harga modalnya belum pernah diisi manual di Inventory — bisa menyesatkan keputusan bisnis kalau pemilik toko mengandalkan grafik ini.

### Fix

1. `transactionService.ts` baris 194, ganti `hargaModalSnapshot: 0` → `hargaModalSnapshot: null`.
2. `ReportingChart.tsx`, ganti baca `item.hargaModal` → `item.hargaModalSnapshot`, dan barang dengan `null` dikeluarkan dari perhitungan modal (bukan dianggap 0) — samakan pola dengan `TransactionTable.tsx`.

### Cara Verifikasi

Checkout barang yang belum terdaftar di Inventory (lewat Input Manual, tanpa isi harga modal). Buka Laporan → grafik Profit, barang itu seharusnya ditandai "modal tidak diketahui" dan tidak ikut dihitung sebagai 100% profit.

---

## 11. 🟡 MEDIUM — Dashboard "hari pertama" bisa salah nyala lagi di toko yang transaksinya sudah diarsip

> **Status: ✅ Diperbaiki — commit `c5efc1f`** — `useTransactionMetrics.ts` sekarang tambah count dari `archive_transactions` ke `historicalCount` sebelum kalkulasi `isFirstDay`.

**File:** `src/hooks/useTransactionMetrics.ts`, dikonsumsi oleh `MetrikCard.tsx`

### Gejala

Kartu "Total Pemasukan Hari Ini" di dashboard bisa kehilangan indikator tren (naik/turun dibanding kemarin) dan balik ke mode "hari pertama", padahal toko sudah beroperasi lama.

### Akar Masalah

Hook ini sudah benar filter `deletedAt` (ada komentar "P0-FIX"), tapi `historicalTxs` untuk menentukan `isFirstDay` **cuma query `db.transactions`**, tidak termasuk `db.archive_transactions`:

```js
const historicalTxs = await db.transactions.where('tanggal').below(todayStr).toArray();
```

Toko yang sudah lama pakai ClearTask dan pernah "Tutup Buku" (arsipkan transaksi lama) bisa punya `db.transactions` yang isinya cuma data baru-baru ini — kalau semua transaksi sebelum hari ini kebetulan sudah diarsip, `historicalCount` jadi 0, `isFirstDay` jadi `true` lagi. Ini pola yang sama persis seperti bug #9/#10 (arsip tidak ikut terhitung), tapi lokasinya di dashboard metrics, bukan laporan sesi, jadi tidak ikut tertangani saat fix W1-06.

### Dampak

`MetrikCard.tsx` memakai `isFirstDay` untuk menyembunyikan persentase tren (`formatTrend(isFirstDay ? NaN : trendPercent)`) — toko yang sudah lama jalan bisa tiba-tiba kehilangan info tren tanpa alasan yang jelas ke pemilik toko.

### Fix

Tambah query `db.archive_transactions.where('tanggal').below(todayStr).count()`, gabung ke `historicalCount` — sama seperti pola `getSessionTransactions` yang sudah benar di W1-06.

### Cara Verifikasi

Di toko dengan transaksi yang sudah diarsip semua (via Tutup Buku), buka dashboard — `isFirstDay` seharusnya tetap `false` kalau memang ada histori (walau di tabel arsip), tren tetap tampil.

---

## 12. 🟠 HIGH (integritas roadmap) — Command Palette (Ctrl+K) diklaim ✅ di Master Plan (W3-07), nol implementasi di kode

> **Status: ✅ Diperbaiki (klaim audit tidak akurat)** — Cross-check ke kode aktual: `CommandPalette.tsx`, `useCommandPalette.ts`, dan keyboard handler Ctrl+K di `App.tsx` semua sudah ada dan terimplementasi lengkap. Temuan audit ini berdasarkan kode versi lama.

**File:** Master Plan `W3-07`, vs `src/App.tsx`, `src/components/HelpModal.tsx`

### Gejala

`HelpModal.tsx` baris 554 memberi tahu user: _"Tekan Ctrl+K untuk mencari menu dan aksi kapan saja."_ Menekan Ctrl+K di aplikasi tidak melakukan apa-apa.

### Akar Masalah

Grep `CommandPalette` ke seluruh codebase — nol hasil, file-nya tidak ada sama sekali. `App.tsx` juga tidak punya satupun handler untuk kombinasi Ctrl+K/Cmd+K. Tapi Master Plan menyentang:

> `W3-07 | Command palette Ctrl+K sungguhan | Low | L | ... ✅`

Ini beda dengan W0-06 (Ctrl+Enter checkout) yang dicek juga dan **benar-benar sudah diimplementasi** (`InputPenjualan.tsx` baris 600) — jadi bukan pola sistemik di semua shortcut, tapi khusus item ini statusnya di Master Plan tidak sesuai kenyataan kode. _(Lihat juga catatan di bagian paling bawah — pola ini ternyata bukan cuma 1 item, lihat W3-11 dan W3-12.)_

### Dampak

Bukan cuma fitur hilang, tapi dokumen roadmap sendiri jadi tidak bisa dipercaya untuk menentukan "apa yang sudah benar-benar selesai" tanpa cross-check manual ke kode.

### Fix

Ubah status W3-07 di Master Plan ke belum-selesai, atau hapus baris Ctrl+K dari `HelpModal.tsx` sampai benar-benar dibangun.

---

## 13. 🟡 MEDIUM — Upload foto QRIS tidak ada batas ukuran/kompresi

> **Status: ✅ Diperbaiki — commit `21f848a`** — Kedua `SetupWizardModal.tsx` dan `SettingsModal.tsx` sekarang validasi 10MB hard limit dan kompres via canvas ke JPEG 0.7 sebelum simpan ke IndexedDB.

**File:** `src/components/SetupWizardModal.tsx` (`handleQrisUpload`), `src/components/SettingsModal.tsx` (pola yang sama persis)

### Gejala

Upload gambar QRIS dari galeri/kamera HP tanpa batasan ukuran file.

### Akar Masalah

```js
function handleQrisUpload(e: any) {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (evt) => setQrisImageUrl(evt.target?.result as string);
    reader.readAsDataURL(file);
  }
}
```

Ada `accept="image/*"` (menyaring ke gambar saja), tapi tidak ada batas ukuran atau resize/kompresi. Foto QRIS langsung dari kamera HP modern (3-8 MB) di-convert jadi base64 (nambah ~33% lebih besar) dan disimpan mentah ke `settings.qrisImageUrl` di IndexedDB.

### Dampak

String base64 sebesar itu terbawa tiap kali `useSettings()` dipanggil di manapun — termasuk tiap buka `StrukModal` untuk preview/cetak struk — bikin boot app lebih lambat dan storage toko lama-lama bengkak.

### Fix

Sebelum `readAsDataURL`, resize gambar ke canvas (misal max 400×400px) dan kompres ke JPEG kualitas ~0.7 — QR code tetap scannable di ukuran segitu. Atau minimal validasi ukuran file (`file.size > 1_000_000` → tolak + pesan error) sebagai langkah paling sederhana.

---

## 14. 🟠 HIGH (fitur) — Inline Syntax Parser ("Susu 2x @15000") dead code, nol dipanggil dari UI

> **Status: 🟠 Belum diperbaiki** — Dikonfirmasi dari kode aktual: `parseInlineCommand` dan `hasInlineSyntax` nol pemanggilan dari komponen manapun. Rencana fix + perbaikan inkonsistensi regex: [W4-BUG-FIX-PLAN.md → Refactor-01](docs/W4-BUG-FIX-PLAN.md).

**File:** `src/utils/inlineSyntaxParser.ts` (`parseInlineCommand`, `hasInlineSyntax`), `src/components/InputPenjualan.tsx`

### Gejala

Fitur "Inline Syntax Parser" — ketik langsung "Susu 2x @15000" di satu field lalu otomatis ke-parse jadi nama/qty/harga — yang disebut sebagai salah satu fitur andalan ClearTask di README, **tidak bisa dipakai sama sekali** di aplikasi.

### Akar Masalah

`parseInlineCommand()` dan `hasInlineSyntax()` di `inlineSyntaxParser.ts` sudah diimplementasi lengkap dengan baik (regex untuk qty depan/belakang, harga `@`, dokumentasi JSDoc jelas, dan ada test file sendiri `inlineSyntaxParser.test.js`). Tapi digrep ke seluruh `.tsx`/`.ts` di luar file itu sendiri dan test-nya — **nol pemanggilan**. `InputPenjualan.tsx` cuma mengimpor `getCashBreakdown` (helper pecahan kembalian) dari file yang sama, tidak pernah mengimpor `parseInlineCommand` atau `hasInlineSyntax`. Tidak ada field input manapun di UI yang memanggil fungsi parsing ini.

### Dampak

Fitur ini murni dead code dari sisi UI — dokumentasi/README mengklaim fitur ini ada dan jadi pembeda ClearTask, tapi kasir tidak punya cara memakainya sama sekali di v3.7.0.

### Catatan tambahan kalau nanti diwire ke UI

Saat fitur ini di-hook up ke komponen, satu hal perlu diperbaiki dulu: ketiga pola regex ekstraksi qty (`trailingQtyRegex`, `leadingQtyRegex`, `xTrailingRegex`) semuanya mensyaratkan ada spasi (`\s+`) di antara nama barang dan penanda qty. Kalau kasir mengetik cepat tanpa spasi (misal `"indomie2x"`, pola mengetik yang wajar untuk fitur yang justru didesain untuk kecepatan), qty gagal ter-ekstrak dan `"2x"` ikut nempel jadi bagian nama barang — berpotensi bikin entri inventory baru yang salah lewat auto-detect produk. `hasInlineSyntax()` sendiri malah mendeteksi string itu sebagai "ada sintaks inline" (regex-nya pakai `\s*`, boleh nol spasi) — jadi preview hint di UI nantinya bisa tampil "terdeteksi", tapi hasil parse sungguhan tidak sesuai preview itu.

### Fix

1. Putuskan dulu: fitur ini mau benar-benar diwire ke UI (field input cepat di `InputPenjualan.tsx`), atau dihapus dari README/dokumentasi kalau memang belum prioritas.
2. Kalau diwire: samakan syarat spasi di ketiga regex qty dengan regex `hasInlineSyntax`, atau sebaliknya — supaya preview dan hasil parse konsisten.

### Cara Verifikasi

Grep `parseInlineCommand` ke seluruh `src/components/` — pastikan muncul minimal 1 pemanggilan nyata dari form input, bukan cuma di file definisinya dan test.

---

## ⚠️ Catatan Kritis: Pola 3 Item W3 "Perf" Dicentang ✅, Nol yang Diimplementasi

Ini bukan 1 bug lagi, tapi pola di seluruh section **W3 (Perf)** Master Plan yang perlu perhatian khusus sebelum lanjut audit ke bagian lain:

**W3-12** — klaimnya paling parah, sampai kasih angka presisi:

> _"✅ (1652 → 785 baris, -53%; sub-komponen di `src/components/pos/`)"_

Kenyataan di repo: `InputPenjualan.tsx` masih **1652 baris** — persis sama dengan angka "sebelum" yang disebut. Folder `src/components/pos/` **tidak ada sama sekali**. Tidak ada satupun pemecahan komponen yang terjadi — angka "785 baris, -53%" murni angka yang tidak berdasar bukti apapun di histori commit maupun file.

**W3-11** — klaim: _"Satukan `useInventory`/`useExpenses` jadi satu langganan `useLiveQuery` per tabel ... ✅"_

Kenyataan: `useInventory()` masih dipanggil terpisah di **4 komponen berbeda** (`InputPenjualan`, `TopBar`, `InventoryManager`, `NotificationPanel`), `useExpenses()` di 2 komponen (`LaporanExport`, `InputKeluaran`) — persis kondisi sebelum "perbaikan", tidak ada `InventoryContext`/provider bersama sama sekali.

**W3-07** — Command Palette (lihat #12 di atas) — nol implementasi juga.

**Kenapa ini penting:** tiga-tiganya ada di section yang sama (W3 Perf), effort-nya bukan kecil (M, M, L). Kalau cuma 1 item meleset, bisa dibilang human error biasa. Tiga item sekaligus di section yang sama, salah satunya sampai memakai angka statistik yang persis dikarang — itu pola, bukan kebetulan. **Kolom ✅ di seluruh dokumen Master Plan tidak bisa dipercaya tanpa verifikasi manual ulang**, terutama untuk item berefforts besar.

**Rekomendasi:** sebelum lanjut audit ke bagian lain, lakukan 1 pass khusus untuk cross-check **semua** baris ✅ di W0-W3 (bukan cuma yang "Perf") terhadap commit hash/diff yang relevan — bukan percaya ke centang saja.

---

## Area yang Sudah Dicek dan Bersih (Tidak Perlu Disentuh)

Supaya jelas mana yang tidak perlu dikhawatirkan:

- `transactionService.ts` — logic checkout/void/restore/edit/unpack (isi fungsinya) sudah benar.
- Migrasi Dexie v12 (`db.ts`) — resolusi `inventoryId` dari nama kanonik aman, data yang tidak match diberi `null` (bukan ditebak), ledger opening dibangun dari quantity saat ini, idempoten.
- UI void transaksi — alasan wajib diisi sebelum submit, sesuai W2-06.
- Rumus `kasTunaiBersih` sendiri (penjualan tunai - kembalian - pengeluaran tunai) — formula benar; masalahnya cuma di sumber data pengeluaran (lihat temuan #2).
- `closingSnapshot` (W1-05) dan merge transaksi aktif+arsip di laporan sesi (W1-06).
- Prioritas harga custom, warning harga jual di bawah modal, indikator modal tidak diketahui di `TransactionTable.tsx` (W2-08/09/10) — **tapi lihat #10, implementasinya tidak konsisten ke `ReportingChart.tsx`**.
- **W3-01/02 tuntas 100%** — dikonfirmasi nol `window.confirm`/`window.alert` tersisa di seluruh codebase.
- Notifikasi stok menipis per-barang (`minStock`, W3-03).
- Custom date range laporan (W3-06) — filter transaksi utama sudah benar pakai Dexie `.between()` inclusive.
- `stockDriftCheck.ts` (W1-12) — logic perbandingan `inventory.quantity` vs jumlah `stock_movements.delta` sudah benar, walau perlu dicatat alat ini **tidak** akan mendeteksi bug #1 di atas (karena masalahnya bukan di angka ledger).
- `useInventory.ts` — filter `deletedAt` benar, guard duplikat nama kanonikal benar di `addInventoryItem`/`updateInventoryItem`.
- `TrashManager.tsx` bagian restore barang (`handleRestoreInv`) — berbeda dari restore transaksi (bug #1), ini aman karena soft-delete barang memang cuma soal flag `deletedAt`, tidak menyentuh `stock_movements`.
- `MergePreviewModal.tsx`, `InventoryModal.tsx`, `NotificationPanel.tsx` (notifikasi stok menipis + reminder backup berkala W3-05), `SessionBanner.tsx` — semua logic & validasi sudah benar.
- `bluetoothPrinterHelper.ts` — encoding CP437 untuk printer thermal 58mm sudah ditangani dengan benar (`sanitizeThermalText` + `encodeCp437`), plus device filter by name prefix dengan fallback `acceptAllDevices`. Edge case garbled text yang pernah ditemukan di audit sebelum v3.7.0 sudah selesai diperbaiki.
- `migration.ts` (migrasi legacy localStorage → IndexedDB) — idempoten, defensif, aman dijalankan ulang.
- `useCategories.ts` — `deleteCategory` sudah benar cek pemakaian di inventory sebelum hapus (W1-08).
- `ErrorBoundary.tsx` — kode error pendek + tombol "Salin Detail Error" sudah ada (W0-12).
- `StrukModal.tsx` — alamat/telepon toko kosong sudah ditampilkan kosong (bukan data dummy palsu lagi, W0-07).
- `HotkeyModal.tsx`, `PromptDialog.tsx` — logic dan validasi sudah benar, tidak ada temuan baru.
- `AppBootstrap.tsx` — penanganan migrasi, incognito, storage quota, dan SW update toast semua sudah benar.
- `downloadHelper.ts`, `errorMessages.ts`, `statusVariant.ts`, `audioFeedback.ts`, `useBackHandler.ts` — file kecil, semua bersih, tidak ada temuan.
- `exportCSV.ts`, `exportExcel.ts` — escaping/sanitasi formula-injection sudah benar di keduanya, konsisten dengan data yang diterima dari pemanggil (tidak ada temuan baru di file-nya sendiri — tapi lihat #5 soal data yang masuk ke `exportCSV` kalau berasal dari CSV import yang bermasalah).

**Catatan dead code (bukan bug, cuma informasi):** `auditService.ts` dan `parseCSV()` di `csvParser.ts` (lihat temuan #4 & #5) sudah disebut di atas; tambahan: `syncManager.ts` (blueprint cloud sync, isinya cuma `console.log` simulasi, tidak pernah di-import di mana pun) dan `crypto.ts` (modul PBKDF2+AES-GCM lengkap tapi tidak dipanggil di mana pun — sepertinya scaffolding untuk fitur PIN/multi-kasir W5-07 yang belum dikerjakan).

---

## Belum Dicek / Belum Lengkap

- `HelpModal.tsx`, `LaporanExport.tsx`, `StrukModal.tsx` — sudah dibaca sebagian/spot-check (menemukan #12, #13), belum full line-by-line.
- `formatters.ts` — sudah di-full-read di putaran ini, bersih, tidak ada temuan baru.
- `inlineSyntaxParser.ts` — sudah di-full-read, lihat temuan #14.
- `crypto.ts` — dikonfirmasi ulang masih dead code (nol importer di luar file sendiri & test), konsisten dengan catatan sebelumnya, bukan bug baru.
- Area yang masih belum disentuh: `ADR-001` kepatuhan di seluruh codebase secara menyeluruh (baru dicek di titik-titik yang relevan ke bug #8), `stockDriftCheck.test.ts`/`stockInvariant.test.ts` isi lengkapnya (baru dicek namanya & 1 skenario dari bug #1).
- **Belum ada verifikasi sistematis** terhadap sisa baris ✅ di Master Plan W0-W2 dan W4-W5 (baru W3 "Perf" yang ketahuan bermasalah, lihat catatan kritis di atas) — ini prioritas yang disarankan untuk sesi berikutnya.

---

_File ini gabungan dari audit 5 Oktober 2026 (#1-9, oleh kontributor lain) dan lanjutan 6 Oktober 2026 (#10-14, menuntaskan daftar "Belum dicek" dari versi sebelumnya)._
