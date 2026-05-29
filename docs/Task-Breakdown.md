# 🗓️ Sprint Backlog & Task Breakdown — ClearTask

> **Project:** ClearTask v3.1.0  
> **Status:** Pending Approval (URG-4)  
> **Date:** 2026-05-30  
> **Language:** Bahasa Indonesia

This document details the step-by-step sequential **Task Breakdown** divided into **2 Incremental Sprints** to safely execute refactoring and code expansions in Strangler Fig Mode.

---

## 🏃 Sprint 1: Timezone Fix, Database Hardening & Security (Must Haves)

Sprint 1 focuses on eliminating systemic bugs, data loss risks, and locking core security bounds.

### TASK-01: Timezone Standardizations & Date Indexing Reform

- **Description:** Replacing all legacy `toISOString().split('T')[0]` calls with a centralized local date-string helper to prevent midnight reporting date-shift bugs.
- **Target Files:**
  - `src/utils/formatters.ts` (Implement local boundary mapping)
  - `src/services/db.ts` (Lookup index matching alignment)
  - `src/hooks/useTransactionData.ts`, `src/hooks/useSession.ts` (Binding updates)
- **Awesome Skills Reference:** `@clean-code`, `@javascript-best-practices`
- **Test Validation:** Run `toLocalDateString.test.js` under Vitest and confirm 100% correct WIB calendar matching.

### TASK-02: Graceful QuotaExceededError Storage Handler

- **Description:** Bubble up IndexedDB writes failures from Dexie storage layer to parent hooks and throw alert red Toasts notifications.
- **Target Files:**
  - `src/services/db.ts` (Verify write errors propagation)
  - `src/hooks/useTransactionData.ts` (Catch exception and set active error state)
  - `src/App.tsx` (Trigger visual Toast alert to cashier)
- **Awesome Skills Reference:** `@error-handling-patterns`
- **Test Validation:** Trigger simulated quota failures in Vitest and verify rollback atomicity and Toast emission.

### TASK-03: Reactive Cashier Metadata Binding

- **Description:** Bind transaction cashier name metadata dynamically to settings kasirName context in form initialization.
- **Target Files:**
  - `src/components/InputPenjualan.tsx` (Connect form `initialForm` state to settings context kasir value)
- **Test Validation:** Change active cashier name in SettingsModal, commit a transaction checkout, and expect the new record kasir attribute to match correctly.

---

## 🏃 Sprint 2: SAW worker Decoupling, Merges checks & Archival (Should Haves)

Sprint 2 focuses on offloading heavy computations to Web Workers, import checking, and cold-data partitions.

### TASK-04: Background Worker SAW Replenishment Decoupling

- **Description:** Delegate complex multi-criteria calculations to asynchronous background thread Web Worker (`sawWorker.ts`) to maintain 60 FPS UI rendering thread.
- **Target Files:**
  - `src/workers/sawWorker.ts` (Worker script calculation logic)
  - `src/hooks/useSAWCalculation.ts` (Worker message post/receive communication handler)
  - `src/pages/RestockAnalysis.tsx` (Component loading state integrations)
- **Awesome Skills Reference:** `@react-best-practices`, `@javascript-best-practices`
- **Test Validation:** Perform SAW calculations in browser sandbox and verify zero dropped frames.

### TASK-05: Double-Merge Import Validation Check

- **Description:** Scan incoming import files and skip duplicate records matching local `transactionId` in `calculateMerge` atomically.
- **Target Files:**
  - `src/services/databaseManager.ts` (Skip checking checks)
- **Test Validation:** Import identical JSON file twice, check if merge preview shows `skipped` counts corresponding to duplicates, and expect database size to remain identical.

### TASK-06: Atomic historical Transactions Archival

- **Description:** Implement atomic archival utility to partition transactions older than boundary values to separate `archive_transactions` table.
- **Target Files:**
  - `src/services/databaseManager.ts` (`archiveOldTransactions` transactional script)
  - `src/components/TabDatabase.tsx` (UI execution button interface)
- **Awesome Skills Reference:** `@database-design`
- **Test Validation:** Archive older transaction rows under Vitest and confirm correct database partitions alignment.
