<p align="center">
  <h1 align="center">ClearTask v3.0.0</h1>
  <p align="center"><strong>Aplikasi Kasir PWA Offline-First — Aman, Cepat, dan Bisa Dipakai Tanpa Internet.</strong></p>
</p>

---

## Tentang ClearTask

ClearTask adalah aplikasi Point-of-Sale (POS) berbasis PWA yang dirancang untuk kasir dan pemilik usaha kecil. Semua data tersimpan **100% lokal** di perangkat pengguna menggunakan IndexedDB — tidak ada server, tidak ada akun, tidak ada biaya langganan.

### Fitur Utama

- **Input Transaksi** — Form dua-kolom dengan kalkulasi total otomatis, kategori & sub-kategori dinamis
- **Manajemen Sesi/Shift** — Buka/tutup sesi kasir, closing report otomatis per shift
- **Master Barang (Inventaris)** — CRUD lengkap dengan peringatan stok rendah
- **Laporan & Export** — Export ke Excel (.xlsx) dan CSV, filter tanggal & pencarian
- **Database Manager** — Backup/restore via JSON, Smart Merge (tolak duplikasi otomatis)
- **PWA Installable** — Bisa diinstall di Android/iOS/Desktop, 100% offline

---

## Tech Stack

| Layer     | Teknologi                                          |
| --------- | -------------------------------------------------- |
| Framework | React 19 + Vite 8                                  |
| Styling   | Tailwind CSS v4                                    |
| Database  | IndexedDB via Dexie.js v4                          |
| Enkripsi  | Web Crypto API (AES-GCM 256 + PBKDF2)              |
| Export    | ExcelJS (lazy-loaded)                              |
| Testing   | Vitest + @testing-library/react + fast-check (PBT) |
| E2E       | Playwright                                         |
| DX        | Husky + Commitlint + lint-staged + Prettier        |

---

## Arsitektur

```
src/
├── components/         # UI components (Atomic Design)
│   └── ui/             # Base atoms: Button, Input, Card, Modal, Badge, Typography
├── contexts/           # React contexts
│   └── SettingsContext.jsx   # Theme, kasir name, preferences
├── hooks/              # Custom hooks
│   ├── useTransactions.js      # Wrapper — composes 3 sub-hooks
│   ├── useTransactionData.js   # CRUD + Dexie transactions
│   ├── useTransactionFilter.js # Search, sort, date filter
│   ├── useTransactionMetrics.js# Daily analytics (todayTotal, trend)
│   ├── useCategories.js        # Dynamic categories & sub-categories
│   ├── useInventory.js         # Master barang CRUD
│   └── useSession.js           # Sesi kasir (buka/tutup)
├── services/           # External integrations
│   ├── db.js                   # Dexie schema (v1 → v2 migration)
│   └── databaseManager.js      # Export/import/merge database
├── utils/              # Pure utility functions
│   ├── formatters.js           # formatRupiah, formatDate, toLocalDateString
│   ├── exportExcel.js          # ExcelJS export
│   ├── exportCSV.js            # CSV export (RFC 4180)
│   ├── downloadHelper.js       # Native browser File API download
│   └── migration.js            # localStorage → IndexedDB migration
└── __tests__/          # Unit + PBT test suite
```

**Provider nesting:**

```
ErrorBoundary
└── AppBootstrap (migration)
    └── SettingsProvider
        └── App
```

---

## Quick Start

### Prasyarat

- Node.js ≥ 20
- npm ≥ 10

### Instalasi

```bash
# Clone
git clone https://github.com/<username>/ClearTask.git
cd ClearTask

# Install dependencies
npm install

# Copy env (tidak ada nilai yang wajib diisi untuk dev lokal)
cp .env.example .env

# Jalankan dev server
npm run dev
# → http://localhost:5173
```

---

## Testing

```bash
# Jalankan semua unit test (single run)
npm run test:run

# Watch mode (development)
npm run test

# Coverage report → coverage/
npm run test:coverage

# E2E tests (butuh dev server aktif)
npm run test:e2e
```

### Coverage Targets

| Metric     | Target |
| ---------- | ------ |
| Statements | ≥ 80%  |
| Branches   | ≥ 75%  |
| Functions  | ≥ 80%  |
| Lines      | ≥ 80%  |

---

## Scripts

| Perintah                     | Deskripsi                           |
| ---------------------------- | ----------------------------------- |
| `npm run dev`                | Dev server (port 5173, strictPort)  |
| `npm run build`              | Production build → `dist/`          |
| `npm run preview`            | Preview production build            |
| `npm run lint`               | ESLint check                        |
| `npm run format`             | Prettier format (write)             |
| `npm run format:check`       | Prettier check (CI mode)            |
| `npm run test:run`           | Unit tests (single run)             |
| `npm run test:coverage`      | Unit tests + coverage               |
| `npm run test:e2e`           | Playwright E2E                      |
| `ANALYZE=true npm run build` | Bundle analyzer → `dist/stats.html` |

---

## Keamanan

- **Data Lokal:** Semua data tersimpan di IndexedDB browser — tidak ada server, tidak ada transmisi data
- **CSP:** Content Security Policy meta tag di `index.html`
- **Logging:** `console.error` hanya aktif di DEV mode
- **Service Worker:** Otomatis di-unregister di DEV mode untuk mencegah stale cache

---

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel login
vercel --prod
```

Atau import repo langsung dari Vercel Dashboard — Vite terdeteksi otomatis.

> **Catatan PWA:** Pastikan production berjalan di HTTPS agar Service Worker dan Web Manifest berfungsi.

---

## Kontribusi

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md) untuk panduan lengkap.

---

## Changelog

Lihat [CHANGELOG.md](./CHANGELOG.md) untuk riwayat perubahan.
