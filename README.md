<p align="center">
  <h1 align="center">ClearTask v3.7.0</h1>
  <p align="center"><strong>Aplikasi Kasir PWA Offline-First — Sektor Retail, Minimarket & High-Resiliency POS.</strong></p>
</p>

---

## Tentang ClearTask

ClearTask adalah aplikasi Point-of-Sale (POS) berbasis PWA yang dirancang untuk kasir, toko kelontong, minimarket, dan UMKM. Semua data tersimpan **100% lokal** di perangkat pengguna menggunakan IndexedDB — tidak ada server, tidak ada akun wajib, tidak ada biaya langganan, dan dapat bekerja secara penuh tanpa jaringan internet.

### Fitur Utama ClearTask v3.7.0

- 📊 **Fondasi Data & Ledger Stok (Stock Movements & Product Identity - W1)**:
  - **Tabel Append-Only `stock_movements` (Dexie v12)**: Setiap pergerakan stok (penjualan, void, restore, edit pesanan, unpack dus, penyesuaian manual) tercatat dalam ledger permanen.
  - **Atomic `transactionService`**: Menyatukan seluruh alur checkout, pembatalan, pemulihan, dan edit ke dalam satu transaksi database (`db.transaction`) atomik.
  - **Identitas Produk & Snapshot Transaksi**: Transaksi merekam `inventoryId`, `namaSnapshot`, dan `hargaModalSnapshot` sehingga histori laporan tidak terdistorsi jika data katalog berubah.
  - **Sesi Kasir Immutable & Closing Snapshot**: Penutupan sesi menyimpan snapshot total omset, metode pembayaran, dan kas bersih. Transaksi paska-tutup ditandai `postCloseAdjusted`.
  - **Deduplikasi Kanonikal & Proteksi Kategori**: Normalisasi spasi dan huruf kecil pada nama barang, serta penolakan penghapusan kategori yang masih dipakai di inventaris aktif.
  - **Invarian Stok & Deteksi Drift**: Test suite matematis invarian stok (`quantity = saldo awal + sum(delta)`) dan utilitas `stockDriftCheck` untuk audit inventaris.

- 💰 **Integritas Uang, Rekonsiliasi Kas & Audit Log (W2)**:
  - **Parser Desimal Indonesia (`parseIDNumber`)**: Penanganan terpadu format angka Indonesia (koma sebagai desimal `"0,57"`, titik sebagai ribuan `"12.000"`).
  - **Kas Tunai Bersih Sesi**: Perhitungan kas real (penjualan tunai - kembalian - pengeluaran operasional tunai) pada laporan penutupan shift.
  - **Rekonsiliasi Kas Fisik Pra-Tutup**: Validasi kas fisik di laci sebelum sesi ditutup, dengan peringatan selisih toleransi Rp 50.000 dan kewajiban input alasan.
  - **Undo Checkout Kilat (15 Detik)**: Tombol pembatalan instan di layar struk untuk mengembalikan stok ke inventaris dan memulihkan isi keranjang kasir.
  - **Tabel `audit_log` (Dexie v13)**: Riwayat audit append-only yang merekam aksi void, edit, dan restore lengkap beserta identitas kasir, waktu, dan alasan wajib.
  - **Immutabilitas Kasir**: Nama kasir penginput terkunci dan tidak dapat ditimpa saat transaksi diedit.
  - **Parser CSV RFC 4180**: Parser import CSV tahan kutipan ganda dan koma dalam nilai.

- ⚡ **QOL, Konsistensi UI & Hardware (W3)**:
  - **Promise-Based `useConfirm` Dialog**: Menggantikan seluruh `window.confirm` browser dengan modal konfirmasi bertema yang konsisten.
  - **Notifikasi Toast Non-Blocking**: Notifikasi melayang elegan menggantikan seluruh pemanggilan `alert()` native.
  - **Notifikasi Stok Menipis Dinamis**: Membaca batas `minStock` spesifik per produk, bukan batas statis seragam.
  - **Auto-Reconnect Printer Bluetooth**: Penyimpanan perangkat printer terakhir dan koneksi ulang otomatis.
  - **Format Struk Thermal 80mm & 58mm**: Pilihan layout cetak struk lebar 80mm dan standar 58mm langsung di modal struk kasir.
  - **Highlight Pencarian (`<HighlightText>`)**: Penyorotan visual kata kunci pencarian pada katalog barang dan tabel riwayat transaksi.
  - **Cash Drawer Kick Command**: Perintah ESC/POS kick drawer otomatis pada transaksi tunai.
  - **Mobile Split Cart**: Tata letak mobile ergonomis dengan list barang dan sticky checkout button.
  - **Periodic Backup Reminder**: Peringatan otomatis jika database belum diexport selama lebih dari 7 hari.

- 🛡️ **Data Integrity & Mobile Resilience Engine (v3.6.0 Baseline)**:
  - **Negative Stock & Warning Attachment**: Pelacakan stok akurat tanpa silent-clamping nol.
  - **O(1) Inventory Lookup Optimization**: Optimasi checkout berkecepatan tinggi menggunakan map lookup.
  - **Hardware Back Button Handler (Android PWA)**: Integrasi tombol Back fisik Android untuk menutup modal bertingkat.
  - **Multi-UOM Konversi Stok (Dus → Pcs Auto Unpack)**: Manajemen stok kemasan grosir dengan aksi 1-klik _⚡ Unpack Dus_.
  - **Harga Grosir (Tiered Pricing Engine)**: Skema diskon kuantitas bertingkat otomatis.

- 🛠️ **Strict Typing & Robust Codebase**:
  - 100% Type-Safe (`tsc --noEmit` 0 error) di seluruh komponen, hooks, utilities, dan modal.
  - 56 test suites (494 unit, integration, dan property tests) lulus 100%.

---

## Tech Stack

| Layer      | Teknologi                                           |
| ---------- | --------------------------------------------------- |
| Framework  | React 19 + Vite 8                                   |
| Styling    | Vanilla CSS + CSS Variables + Tailwind CSS v4       |
| Database   | IndexedDB via Dexie.js v4 (Schema v13)              |
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
│   ├── ui/             # Base atoms: Button, Input, Card, Modal, Badge
│   ├── InputPenjualan.tsx   # POS Kasir, Quick Cash, Wholesale, Hero Change
│   ├── InventoryManager.tsx # Master Barang, Quick Adjust, Multi-UOM, Supplier Restock
│   ├── InventoryModal.tsx   # Form Barang, Wholesale & Pack Stock settings
│   ├── HotkeyModal.tsx      # Contextual Hotkey Sheet Overlay (?)
│   ├── SetupWizardModal.tsx # 3-Step First-Time Onboarding Wizard
│   ├── TrashManager.tsx     # Soft Delete & Data Restoration
│   └── StrukModal.tsx       # Receipt printing, Thermal 58mm & WA Share
├── contexts/           # React contexts (Settings, Theme)
├── hooks/              # Custom hooks
│   ├── useTransactions.ts     # Wrapper — composes sub-hooks
│   ├── useTransactionData.ts  # Atomic Dexie transactions & Device Prefix IDs
│   ├── useInventory.ts        # Master barang CRUD
│   └── useSession.ts          # Sesi/shift kasir
├── services/           # External & Database services
│   ├── db.ts                  # Dexie schema v11 & blocked handlers
│   └── databaseManager.ts     # Export/import/merge database
├── utils/              # Resiliency & pure utilities
│   ├── audioFeedback.ts       # Web Audio API & Haptic vibration
│   ├── inlineSyntaxParser.ts  # Inline POS command parser & Cash breakdown
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
