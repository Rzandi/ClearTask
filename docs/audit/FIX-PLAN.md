# 🔧 ClearTask — Audit Fix Plan

> Dikonsolidasi dari 12 laporan audit | 2026-05-22
> Urutan berdasarkan: Dampak × Effort (High Impact + Low Effort = dikerjakan duluan)

---

## Cara Baca Dokumen Ini

- **Sektor** = area kode yang disentuh
- **Effort** = estimasi waktu pengerjaan
- **Sumber** = file laporan audit asal
- Status: `[ ]` = belum, `[x]` = selesai

---

## 🚀 WAVE 1 — Quick Wins (< 30 menit total, dampak tinggi)

> Kerjakan semua ini dalam satu sesi. Tidak ada dependency antar item.

### W1-1 · Hapus `injectKeyForTesting` dari production build

- **Sektor:** Security / Context
- **File:** `src/contexts/SecurityContext.jsx`
- **Effort:** 5 menit
- **Sumber:** `security-report.md`
- **Fix:**
  ```js
  // Ganti baris di context value:
  ...(import.meta.env.DEV ? { injectKeyForTesting } : {}),
  ```

### W1-2 · Fix `--color-text-muted` contrast (WCAG AA)

- **Sektor:** A11y / CSS
- **File:** `src/index.css`
- **Effort:** 2 menit
- **Sumber:** `ux-report.md`
- **Fix:**
  ```css
  --color-text-muted: #8b949e; /* was: #6e7681 — rasio 3.8:1 → 5.2:1 */
  ```

### W1-3 · Conditional `console.error` hanya di DEV

- **Sektor:** Security / Logging
- **File:** `src/hooks/useTransactions.js`
- **Effort:** 3 menit
- **Sumber:** `security-report.md`
- **Fix:**
  ```js
  if (import.meta.env.DEV) console.error('Gagal dekripsi transaksi', tx.id, e);
  ```

### W1-4 · Tambahkan CSP meta tag di `index.html`

- **Sektor:** Security / HTML
- **File:** `index.html`
- **Effort:** 5 menit
- **Sumber:** `security-report.md`
- **Fix:**
  ```html
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
  />
  ```

### W1-5 · Tambahkan `strictPort` di Vite config

- **Sektor:** DX / Config
- **File:** `vite.config.js`
- **Effort:** 2 menit
- **Sumber:** `dx-report.md`
- **Fix:**
  ```js
  server: { port: 5173, strictPort: true },
  ```

### W1-6 · Tambahkan `aria-label` deskriptif ke numpad PIN

- **Sektor:** A11y / Component
- **File:** `src/components/PinLockScreen.jsx`
- **Effort:** 10 menit
- **Sumber:** `ux-report.md`
- **Fix:** Tambahkan `aria-label={`Masukkan digit ${num}`}` ke setiap tombol numpad.

---

## 🔒 WAVE 2 — Security Hardening (1–2 jam)

> Kerjakan setelah Wave 1. Urutan dalam wave ini penting: W2-1 sebelum W2-2.

### W2-1 · Tambahkan PIN brute-force lockout

- **Sektor:** Security / Component
- **File:** `src/components/PinLockScreen.jsx`
- **Effort:** 30 menit
- **Sumber:** `security-report.md`
- **Fix:** Tambahkan state `failedAttempts` dan `lockedUntil`. Setelah 5 gagal, lockout 30 detik (exponential backoff).

  ```js
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  // Di handleSubmit, jika login gagal:
  const newAttempts = failedAttempts + 1;
  setFailedAttempts(newAttempts);
  if (newAttempts >= 5) {
    const lockDuration = Math.min(30 * Math.pow(2, newAttempts - 5), 300); // max 5 menit
    setLockedUntil(Date.now() + lockDuration * 1000);
  }
  ```

### W2-2 · Tambahkan komentar dokumentasi bahwa salt adalah public value

- **Sektor:** Security / Documentation
- **File:** `src/contexts/SecurityContext.jsx`
- **Effort:** 5 menit
- **Sumber:** `security-report.md`
- **Fix:** Tambahkan JSDoc comment di atas `securitySalt` yang menjelaskan ini adalah public value by design.

---

## 🏗️ WAVE 3 — Architecture Refactor (2–4 jam)

> Wave terbesar. Kerjakan W3-1 dulu karena W3-2 bergantung padanya.

### W3-1 · Tambahkan React Error Boundary di root

- **Sektor:** Architecture / Error Handling
- **File:** `src/main.jsx` + buat `src/components/ErrorBoundary.jsx`
- **Effort:** 30 menit
- **Sumber:** `architecture-report.md` + `error-handling-report.md`
- **Fix:** Buat class component `ErrorBoundary` dengan fallback UI yang informatif. Wrap `<App />` di `main.jsx`.

### W3-2 · Pecah `useTransactions` menjadi 3 hooks

- **Sektor:** Architecture / Hooks
- **File:** `src/hooks/useTransactions.js` → split menjadi:
  - `src/hooks/useTransactionData.js` (fetch + CRUD + enkripsi)
  - `src/hooks/useTransactionFilter.js` (filter + sort)
  - `src/hooks/useTransactionMetrics.js` (todayMetrics)
- **Effort:** 90 menit
- **Sumber:** `architecture-report.md`
- **Catatan:** Update semua consumer (`App.jsx`, test files) setelah split.

### W3-3 · Refactor `SettingsModal` pakai `Modal.jsx` base (focus trap)

- **Sektor:** A11y / Architecture
- **File:** `src/components/SettingsModal.jsx`
- **Effort:** 30 menit
- **Sumber:** `ux-report.md`
- **Fix:** Ganti backdrop + card div dengan `<Modal isOpen={isOpen} onClose={handleClose} title="Pengaturan">`.

### W3-4 · Pindahkan `databaseManager.js` ke `src/services/`

- **Sektor:** Architecture / File Structure
- **File:** `src/utils/databaseManager.js` → `src/services/databaseManager.js`
- **Effort:** 10 menit (gunakan smartRelocate)
- **Sumber:** `architecture-report.md`
- **Status:** ✅ DONE — File dipindah ke `src/services/databaseManager.js`. Import di `TabDatabase.jsx` dan `databaseManager.test.js` diperbarui.

---

## ⚡ WAVE 4 — Performance (1–2 jam)

### W4-1 · Lazy load `SettingsModal` dan `ConfirmDialog`

- **Sektor:** Performance / Bundle
- **File:** `src/App.jsx`
- **Effort:** 15 menit
- **Sumber:** `perf-report.md`
- **Fix:**
  ```js
  const SettingsModal = lazy(() => import('./components/SettingsModal'));
  const ConfirmDialog = lazy(() => import('./components/ConfirmDialog'));
  ```

### W4-2 · Ganti `file-saver` dengan native browser File API

- **Sektor:** Performance / Dependencies
- **File:** `src/utils/databaseManager.js` + `src/utils/exportCSV.js` + `src/utils/exportExcel.js`
- **Effort:** 30 menit
- **Sumber:** `deps-report.md`
- **Fix:**
  ```js
  // Ganti saveAs(blob, filename) dengan:
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  ```
  Lalu hapus `file-saver` dari `package.json`.

### W4-3 · Tambahkan `React.memo` ke komponen berat

- **Sektor:** Performance / Components
- **File:** `src/components/MetrikCard.jsx`, `src/components/SessionBanner.jsx`
- **Effort:** 15 menit
- **Sumber:** `perf-report.md`
- **Catatan:** `MetrikCard` sudah pakai `memo` ✅. Cek komponen lain yang sering re-render.

---

## 📋 WAVE 5 — Compliance & Documentation (1 jam)

### W5-1 · Tambahkan Privacy Notice di app

- **Sektor:** Compliance / UI
- **File:** `src/components/HelpModal.jsx`
- **Effort:** 20 menit
- **Sumber:** `compliance-report.md`
- **Status:** ✅ DONE — Seksi "Privasi & Keamanan Data" ditambahkan di HelpModal. Mencakup: data yang disimpan, lokasi penyimpanan (lokal/IndexedDB), enkripsi AES-GCM, hak hapus data, dan peringatan backup.

### W5-2 · Tambahkan backup reminder

- **Sektor:** Compliance / UX
- **File:** `src/components/SettingsModal.jsx` + `src/services/databaseManager.js`
- **Effort:** 15 menit
- **Sumber:** `compliance-report.md`
- **Status:** ✅ DONE — Banner kuning muncul di SettingsModal jika belum pernah backup atau backup terakhir ≥ 7 hari lalu. Timestamp `lastBackupAt` ditulis ke IndexedDB meta table setiap kali `exportDatabase()` dipanggil.

### W5-3 · Update `README.md`

- **Sektor:** DX / Documentation
- **File:** `README.md`
- **Effort:** 20 menit
- **Sumber:** `dx-report.md`
- **Status:** ✅ DONE — README diperbarui: arsitektur IndexedDB, PIN security, 3 sub-hooks, tech stack terkini, quick start, testing guide, scripts table, security section.

### W5-4 · Konsistenkan penggunaan `formatRupiah()`

- **Sektor:** i18n / Utils
- **File:** `src/components/InputPenjualan.jsx` dan komponen lain yang pakai `toLocaleString` langsung
- **Effort:** 15 menit
- **Sumber:** `i18n-report.md`

---

## 🗄️ WAVE 6 — Database Schema (1–2 jam, perlu planning)

> Wave ini memerlukan Dexie schema upgrade. Buat branch terpisah.

### W6-1 · Hapus `legacyId` field dari transaksi yang dimigrasikan

- **Sektor:** DB / Migration
- **File:** `src/utils/migration.js` + `src/services/db.js`
- **Effort:** 20 menit
- **Sumber:** `migration-report.md`
- **Fix:** Hapus `legacyId: _oldId` dari migration script. Buat Dexie v2 migration untuk membersihkan field lama.

### W6-2 · Tambahkan `updatedAt` ke semua tabel

- **Sektor:** DB / Schema
- **File:** `src/services/db.js`
- **Effort:** 45 menit
- **Sumber:** `sync-report.md` + `compliance-report.md`
- **Fix:** Buat `db.version(2)` dengan `updatedAt` di transactions, sessions, inventory. Buat upgrade function yang set `updatedAt = createdAt` untuk data lama.

### W6-3 · Duplikasi migration flag ke IndexedDB `meta` table

- **Sektor:** DB / Migration
- **File:** `src/utils/migration.js`
- **Effort:** 15 menit
- **Sumber:** `migration-report.md`

### W6-4 · Tambahkan validasi integritas post-migration

- **Sektor:** DB / Migration
- **File:** `src/utils/migration.js`
- **Effort:** 20 menit
- **Sumber:** `migration-report.md`

---

## 🔮 WAVE 7 — Future-Proofing (Opsional, untuk v3.x)

> Tidak urgent. Kerjakan saat ada bandwidth.

### W7-1 · Desain conflict resolution strategy untuk Cloud Sync

- **Sektor:** Architecture / Sync
- **Effort:** Planning session (tidak ada kode)
- **Sumber:** `sync-report.md`

### W7-2 · Implementasi decrypt cache di `useTransactionData`

- **Sektor:** Performance / Hooks
- **File:** `src/hooks/useTransactionData.js` (setelah W3-2)
- **Effort:** 60 menit
- **Sumber:** `perf-report.md`

### W7-3 · Tambahkan date-range filter di Dexie query

- **Sektor:** Performance / DB
- **File:** `src/hooks/useTransactionData.js`
- **Effort:** 30 menit
- **Sumber:** `perf-report.md`

### W7-4 · Tambahkan audit trail (`updatedBy`, `updatedAt`) ke transaksi

- **Sektor:** Compliance / DB
- **File:** `src/hooks/useTransactionData.js` + `src/services/db.js`
- **Effort:** 45 menit
- **Sumber:** `compliance-report.md`

### W7-5 · Pertimbangkan migrasi TypeScript untuk `utils/` dan `hooks/`

- **Sektor:** Architecture / DX
- **Effort:** 4–8 jam
- **Sumber:** `architecture-report.md`

---

## 📊 Summary Tabel

| Wave                     | Jumlah Issue | Total Effort | Prioritas    |
| ------------------------ | ------------ | ------------ | ------------ |
| Wave 1 — Quick Wins      | 6            | ~30 menit    | 🔴 Sekarang  |
| Wave 2 — Security        | 2            | ~35 menit    | 🔴 Sekarang  |
| Wave 3 — Architecture    | 4            | ~2.5 jam     | 🟠 Sprint 1  |
| Wave 4 — Performance     | 3            | ~1 jam       | 🟠 Sprint 1  |
| Wave 5 — Compliance/Docs | 4            | ~1 jam       | 🟡 Sprint 2  |
| Wave 6 — Database        | 4            | ~1.5 jam     | 🟡 Sprint 2  |
| Wave 7 — Future          | 5            | ~8+ jam      | 🟢 Sprint 3+ |
| **Total**                | **28**       | **~15 jam**  |              |

---

## Urutan Eksekusi yang Disarankan

```
Hari 1 (2 jam):  Wave 1 + Wave 2  → Security hardened, quick wins done
Hari 2 (3 jam):  Wave 3           → Architecture clean, Error Boundary ada
Hari 3 (2 jam):  Wave 4 + Wave 5  → Performance + Docs
Hari 4 (2 jam):  Wave 6           → DB schema upgrade (branch terpisah)
Hari 5+:         Wave 7           → Future-proofing (opsional)
```

---

_Dokumen ini dibuat dari konsolidasi 12 laporan audit di `docs/audit/`._
_Setiap fix harus diikuti dengan `npm run test:run` untuk memastikan tidak ada regresi._
