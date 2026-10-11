# W4-02: Hutang-Piutang Pelanggan - Design Document

**Status**: 📋 Design Phase  
**Priority**: High  
**Effort**: XL (8 orang-hari)  
**Tanggal**: 5 Oktober 2026

## Executive Summary

Toko perlu tracking hutang-piutang pelanggan yang berutang. Ini adalah fitur besar karena:
1. **Tidak ada entity Customer** - sistem sekarang tidak punya pelanggan, hanya teks UI
2. **Perlu ledger terpisah** - Piutang bukan stock movement
3. **Perlu reconciliation** - Total piutang harus match dengan transaksi credit

## Business Requirements

### Confirmed from Owner
- ✅ Toko mengizinkan pelanggan tertentu berutang
- ✅ Perlu tracking siapa yang hutang berapa
- ✅ Perlu catatan pembayaran/pelunasan
- ✅ Perlu laporan piutang outstanding

### Use Cases

**UC-1: Daftar Pelanggan**
- Kasir bisa tambah pelanggan baru (nama, telepon, alamat optional)
- Kasir bisa lihat daftar pelanggan
- Kasir bisa cari pelanggan by nama/telepon
- Kasir bisa edit info pelanggan
- Kasir bisa non-aktifkan pelanggan (soft delete)

**UC-2: Transaksi Credit**
- Saat checkout, kasir bisa pilih "Credit" sebagai metode pembayaran
- Jika Credit dipilih, wajib pilih pelanggan dari dropdown
- Transaksi credit otomatis menambah piutang pelanggan
- Struk mencantumkan "HUTANG - [Nama Pelanggan]"

**UC-3: Pembayaran Piutang**
- Kasir bisa buka halaman "Piutang"
- Kasir bisa pilih pelanggan, lihat list transaksi yang belum lunas
- Kasir bisa input pembayaran (bisa partial atau full)
- Pembayaran tercatat dengan tanggal, jumlah, kasir
- Jika full payment, transaksi statusnya jadi "Lunas"

**UC-4: Laporan Piutang**
- Lihat total piutang per pelanggan
- Lihat aging (sudah berapa hari outstanding)
- Lihat riwayat pembayaran per pelanggan
- Export laporan piutang to CSV

## Data Model

### 1. Customers Table (New)

```typescript
interface Customer {
  id: string;                    // UUID
  nama: string;                  // Required
  telepon?: string | null;       // Optional, for contact
  alamat?: string | null;        // Optional
  catatan?: string | null;       // Internal notes
  status: 'aktif' | 'nonaktif';  // Soft delete
  totalPiutang: number;          // Computed field (sum of outstanding)
  createdAt: string;             // ISO timestamp
  updatedAt: string;
  createdBy: string;             // Kasir name
  deletedAt?: string | null;
}
```

### 2. Credit Ledger Table (New)

```typescript
interface CreditLedger {
  id: string;                    // UUID
  customerId: string;            // FK to customers
  type: 'debit' | 'credit';      // debit = hutang bertambah, credit = bayar
  amount: number;                // Always positive
  balance: number;               // Running balance setelah entry ini
  
  // Reference ke transaksi jika type=debit
  refType: 'transaction' | 'payment' | 'adjustment' | 'opening';
  refId?: string | null;         // Transaction ID atau Payment ID
  transactionId?: string | null; // Denormalized for quick lookup
  
  // Payment details jika type=credit
  paymentMethod?: 'Tunai' | 'Transfer' | 'QRIS' | null;
  
  tanggal: string;               // YYYY-MM-DD (transaction date)
  catatan?: string | null;       // Optional notes
  createdAt: string;             // ISO timestamp
  createdBy: string;             // Kasir name
}
```

### 3. Credit Payments Table (New)

```typescript
interface CreditPayment {
  id: string;                    // UUID
  customerId: string;            // FK to customers
  amount: number;                // Payment amount
  paymentMethod: 'Tunai' | 'Transfer' | 'QRIS';
  tanggal: string;               // YYYY-MM-DD
  sessionId?: string | null;     // Optional FK to session
  
  // Allocation details (could pay multiple transactions)
  allocations: PaymentAllocation[];
  
  catatan?: string | null;
  createdAt: string;
  createdBy: string;             // Kasir name
}

interface PaymentAllocation {
  transactionId: string;         // Which transaction
  amount: number;                // How much allocated to this tx
}
```

### 4. Transaction Updates (Existing)

```typescript
interface Transaction {
  // ... existing fields ...
  
  // New fields for credit
  customerId?: string | null;    // FK to customers (if metode=Credit)
  creditStatus?: 'unpaid' | 'partial' | 'paid' | null;
  creditPaidAmount?: number;     // Amount already paid
  creditBalance?: number;        // Remaining balance
}
```

## Architecture

### Service Layer (New)

```
customerService.ts
├─ createCustomer(data)
├─ updateCustomer(id, data)
├─ getCustomerById(id)
├─ getActiveCustomers()
├─ searchCustomers(query)
├─ deactivateCustomer(id)
└─ getCustomerBalance(id)

creditService.ts
├─ recordCreditTransaction(tx)      // When checkout with Credit
├─ recordPayment(payment)           // When customer pays
├─ getCreditTransactions(customerId)
├─ getCreditHistory(customerId)
├─ getOutstandingBalance(customerId)
└─ getCreditSummary()              // All customers with debt

paymentService.ts
├─ createPayment(customerId, amount, allocations)
├─ getPaymentHistory(customerId)
└─ reversePayment(paymentId)       // Admin only
```

### Validation Rules

**Customer**:
- Nama wajib, min 2 karakter
- Telepon optional, tapi jika diisi harus valid format
- Tidak boleh duplicate nama exact (case-insensitive)

**Credit Transaction**:
- Hanya bisa jika metode = "Credit"
- Wajib pilih customer
- Total transaksi > 0
- Customer harus status=aktif

**Payment**:
- Amount > 0
- Amount tidak boleh > total outstanding customer
- Allocations total harus = amount
- Semua transactionId dalam allocations harus valid dan unpaid/partial

## UI Components

### 1. Customer Management Page (New)

Location: `src/pages/PelangganPage.tsx`

Features:
- List all customers dengan search bar
- Display: nama, telepon, total piutang, status
- Button: + Tambah Pelanggan
- Row actions: Edit, Lihat Detail, Non-aktifkan
- Empty state jika belum ada customer

### 2. Customer Form Modal (New)

Component: `src/components/CustomerFormModal.tsx`

Fields:
- Nama (required)
- Telepon (optional, with validation)
- Alamat (optional, textarea)
- Catatan (optional, for internal notes)

### 3. Credit Selection in Checkout (Modified)

Location: `src/components/pos/CheckoutSection.tsx`

Changes:
- Jika metode = "Credit", muncul dropdown "Pilih Pelanggan"
- Dropdown dengan search/filter
- Show customer balance di samping nama
- Tombol "Tambah Pelanggan Baru" (quick add)

### 4. Piutang Page (New)

Location: `src/pages/PiutangPage.tsx`

Sections:
- **Summary Cards**: Total outstanding, jumlah customer, aging breakdown
- **Customer List**: Nama, telepon, outstanding, last payment, aging
- **Detail View**: Klik customer → show transactions + payment history
- **Payment Form**: Input pembayaran dengan allocation per transaction

### 5. Payment Modal (New)

Component: `src/components/PaymentModal.tsx`

Features:
- Input amount
- Select payment method
- Auto-allocate to oldest transactions first (FIFO)
- Manual allocation adjustment
- Show remaining balance after payment
- Confirmation dengan print receipt option

## Database Schema Migration

### Migration v14

```typescript
db.version(14).stores({
  // ... existing tables ...
  
  // New tables
  customers: 'id, nama, telepon, status, totalPiutang, createdAt, deletedAt',
  credit_ledger: 'id, customerId, type, tanggal, transactionId, createdAt',
  credit_payments: 'id, customerId, tanggal, sessionId, createdAt',
});

db.version(14).upgrade(async (tx) => {
  // No data migration needed for new tables
  console.log('v14: Added customers, credit_ledger, credit_payments tables');
  
  // Optional: Create default "Walk-in Customer" for anonymous credit
  const defaultCustomer = {
    id: 'default-walkin',
    nama: 'Pelanggan Umum',
    status: 'aktif',
    totalPiutang: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  await tx.table('customers').add(defaultCustomer);
});
```

## Implementation Phases

### Phase 1: Foundation (2 hari)
- [ ] Create data model & types
- [ ] Migration v14 dengan 3 tabel baru
- [ ] Customer service layer
- [ ] Basic CRUD tests

### Phase 2: Credit Flow (2 hari)
- [ ] Credit service layer
- [ ] Update checkout untuk support Credit payment
- [ ] Record credit transaction di ledger
- [ ] Update transaction service
- [ ] Integration tests

### Phase 3: Payment Flow (2 hari)
- [ ] Payment service layer
- [ ] Payment allocation logic (FIFO)
- [ ] Payment modal UI
- [ ] Update customer balance
- [ ] Payment tests

### Phase 4: UI & Reports (2 hari)
- [ ] Customer management page
- [ ] Piutang page dengan detail view
- [ ] Search & filter customers
- [ ] Laporan piutang (summary & detailed)
- [ ] Export to CSV
- [ ] E2E tests

## Test Strategy

### Unit Tests
- `customerService.test.ts` - CRUD operations
- `creditService.test.ts` - Ledger recording
- `paymentService.test.ts` - Payment & allocation

### Integration Tests
- `creditFlow.test.ts` - End-to-end credit transaction
- `paymentFlow.test.ts` - End-to-end payment with allocation
- `balanceReconciliation.test.ts` - Ensure balance integrity

### E2E Tests (Playwright)
- `credit-transaction.spec.ts` - Checkout with credit
- `payment-process.spec.ts` - Record payment
- `customer-management.spec.ts` - CRUD customers

## Business Rules & Invariants

### Invariants (Must Always Be True)

1. **Balance Integrity**:
   ```
   customer.totalPiutang = SUM(ledger WHERE type='debit') - SUM(ledger WHERE type='credit')
   ```

2. **Transaction Status**:
   ```
   IF tx.creditPaidAmount = 0 THEN status = 'unpaid'
   IF 0 < tx.creditPaidAmount < tx.total THEN status = 'partial'
   IF tx.creditPaidAmount >= tx.total THEN status = 'paid'
   ```

3. **Payment Allocation**:
   ```
   payment.amount = SUM(allocations.amount)
   ```

4. **Ledger Balance**:
   ```
   entry[n].balance = entry[n-1].balance + entry[n].delta
   (delta = +amount for debit, -amount for credit)
   ```

### Business Rules

1. **Credit Limit**: Tidak ada limit per customer (bisa ditambah di future)
2. **Overdue**: Tidak ada penalty atau bunga (bisa ditambah di future)
3. **Negative Balance**: Tidak boleh customer bayar lebih dari hutang
4. **Aging Buckets**: 0-30 hari, 31-60 hari, 61-90 hari, >90 hari
5. **Payment Priority**: FIFO - bayar transaksi terlama dulu

## Security & Audit

### Audit Log
Semua operasi credit/payment harus tercatat di `audit_log`:
- `create_customer`
- `update_customer`
- `deactivate_customer`
- `credit_transaction` (saat checkout)
- `credit_payment` (saat bayar)
- `payment_reversal` (admin only)

### Permissions (Future)
- Kasir: Bisa create customer, record payment
- Admin: Bisa deactivate customer, reverse payment
- Owner: Bisa lihat all reports

## Edge Cases & Error Handling

### Edge Case 1: Customer Deleted with Outstanding
- **Problem**: Customer punya piutang tapi di-delete
- **Solution**: Soft delete only (status=nonaktif), tidak bisa delete jika balance > 0

### Edge Case 2: Payment > Outstanding
- **Problem**: User input payment lebih besar dari hutang
- **Solution**: Validasi di form, reject dengan error message

### Edge Case 3: Partial Payment Allocation
- **Problem**: Payment Rp 100K, tapi ada 3 transaksi (Rp 50K, Rp 60K, Rp 40K)
- **Solution**: FIFO allocation:
  - Tx1 (Rp 50K) → paid fully
  - Tx2 (Rp 60K) → paid Rp 50K (partial)
  - Tx3 (Rp 40K) → unpaid

### Edge Case 4: Session Closing with Unpaid Credit
- **Problem**: Sesi ditutup, ada transaksi credit yang belum dibayar
- **Solution**: Credit tidak termasuk dalam cash count, tapi tercatat di laporan

## Integration Points

### With Existing Features

**Transaction Service (W1-04)**:
- Modify `createTransaction()` untuk handle Credit payment
- Record ke `credit_ledger` saat metode=Credit

**Session Closing (W2-03)**:
- Exclude credit transactions dari cash reconciliation
- Show credit transactions separately di closing report

**Laporan Export (W2)**:
- Add credit filter: All / Paid / Unpaid / Partial
- Show customer name di transaction export

**Backup/Restore (W1-10)**:
- Include customers, credit_ledger, credit_payments di backup
- Merge strategy untuk customers: by ID
- Validation: balance integrity check after restore

## Future Enhancements

Out of scope untuk W4-02, tapi perlu dokumentasi:

1. **Credit Limit per Customer**
2. **Auto SMS/WhatsApp Reminder** untuk overdue
3. **Interest/Penalty** untuk late payment
4. **Payment Plan** (cicilan terjadwal)
5. **Credit Score** based on payment history
6. **Multi-currency** credit (untuk toko internasional)

## Success Criteria

✅ W4-02 dianggap selesai jika:
- [ ] Customer CRUD fully functional
- [ ] Checkout dengan Credit berhasil record piutang
- [ ] Payment berhasil reduce piutang dan allocate ke transactions
- [ ] Balance integrity invariant terjaga (tested)
- [ ] Laporan piutang accurate
- [ ] UI intuitive dan tidak crash
- [ ] Export to CSV working
- [ ] Test coverage >= 85% untuk new code
- [ ] Documentation complete
- [ ] Manual testing checklist verified

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Balance drift over time | Medium | High | Comprehensive balance reconciliation tests + periodic audit |
| Performance dengan ribuan customers | Low | Medium | Index on customerId, nama; pagination di UI |
| Payment allocation complexity | Medium | Medium | Thorough testing + clear FIFO algorithm |
| UI confusion untuk kasir | Medium | Low | User training + clear UX flow |
| Data corruption saat offline | Low | High | Transaction atomicity + local backup |

## Documentation Deliverables

1. ✅ This design doc (W4-02-HUTANG-PIUTANG-DESIGN.md)
2. [ ] Implementation guide (W4-02-IMPLEMENTATION.md)
3. [ ] User manual (W4-02-USER-GUIDE.md)
4. [ ] API docs (inline JSDoc)
5. [ ] Test plan (W4-02-TEST-PLAN.md)

---

**Next Steps**: 
1. Review design dengan stakeholder
2. Confirm business rules & edge cases
3. Start Phase 1 implementation
4. Create W4-02-IMPLEMENTATION.md dengan detailed code plan
