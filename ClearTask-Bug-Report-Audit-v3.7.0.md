# Bug Report: Audit Manual v3.7.0 (W0–W3)

**Lingkup:** audit kode manual (bukan cuma baca checklist) terhadap rilis v3.7.0, menyasar area paling berisiko: uang (kas, pengeluaran), stok (ledger, void/restore), dan integritas data (audit log, backup).
**Metode:** baca langsung source + cross-check terhadap test suite yang ada, bukan menjalankan aplikasi.
**Tanggal:** 5 Oktober 2026

---

## Ringkasan Prioritas

| # | Severity | Judul | File Utama |
|---|----------|-------|------------|
| 1 | 🔴 Critical | Restore transaksi dari Trash bypass `transactionService` | `TrashManager.tsx` |
| 2 | 🟠 High (uang) | `sessionId` gak nempel ke data Pengeluaran | `useExpenses.ts`, `InputKeluaran.tsx` |
| 3 | 🟠 High (data) | Backup JSON gak include `audit_log` | `databaseManager.ts` |
| 4 | 🟡 Medium | Audit log write-only, nol UI buat liatnya | `auditService.ts` |
| 5 | 🟡 Medium | Import CSV rawan `\r` di kolom terakhir | `InventoryManager.tsx`, `csvParser.ts` |
| 6 | 🟢 Low | Permanent purge gak nulis `audit_log` | `TrashManager.tsx` |
| 7 | 🔵 Kosmetik | Type `filterDate` kedaluwarsa | `useTransactionFilter.ts` |
| 8 | 🟠 High (data) | `EditTransactionModal` nama barang teks bebas, `inventoryId` lama kebawa | `EditTransactionModal.tsx`, `transactionService.ts` |
| 9 | 🟡 Medium | Counter jumlah transaksi di `RiwayatSesi` gak filter void & gak include arsip | `RiwayatSesi.tsx` |

---

## 1. 🔴 CRITICAL — Restore transaksi dari Trash Manager bypass `transactionService.restoreTransaction()`

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

**File:** `src/components/TrashManager.tsx` (`promptPermanentDeleteTx`, `promptPermanentDeleteInv`)

### Gejala
Aksi hapus permanen (purge) dari Trash — baik transaksi maupun barang — tidak meninggalkan jejak di `audit_log`, walau sudah ada `ConfirmDialog` sebagai konfirmasi (W0-04 sudah terpenuhi dari sisi itu).

### Dampak
Severity rendah karena item yang di-purge memang sudah soft-deleted lebih dulu (stoknya sudah dikembalikan saat void), jadi purge tidak mengubah stok/kas. Tapi untuk kelengkapan audit trail ("siapa menghapus apa secara permanen, kapan"), ini masih ada baiknya dicatat — terutama kalau nanti W5-07 (multi-kasir dengan akun) jadi, supaya ada histori siapa yang punya akses purge.

### Fix (opsional, prioritas rendah)
Tambah `await db.audit_log.add({ action: 'purge', entity: 'transaction'|'inventory', entityId, timestamp, actor, ... })` di kedua handler sebelum/sesudah `db.transactions.delete(id)` / `db.inventory.delete(item.id)`.

---

## 7. 🔵 KOSMETIK — Type `filterDate: string` di `useTransactionFilter.ts` sudah kedaluwarsa

**File:** `src/hooks/useTransactionFilter.ts`

### Detail
Interface `TransactionFilterState` masih mendeklarasikan `filterDate: string`, padahal sejak W3-06 (custom date range), nilai runtime-nya bisa berupa object `{ start, end, label }`. Konsumen yang benar (`useTransactionData.ts`, `LaporanExport.tsx`) sudah menangani kedua bentuk dengan benar (`typeof filterDate === 'object'` check) — jadi **ini bukan bug fungsional**, cuma anotasi tipe yang menyesatkan kalau ada yang membaca interface ini sebagai dokumentasi.

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
  namaBarang: form.namaBarang.trim(),   // bisa diganti ke produk lain
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
Ini melanggar invariant *product identity* yang baru diformalkan lewat ADR-001 (item transaksi harus konsisten antara `namaBarang`/`namaSnapshot` dan `inventoryId` yang dirujuk). Kalau kasir salah input barang saat checkout dan coba dikoreksi lewat Edit Transaksi (bukan void+ulang), hasilnya:
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

## Area yang Sudah Dicek dan Bersih (Tidak Perlu Disentuh)

Supaya jelas mana yang tidak perlu dikhawatirkan:

- `transactionService.ts` — logic checkout/void/restore/edit/unpack (isi fungsinya) sudah benar.
- Migrasi Dexie v12 (`db.ts`) — resolusi `inventoryId` dari nama kanonik aman, data yang tidak match diberi `null` (bukan ditebak), ledger opening dibangun dari quantity saat ini, idempoten.
- UI void transaksi — alasan wajib diisi sebelum submit, sesuai W2-06.
- Rumus `kasTunaiBersih` sendiri (penjualan tunai - kembalian - pengeluaran tunai) — formula benar; masalahnya cuma di sumber data pengeluaran (lihat temuan #2).
- `closingSnapshot` (W1-05) dan merge transaksi aktif+arsip di laporan sesi (W1-06).
- Prioritas harga custom, warning harga jual di bawah modal, indikator modal tidak diketahui (W2-08/09/10).
- **W3-01/02 tuntas 100%** — dikonfirmasi nol `window.confirm`/`window.alert` tersisa di seluruh codebase.
- Notifikasi stok menipis per-barang (`minStock`, W3-03).
- Custom date range laporan (W3-06) — filter transaksi utama sudah benar pakai Dexie `.between()` inclusive.
- `stockDriftCheck.ts` (W1-12) — logic perbandingan `inventory.quantity` vs jumlah `stock_movements.delta` sudah benar, walau perlu dicatat alat ini **tidak** akan mendeteksi bug #1 di atas (karena masalahnya bukan di angka ledger).
- `useInventory.ts` — filter `deletedAt` benar, guard duplikat nama kanonikal benar di `addInventoryItem`/`updateInventoryItem`.
- `TrashManager.tsx` bagian restore barang (`handleRestoreInv`) — berbeda dari restore transaksi (bug #1), ini aman karena soft-delete barang memang cuma soal flag `deletedAt`, tidak menyentuh `stock_movements`.
- `MergePreviewModal.tsx`, `InventoryModal.tsx`, `NotificationPanel.tsx` (notifikasi stok menipis + reminder backup berkala W3-05), `SessionBanner.tsx` — semua logic & validasi sudah benar.
- `bluetoothPrinterHelper.ts` — encoding CP437 untuk printer thermal 58mm sudah ditangani dengan benar (`sanitizeThermalText` + `encodeCp437`), plus device filter by name prefix dengan fallback `acceptAllDevices`. Edge case garbled text yang pernah ditemukan di audit sebelum v3.7.0 sudah selesai diperbaiki.
- `migration.ts` (migrasi legacy localStorage → IndexedDB) — idempoten, defensif, aman dijalankan ulang.

**Catatan dead code (bukan bug, cuma informasi):** `auditService.ts` dan `parseCSV()` di `csvParser.ts` (lihat temuan #4 & #5) sudah disebut di atas; tambahan: `syncManager.ts` (blueprint cloud sync, isinya cuma `console.log` simulasi, tidak pernah di-import di mana pun) dan `crypto.ts` (modul PBKDF2+AES-GCM lengkap tapi tidak dipanggil di mana pun — sepertinya scaffolding untuk fitur PIN/multi-kasir W5-07 yang belum dikerjakan).

---
Belum dicek:

HelpModal.tsx, HotkeyModal.tsx, PromptDialog.tsx, SetupWizardModal.tsx — modal-modal UI pendukung
ReportingChart.tsx, MetrikCard.tsx, LaporanExport.tsx (sempat dibaca sesi lalu tapi belum diaudit detail isinya)
StrukModal.tsx — preview struk sebelum print
AppBootstrap.tsx, ErrorBoundary.tsx — startup & error handling
Hooks: useBackHandler.ts, useCategories.ts, useTransactionFilter.ts, useTransactionMetrics.ts
Utils: backNavigation.ts, downloadHelper.ts, errorMessages.ts, exportCSV.ts, exportExcel.ts, statusVariant.ts, audioFeedback.ts, inlineSyntaxParser.ts, formatters.ts, parseIDNumber.ts (yang ini cuma dicek sepintas, belum full read)
_Audit ini dilakukan dengan membaca source code langsung dan menelusuri alur data lintas file, bukan menjalankan aplikasi secara end-to-end — ada baiknya tiap fix di atas diverifikasi juga lewat testing manual di dev server sebelum di-commit._