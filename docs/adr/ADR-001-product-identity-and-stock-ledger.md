# ADR 001: Identitas Produk, Ledger Stok, dan Sesi Immutable

- **Status**: Accepted
- **Tanggal**: 2026-10-04
- **Penulis**: ClearTask Core Team / @Fihan
- **Terkait Master Plan**: W1-01 s.d. W1-06 (Sektor A & C)

---

## 1. Konteks & Akar Masalah

Berdasarkan audit dan verifikasi data pada ClearTask:

1. **Identitas Produk Rapuh**: Transaksi selama ini mencatat item hanya berdasarkan `namaBarang` (string bebas). Jika nama barang di Master Barang diubah atau dihapus, riwayat transaksi kehilangan kaitan dengan katalog asli atau bahkan memotong stok barang yang salah.
2. **Stok Tanpa Ledger**: Perubahan stok langsung memutasi `inventory.quantity` tanpa mencatat riwayat mutasi (_audit trail_). Jika terjadi selisih (drift stok), tidak ada cara untuk merekonstruksi dari mana selisih tersebut berasal.
3. **Sesi Tertutup Masih Bisa Berubah**: Transaksi di sesi yang sudah ditutup masih bisa diedit atau dihapus secara diam-diam, merusak integritas laporan keuangan sesi yang telah dipertanggungjawabkan kasir.
4. **Operasi Non-Atomic**: Operasi void, restore, dan edit transaksi sebelumnya tersebar dan tidak terbungkus dalam satu transaksi database (`db.transaction`) atomik bersama pembaruan stok.

---

## 2. Keputusan Desain (Architectural Decisions)

### A. Identitas Produk & Snapshot Transaksi (W1-02)

Setiap item di dalam transaksi (`transactions.items[]`) wajib memiliki:

- `inventoryId: string | null`: UUID barang di tabel `inventory` (`null` jika item manual/ad-hoc non-katalog).
- `namaSnapshot: string`: Nama barang saat transaksi dicatat (tidak berubah meski master diubah).
- `hargaModalSnapshot: number | null`: Modal barang saat checkout (`null` jika modal tidak diketahui).

### B. Tabel Ledger `stock_movements` (W1-03)

Tabel baru yang bersifat _append-only_ untuk merekam setiap mutasi stok fisik:

```ts
export interface StockMovement {
  id: string; // UUID
  inventoryId: string; // FK ke inventory.id
  delta: number; // +/- perubahan kuantitas (mis. -2 saat jual, +2 saat void/retur)
  reason: 'opening' | 'sale' | 'void' | 'restore' | 'edit' | 'unpack' | 'adjust' | 'import';
  refType: 'transaction' | 'session' | 'manual' | 'unpack';
  refId?: string | number; // ID transaksi atau referensi terkait
  at: string; // ISO Timestamp
  by: string; // Nama kasir / user
  note?: string; // Keterangan opsional
}
```

**Invarian Stok**:
$$\text{inventory.quantity} = \text{saldo opening} + \sum \text{delta seluruh movements}$$
Field `inventory.quantity` tetap dipertahankan sebagai denormalisasi saldo terhitung untuk performa query POS O(1), dan **selalu ditulis dalam satu `db.transaction` bersama entri `stock_movements`**.

### C. Atomic Business Service: `transactionService` (W1-04)

Semua alur bisnis transaksi:

- `checkout` (insert transaction, potong stok, catat movement `sale`)
- `void` (tandai deletedAt, kembalikan stok, catat movement `void`)
- `restore` (hapus deletedAt, potong stok kembali, catat movement `restore`)
- `edit` (update transaction, selisih qty menjadi movement `edit`)
  Dipindahkan dari komponen/hook ke `transactionService.ts` yang membungkus setiap operasi dalam `db.transaction('rw', [db.transactions, db.inventory, db.stock_movements], ...)`.

### D. Sesi Immutable & Closing Snapshot (W1-05)

Saat sesi ditutup melalui `closeSession()`:

- Simpan `closingSnapshot` di record sesi yang berisi total penjualan, transaksi aktif, ringkasan per metode pembayaran, dan kas bersih.
- Jika transaksi pada sesi tertutup diedit atau di-void di kemudian hari, sistem:
  1. Mewajibkan input alasan perubahan.
  2. Menandai record sesi dengan flag `postCloseAdjusted: true`.
  3. Mencatat perubahan di `audit_log`.

---

## 3. Strategi Migrasi Data (Dexie v12)

1. **Skema Dexie v12**:
   - Daftarkan tabel `stock_movements: '&id, inventoryId, reason, refId, at'`.
   - Update index `transactions` dan `archive_transactions` jika diperlukan.
2. **Data Migration (`.upgrade()`)**:
   - Membaca semua inventory aktif.
   - Mengisi item transaksi lama dengan `inventoryId` berdasarkan pencocokan nama kanonikal (`trim().toLowerCase().replace(/\s+/g, ' ')`). Jika ambigu/tidak ada, set `null`.
   - `hargaModalSnapshot` pada riwayat transaksi lama diisi `null` (tidak menebak dari modal sekarang agar tidak bias).
   - Membuat 1 entri `stock_movements` bertipe `opening` untuk setiap barang di `inventory` dengan nilai `delta: item.quantity`.

---

## 4. Konsekuensi & Mitigasi Risiko

- **Keuntungan**:
  - Pelacakan audit stok 100% transparan dan dapat direkonsiliasi kapan saja.
  - Nama barang di transaksi abadi dan aman dari rename master.
  - Sesi kasir terlindungi dari manipulasi tanpa jejak.
- **Mitigasi Overhead**:
  - Jalur baca katalog POS tetap membaca `inventory.quantity` secara instan tanpa perlu agregasi manual seluruh ledger.
  - Perkakas _Cek Drift Stok_ (W1-12) disediakan untuk mendeteksi deviasi secara otomatis di latar belakang.
