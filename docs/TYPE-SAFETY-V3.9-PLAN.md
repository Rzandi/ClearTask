# 🚀 Implementation Plan: Advanced Type Safety & Runtime Invariants (v3.9.0+)

> **Feature:** Advanced Type System Hardening  
> **Target Release:** v3.9.0+  
> **Status:** 📋 Planning  
> **Prerequisites:** ✅ v3.8.0 Type Baseline (`tsc --noEmit` 0 error, zero unannotated `any`)

---

## 🎯 Ringkasan & Tujuan Arsitektur

Pada v3.8.0, kita berhasil menuntaskan eliminasi `any` pada parameter service, context, dan entitas utama.  
Tahap lanjutan (v3.9.0+) berfokus pada **Bulletproof Type Invariants & Zero-Cost Abstractions** agar bug logika (misal: ID tertukar antar tabel, format JSON corrupt saat import/restore, atau kegagalan parsing input runtime) bisa dicegah **sebelum menyentuh database atau render UI**.

Terdapat 4 pilar utama:

1. **Type Guards for Runtime Validation**: Memvalidasi data mentah dari LocalStorage, IndexedDB import, dan JSON backup sebelum di-cast ke tipe domain.
2. **Branded Types for Entity IDs**: Menghindari _ID confusion bug_ (contoh: tidak sengaja memasukkan `customerId` ke parameter `inventoryId`).
3. **Discriminated Unions for Polymorphic Types**: Menjamin kelengkapan properti berdasarkan discriminator (seperti tipe pembayaran, aksi audit log, dan pergerakan stok).
4. **Strict ESLint Rules**: Mencegah regresi penggunaan `any` baru oleh developer/kontributor secara otomatis di pre-commit hook.

---

## 🏛️ Detail Pilar Teknis

### Pilar 1: Type Guards & Runtime Invariants

Mencegah silent corruption data saat file backup diimpor atau saat schema lokal dibaca dari IndexedDB.

```typescript
// src/types/guards.ts

export function isCartItem(item: unknown): item is CartItem {
  if (typeof item !== 'object' || item === null) return false;
  const c = item as Record<string, unknown>;
  return (
    typeof c.namaBarang === 'string' &&
    typeof c.qty === 'number' &&
    c.qty > 0 &&
    typeof c.hargaSatuan === 'number' &&
    c.hargaSatuan >= 0 &&
    typeof c.total === 'number'
  );
}

export function isTransaction(tx: unknown): tx is Transaction {
  if (typeof tx !== 'object' || tx === null) return false;
  const t = tx as Record<string, unknown>;
  return (
    typeof t.transactionId === 'string' &&
    typeof t.tanggal === 'string' &&
    Array.isArray(t.items) &&
    t.items.every(isCartItem)
  );
}
```

**Titik Integrasi:**

- `databaseManager.ts`: Validasi array sebelum `bulkAdd` saat import JSON.
- `useTransactionData.ts` & `useInventory.ts`: Validasi saat membaca draft cart di localStorage.

---

### Pilar 2: Branded Types (Nominal Typing untuk IDs)

Di TypeScript standar, semua ID berupa `string`, sehingga compiler tidak protes jika kasir/developer memanggil:

```typescript
// ❌ Potensi bug fatal:
getCustomerDebt(item.inventoryId); // lolos compile karena dua-duanya string!
```

Dengan Branded Types, kita memberikan "stempel nominal" tanpa overhead performa JavaScript di runtime:

```typescript
// src/types/branded.ts

declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type InventoryId = Brand<string, 'InventoryId'>;
export type CustomerId = Brand<string, 'CustomerId'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type SessionId = Brand<number, 'SessionId'>;
export type LedgerId = Brand<string, 'LedgerId'>;

// Factory / Safe Cast Helpers
export const asInventoryId = (id: string): InventoryId => id as InventoryId;
export const asCustomerId = (id: string): CustomerId => id as CustomerId;
export const asTransactionId = (id: string): TransactionId => id as TransactionId;
```

**Titik Integrasi:**

- `customerService.ts`: `payCustomerDebtFIFO(customerId: CustomerId, ...)`
- `transactionService.ts`: `unpackInventoryItem(inventoryId: InventoryId, ...)`
- `types/index.ts`: Ganti `inventoryId?: string` menjadi `inventoryId?: InventoryId`.

---

### Pilar 3: Discriminated Unions untuk Model Polimorfik

Saat ini beberapa interface menggabungkan kolom opsional yang saling tergantung. Discriminated union memaksa compiler memeriksa konteks secara ketat.

#### Contoh A: Metode Pembayaran (Payment Details)

```typescript
export type PaymentMethodDetails =
  | { method: 'cash'; uangDiterima: number; kembalian: number }
  | { method: 'qris'; qrisNsm?: string; verifiedAt: string }
  | { method: 'credit'; customerId: CustomerId; jatuhTempo: string };
```

#### Contoh B: Pergerakan Stok (`StockMovement`)

```typescript
export type StockMovement =
  | { reason: 'sale'; delta: number; refType: 'transaction'; refId: TransactionId }
  | { reason: 'unpack'; delta: number; refType: 'unpack'; unpackUnits: number }
  | { reason: 'opening'; delta: number; refType: 'manual'; note: string }
  | { reason: 'adjust'; delta: number; refType: 'manual'; by: string };
```

---

### Pilar 4: ESLint Rule `@typescript-eslint/no-explicit-any: error`

Mengunci kualitas kode di pre-commit hook agar tidak ada lagi baris `any` liar yang masuk ke codebase.

**Langkah:**

1. Update `eslint.config.js`:
   ```javascript
   rules: {
     '@typescript-eslint/no-explicit-any': 'error',
     '@typescript-eslint/no-unsafe-assignment': 'warn',
     '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as' }],
   }
   ```
2. Pastikan file boundary pihak ketiga (seperti ExcelJS callbacks) diberi komentar override spesifik:
   ```typescript
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   ```

---

## 📅 Roadmap Pelaksanaan Bertahap

```
┌─────────────────────────────────────────────────────────────┐
│ Fase 1: ESLint Enforce & Branded IDs Foundation            │
│ - Buat src/types/branded.ts                                 │
│ - Pasang eslint rule no-explicit-any: error                │
│ - Terapkan Branded ID pada customerService & credit module │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Fase 2: Runtime Type Guards                                 │
│ - Buat src/types/guards.ts                                  │
│ - Pasang runtime guard di databaseManager (import/merge)    │
│ - Pasang unit test guards di src/__tests__/guards.test.ts  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Fase 3: Discriminated Unions Refactor                       │
│ - Refactor CartItem / PaymentMethodDetails                  │
│ - Refactor AuditLogEntry action-payload union               │
│ - Verifikasi seluruh test suite (648+ tests tetap hijau)   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Kriteria Sukses (Definition of Done)

- [ ] ESLint melarang `any` baru tanpa komentar eslint-disable berizin.
- [ ] Compiler TypeScript menolak jika ID bertukar (contoh: `customerId` diinput ke fungsi yang butuh `inventoryId`).
- [ ] Import file JSON invalid/corrupt ditolak secara elegan sebelum menyentuh Dexie melalui runtime Type Guards.
- [ ] 100% test suite lulus dan waktu build Vite tetap di bawah 4 detik.
