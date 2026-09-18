<p align="center">
  <h1 align="center">ClearTask v3.5.1</h1>
  <p align="center"><strong>Aplikasi Kasir PWA Offline-First — Sektor Retail, Minimarket & High-Resiliency POS.</strong></p>
</p>

---

## Tentang ClearTask

ClearTask adalah aplikasi Point-of-Sale (POS) berbasis PWA yang dirancang untuk kasir, toko kelontong, minimarket, dan UMKM. Semua data tersimpan **100% lokal** di perangkat pengguna menggunakan IndexedDB — tidak ada server, tidak ada akun wajib, tidak ada biaya langganan, dan dapat bekerja secara penuh tanpa jaringan internet.

### Fitur Utama ClearTask v3.5.1

- 📚 **Pusat Bantuan & FAQ Interaktif Terpadu (Help & Shortcuts Hub)**:
  - **7 Kategori FAQ Operasional**: Panduan lengkap troubleshooting, alur kerja kasir, inventaris, laporan keuangan, printer thermal Bluetooth, database, hingga keamanan & offline mode.
  - **Tab Pintasan Keyboard (Shortcut Keys)**: Tampilan visual interaktif daftar shortcut fisik (`F1` - `F5`, `F8`, `Ctrl+Enter`, `Alt+O`, `?`, `Esc`) untuk operasional kasir ultra-cepat tanpa mouse.
- 🛍️ **Sektor Retail & Minimarket**:
  - **Harga Grosir (Tiered Pricing Engine)**: Skema diskon kuantitas bertingkat (_beli banyak lebih murah_) yang otomatis mendeteksi dan menerapkan harga grosir di keranjang POS.
  - **Multi-UOM Konversi Stok (Dus → Pcs Auto Unpack)**: Manajemen stok kemasan grosir (`packStock`, `packRatio`) dengan aksi 1-klik _⚡ Unpack Dus_ dan prompt cepat di POS saat stok eceran Pcs habis.
  - **Daftar Belanja Restock Supplier (Purchase Requisition)**: Filter otomatis barang menipis (`stok <= minStock`) dan ekspor daftar belanja 1-tap langsung ke WhatsApp Supplier atau file CSV.
- ⚡ **Quality of Life (QOL) & Input Kasir**:
  - **Quick Cash & Cash Breakdown**: Tombol pecahan nominal tunai (`10k`, `20k`, `50k`, `100k`) & widget rincian pecahan lembaran uang kertas (20rb, 10rb, 5rb, 2rb, 1rb).
  - **Hero Change Display (40px)**: Tampilan nominal kembalian berukuran `40px` bold berwarna hijau murni/merah tegas pada layar pembayaran.
  - **Pending Order**: Simpan keranjang belanja sementara ke slot tertunda dan pulihkan dengan 1 klik.
  - **Inline Syntax Command Parser**: Pengetikan cepat di POS (contoh: `Susu 2x @15000 !diskon10%`) yang otomatis terurai menjadi item keranjang.
  - **Audio & Haptic Feedback**: Efek suara _beep_ kasir (suara beda jika item tak terdaftar) & getaran mikro (`navigator.vibrate`) saat scan/penambahan item.
  - **Soft Delete & Trash Manager**: Penghapusan transaksi dan master barang berbasis Soft Delete (`deletedAt`) terintegrasi penuh ke Tong Sampah dan pembersihan otomatis > 30 hari.
- 🎨 **Visual Adaptability & Ergonomi Layout**:
  - **Dual-Pane 65:35 & Mobile Bottom Sheet**: Tata letak teroptimasi untuk jempol pada mode seluler & mata kasir pada layar tablet/desktop.
  - **Outdoor High-Contrast & OLED Dark Mode**: Mode visual luar ruangan (rasio kontras WCAG AAA > 7:1) & mode gelap murni `#09090B`.
  - **Hotkey Sheet Overlay (`?` / `Shift+/`)**: Modal panduan visual shortcut keyboard fisik (`<kbd>F1</kbd>` - `<kbd>F5</kbd>`, `<kbd>F8</kbd>`, `<kbd>Alt+O</kbd>`, `<kbd>Ctrl+Enter</kbd>`).
  - **First-Time Kiosk Setup Wizard**: Modal onboarding 3 langkah (Profil Toko -> QRIS & Nota -> Tes Cetak).
- 🛡️ **Live Resiliency & Offline Resilience**:
  - **Auto-Draft Cart Persistence**: Keranjang kasir tersimpan otomatis di `localStorage` (`cleartask_draft_cart`) & terpulihkan jika tab tertutup.
  - **Lazy Chunk Retry (`lazyWithRetry`)**: Penanganan otomatis kegagalan pemuatan JS chunk saat pembaruan Service Worker.
  - **Multi-Tab Sync (`BroadcastChannel`)**: Penyelarasan keranjang & state aplikasi antar tab browser secara real-time.
  - **Storage Quota & Incognito Warning**: Peringatan otomatis jika sisa memori < 50MB atau aplikasi dibuka di mode Incognito browser.
  - **Clock Tampering & Monotonic Sequence**: Monotonic sequence guard untuk mencegah kekacauan urutan transaksi jika jam HP dimundurkan.
  - **Offline Collision-Free Device Prefix**: ID transaksi ber-prefix kasir (`TRX-${kasirSlug}-${seq}`) untuk mencegah tumbukan ID antar perangkat offline.
- 🛠️ **Strict Typing & Robust Codebase**:
  - 100% Type-Safe (`tsc --noEmit` 0 error) di seluruh komponen, hooks, utilities, dan modal.
  - 42 test suites (376 unit & property tests) lulus 100%.

---

## Tech Stack

| Layer      | Teknologi                                           |
| ---------- | --------------------------------------------------- |
| Framework  | React 19 + Vite 8                                   |
| Styling    | Vanilla CSS + CSS Variables + Tailwind CSS v4       |
| Database   | IndexedDB via Dexie.js v4 (Schema v11)              |
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
# Build Production Bundle (sw v3.5.1)
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
