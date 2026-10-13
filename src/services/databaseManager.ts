/* ═══════════════════════════════════════════════════════════
   Database Manager — ClearTask
   Handles export, import validation, merge calculation,
   and atomic merge application for the full database.
   ═══════════════════════════════════════════════════════════ */
import db from './db';
import { toLocalDateString } from '../utils/formatters';
import { triggerDownload } from '../utils/downloadHelper';
import { KATEGORI_DEFAULT, SUBKATEGORI_PRESET } from '../hooks/useCategories';
import { generateSalt, deriveKey, encryptData, decryptData } from '../utils/crypto';
import type {
  Transaction,
  Session,
  InventoryItem,
  Expense,
  CategoriesRecord,
  DatabaseExport,
  MergeResult,
  Customer,
  CreditLedger,
  CreditPayment,
  PriceHistoryEntry,
  EncryptedBackupEnvelope,
} from '../types/index';

// Re-export so existing imports of DatabaseExport/MergeResult from this file keep working
export type { DatabaseExport, MergeResult, EncryptedBackupEnvelope } from '../types/index';

// ── Exported functions ────────────────────────────────────

/**
 * Read all data from IndexedDB and trigger a JSON file download.
 * Handles empty database gracefully. Supports optional password encryption (W5-01).
 * @param {object} [options] - Optional export options (e.g. password for encryption)
 * @returns {Promise<void>}
 */
export async function exportDatabase(options?: { password?: string }): Promise<void> {
  const transactions = await db.transactions.toArray();
  const sessions = await db.sessions.toArray();
  const categoriesDb = await db.categories.toArray();
  const categories = categoriesDb.length > 0 ? categoriesDb[0] : { categories: [] };
  const inventory = await db.inventory.toArray();
  const expenses = await db.expenses.toArray();
  const archiveTransactions = await db.archive_transactions.toArray();
  const stockMovements = await db.stock_movements.toArray();
  // Bug #3: include audit_log in backup so audit trail survives device loss
  const auditLog = await db.audit_log.toArray();
  // W4-02: include customers, credit ledger, and payments
  const customers = await db.customers.toArray();
  const creditLedger = await db.credit_ledger.toArray();
  const creditPayments = await db.credit_payments.toArray();
  // W4-03: include price history
  const priceHistory = await db.price_history.toArray();

  const exportData: DatabaseExport = {
    version: '2.0',
    schemaVersion: 15, // reflects schema v15 (customers, credit, price_history)
    exportedAt: new Date().toISOString(),
    transactions: Array.isArray(transactions) ? transactions : [],
    sessions: Array.isArray(sessions) ? sessions : [],
    categories: categories && typeof categories === 'object' ? categories : { categories: [] },
    inventory: Array.isArray(inventory) ? inventory : [],
    expenses: Array.isArray(expenses) ? expenses : [],
    archive_transactions: Array.isArray(archiveTransactions) ? archiveTransactions : [],
    stock_movements: Array.isArray(stockMovements) ? stockMovements : [],
    audit_log: Array.isArray(auditLog) ? auditLog : [],
    customers: Array.isArray(customers) ? customers : [],
    credit_ledger: Array.isArray(creditLedger) ? creditLedger : [],
    credit_payments: Array.isArray(creditPayments) ? creditPayments : [],
    price_history: Array.isArray(priceHistory) ? priceHistory : [],
    metadata: {
      totalTransactions: Array.isArray(transactions) ? transactions.length : 0,
      totalSessions: Array.isArray(sessions) ? sessions.length : 0,
      totalInventory: Array.isArray(inventory) ? inventory.length : 0,
      totalExpenses: Array.isArray(expenses) ? expenses.length : 0,
      totalArchiveTransactions: Array.isArray(archiveTransactions) ? archiveTransactions.length : 0,
      deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    },
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const dateStr = toLocalDateString(new Date());

  // W5-01: Password-protected AES-GCM encrypted backup if password provided
  if (options?.password && options.password.trim().length > 0) {
    const salt = generateSalt();
    const key = await deriveKey(options.password.trim(), salt);
    const ciphertext = await encryptData(jsonString, key);

    const encryptedEnvelope: EncryptedBackupEnvelope = {
      version: '2.0',
      schemaVersion: 15,
      encrypted: true,
      salt,
      ciphertext,
      exportedAt: new Date().toISOString(),
      metadata: {
        ...exportData.metadata,
      },
    };

    const encryptedJson = JSON.stringify(encryptedEnvelope, null, 2);
    const blob = new Blob([encryptedJson], { type: 'application/json' });
    const filename = `ClearTask_DB_${dateStr}.encrypted.json`;
    triggerDownload(blob, filename);
  } else {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `ClearTask_DB_${dateStr}.json`;
    triggerDownload(blob, filename);
  }

  // Record backup timestamp so SettingsModal can show the reminder (W5-2)
  try {
    const existingBackup = await db.meta.get({ key: 'lastBackupAt' });
    await db.meta.put({
      ...(existingBackup || {}),
      key: 'lastBackupAt',
      value: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal — reminder will just show "belum pernah backup"
  }
}

/**
 * Validate a JSON string as a ClearTask DatabaseExport.
 * @param {string} jsonString
 * @returns {{ valid: boolean, data: object|null, error: string|null }}
 */
export function validateImport(jsonString: string): {
  valid: boolean;
  data: DatabaseExport | null;
  error: string | null;
  encrypted?: boolean;
  salt?: string;
} {
  // 1. Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      valid: false,
      data: null,
      error: 'File tidak dapat dibaca: format JSON tidak valid',
    };
  }

  // W5-01: Detect encrypted backup envelope
  if (parsed && typeof parsed === 'object' && parsed.encrypted === true) {
    if (typeof parsed.salt !== 'string' || typeof parsed.ciphertext !== 'string') {
      return {
        valid: false,
        data: null,
        error: 'File backup terenkripsi tidak valid: salt atau ciphertext rusak',
      };
    }
    return {
      valid: false,
      data: null,
      error: 'File backup terenkripsi dengan password.',
      encrypted: true,
      salt: parsed.salt,
    };
  }

  // 2. Check required fields exist
  const requiredFields = ['version', 'exportedAt', 'transactions', 'sessions'];
  for (const field of requiredFields) {
    if (!(field in parsed)) {
      return {
        valid: false,
        data: null,
        error: 'File tidak valid: struktur data tidak dikenali',
      };
    }
  }

  // 2.5 Strict version check
  if (parsed.version !== '1.0' && parsed.version !== '2.0') {
    return {
      valid: false,
      data: null,
      error: `File tidak valid: versi database tidak didukung (${parsed.version})`,
    };
  }

  // 3. Check transactions and sessions are arrays
  if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.sessions)) {
    return {
      valid: false,
      data: null,
      error: 'File tidak valid: format data transaksi atau sesi tidak dikenali',
    };
  }

  return { valid: true, data: parsed, error: null };
}

/**
 * Decrypt an encrypted backup envelope with the given password and validate its contents.
 * If the backup is already unencrypted, validates directly.
 * @param {string} jsonString
 * @param {string} [password]
 * @returns {Promise<{ valid: boolean; data: DatabaseExport | null; error: string | null }>}
 */
export async function decryptAndValidateImport(
  jsonString: string,
  password?: string
): Promise<{
  valid: boolean;
  data: DatabaseExport | null;
  error: string | null;
}> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      valid: false,
      data: null,
      error: 'File tidak dapat dibaca: format JSON tidak valid',
    };
  }

  // If encrypted, require password and decrypt
  if (parsed && typeof parsed === 'object' && parsed.encrypted === true) {
    if (!password || password.trim().length === 0) {
      return {
        valid: false,
        data: null,
        error: 'Password dibutuhkan untuk membuka backup terenkripsi',
      };
    }

    try {
      const key = await deriveKey(password.trim(), parsed.salt);
      const decryptedJson = await decryptData(parsed.ciphertext, key);
      return validateImport(decryptedJson);
    } catch {
      return {
        valid: false,
        data: null,
        error: 'Password salah atau data enkripsi rusak',
      };
    }
  }

  // Unencrypted backup
  return validateImport(jsonString);
}

function isSameTransaction(tx1: any, tx2: any): boolean {
  return tx1.tanggal === tx2.tanggal && tx1.total === tx2.total && tx1.createdAt === tx2.createdAt;
}

/**
 * Calculate what would be added by a merge, without modifying the database.
 * @param {object} importData - A validated DatabaseExport object
 * @returns {Promise<object>} MergeResult
 */
export async function calculateMerge(importData: DatabaseExport): Promise<MergeResult> {
  // Read existing data
  const existingTransactions = await db.transactions.toArray();
  const existingSessions = await db.sessions.toArray();
  const existingCategoriesDb = await db.categories.toArray();
  const existingCategories =
    existingCategoriesDb.length > 0
      ? existingCategoriesDb[0]
      : { categories: [], subCategories: {} };
  const existingInventory = await db.inventory.toArray();
  const existingExpenses = await db.expenses.toArray();
  const existingArchiveTransactions = await db.archive_transactions.toArray();

  const existingTxIds = new Set(existingTransactions.map((tx: any) => tx.transactionId));
  const existingSessionIds = new Set(existingSessions.map((s: any) => s.id));
  const existingCategoryNames = new Set(
    (existingCategories.categories ?? []).map((c: string) => c.toLowerCase())
  );
  const existingInventoryIds = new Set(existingInventory.map((item: any) => item.id));
  const existingExpenseIds = new Set(existingExpenses.map((ex: any) => ex.id));
  const existingArchiveTxIds = new Set(
    existingArchiveTransactions.map((tx: any) => tx.transactionId)
  );

  // Identify new items
  const importTransactions = Array.isArray(importData.transactions) ? importData.transactions : [];
  const importSessions = Array.isArray(importData.sessions) ? importData.sessions : [];
  const importCategories = importData.categories?.categories ?? [];
  const importInventory = Array.isArray(importData.inventory) ? importData.inventory : [];
  const importExpenses = Array.isArray(importData.expenses) ? importData.expenses : [];
  const importArchiveTransactions = Array.isArray(importData.archive_transactions)
    ? importData.archive_transactions
    : [];

  // Maps for fast conflict lookup
  const existingTxMap = new Map<string, any>();
  for (const tx of existingTransactions) {
    if (tx.transactionId) {
      existingTxMap.set(tx.transactionId, tx);
    }
  }

  const existingArchiveTxMap = new Map<string, any>();
  for (const tx of existingArchiveTransactions) {
    if (tx.transactionId) {
      existingArchiveTxMap.set(tx.transactionId, tx);
    }
  }

  // Calculate maximum sequence number across existing & imported transactions
  let nextSeq = 0;
  const parseSeq = (txId: string) => {
    if (typeof txId === 'string' && txId.startsWith('TRX-')) {
      const num = parseInt(txId.slice(4), 10);
      if (!isNaN(num)) return num;
    }
    return 0;
  };

  for (const tx of existingTransactions) {
    nextSeq = Math.max(nextSeq, parseSeq(tx.transactionId));
  }
  for (const tx of existingArchiveTransactions) {
    nextSeq = Math.max(nextSeq, parseSeq(tx.transactionId));
  }
  for (const tx of importTransactions) {
    nextSeq = Math.max(nextSeq, parseSeq(tx.transactionId));
  }
  for (const tx of importArchiveTransactions) {
    nextSeq = Math.max(nextSeq, parseSeq(tx.transactionId));
  }

  let currentNewSeq = nextSeq + 1;

  const seenTxMap = new Map<string, any>();
  const transactionsToAdd = importTransactions
    .filter((tx: any) => {
      if (!tx.transactionId) return false;

      // Check conflict with database
      const existing = existingTxMap.get(tx.transactionId);
      if (existing) {
        if (isSameTransaction(existing, tx)) {
          return false;
        }
        tx.transactionId = 'TRX-' + String(currentNewSeq++).padStart(5, '0');
      }

      // Check conflict with archive table
      const existingArchive = existingArchiveTxMap.get(tx.transactionId);
      if (existingArchive) {
        if (isSameTransaction(existingArchive, tx)) {
          return false;
        }
        tx.transactionId = 'TRX-' + String(currentNewSeq++).padStart(5, '0');
      }

      // Check conflict with already seen transactions in this import
      const seen = seenTxMap.get(tx.transactionId);
      if (seen) {
        if (isSameTransaction(seen, tx)) {
          return false;
        }
        tx.transactionId = 'TRX-' + String(currentNewSeq++).padStart(5, '0');
      }

      // Double check that the new re-numbered ID does not conflict with any seen or existing ones
      while (
        seenTxMap.has(tx.transactionId) ||
        existingTxMap.has(tx.transactionId) ||
        existingArchiveTxMap.has(tx.transactionId)
      ) {
        tx.transactionId = 'TRX-' + String(currentNewSeq++).padStart(5, '0');
      }

      seenTxMap.set(tx.transactionId, tx);
      return true;
    })
    .map((tx: any) => {
      const { id, ...rest } = tx;
      return rest;
    });

  const seenSessionIds = new Set(existingSessionIds);
  const sessionsToAdd = importSessions.filter((s: any) => {
    if (!s.id) return false;
    if (seenSessionIds.has(s.id)) return false;
    seenSessionIds.add(s.id);
    return true;
  });

  const seenExpenseIds = new Set(existingExpenseIds);
  const expensesToAdd = importExpenses.filter((ex: any) => {
    if (!ex.id) return false;
    if (seenExpenseIds.has(ex.id)) return false;
    seenExpenseIds.add(ex.id);
    return true;
  });

  const seenArchiveTxMap = new Map<string, any>();
  const archiveTransactionsToAdd = importArchiveTransactions
    .filter((tx: any) => {
      if (!tx.transactionId) return false;

      const existing = existingTxMap.get(tx.transactionId);
      if (existing) {
        if (isSameTransaction(existing, tx)) {
          return false;
        }
        tx.transactionId = 'TRX-' + String(currentNewSeq++).padStart(5, '0');
      }

      const existingArchive = existingArchiveTxMap.get(tx.transactionId);
      if (existingArchive) {
        if (isSameTransaction(existingArchive, tx)) {
          return false;
        }
        tx.transactionId = 'TRX-' + String(currentNewSeq++).padStart(5, '0');
      }

      const seen = seenArchiveTxMap.get(tx.transactionId);
      if (seen) {
        if (isSameTransaction(seen, tx)) {
          return false;
        }
        tx.transactionId = 'TRX-' + String(currentNewSeq++).padStart(5, '0');
      }

      while (
        seenTxMap.has(tx.transactionId) ||
        seenArchiveTxMap.has(tx.transactionId) ||
        existingTxMap.has(tx.transactionId) ||
        existingArchiveTxMap.has(tx.transactionId)
      ) {
        tx.transactionId = 'TRX-' + String(currentNewSeq++).padStart(5, '0');
      }

      seenArchiveTxMap.set(tx.transactionId, tx);
      return true;
    })
    .map((tx: any) => {
      const { id, ...rest } = tx;
      return rest;
    });

  // Merge categories & subCategories
  const seenCategoryNames = new Set(existingCategoryNames);
  const categoriesToAdd = importCategories.filter((name: string) => {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    if (seenCategoryNames.has(lowerName)) return false;
    seenCategoryNames.add(lowerName);
    return true;
  });

  const mergedCategoriesList = [...(existingCategories.categories || [])];
  const mergedSubCategories = { ...(existingCategories.subCategories || {}) };

  // 1. Build canonical category names map
  const canonicalCategoryMap = new Map<string, string>();
  for (const cat of KATEGORI_DEFAULT) {
    canonicalCategoryMap.set(cat.toLowerCase(), cat);
  }
  for (const cat of mergedCategoriesList) {
    canonicalCategoryMap.set(cat.toLowerCase(), cat);
  }

  // 2. Add new custom categories
  for (const name of categoriesToAdd) {
    mergedCategoriesList.push(name);
    canonicalCategoryMap.set(name.toLowerCase(), name);
  }

  const importSubCategories = importData.categories?.subCategories ?? {};
  let subCategoriesChanged = false;

  const processSubCategory = (catName: string, subName: string) => {
    const canonicalCat = canonicalCategoryMap.get(catName.toLowerCase()) || catName;
    if (
      canonicalCat === '__proto__' ||
      canonicalCat === 'constructor' ||
      canonicalCat === 'prototype'
    ) {
      return;
    }

    // Ensure category is in custom categories list if not a preset
    if (!KATEGORI_DEFAULT.includes(canonicalCat) && !mergedCategoriesList.includes(canonicalCat)) {
      mergedCategoriesList.push(canonicalCat);
      canonicalCategoryMap.set(canonicalCat.toLowerCase(), canonicalCat);
      categoriesToAdd.push(canonicalCat);
    }

    const presetSubs = SUBKATEGORI_PRESET[canonicalCat] || [];
    let existingCustomSubs: string[] = [];
    const existingKey = Object.keys(mergedSubCategories).find(
      (k) => k.toLowerCase() === canonicalCat.toLowerCase()
    );
    if (
      existingKey &&
      existingKey !== '__proto__' &&
      existingKey !== 'constructor' &&
      existingKey !== 'prototype' &&
      Object.prototype.hasOwnProperty.call(mergedSubCategories, existingKey)
    ) {
      existingCustomSubs = Reflect.get(mergedSubCategories, existingKey) || [];
    }

    const existingSubsLower = new Set([
      ...presetSubs.map((s) => s.toLowerCase()),
      ...existingCustomSubs.map((s) => s.toLowerCase()),
    ]);

    if (!existingSubsLower.has(subName.toLowerCase())) {
      const mergedCustomSubs = [...existingCustomSubs, subName];
      const targetKey = existingKey || canonicalCat;
      if (targetKey !== '__proto__' && targetKey !== 'constructor' && targetKey !== 'prototype') {
        Reflect.set(mergedSubCategories, targetKey, mergedCustomSubs);
        subCategoriesChanged = true;
      }
    }
  };

  // 3. Merge subcategories explicitly imported
  for (const importCat of Object.keys(importSubCategories)) {
    if (
      importCat === '__proto__' ||
      importCat === 'constructor' ||
      importCat === 'prototype' ||
      !Object.prototype.hasOwnProperty.call(importSubCategories, importCat)
    ) {
      continue;
    }
    const importSubs = Reflect.get(importSubCategories, importCat);
    if (!Array.isArray(importSubs)) continue;

    for (const sub of importSubs) {
      if (sub) processSubCategory(importCat, sub);
    }
  }

  // --- Gap Category Scan: scan imported data for referenced categories and subcategories ---
  // Scan transactions
  for (const tx of transactionsToAdd) {
    if (tx.items && Array.isArray(tx.items)) {
      for (const item of tx.items) {
        if (item.kategori) {
          const cat = item.kategori.trim();
          const sub = (item.subKategori || '').trim();
          if (cat) {
            if (sub) processSubCategory(cat, sub);
            else {
              const canonicalCat = canonicalCategoryMap.get(cat.toLowerCase()) || cat;
              if (
                canonicalCat !== '__proto__' &&
                canonicalCat !== 'constructor' &&
                canonicalCat !== 'prototype' &&
                !KATEGORI_DEFAULT.includes(canonicalCat) &&
                !mergedCategoriesList.includes(canonicalCat)
              ) {
                mergedCategoriesList.push(canonicalCat);
                canonicalCategoryMap.set(canonicalCat.toLowerCase(), canonicalCat);
                categoriesToAdd.push(canonicalCat);
              }
            }
          }
        }
      }
    }
    if (tx.kategori) {
      const cat = tx.kategori.trim();
      const sub = (tx.subKategori || '').trim();
      if (cat) {
        if (sub) processSubCategory(cat, sub);
        else {
          const canonicalCat = canonicalCategoryMap.get(cat.toLowerCase()) || cat;
          if (
            canonicalCat !== '__proto__' &&
            canonicalCat !== 'constructor' &&
            canonicalCat !== 'prototype' &&
            !KATEGORI_DEFAULT.includes(canonicalCat) &&
            !mergedCategoriesList.includes(canonicalCat)
          ) {
            mergedCategoriesList.push(canonicalCat);
            canonicalCategoryMap.set(canonicalCat.toLowerCase(), canonicalCat);
            categoriesToAdd.push(canonicalCat);
          }
        }
      }
    }
  }

  // Scan archived transactions
  for (const tx of archiveTransactionsToAdd) {
    if (tx.items && Array.isArray(tx.items)) {
      for (const item of tx.items) {
        if (item.kategori) {
          const cat = item.kategori.trim();
          const sub = (item.subKategori || '').trim();
          if (cat) {
            if (sub) processSubCategory(cat, sub);
            else {
              const canonicalCat = canonicalCategoryMap.get(cat.toLowerCase()) || cat;
              if (
                canonicalCat !== '__proto__' &&
                canonicalCat !== 'constructor' &&
                canonicalCat !== 'prototype' &&
                !KATEGORI_DEFAULT.includes(canonicalCat) &&
                !mergedCategoriesList.includes(canonicalCat)
              ) {
                mergedCategoriesList.push(canonicalCat);
                canonicalCategoryMap.set(canonicalCat.toLowerCase(), canonicalCat);
                categoriesToAdd.push(canonicalCat);
              }
            }
          }
        }
      }
    }
    if (tx.kategori) {
      const cat = tx.kategori.trim();
      const sub = (tx.subKategori || '').trim();
      if (cat) {
        if (sub) processSubCategory(cat, sub);
        else {
          const canonicalCat = canonicalCategoryMap.get(cat.toLowerCase()) || cat;
          if (
            canonicalCat !== '__proto__' &&
            canonicalCat !== 'constructor' &&
            canonicalCat !== 'prototype' &&
            !KATEGORI_DEFAULT.includes(canonicalCat) &&
            !mergedCategoriesList.includes(canonicalCat)
          ) {
            mergedCategoriesList.push(canonicalCat);
            canonicalCategoryMap.set(canonicalCat.toLowerCase(), canonicalCat);
            categoriesToAdd.push(canonicalCat);
          }
        }
      }
    }
  }

  // Scan inventory
  const canonicalize = (s?: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const seenInventoryIds = new Set(existingInventoryIds);
  const seenInventoryNames = new Set(
    existingInventory
      .filter((item: any) => item.namaBarang || item.nama)
      .map((item: any) => canonicalize(item.namaBarang || item.nama))
  );
  const inventoryToAdd = importInventory.filter((item: any) => {
    if (!item.id) return false;
    if (seenInventoryIds.has(item.id)) return false;

    // Deduplicate by canonical product name (W1-07: trim, lowercase, fold whitespace)
    const nameKey = canonicalize(item.namaBarang || item.nama);
    if (nameKey && seenInventoryNames.has(nameKey)) return false;

    seenInventoryIds.add(item.id);
    if (nameKey) seenInventoryNames.add(nameKey);

    if (item.kategori) {
      const cat = item.kategori.trim();
      const sub = (item.subKategori || '').trim();
      if (cat) {
        if (sub) processSubCategory(cat, sub);
        else {
          const canonicalCat = canonicalCategoryMap.get(cat.toLowerCase()) || cat;
          if (
            canonicalCat !== '__proto__' &&
            canonicalCat !== 'constructor' &&
            canonicalCat !== 'prototype' &&
            !KATEGORI_DEFAULT.includes(canonicalCat) &&
            !mergedCategoriesList.includes(canonicalCat)
          ) {
            mergedCategoriesList.push(canonicalCat);
            canonicalCategoryMap.set(canonicalCat.toLowerCase(), canonicalCat);
            categoriesToAdd.push(canonicalCat);
          }
        }
      }
    }
    return true;
  });

  // Scan expenses
  for (const ex of expensesToAdd) {
    if (ex.kategori) {
      const cat = ex.kategori.trim();
      if (cat) {
        const canonicalCat = canonicalCategoryMap.get(cat.toLowerCase()) || cat;
        if (
          canonicalCat !== '__proto__' &&
          canonicalCat !== 'constructor' &&
          canonicalCat !== 'prototype' &&
          !KATEGORI_DEFAULT.includes(canonicalCat) &&
          !mergedCategoriesList.includes(canonicalCat)
        ) {
          mergedCategoriesList.push(canonicalCat);
          canonicalCategoryMap.set(canonicalCat.toLowerCase(), canonicalCat);
          categoriesToAdd.push(canonicalCat);
        }
      }
    }
  }

  // Scan stock_movements (W1-10)
  const existingStockMovements = await db.stock_movements.toArray();
  const existingStockMovementIds = new Set(existingStockMovements.map((sm: any) => sm.id));
  const importStockMovements = Array.isArray(importData.stock_movements)
    ? importData.stock_movements
    : [];
  const stockMovementsToAdd = [
    ...importStockMovements.filter((sm: any) => sm.id && !existingStockMovementIds.has(sm.id)),
  ];

  // W1-10: If importing legacy backup without stock_movements ledger, synthesize opening movements
  if (importStockMovements.length === 0 && inventoryToAdd.length > 0) {
    const nowIso = new Date().toISOString();
    for (const item of inventoryToAdd) {
      if (item.id) {
        stockMovementsToAdd.push({
          id:
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `sm-${item.id}-opening`,
          inventoryId: item.id,
          delta: Number(item.quantity) || 0,
          reason: 'opening',
          refType: 'manual',
          refId: 'import-backup-derivation',
          at: nowIso,
          by: 'System Import',
          note: 'Saldo awal dari import backup lama',
        });
      }
    }
  }

  const skippedStockMovements = importStockMovements.length - stockMovementsToAdd.length;

  // Bug #3: Scan audit_log — append-only with UUID keys, simple dedup by id
  const existingAuditLogs = await db.audit_log.toArray();
  const existingAuditLogIds = new Set(existingAuditLogs.map((al: any) => al.id));
  const importAuditLogs = Array.isArray((importData as any).audit_log)
    ? (importData as any).audit_log
    : [];
  const auditLogsToAdd = importAuditLogs.filter(
    (al: any) => al.id && !existingAuditLogIds.has(al.id)
  );

  // W5-01: Scan customers
  const existingCustomers = await db.customers.toArray();
  const existingCustomerIds = new Set(existingCustomers.map((c: any) => c.id));
  const importCustomers = Array.isArray((importData as any).customers)
    ? (importData as any).customers
    : [];
  const customersToAdd = importCustomers.filter((c: any) => c.id && !existingCustomerIds.has(c.id));

  // W5-01: Scan credit_ledger
  const existingCreditLedger = await db.credit_ledger.toArray();
  const existingCreditLedgerIds = new Set(existingCreditLedger.map((cl: any) => cl.id));
  const importCreditLedger = Array.isArray((importData as any).credit_ledger)
    ? (importData as any).credit_ledger
    : [];
  const creditLedgersToAdd = importCreditLedger.filter(
    (cl: any) => cl.id && !existingCreditLedgerIds.has(cl.id)
  );

  // W5-01: Scan credit_payments
  const existingCreditPayments = await db.credit_payments.toArray();
  const existingCreditPaymentIds = new Set(existingCreditPayments.map((cp: any) => cp.id));
  const importCreditPayments = Array.isArray((importData as any).credit_payments)
    ? (importData as any).credit_payments
    : [];
  const creditPaymentsToAdd = importCreditPayments.filter(
    (cp: any) => cp.id && !existingCreditPaymentIds.has(cp.id)
  );

  // W5-01: Scan price_history
  const existingPriceHistory = await db.price_history.toArray();
  const existingPriceHistoryIds = new Set(existingPriceHistory.map((ph: any) => ph.id));
  const importPriceHistory = Array.isArray((importData as any).price_history)
    ? (importData as any).price_history
    : [];
  const priceHistoriesToAdd = importPriceHistory.filter(
    (ph: any) => ph.id && !existingPriceHistoryIds.has(ph.id)
  );

  const hasCategoryChanges = categoriesToAdd.length > 0 || subCategoriesChanged;
  const categoriesRecordToPut = hasCategoryChanges
    ? {
        id: existingCategories.id || 1,
        key: 'main',
        categories: mergedCategoriesList,
        subCategories: mergedSubCategories,
      }
    : null;

  // Build the full set of session IDs after merge (existing + new)
  const allSessionIdsAfterMerge = new Set([
    ...existingSessionIds,
    ...sessionsToAdd.map((s: any) => s.id),
  ]);

  // Count orphan transactions: new transactions with a non-null sessionId
  // that won't exist in the merged session set
  const orphanTransactions = transactionsToAdd.filter(
    (tx: any) =>
      tx.sessionId !== null &&
      tx.sessionId !== undefined &&
      !allSessionIdsAfterMerge.has(tx.sessionId)
  ).length;

  // Count skipped (duplicates)
  const skippedTransactions = importTransactions.length - transactionsToAdd.length;
  const skippedSessions = importSessions.length - sessionsToAdd.length;
  const skippedCategories = importCategories.length - categoriesToAdd.length;
  const skippedInventory = importInventory.length - inventoryToAdd.length;
  const skippedExpenses = importExpenses.length - expensesToAdd.length;
  const skippedArchiveTransactions =
    importArchiveTransactions.length - archiveTransactionsToAdd.length;
  const skippedCustomers = importCustomers.length - customersToAdd.length;
  const skippedCreditLedger = importCreditLedger.length - creditLedgersToAdd.length;
  const skippedCreditPayments = importCreditPayments.length - creditPaymentsToAdd.length;
  const skippedPriceHistory = importPriceHistory.length - priceHistoriesToAdd.length;

  const skipped =
    skippedTransactions +
    skippedSessions +
    skippedCategories +
    skippedInventory +
    skippedExpenses +
    skippedArchiveTransactions +
    skippedStockMovements +
    skippedCustomers +
    skippedCreditLedger +
    skippedCreditPayments +
    skippedPriceHistory;

  return {
    __isMergeResult: true,
    newTransactions: transactionsToAdd.length,
    newSessions: sessionsToAdd.length,
    newCategories: categoriesToAdd.length,
    newInventory: inventoryToAdd.length,
    newExpenses: expensesToAdd.length,
    newArchiveTransactions: archiveTransactionsToAdd.length,
    newStockMovements: stockMovementsToAdd.length,
    newCustomers: customersToAdd.length,
    newCreditLedger: creditLedgersToAdd.length,
    newCreditPayments: creditPaymentsToAdd.length,
    newPriceHistory: priceHistoriesToAdd.length,
    skipped,
    orphanTransactions,
    transactionsToAdd,
    sessionsToAdd,
    categoriesToAdd,
    inventoryToAdd,
    expensesToAdd,
    archiveTransactionsToAdd,
    stockMovementsToAdd,
    auditLogsToAdd,
    customersToAdd,
    creditLedgersToAdd,
    creditPaymentsToAdd,
    priceHistoriesToAdd,
    categoriesRecordToPut,
  };
}

/**
 * Apply a merge atomically to IndexedDB using Dexie transaction.
 * Rolls back on any failure.
 * @param {object} data - Either a raw DatabaseExport OR a pre-calculated MergeResult
 *   (from calculateMerge). Pass the MergeResult directly to avoid re-reading the DB.
 */
export async function applyMerge(
  data: MergeResult | DatabaseExport
): Promise<{ success: boolean; error: string | null }> {
  // Explicit flag is more reliable than duck-typing on transactionsToAdd
  const mergeResult: MergeResult =
    '__isMergeResult' in data && data.__isMergeResult === true
      ? data
      : await calculateMerge(data as DatabaseExport);
  const {
    transactionsToAdd,
    sessionsToAdd,
    categoriesToAdd,
    inventoryToAdd,
    expensesToAdd,
    archiveTransactionsToAdd,
  } = mergeResult;

  try {
    await db.transaction(
      'rw',
      [
        db.transactions,
        db.sessions,
        db.categories,
        db.inventory,
        db.expenses,
        db.archive_transactions,
        db.stock_movements,
        db.audit_log,
        db.customers,
        db.credit_ledger,
        db.credit_payments,
        db.price_history,
        db.meta,
      ],
      async () => {
        if (transactionsToAdd.length > 0) {
          await db.transactions.bulkAdd(transactionsToAdd);
        }
        if (sessionsToAdd.length > 0) {
          await db.sessions.bulkAdd(sessionsToAdd);
        }
        if (expensesToAdd.length > 0) {
          await db.expenses.bulkAdd(expensesToAdd);
        }
        if (archiveTransactionsToAdd.length > 0) {
          await db.archive_transactions.bulkAdd(archiveTransactionsToAdd);
        }
        if (mergeResult.stockMovementsToAdd && mergeResult.stockMovementsToAdd.length > 0) {
          await db.stock_movements.bulkAdd(mergeResult.stockMovementsToAdd);
        }
        // Bug #3: restore audit_log from backup
        if (mergeResult.auditLogsToAdd && mergeResult.auditLogsToAdd.length > 0) {
          await db.audit_log.bulkAdd(mergeResult.auditLogsToAdd);
        }
        // W5-01: restore customers, credit ledger, payments, and price history
        if (mergeResult.customersToAdd && mergeResult.customersToAdd.length > 0) {
          await db.customers.bulkAdd(mergeResult.customersToAdd);
        }
        if (mergeResult.creditLedgersToAdd && mergeResult.creditLedgersToAdd.length > 0) {
          await db.credit_ledger.bulkAdd(mergeResult.creditLedgersToAdd);
        }
        if (mergeResult.creditPaymentsToAdd && mergeResult.creditPaymentsToAdd.length > 0) {
          await db.credit_payments.bulkAdd(mergeResult.creditPaymentsToAdd);
        }
        if (mergeResult.priceHistoriesToAdd && mergeResult.priceHistoriesToAdd.length > 0) {
          await db.price_history.bulkAdd(mergeResult.priceHistoriesToAdd);
        }
        if (mergeResult.categoriesRecordToPut) {
          await db.categories.put(mergeResult.categoriesRecordToPut);
        } else if (categoriesToAdd.length > 0) {
          const existingDb = await db.categories.toArray();
          if (existingDb.length > 0) {
            const existing = existingDb[0];
            await db.categories.put({
              ...existing,
              categories: [...(existing.categories || []), ...categoriesToAdd],
            });
          } else {
            await db.categories.put({ id: 1, categories: categoriesToAdd, subCategories: {} });
          }
        }
        if (inventoryToAdd.length > 0) {
          await db.inventory.bulkAdd(inventoryToAdd);
        }

        // Recalculate and update seq in db.meta
        const allTx = await db.transactions.toArray();
        const allArchiveTx = await db.archive_transactions.toArray();
        let maxSeq = 0;
        const parseSeq = (txId: string) => {
          if (typeof txId === 'string' && txId.startsWith('TRX-')) {
            const num = parseInt(txId.slice(4), 10);
            if (!isNaN(num)) return num;
          }
          return 0;
        };
        for (const tx of allTx) {
          maxSeq = Math.max(maxSeq, parseSeq(tx.transactionId));
        }
        for (const tx of allArchiveTx) {
          maxSeq = Math.max(maxSeq, parseSeq(tx.transactionId));
        }

        const metaSeq = await db.meta.get({ key: 'seq' });
        const currentSeqValue = metaSeq ? metaSeq.value : 0;
        if (maxSeq > currentSeqValue) {
          await db.meta.put({ ...(metaSeq || {}), key: 'seq', value: maxSeq });
        }
      }
    );
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: 'Merge gagal: ' + error.message };
  }
}

/**
 * Move transactions older than the specified date to the archive table.
 * @param {string} olderThanDate - ISO date string to compare against
 * @returns {Promise<{ success: boolean, archivedCount: number, error: string | null }>}
 */
export async function archiveOldTransactions(
  olderThanDate: string
): Promise<{ success: boolean; archivedCount: number; error: string | null }> {
  try {
    let archivedCount = 0;
    await db.transaction('rw', db.transactions, db.archive_transactions, async () => {
      const oldTransactions = await db.transactions.where('tanggal').below(olderThanDate).toArray();

      if (oldTransactions.length === 0) return;

      await db.archive_transactions.bulkAdd(oldTransactions);

      const idsToDelete = oldTransactions.map((tx) => tx.id);
      await db.transactions.bulkDelete(idsToDelete);

      archivedCount = oldTransactions.length;
    });

    return { success: true, archivedCount, error: null };
  } catch (error: any) {
    return { success: false, archivedCount: 0, error: 'Gagal mengarsipkan data: ' + error.message };
  }
}

/**
 * Automatically scans all existing transactions, archived transactions, inventory items,
 * and expense records to find any categories or subcategories used that are not present
 * in the presets or in the custom categories database, and registers them.
 */
export async function syncMissingCategories(): Promise<{ success: boolean; error: string | null }> {
  try {
    const transactions = await db.transactions.toArray();
    const archiveTransactions = await db.archive_transactions.toArray();
    const inventory = await db.inventory.toArray();
    const expenses = await db.expenses.toArray();
    const categoriesDb = await db.categories.toArray();
    const categoriesRecord =
      categoriesDb.length > 0
        ? categoriesDb[0]
        : { id: 1, key: 'main', categories: [], subCategories: {} };

    const customCategories = categoriesRecord.categories || [];
    const customSubCategories = categoriesRecord.subCategories || {};

    const canonicalCategoryMap = new Map<string, string>();
    for (const cat of KATEGORI_DEFAULT) {
      canonicalCategoryMap.set(cat.toLowerCase(), cat);
    }
    for (const cat of customCategories) {
      canonicalCategoryMap.set(cat.toLowerCase(), cat);
    }

    const categoriesToAdd = new Set<string>();
    const subCategoriesMap = new Map<string, Set<string>>();

    const registerCategory = (cat: string) => {
      const trimmed = cat.trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      if (lower === '__proto__' || lower === 'constructor' || lower === 'prototype') {
        return;
      }
      if (!canonicalCategoryMap.has(lower)) {
        categoriesToAdd.add(trimmed);
        canonicalCategoryMap.set(lower, trimmed);
      }
    };

    const registerSubCategory = (cat: string, sub: string) => {
      const trimmedCat = cat.trim();
      const trimmedSub = sub.trim();
      if (!trimmedCat || !trimmedSub) return;
      const lowerCat = trimmedCat.toLowerCase();
      const lowerSub = trimmedSub.toLowerCase();
      if (
        lowerCat === '__proto__' ||
        lowerCat === 'constructor' ||
        lowerCat === 'prototype' ||
        lowerSub === '__proto__' ||
        lowerSub === 'constructor' ||
        lowerSub === 'prototype'
      ) {
        return;
      }

      registerCategory(trimmedCat);
      const canonicalCat = canonicalCategoryMap.get(lowerCat) || trimmedCat;

      const presetSubs: string[] = (SUBKATEGORI_PRESET[canonicalCat] || []) as string[];
      const existingCustomSubs: string[] = (customSubCategories[canonicalCat] || []) as string[];
      const allSubsLower = new Set([
        ...presetSubs.map((s: string) => s.toLowerCase()),
        ...existingCustomSubs.map((s: string) => s.toLowerCase()),
      ]);

      if (!allSubsLower.has(lowerSub)) {
        if (!subCategoriesMap.has(canonicalCat)) {
          subCategoriesMap.set(canonicalCat, new Set());
        }
        subCategoriesMap.get(canonicalCat)!.add(trimmedSub);
      }
    };

    // Scan transactions
    for (const tx of transactions) {
      if (tx.items && Array.isArray(tx.items)) {
        for (const item of tx.items) {
          if (item.kategori) {
            if (item.subKategori) registerSubCategory(item.kategori, item.subKategori);
            else registerCategory(item.kategori);
          }
        }
      }
      if (tx.kategori) {
        if (tx.subKategori) registerSubCategory(tx.kategori, tx.subKategori);
        else registerCategory(tx.kategori);
      }
    }

    // Scan archive transactions
    for (const tx of archiveTransactions) {
      if (tx.items && Array.isArray(tx.items)) {
        for (const item of tx.items) {
          if (item.kategori) {
            if (item.subKategori) registerSubCategory(item.kategori, item.subKategori);
            else registerCategory(item.kategori);
          }
        }
      }
      if (tx.kategori) {
        if (tx.subKategori) registerSubCategory(tx.kategori, tx.subKategori);
        else registerCategory(tx.kategori);
      }
    }

    // Scan inventory
    for (const item of inventory) {
      if (item.kategori) {
        if (item.subKategori) registerSubCategory(item.kategori, item.subKategori);
        else registerCategory(item.kategori);
      }
    }

    // Scan expenses
    for (const ex of expenses) {
      if (ex.kategori) registerCategory(ex.kategori);
    }

    const hasChanges = categoriesToAdd.size > 0 || subCategoriesMap.size > 0;
    if (hasChanges) {
      const newCategoriesList = [...customCategories, ...categoriesToAdd];
      const newSubCategoriesObj = { ...customSubCategories };

      for (const [cat, subs] of subCategoriesMap.entries()) {
        const existingCustom = newSubCategoriesObj[cat] || [];
        newSubCategoriesObj[cat] = [...existingCustom, ...subs];
      }

      await db.categories.put({
        ...categoriesRecord,
        categories: newCategoriesList,
        subCategories: newSubCategoriesObj,
      });
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: 'Kategori sync gagal: ' + error.message };
  }
}
