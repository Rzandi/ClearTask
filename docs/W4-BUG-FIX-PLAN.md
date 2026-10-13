# Bug Fix Plan — Temuan Audit v3.7.0

**Dibuat:** 11 Oktober 2026  
**Sumber:** [ClearTask-Bug-Report-Audit-v3.7.0.md](../ClearTask-Bug-Report-Audit-v3.7.0.md)  
**Status:** Perencanaan

---

## Ringkasan

Dari 14 temuan audit, **6 sudah diperbaiki** sebelum dokumen ini dibuat (terkonfirmasi lewat grep ke kode aktual). Tersisa **8 item** yang perlu dikerjakan, dibagi menjadi:

- **5 bug aktif** yang berdampak ke data/UX
- **3 item refactor/fitur** yang terkait temuan audit

---

## Status Temuan Per Item

| #   | Severity    | Judul                                                                 | Status                                                             |
| --- | ----------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | 🔴 Critical | Restore bypass `transactionService`                                   | ✅ Fixed                                                           |
| 2   | 🟠 High     | `sessionId` tidak ditempel ke Pengeluaran                             | ✅ Fixed                                                           |
| 3   | 🟠 High     | Backup JSON tidak include `audit_log`                                 | ✅ Fixed                                                           |
| 4   | 🟡 Medium   | Audit log write-only, tidak ada UI                                    | ⏳ Backlog (W5)                                                    |
| 5   | 🟡 Medium   | CSV `\r` di kolom terakhir                                            | ✅ Fixed                                                           |
| 6   | 🟢 Low      | Permanent purge tidak tulis `audit_log`                               | ✅ Fixed                                                           |
| 7   | 🔵 Kosmetik | Type `filterDate` kedaluwarsa                                         | ✅ Fixed                                                           |
| 8   | 🟠 High     | `EditTransactionModal` `inventoryId` lama kebawa                      | ✅ Fixed — commit `50e374d`                                        |
| 9   | 🟡 Medium   | Counter badge `RiwayatSesi` tidak filter void/arsip                   | ✅ Fixed — commit `53079f3`                                        |
| 10  | 🟠 High     | `ReportingChart` pakai `hargaModal\|\|0`, margin palsu 100%           | ✅ Fixed — commit `b4f3923`                                        |
| 11  | 🟡 Medium   | Dashboard `isFirstDay` tidak query `archive_transactions`             | ✅ Fixed — commit `c5efc1f`                                        |
| 12  | 🟠 High     | Command Palette Ctrl+K diklaim ✅ tapi nol implementasi               | ✅ Fixed (sudah ada `CommandPalette.tsx` + `useCommandPalette.ts`) |
| 13  | 🟡 Medium   | Upload QRIS tidak ada batas ukuran/kompresi                           | ✅ Fixed — commit `21f848a`                                        |
| 14  | 🟠 High     | `parseInlineCommand` dead code, nol dipanggil dari UI                 | ✅ Done — wired ke `ManualItemForm.tsx`                            |
| —   | ⚠️          | W3-11 unify `useLiveQuery` — klaim ✅ perlu verifikasi                | 🔵 Verified partial                                                |
| —   | ⚠️          | W3-12 InputPenjualan -53% — angka tidak akurat (894 baris, bukan 785) | 🔵 Verified partial                                                |

---

## Work Items yang Perlu Dikerjakan

### 🔴 Bug-01 — Fix `ReportingChart` margin palsu + `hargaModalSnapshot: 0` di auto-detect

**Priority:** High (uang/laporan)  
**Effort:** S (0.5 hari)  
**Status: ✅ Done — commit `b4f3923`**  
**Files:** `src/components/ReportingChart.tsx`, `src/services/transactionService.ts`

**Root cause (dua titik):**

1. `transactionService.ts` baris ~194: jalur auto-detect produk baru menulis `hargaModalSnapshot: 0` — seharusnya `null` agar konsisten dengan jalur match yang sudah benar (`null` = tidak diketahui).
2. `ReportingChart.tsx` baris ~78: membaca `item.hargaModal || 0` — seharusnya `item.hargaModalSnapshot`, dan nilai `null` harus dieksklusi dari perhitungan modal (bukan dianggap 0).

**Fix:**

```ts
// transactionService.ts ~194
// SEBELUM:
hargaModalSnapshot: 0,
// SESUDAH:
hargaModalSnapshot: null,

// ReportingChart.tsx ~78
// SEBELUM:
entry.modal += (item.hargaModal || 0) * (item.qty || 1);
// SESUDAH:
if (item.hargaModalSnapshot !== null && item.hargaModalSnapshot !== undefined) {
  entry.modal += item.hargaModalSnapshot * (item.qty || 1);
} else {
  entry.hasUnknownModal = true; // tandai untuk ditampilkan "sebagian modal tidak diketahui"
}
```

**Verification:** Checkout barang baru (auto-detect, tanpa harga modal di inventory). Buka grafik Profit — barang itu TIDAK boleh terhitung margin 100%.

---

### 🔴 Bug-02 — Fix `EditTransactionModal` — null-kan `inventoryId` saat nama barang berubah

**Priority:** High (integritas data stok)  
**Effort:** S (0.5 hari)  
**Status: ✅ Done — commit `50e374d`**  
**Files:** `src/components/EditTransactionModal.tsx`

**Root cause:** `handleSubmit` spread item lama (termasuk `inventoryId`) lalu hanya timpa `namaBarang`. Kalau nama diganti ke produk berbeda, `inventoryId` lama tetap menempel → `transactionService.updateTransaction()` menyesuaikan stok barang **lama**, bukan barang baru.

**Fix (minimal change, non-breaking):**

```ts
// EditTransactionModal.tsx — di handleSubmit, setelah build updatedItem
const oldNamaBarang = transaction.items?.[0]?.namaBarang ?? transaction.namaBarang ?? '';
const newNamaBarang = form.namaBarang.trim();

const updatedItem = {
  ...(transaction.items && transaction.items[0] ? transaction.items[0] : {}),
  kategori: form.kategori,
  namaBarang: newNamaBarang,
  qty: parseInt(form.qty, 10),
  hargaSatuan: parseInt(form.hargaSatuan, 10),
  total,
  // Guard: kalau nama berubah, drop inventoryId agar transactionService
  // fallback ke pencarian by nama baru, bukan pakai ID barang lama
  ...(newNamaBarang.toLowerCase() !== oldNamaBarang.toLowerCase() ? { inventoryId: null } : {}),
};
```

**Note:** Solusi ideal jangka panjang adalah ganti field `namaBarang` jadi autocomplete dari `useInventory()` (seperti `InputPenjualan.tsx`), tapi itu L effort. Fix ini adalah guard minimal yang mencegah silent data corruption.

**Verification:** Checkout barang A (qty 2) → stok A berkurang 2. Edit transaksi, ganti nama ke barang B → stok A kembali +2, stok B berkurang 2.

---

### 🟡 Bug-03 — Fix counter badge `RiwayatSesi` — filter void + include arsip

**Priority:** Medium (UI konsistensi)  
**Effort:** S (0.5 hari)  
**Status: ✅ Done — commit `53079f3`**  
**Files:** `src/components/RiwayatSesi.tsx`

**Root cause:** `loadCounts()` memakai `.count()` polos tanpa filter `deletedAt` dan tanpa query `archive_transactions`.

**Fix:**

```ts
// RiwayatSesi.tsx — ganti loadCounts()
async function loadCounts() {
  const map: Record<string, number> = {};
  await Promise.all(
    allSessions.map(async (session) => {
      // Query aktif (filter void)
      const activeTxs = await db.transactions
        .where('sessionId')
        .equals(session.id)
        .filter((tx) => !tx.deletedAt)
        .count();
      // Query arsip
      const archivedTxs = await db.archive_transactions
        .where('sessionId')
        .equals(session.id)
        .count();
      map[session.id] = activeTxs + archivedTxs;
    })
  );
  setTxCounts(map);
}
```

**Verification:** Buka sesi, checkout 2 transaksi, void 1. Badge = "1 transaksi". Arsipkan sesi → badge tetap "1 transaksi" (bukan 0).

---

### 🟡 Bug-04 — Fix `useTransactionMetrics` `isFirstDay` — include `archive_transactions`

**Priority:** Medium (dashboard metrics)  
**Effort:** S (0.5 hari)  
**Status: ✅ Done — commit `c5efc1f`**  
**Files:** `src/hooks/useTransactionMetrics.ts`

**Root cause:** `historicalTxs` hanya query `db.transactions`, tidak include `db.archive_transactions`. Toko yang semua transaksinya sudah diarsip → `historicalCount = 0` → `isFirstDay = true` → tren menghilang.

**Fix:**

```ts
// useTransactionMetrics.ts
const historicalTxs = await db.transactions.where('tanggal').below(todayStr).toArray();
const archivedHistoricalCount = await db.archive_transactions
  .where('tanggal')
  .below(todayStr)
  .count();
const historicalCount =
  historicalTxs.filter((tx: any) => !tx.deletedAt).length + archivedHistoricalCount;
```

**Verification:** Toko dengan semua transaksi diarsip → dashboard masih tampil tren (bukan "hari pertama").

---

### 🟡 Bug-05 — Fix upload QRIS — validasi ukuran + kompresi canvas

**Priority:** Medium (storage/performance)  
**Effort:** S (0.5 hari)  
**Status: ✅ Done — commit `21f848a`**  
**Files:** `src/components/SetupWizardModal.tsx`, `src/components/SettingsModal.tsx`

**Root cause:** Foto QRIS dari kamera HP (3-8 MB) disimpan mentah sebagai base64 ke IndexedDB. Terbawa tiap `useSettings()` dipanggil.

**Fix:** Resize ke canvas max 400×400px + kompres JPEG 0.7 sebelum `readAsDataURL`:

```ts
async function compressImage(file: File, maxSize = 400, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Di handleQrisUpload:
async function handleQrisUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 10_000_000) {
    // 10MB hard limit
    showToast('Ukuran gambar terlalu besar (max 10MB)', 'error');
    return;
  }
  const compressed = await compressImage(file);
  setQrisImageUrl(compressed);
}
```

**Verification:** Upload foto 5MB → tersimpan sebagai string base64 kecil (< 100KB). QR code masih scannable.

---

### 🟠 Refactor-01 — Wire `parseInlineCommand` ke `InputPenjualan.tsx`

**Priority:** High (fitur diklaim ada di README tapi dead code)  
**Effort:** M (1.5 hari)  
**Status: ✅ Done (12 Okt 2026)**  
**Files:** `src/components/pos/ManualItemForm.tsx`, `src/utils/inlineSyntaxParser.ts`, `src/__tests__/W4-inlineSyntaxForm.test.jsx`

**Scope:**

1. Perbaiki inkonsistensi regex di `inlineSyntaxParser.ts`: samakan syarat spasi antara `hasInlineSyntax()` (`\s*`) dan regex qty (`\s+`), atau keduanya pakai `\s*`. Pilih satu — saat ini `"indomie2x"` di-detect tapi gagal di-parse.
2. Tambah field input "cepat" di `InputPenjualan.tsx` yang:
   - Saat user mengetik, panggil `hasInlineSyntax()` untuk deteksi
   - Tampilkan hint preview kalau terdeteksi: "→ Susu · 2x · Rp 15.000"
   - Saat user tekan Enter/Tab, parse dengan `parseInlineCommand()` dan isi form nama/qty/harga
3. Fallback: kalau parse gagal, treat input sebagai nama barang biasa

**Note:** Fix regex dulu sebelum wire ke UI, agar preview dan hasil parse konsisten.

---

### 🔵 Refactor-02 — Update Master Plan W3-12 dengan angka baris yang akurat

**Priority:** Low (dokumentasi akurasi)  
**Effort:** XS (< 1 jam)  
**Status: ✅ Done (11 Okt 2026)**  
**Files:** `docs/Master-plan-3.7.0/ClearTask-Master-Plan.md`

Angka dikoreksi: "1652 → 894 baris, -46%" dengan 5 sub-komponen di `src/components/pos/`.

---

### 🔵 Refactor-03 — Audit sisa ✅ di Master Plan W0-W2

**Priority:** Low (roadmap hygiene)  
**Effort:** M (1 hari investigasi)  
**Output:** Laporan singkat per section mana yang verified vs belum

**Konteks:** Audit menemukan W3-11 dan W3-12 punya klaim ✅ yang tidak sepenuhnya akurat. Perlu pass manual ke W0-W2 untuk pastikan semua centang memang terbukti di kode, bukan sekedar terdokumentasi.

---

## Urutan Pengerjaan yang Disarankan

```
Bug-01 (ReportingChart)     → paling parah, menyesatkan laporan keuangan
Bug-02 (EditTransaction)    → silent data corruption stok
Bug-03 (RiwayatSesi badge)  → quick win, S effort
Bug-04 (isFirstDay metrics) → quick win, S effort
Bug-05 (QRIS upload)        → quick win, S effort
Refactor-01 (inline parser) → setelah bugs clear, 1.5 hari
Refactor-02/03 (docs)       → kapan saja, paralel
```

Total estimasi: **~5 hari** untuk semua item.

---

## Catatan

- Bug-01 dan Bug-02 harus dikerjakan sebelum **W4-04 (Diskon)** karena keduanya menyentuh `transactionService` dan `TransactionItem` — lebih murah fix sebelum diskon menambah field baru.
- Refactor-01 (inline parser) sebaiknya dikerjakan sebelum **W4-02 Phase 4-5** (Hutang-Piutang notifications) karena inline parser relevan dengan flow `InputPenjualan`.
- Bug-03/04/05 bisa diparalel dengan W4-05 (clean types) yang sedang berjalan sekarang.
