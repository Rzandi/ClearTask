# 💡 ClearTask v3.5.1 — Gap Analysis & Impact Analysis (POS & Printing Upgrades)

> **Agent:** Scout Agent
> **Project Type:** Legacy Refactor (Strangler Fig Mode)
> **Status:** ✅ RESOLVED (v3.5.1)
> **Last verified:** 2026-09-18 | Deep scan `src/` via context-gatherer

This document maps how new features (IndexedDB Storage, Order Document format, SAW Analysis, and Archival) integrate into the legacy codebase, identifying potential logic conflicts, system impact, and database normalization pathways.

---

## 🗺️ Integration Map & Impact Analysis

### 1. IndexedDB Migration (Dexie.js) ✅ DONE

- **Description:** Replacing `localStorage` with `ClearTaskDB` (IndexedDB wrapped via Dexie) as the single local Source of Truth (SoT).
- **Impacted Legacy Modules:**
  - `utils/storage.js` (Deprecated — file masih ada sebagai `src/constants/storageKeys.js` tapi sudah dead code)
  - `hooks/useTransactions.ts` (Decoupled to use reactive Dexie live queries) ✅
  - `hooks/useSession.ts` (Refactored to query session database records) ✅
- **Integration Strategy:** Uses `dexie-react-hooks` (`useLiveQuery`) to automatically trigger React component re-renders when local DB state mutations occur, eliminating legacy manual event listeners. ✅ ACTIVE
- **Current DB version:** v11 (schema aktif di `src/services/db.ts`)

### 2. Transaction Cart Model (Version 3 Schema Upgrade) ✅ DONE

- **Description:** Migrating single-item transaction records to an order document format with a cart array (`items[]`).
- **Impacted Legacy Modules:**
  - `components/InputPenjualan.tsx` (Form inputs restructured to feed arrays) ✅
  - `components/LaporanExport.tsx` (Data mapping adapted to display multiple items per row) ✅
  - `utils/sessionStats.ts` (Calculations revised to reduce cart items correctly) ✅
- **Database Impact:** Safe transactional migration in `db.ts` upgrade block (Version 3) that maps `namaBarang`, `qty`, `hargaSatuan`, `total`, `kategori`, and `subKategori` into a flat single-item array in `items[]` for legacy rows, preventing data loss. ✅

### 3. Decision Support System (SAW Method Restock Analysis) ⚠️ PARTIAL / REVERTED

- **Description:** Multi-criteria decision analysis using SAW to suggest replenishment priority.
- **Status:** ⚠️ SAW tables (`saw_criterias`, `saw_history`) **di-drop di DB version 9** — fitur ini di-revert dari schema aktif. `sawWorker.ts` status tidak dikonfirmasi apakah masih ada di `src/`.
- **Titik Integrasi (Integration Points):**
  - **Reads:** `db.transactions` dan `db.inventory` — masih ada, namun SAW consumer sudah tidak aktif
  - **Writes:** `db.saw_criterias` dan `db.saw_history` — **tabel ini di-drop di v9**
- **Conflict Resolution:** Web Worker approach direncanakan untuk isolasi dari main thread, tapi karena revert fitur, status implementasi belum dikonfirmasi.

### 4. Cold-Data Archival Layer (Version 5 Schema) ✅ DONE

- **Description:** Partitioning database into active transactions (`transactions`) and historical data (`archive_transactions`) older than a specified duration.
- **Impacted Legacy Modules:**
  - `services/databaseManager.ts` (Added atomic transaction `archiveOldTransactions`) ✅
  - `components/TabDatabase.tsx` (Database management interface integrations) ✅

---

## ⚡ Potential Logic Conflicts & Risk Assessment

| #   | Potential Conflict / Gap                                                                                         | Risk Level    | Status                   | Mitigation                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | **Timezone Divergence in Offline Querying** — Legacy `toISOString().split('T')[0]` menyebabkan shift 7 jam (WIB) | 🔴 **High**   | ✅ **RESOLVED**          | `toLocalDateString()` helper aktif di semua modul                                                                 |
| 2   | **Database Quota Exceeded (Storage Crash)** — IndexedDB writes bisa gagal pada disk penuh                        | 🟡 **Medium** | ✅ **RESOLVED**          | `QuotaExceededError` ditangkap di semua write ops di `App.tsx`. `checkStorageQuota()` aktif di `AppBootstrap.tsx` |
| 3   | **Stale Cashier Metadata** — Settings default value override nama kasir menjadi `'Admin'`                        | 🟡 **Medium** | ✅ **RESOLVED**          | `InputPenjualan.tsx` membaca `settings.kasirName` dinamis dari `SettingsContext`                                  |
| 4   | **Double-Merge Conflict in Import** — Data duplikat bisa overwrite/duplicate records                             | 🟡 **Medium** | ✅ **RESOLVED**          | `calculateMerge()` di `databaseManager.ts` check `transactionId` uniqueness + renumbering untuk conflicts         |
| 5   | **Inventory Soft Delete Inconsistency** — `deleteInventoryItem` kini soft delete; query memfilter `deletedAt`    | 🔴 **High**   | ✅ **RESOLVED (v3.5.1)** | Selesai via `useInventory.ts` + unit test `useInventory.softdelete.test.js`                                       |
| 6   | **Shortcut F3 Dead Navigation** — F3 route ke tab `'database'`                                                   | 🟡 **Medium** | ✅ **RESOLVED (v3.5.1)** | Selesai via `AppShell.tsx` reroute ke `'database'` + `shortcuts.ts`                                               |
| 7   | **Security PIN Not Active in Production** — Fitur PIN lengkap ada di `src/archive/` tapi tidak terintegrasi      | 🟡 **Medium** | 📦 **ARCHIVED**          | Sprint 4 di-skip sesuai keputusan user (tetap di archive)                                                         |

---

## 🔒 Operational Boundaries (Jangan Ubah / Keep Intact)

1. **Source of Truth Priority:** Keep Dexie IndexedDB as the 100% local Source of Truth. No external APIs should bypass this boundary. ✅ Terjaga — `syncManager.ts` masih blueprint/stub, tidak aktif.
2. **ACID Transactions:** All database merges, deletions, or archives must be enclosed in `db.transaction()` block. ✅ Aktif di `applyMerge`, `archiveOldTransactions`, `addTransaction`.
3. **No Heavy Packages:** Maintain lazy imports for `exceljs` and pure native Web Worker implementations. Do not add bloated third-party routing or state-management frameworks. ✅ `lazyWithRetry()` aktif untuk semua modal components.
