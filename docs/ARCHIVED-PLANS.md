# 📦 Dokumen Planning Fitur yang Diarsipkan (Archived & Deferred Plans)

Dokumen ini mendokumentasikan perencanaan fitur, modul eksplorasi, dan item arsitektur yang sengaja ditunda (_deferred_), dilewati (_skipped_), atau diarsipkan (_archived_) dari roadmap aktif rilis **v3.8.0**.

Hal ini didasarkan pada prinsip **Local-First Resiliency, Zero-Distortion Data, dan Batasan Storage IndexedDB**, agar kompleksitas tidak membahayakan stabilitas operasional harian kasir.

---

## 📑 Daftar Fitur & Status Pengarsipan

| ID Item     | Nama Fitur / Modul                      | Status                   | Lokasi Kode / Referensi                                | Alasan Penundaan / Pengarsipan                                                                                                                                                                     |
| ----------- | --------------------------------------- | ------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **W4-08**   | **Foto Barang di Inventaris**           | ⏭️ Skipped / Diarsipkan  | `docs/Master-plan-3.7.0/ClearTask-Master-Plan.md`      | IndexedDB memiliki batas kuota storage per-origin pada browser mobile. Menyimpan gambar blob/base64 dalam jumlah banyak berisiko memicu `QuotaExceededError` dan memperlambat backup/restore JSON. |
| **W4-09**   | **Multi-User & Role Sederhana**         | ⏭️ Skipped / Diarsipkan  | `src/archive/PinLockScreen.jsx`, `SecurityContext.jsx` | ClearTask difokuskan pada single-device retail kasir tanpa server. Kompleksitas hak akses (RBAC) dinilai _overkill_ untuk skala UMKM/toko kelontong saat ini.                                      |
| **W4-10**   | **Sinkronisasi Cloud Opsional**         | ⏭️ Skipped / Diarsipkan  | `src/services/syncManager.ts` (Dead code/mockup)       | Di luar mandat filosofi _100% Offline-First Zero Server_. Mengundang tantangan konflik resolusi multi-master (CRDT) yang belum dibutuhkan.                                                         |
| **W5-07**   | **Akun Kasir Terkunci & PIN Lock Gate** | ⏭️ Skipped / Diarsipkan  | `src/archive/PinLockScreen.jsx`, `SecurityGate.jsx`    | Telah diuji pada Sprint 4 namun ditunda agar proses pergantian kasir dan login tidak merepotkan kecepatan antrean checkout toko. Kode aman tersimpan di `src/archive/`.                            |
| **W4-06**   | **Virtualisasi List (`react-window`)**  | ⏸️ Deferred (Tertunda)   | Planning Performa Fase 3                               | Paginasi dan pemecahan komponen yang ada saat ini masih berjalan 60 FPS pada pengujian data ratusan barang. Menunggu kebutuhan dataset hingga puluhan ribu baris.                                  |
| **W4-07**   | **Export Laporan Format PDF**           | ⏸️ Backlog Nice-to-Have  | `src/components/LaporanExport.tsx`                     | Ekspor data lengkap sudah tercover dengan baik via Excel (`.xlsx` formatted) dan CSV RFC 4180. Library rendering PDF (misal `jspdf`/`pdfmake`) menambah bobot bundle terlalu besar (~200KB+ gzip). |
| **DSS-SAW** | **Algoritma Restock SAW**               | ⚠️ Reverted / Diarsipkan | Schema v9 (`db.ts`), `sawWorker.ts`                    | Skema tabel `saw_criterias` dan `saw_history` telah di-drop di skema v9 karena pemilik toko lebih membutuhkan audit ledger stok riil dan pelacakan minimum stok dinamis (`minStock`).              |

---

## 🛠️ Panduan Re-Aktivasi di Masa Depan

Bila salah satu fitur di atas ingin dihidupkan kembali pada rilis masa depan (v3.9+ / v4.0):

### 1. Re-aktivasi PIN Lock & Security Gate (W5-07 / W4-09)

1. Pindahkan komponen dari `src/archive/PinLockScreen.jsx` dan `src/archive/SecurityContext.jsx` ke `src/components/auth/` dan `src/contexts/`.
2. Convert file ke TypeScript (`.tsx`) dan kaitkan ke `SettingsContext` untuk PIN master toko.
3. Pasang `<SecurityGate>` pada tab `Database` dan `LaporanExport` untuk melindungi akses pengaturan dari kasir shift.

### 2. Re-aktivasi Foto Barang (W4-08)

1. Wajib menggunakan kompresi canvas ekstrem (maksimal 200x200px webp/jpeg quality 0.6) mirip helper QRIS (`compressQrisImage`).
2. Jangan simpan ke tabel utama `inventory`; pisahkan ke tabel IndexedDB terisolasi `product_images` agar tidak memperlambat query katalog checkout.

### 3. Re-aktivasi Export PDF (W4-07)

1. Gunakan dynamic lazy-import (`await import('jspdf')`) saat tombol ditekan agar tidak membebani initial bundle loading PWA.
2. Manfaatkan format cetak browser native (`window.print()` dengan `@media print` CSS) sebagai alternatif ringan tanpa menambah dependency library eksternal.
