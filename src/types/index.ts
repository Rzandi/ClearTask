/* ═══════════════════════════════════════════════════════════
   types/index.ts — ClearTask
   Canonical type definitions for all core domain objects.
   Single source of truth — import from here, not from individual files.
   ═══════════════════════════════════════════════════════════ */

// ── Cart & Transaction ─────────────────────────────────────

export interface CartItem {
  inventoryId?: string | null;
  namaSnapshot?: string;
  hargaModalSnapshot?: number | null;
  namaBarang: string;
  qty: number;
  hargaSatuan: number;
  total: number;
  kategori?: string;
  subKategori?: string;
  hargaModal?: number;
  // W4-04: Discount per item
  diskonPersen?: number; // 0–100 percentage discount
  diskonNominal?: number; // Flat Rp discount per item line
  totalSebelumDiskon?: number; // qty × hargaSatuan (before discount)
  totalDiskon?: number; // Total discount amount on this item
}

export interface StockMovement {
  id: string;
  inventoryId: string;
  delta: number;
  reason: 'opening' | 'sale' | 'void' | 'restore' | 'edit' | 'unpack' | 'adjust' | 'import';
  refType: 'transaction' | 'session' | 'manual' | 'unpack';
  refId?: string | number;
  at: string;
  by: string;
  note?: string;
  [key: string]: any;
}

export interface AuditLogEntry {
  id: string;
  action:
    | 'create'
    | 'update'
    | 'void'
    | 'restore'
    | 'unpack'
    | 'close_session'
    | 'reconcile'
    // W4-02 credit actions
    | 'credit_transaction_created'
    | 'credit_ledger_created'
    | 'session_closed_with_credit'
    | 'credit_payment_recorded'
    | 'customer_created'
    | 'customer_updated'
    | 'customer_deactivated';
  entity:
    | 'transaction'
    | 'session'
    | 'inventory'
    | 'expense'
    | 'credit_ledger'
    | 'customer'
    | 'credit_payment';
  entityId: string | number;
  timestamp: string;
  actor: string;
  details?: Record<string, any>;
  reason?: string;
}

// W4-04: Transaction-level discount descriptor
export interface DiskonTransaksi {
  tipe: 'persen' | 'nominal';
  nilai: number; // percentage (0–100) or flat Rp amount
}

export interface Transaction {
  id?: number;
  transactionId: string;
  tanggal: string; // YYYY-MM-DD (local timezone via toLocalDateString)
  sessionId: string | null;
  kasir: string;
  items: CartItem[];
  total: number;
  uangDiterima: number;
  kembalian: number;
  metode?: string;
  catatan?: string;
  customerId?: string; // W4-02 Phase 3B: Customer ID for credit sales (UUID)
  // W4-04: Discount fields
  diskonTransaksi?: DiskonTransaksi; // Transaction-level discount
  totalDiskon?: number; // Sum of all discounts (item + transaction)
  createdAt: string; // ISO string
  updatedAt: string;
  syncStatus?: 'local' | 'synced' | 'pending';
  deletedAt?: string | null;
  // Legacy single-item fields (v1.0 schema / flat exports)
  namaBarang?: string;
  kategori?: string;
  subKategori?: string;
  qty?: number;
  hargaSatuan?: number;
  status?: string;
  [key: string]: any; // allow extra Dexie fields without breaking
}

// ── Session ────────────────────────────────────────────────

export interface ClosingSnapshot {
  totalTransactions: number;
  totalRevenue: number;
  paymentMethods: Record<string, number>;
  totalCash: number;
  closedAt: string;
  closedBy: string;
}

export interface Session {
  id: string;
  nama: string;
  tanggalMulai: string;
  waktuMulai: string;
  tanggalTutup: string | null;
  waktuTutup: string | null;
  status: 'aktif' | 'ditutup';
  closingSnapshot?: ClosingSnapshot;
  postCloseAdjusted?: boolean;
  updatedAt?: string;
  syncStatus?: string;
  [key: string]: any;
}

// ── Inventory ──────────────────────────────────────────────

export interface InventoryItem {
  id?: string;
  namaBarang: string;
  kategori: string;
  subKategori?: string;
  harga: number;
  hargaModal?: number;
  satuan?: string;
  quantity: number;
  minStock?: number;
  sku?: string;
  barcode?: string;
  wholesaleMinQty?: number;
  wholesalePrice?: number;
  packUnit?: string;
  packRatio?: number;
  packStock?: number;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  syncStatus?: string;
  [key: string]: any;
}

// ── Expense ────────────────────────────────────────────────

export interface Expense {
  id: string;
  namaKeluaran: string;
  kategori: string;
  jumlah: number;
  tanggal: string;
  catatan?: string;
  metode?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: string;
}

// ── Customer & Credit (W4-02) ──────────────────────────────

export interface Customer {
  id: string; // UUID
  nama: string; // Customer name
  telepon?: string | undefined; // Phone number (optional)
  alamat?: string | undefined; // Address (optional)
  catatan?: string | undefined; // Notes (optional)
  totalHutang: number; // Running total debt (cached)
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  deletedAt?: string | null | undefined; // Soft delete
  syncStatus?: string | undefined;
}

// ── Price History (W4-03) ──────────────────────────────────

export interface PriceHistoryEntry {
  id: string; // UUID
  inventoryId: string; // FK to inventory.id
  changedAt: string; // ISO timestamp
  oldHargaJual: number | null; // Old selling price (null if first time set)
  oldHargaModal: number | null; // Old cost price (null if first time set)
  newHargaJual: number | null; // New selling price
  newHargaModal: number | null; // New cost price
  changedBy: string; // Cashier/admin name
  reason?: string | undefined; // Optional: "Penyesuaian supplier", "Promo", etc
  changeType?: 'manual' | 'bulk_import' | 'system' | undefined; // How the change was made
}

export interface CreditLedger {
  id: string; // UUID
  customerId: string; // FK to Customer
  transactionId: string; // FK to Transaction
  jumlahKredit: number; // Credit amount (always > 0)
  sisaHutang: number; // Remaining unpaid (>= 0)
  tanggalTransaksi: string; // YYYY-MM-DD (local date)
  tanggalJatuhTempo?: string | undefined; // YYYY-MM-DD (optional due date)
  status: 'lunas' | 'belum_lunas'; // Payment status
  catatan?: string | undefined; // Notes
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  deletedAt?: string | null | undefined; // Soft delete (void transaction)
  syncStatus?: string | undefined;
}

export interface CreditPayment {
  id: string; // UUID
  ledgerId: string; // FK to CreditLedger
  customerId: string; // FK to Customer (denormalized)
  jumlahBayar: number; // Payment amount (> 0)
  tanggalBayar: string; // YYYY-MM-DD (local date)
  metodePembayaran: string; // 'tunai' | 'transfer' | etc
  catatan?: string | undefined; // Payment notes
  createdAt: string; // ISO timestamp
  createdBy: string; // Cashier name
  syncStatus?: string | undefined;
}

// ── Export Settings (W4-05) ────────────────────────────────

export interface ExportSettings {
  tokoName?: string;
  kasirName?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
}

// ── Inventory Item Input (W4-05) ───────────────────────────

export interface InventoryItemInput {
  id?: string;
  namaBarang?: string;
  nama?: string;
  kategori?: string;
  subKategori?: string;
  harga?: number;
  hargaModal?: number;
  satuan?: string;
  quantity?: number;
  minStock?: number;
  sku?: string;
  barcode?: string;
  wholesaleMinQty?: number;
  wholesalePrice?: number;
  packUnit?: string;
  packRatio?: number;
  packStock?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  syncStatus?: string;
}

// ── Sync Message Payload (W4-05) ───────────────────────────

export interface SyncMessagePayload {
  sessionId?: string;
  transactionId?: string;
  inventoryId?: string;
  cartData?: CartItem[];
  [key: string]: any; // Allow additional fields for future extensibility
}

// ── UI State ───────────────────────────────────────────────

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export interface ClosingReportData {
  session: Session;
  transactions: Transaction[];
}

// ── Database Export / Import ───────────────────────────────

export interface DatabaseExportMetadata {
  totalTransactions: number;
  totalSessions: number;
  totalInventory: number;
  totalExpenses?: number;
  totalArchiveTransactions?: number;
  deviceInfo: string;
}

export interface EncryptedBackupEnvelope {
  version: string;
  schemaVersion: number;
  encrypted: true;
  salt: string;
  ciphertext: string;
  exportedAt: string;
  metadata?: DatabaseExportMetadata | undefined;
}

export interface DatabaseExport {
  version: string;
  exportedAt: string;
  schemaVersion?: number;
  transactions: Transaction[];
  sessions: Session[];
  categories: CategoriesRecord;
  inventory: InventoryItem[];
  expenses?: Expense[];
  archive_transactions?: Transaction[];
  stock_movements?: StockMovement[];
  audit_log?: AuditLogEntry[]; // Bug #3: include audit trail in backup
  customers?: Customer[]; // W4-02 & W5-01
  credit_ledger?: CreditLedger[]; // W4-02 & W5-01
  credit_payments?: CreditPayment[]; // W4-02 & W5-01
  price_history?: PriceHistoryEntry[]; // W4-03 & W5-01
  metadata: DatabaseExportMetadata;
}

export interface CategoriesRecord {
  id?: number;
  key?: string;
  categories: string[];
  subCategories?: Record<string, string[]>;
}

// ── Merge ──────────────────────────────────────────────────

export interface MergeResult {
  __isMergeResult: boolean;
  newTransactions: number;
  newSessions: number;
  newCategories: number;
  newInventory: number;
  newExpenses: number;
  newArchiveTransactions: number;
  newStockMovements?: number;
  newAuditLogs?: number; // Bug #3
  newCustomers?: number; // W5-01
  newCreditLedger?: number; // W5-01
  newCreditPayments?: number; // W5-01
  newPriceHistory?: number; // W5-01
  skipped: number;
  orphanTransactions: number;
  transactionsToAdd: Transaction[];
  sessionsToAdd: Session[];
  categoriesToAdd: string[];
  inventoryToAdd: InventoryItem[];
  expensesToAdd: Expense[];
  archiveTransactionsToAdd: Transaction[];
  stockMovementsToAdd?: StockMovement[];
  auditLogsToAdd?: AuditLogEntry[]; // Bug #3
  customersToAdd?: Customer[]; // W5-01
  creditLedgersToAdd?: CreditLedger[]; // W5-01
  creditPaymentsToAdd?: CreditPayment[]; // W5-01
  priceHistoriesToAdd?: PriceHistoryEntry[]; // W5-01
  categoriesRecordToPut?: CategoriesRecord | null;
}
