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
  action: 'create' | 'update' | 'void' | 'restore' | 'unpack' | 'close_session' | 'reconcile';
  entity: 'transaction' | 'session' | 'inventory' | 'expense';
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
  transactions: Transaction[];
  sessions: Session[];
  categories: CategoriesRecord;
  inventory: InventoryItem[];
  expenses?: Expense[];
  archive_transactions?: Transaction[];
  stock_movements?: StockMovement[];
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
  skipped: number;
  orphanTransactions: number;
  transactionsToAdd: Transaction[];
  sessionsToAdd: Session[];
  categoriesToAdd: string[];
  inventoryToAdd: InventoryItem[];
  expensesToAdd: Expense[];
  archiveTransactionsToAdd: Transaction[];
  stockMovementsToAdd?: StockMovement[];
  categoriesRecordToPut?: CategoriesRecord | null;
}
