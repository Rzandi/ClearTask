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
  entity: 'transaction' | 'session' | 'inventory' | 'expense' | 'credit_ledger' | 'customer' | 'credit_payment';
  entityId: string | number;
  timestamp: string;
  actor: string;
  details?: Record<string, any>;
  reason?: string;
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
  createdAt: string;
  updatedAt: string;
  syncStatus?: string;
}

// ── Customer & Credit (W4-02) ──────────────────────────────

export interface Customer {
  id: string;                    // UUID
  nama: string;                  // Customer name
  telepon?: string;              // Phone number (optional)
  alamat?: string;               // Address (optional)
  catatan?: string;              // Notes (optional)
  totalHutang: number;           // Running total debt (cached)
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  deletedAt?: string | null;     // Soft delete
  syncStatus?: string;
}

// ── Price History (W4-03) ──────────────────────────────────

export interface PriceHistoryEntry {
  id: string;                    // UUID
  inventoryId: string;           // FK to inventory.id
  changedAt: string;             // ISO timestamp
  oldHargaJual: number | null;   // Old selling price (null if first time set)
  oldHargaModal: number | null;  // Old cost price (null if first time set)
  newHargaJual: number | null;   // New selling price
  newHargaModal: number | null;  // New cost price
  changedBy: string;             // Cashier/admin name
  reason?: string;               // Optional: "Penyesuaian supplier", "Promo", etc
  changeType?: 'manual' | 'bulk_import' | 'system'; // How the change was made
}

export interface CreditLedger {
  id: string;                    // UUID
  customerId: string;            // FK to Customer
  transactionId: string;         // FK to Transaction
  jumlahKredit: number;          // Credit amount (always > 0)
  sisaHutang: number;            // Remaining unpaid (>= 0)
  tanggalTransaksi: string;      // YYYY-MM-DD (local date)
  tanggalJatuhTempo?: string;    // YYYY-MM-DD (optional due date)
  status: 'lunas' | 'belum_lunas'; // Payment status
  catatan?: string;              // Notes
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  deletedAt?: string | null;     // Soft delete (void transaction)
  syncStatus?: string;
}

export interface CreditPayment {
  id: string;                    // UUID
  ledgerId: string;              // FK to CreditLedger
  customerId: string;            // FK to Customer (denormalized)
  jumlahBayar: number;           // Payment amount (> 0)
  tanggalBayar: string;          // YYYY-MM-DD (local date)
  metodePembayaran: string;      // 'tunai' | 'transfer' | etc
  catatan?: string;              // Payment notes
  createdAt: string;             // ISO timestamp
  createdBy: string;             // Cashier name
  syncStatus?: string;
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
  audit_log?: any[];          // Bug #3: include audit trail in backup
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
  newAuditLogs?: number;       // Bug #3
  skipped: number;
  orphanTransactions: number;
  transactionsToAdd: Transaction[];
  sessionsToAdd: Session[];
  categoriesToAdd: string[];
  inventoryToAdd: InventoryItem[];
  expensesToAdd: Expense[];
  archiveTransactionsToAdd: Transaction[];
  stockMovementsToAdd?: StockMovement[];
  auditLogsToAdd?: any[];      // Bug #3
  categoriesRecordToPut?: CategoriesRecord | null;
}
