# 💡 ClearTask v3.1.0 — Gap Analysis & Impact Analysis (Fase 1)

> **Agent:** Scout Agent  
> **Project Type:** Legacy Refactor (Strangler Fig Mode)  
> **Status:** Pending Approval (URG-1)

This document maps how new features (IndexedDB Storage, Order Document format, SAW Analysis, and Archival) integrate into the legacy codebase, identifying potential logic conflicts, system impact, and database normalization pathways.

---

## 🗺️ Integration Map & Impact Analysis

### 1. IndexedDB Migration (Dexie.js)

- **Description:** Replacing `localStorage` with `ClearTaskDB` (IndexedDB wrapped via Dexie) as the single local Source of Truth (SoT).
- **Impacted Legacy Modules:**
  - `utils/storage.js` (Deprecated)
  - `hooks/useTransactions.ts` (Decoupled to use reactive Dexie live queries)
  - `hooks/useSession.ts` (Refactored to query session database records)
- **Integration Strategy:** Uses `dexie-react-hooks` (`useLiveQuery`) to automatically trigger React component re-renders when local DB state mutations occur, eliminating legacy manual event listeners.

### 2. Transaction Cart Model (Version 3 Schema Upgrade)

- **Description:** Migrating single-item transaction records to an order document format with a cart array (`items[]`).
- **Impacted Legacy Modules:**
  - `components/InputPenjualan.tsx` (Form inputs restructured to feed arrays)
  - `components/LaporanExport.tsx` (Data mapping adapted to display multiple items per row)
  - `utils/sessionStats.ts` (Calculations revised to reduce cart items correctly)
- **Database Impact:** Safe transactional migration in `db.ts` upgrade block (Version 3) that maps `namaBarang`, `qty`, `hargaSatuan`, `total`, `kategori`, and `subKategori` into a flat single-item array in `items[]` for legacy rows, preventing data loss.

### 3. Decision Support System (SAW Method Restock Analysis)

- **Description:** Multi-criteria decision analysis using SAW to suggest replenishment priority.
- **Titik Integrasi (Integration Points):**
  - **Reads:** `db.transactions` (for selling frequency and volume) and `db.inventory` (for active stock levels).
  - **Writes:** `db.saw_criterias` (custom weights) and `db.saw_history` (rank snapshot logging).
- **Conflict Resolution:** Heavily nested loops for matrix normalization and scoring are isolated from the main browser thread. Calculations run inside `sawWorker.ts` (Web Worker), avoiding render blocking or UI freezing.

### 4. Cold-Data Archival Layer (Version 5 Schema)

- **Description:** Partitioning database into active transactions (`transactions`) and historical data (`archive_transactions`) older than a specified duration.
- **Impacted Legacy Modules:**
  - `services/databaseManager.ts` (Added atomic transaction `archiveOldTransactions`)
  - `components/TabDatabase.tsx` (Database management interface integrations)

---

## ⚡ Potential Logic Conflicts & Risk Assessment

| #   | Potential Conflict / Gap                                                                                                                                  | Risk Level    | Mitigation Strategy                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Timezone Divergence in Offline Querying**<br>Legacy code used `toISOString().split('T')[0]` which causes a 7-hour timezone shift gap (WIB) at midnight. | 🔴 **High**   | Introduce a programmatic helper `toLocalDateString(date)` that preserves local calendar boundaries across index searches.       |
| 2   | **Database Quota Exceeded (Storage Crash)**<br>IndexedDB writes can fail on low disk space throwing `QuotaExceededError`.                                 | 🟡 **Medium** | Ensure database services explicitly bubble up write failures to custom hooks, triggering user-facing error Toast notifications. |
| 3   | **Stale Cashier Metadata**<br>Settings default values can override active transactions, hardcoding cashier names as `'Admin'`.                            | 🟡 **Medium** | Bind `initialForm` inside `InputPenjualan.tsx` dynamically to `SettingsContext` state value.                                    |
| 4   | **Double-Merge Conflict in Import**<br>Importing duplicate JSON data can overwrite or duplicate records.                                                  | 🟡 **Medium** | Maintain `transactionId` index as unique and run unique checking in `calculateMerge` before pushing `bulkAdd`.                  |

---

## 🔒 Operational Boundaries (Jangan Ubah / Keep Intact)

1. **Source of Truth Priority:** Keep Dexie IndexedDB as the 100% local Source of Truth. No external APIs should bypass this boundary.
2. **ACID Transactions:** All database merges, deletions, or archives must be enclosed in `db.transaction()` block.
3. **No Heavy Packages:** Maintain lazy imports for `exceljs` and pure native Web Worker implementations. Do not add bloated third-party routing or state-management frameworks.
