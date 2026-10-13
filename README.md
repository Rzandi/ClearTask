<p align="center">
  <h1 align="center">ClearTask v3.8.0</h1>
  <p align="center"><strong>Aplikasi Kasir PWA Offline-First — Sektor Retail, Minimarket & High-Resiliency POS.</strong></p>
</p>

---

## Tentang ClearTask

ClearTask adalah aplikasi Point-of-Sale (POS) berbasis PWA yang dirancang untuk kasir, toko kelontong, minimarket, dan UMKM. Semua data tersimpan **100% lokal** di perangkat pengguna menggunakan IndexedDB — tidak ada server, tidak ada akun wajib, tidak ada biaya langganan, dan dapat bekerja secara penuh tanpa jaringan internet.

### Fitur Utama ClearTask v3.8.0

- 🤝 **Sistem Manajemen Hutang & Piutang Pelanggan (W4-02 — Phase 1–5)**:
  - **Buku Besar Piutang (`credit_ledger` & `credit_payments`)**: Pelacakan saldo hutang per pelanggan dengan status `unpaid`, `partial`, dan `paid` yang terhubung langsung ke transaksi penjualan.
  - **Pelunasan Otomatis Multi-Transaksi (FIFO)**: Modal pembayaran pintar yang mengalokasikan cicilan/pembayaran secara otomatis ke nota hutang tertua dengan pratinjau alokasi langsung.
  - **Notifikasi Jatuh Tempo & Pengingat WhatsApp**: Tag keterlambatan (`⚠️ Lewat X hari`), alert ringkasan hutang menunggak harian via toast, dan tombol 1-klik untuk generate pesan tagihan WhatsApp format rapi.
  - **Laporan & Distribusi Umur Piutang (Aging Report)**: Grafik distribusi 4 tier umur piutang (Lancar, 1-30 hari, 31-60 hari, >60 hari), tabel Top 5 Debitur dengan rasio risiko, dan fitur ekspor data ke CSV.
  - **Ringkasan Kredit di Closing Report Shift**: Perhitungan transaksi kredit dan rincian hutang pelanggan baru langsung tertera pada laporan penutupan kasir.

- 📈 **Audit Perubahan Harga Barang (Price History — W4-03)**:
  - **Tabel `price_history` (Dexie v15)**: Setiap perubahan harga jual, modal, maupun grosir otomatis mencatat nilai lama, nilai baru, timestamp, dan identitas pengubah.
  - **Modal Riwayat Harga (`PriceHistoryModal.tsx`)**: Grafik tren & tabel linimasa histori harga per produk lengkap dengan ekspor CSV.

- ⚡ **Input Cepat Syntax Inline Kasir (`ManualItemForm.tsx`)**:
  - Dukungan pengetikan cepat di form kasir seperti `indomie 3x 3500` atau `kopi 2x` dengan deteksi live preview otomatis dan auto-fill saat tekan Enter/Tab.

- 🛡️ **Integritas Uang, Audit Log & Ledger Stok (W1 & W2 Baseline)**:
  - **Append-Only `stock_movements` & `audit_log` (Dexie v12 & v13)**: Jejak mutasi stok dan audit transaksi finansial (void, edit, restore, permanent purge) tersimpan permanen.
  - **Atomic Transaction Services (`transactionService.ts` & `customerService.ts`)**: Eksekusi ACID aman bebas race conditions.
  - **Rekonsiliasi Kas Fisik Pra-Tutup**: Validasi uang laci kasir dengan batas toleransi selisih Rp 50.000 dan kewajiban input alasan.
  - **Undo Checkout Kilat (15 Detik)**: Pembatalan instan transaksi di layar struk dengan pemulihan otomatis stok dan keranjang.

- 🎨 **Modernisasi Arsitektur POS & Akselerasi UI (W3)**:
  - **Komponen Modular POS (`src/components/pos/`)**: Pemecahan form manual, katalog produk, keranjang belanja, panel checkout, dan cek stok.
  - **Command Palette Terintegrasi (`Ctrl+K`)**: Navigasi cepat antar modul, pencarian produk, dan eksekusi checkout.
  - **Format Struk Thermal 80mm & 58mm**: Pilihan format struk fleksibel dengan ESC/POS cash drawer kick command.

- 🛠️ **Pembersihan Tipe TypeScript & Kualitas Kode (W4-05)**:
  - 100% Type-Safe (`tsc --noEmit` 0 error) dengan eliminasi tipe `any` yang tidak perlu pada entitas inti, audit log, services, dan komponen.
  - 64 test suites (648 unit, integration, dan property tests) lulus 100%.

---

## Tech Stack

| Layer      | Teknologi                                           |
| ---------- | --------------------------------------------------- |
| Framework  | React 19 + Vite 8                                   |
| Styling    | Vanilla CSS + CSS Variables + Tailwind CSS v4       |
| Database   | IndexedDB via Dexie.js v4 (Schema v15)              |
| Resiliency | BroadcastChannel API + Storage Estimate + Web Audio |
| Enkripsi   | Web Crypto API (AES-GCM 256 + PBKDF2)               |
| Export     | ExcelJS (lazy-loaded) + CSV RFC 4180                |
| Testing    | Vitest + @testing-library/react + fast-check (PBT)  |
| E2E        | Playwright                                          |
| DX         | Husky + Commitlint + lint-staged + Prettier         |

---

## Arsitektur

```
src/
├── components/         # UI components (Atomic & Feature Driven)
│   ├── credit/         # Modul Hutang-Piutang (CustomerList, Detail, Aging Report, PaymentModal)
│   ├── pos/            # Sub-komponen kasir modular (CartItemList, CatalogBrowser, CheckoutSection, ManualItemForm)
│   ├── ui/             # Base atoms: Button, Input, Card, Modal, Badge
│   ├── InputPenjualan.tsx   # POS Kasir, Quick Cash, Wholesale, Hero Change
│   ├── InventoryManager.tsx # Master Barang, Quick Adjust, Multi-UOM, Supplier Restock
│   ├── InventoryModal.tsx   # Form Barang, Wholesale & Pack Stock settings
│   ├── PriceHistoryModal.tsx # Linimasa & audit histori perubahan harga
│   ├── HotkeyModal.tsx      # Contextual Hotkey Sheet Overlay (?)
│   ├── SetupWizardModal.tsx # 3-Step First-Time Onboarding Wizard
│   ├── TrashManager.tsx     # Soft Delete & Data Restoration
│   └── StrukModal.tsx       # Receipt printing, Thermal 58mm/80mm & WA Share
├── contexts/           # React contexts (Settings, Theme, Inventory)
├── hooks/              # Custom hooks (useTransactions, useInventory, useDailyOverdueCheck, useSession, dll)
├── services/           # Service layer & database
│   ├── db.ts                  # Dexie schema v15 & blocked handlers
│   ├── transactionService.ts  # Atomic checkout, void, restore, unpack
│   ├── customerService.ts     # Customer CRUD, FIFO payment, credit queries
│   ├── auditService.ts        # Append-only audit logging
│   └── databaseManager.ts     # Export/import/merge database & crypto
├── utils/              # Resiliency & pure utilities
│   ├── creditHelper.ts        # Overdue check, FIFO allocator, WhatsApp text generator
│   ├── creditReportHelper.ts  # Aging buckets calculator & CSV exporter
│   ├── inlineSyntaxParser.ts  # Inline syntax parser
│   └── resiliencyGuards.ts    # lazyWithRetry, Storage estimate, Multi-tab sync
└── __tests__/          # Vitest unit & integration test suite
```

---

## 🏃 Panduan Menjalankan Project (Run Guide)

### 📋 Prasyarat

- **Node.js** versi `≥ 20.0.0`
- **npm** versi `≥ 10.0.0`

### 💻 Instalasi Lokal & Development

```bash
# 1. Kloning Repositori
git clone https://github.com/fikz/ClearTask.git
cd ClearTask

# 2. Instalasi Dependensi
npm install

# 3. Jalankan Dev Server
npm run dev
```

Buka **[http://localhost:5173](http://localhost:5173)** di browser Anda.

---

## 🧪 Panduan Pengujian (Testing Guide)

```bash
# 1. Check TypeScript Compilation (Strict Zero Error)
npx tsc --noEmit

# 2. Jalankan Semua Unit & Component Tests
npm run test:run

# 3. Jalankan Tests dengan Coverage Report
npm run test:coverage
```

---

## 📦 Bundling & Deployment

```bash
# Build Production Bundle (sw v3.6.0)
npm run build

# Preview Production Build
npm run preview
```

Deploy ke Vercel:

```bash
vercel --prod
```

---

## 📝 Kontribusi & Changelog

- Untuk panduan kontribusi kode, silakan baca [CONTRIBUTING.md](./CONTRIBUTING.md).
- Riwayat rilis dan daftar perubahan detail dapat dilihat di [CHANGELOG.md](./CHANGELOG.md).
