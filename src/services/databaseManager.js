/* ═══════════════════════════════════════════════════════════
   Database Manager — ClearTask
   Handles export, import validation, merge calculation,
   and atomic merge application for the full database.
   ═══════════════════════════════════════════════════════════ */
import db from './db.js';
import { toLocalDateString } from '../utils/formatters.js';
import { triggerDownload } from '../utils/downloadHelper.js';

// ── Exported functions ────────────────────────────────────

/**
 * Read all data from IndexedDB and trigger a JSON file download.
 * Handles empty database gracefully.
 * @returns {Promise<void>}
 */
export async function exportDatabase() {
  const transactions = await db.transactions.toArray();
  const sessions = await db.sessions.toArray();
  const categoriesDb = await db.categories.toArray();
  const categories = categoriesDb.length > 0 ? categoriesDb[0] : { categories: [] };
  const inventory = await db.inventory.toArray();

  /** @type {import('./databaseManager').DatabaseExport} */
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    transactions: Array.isArray(transactions) ? transactions : [],
    sessions: Array.isArray(sessions) ? sessions : [],
    categories: categories && typeof categories === 'object' ? categories : { categories: [] },
    inventory: Array.isArray(inventory) ? inventory : [],
    metadata: {
      totalTransactions: Array.isArray(transactions) ? transactions.length : 0,
      totalSessions: Array.isArray(sessions) ? sessions.length : 0,
      totalInventory: Array.isArray(inventory) ? inventory.length : 0,
      deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    },
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const dateStr = toLocalDateString(new Date());
  const filename = `ClearTask_DB_${dateStr}.json`;

  triggerDownload(blob, filename);

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
export function validateImport(jsonString) {
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
  if (parsed.version !== '1.0') {
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
 * Calculate what would be added by a merge, without modifying the database.
 * @param {object} importData - A validated DatabaseExport object
 * @returns {Promise<object>} MergeResult
 */
export async function calculateMerge(importData) {
  // Read existing data
  const existingTransactions = await db.transactions.toArray();
  const existingSessions = await db.sessions.toArray();
  const existingCategoriesDb = await db.categories.toArray();
  const existingCategories =
    existingCategoriesDb.length > 0 ? existingCategoriesDb[0] : { categories: [] };
  const existingInventory = await db.inventory.toArray();

  const existingTxIds = new Set(existingTransactions.map((tx) => tx.transactionId));
  const existingSessionIds = new Set(existingSessions.map((s) => s.id));
  const existingCategoryNames = new Set(
    (existingCategories.categories ?? []).map((c) => c.toLowerCase())
  );
  const existingInventoryIds = new Set(existingInventory.map((item) => item.id));

  // Identify new items
  const importTransactions = Array.isArray(importData.transactions) ? importData.transactions : [];
  const importSessions = Array.isArray(importData.sessions) ? importData.sessions : [];
  const importCategories = importData.categories?.categories ?? [];
  const importInventory = Array.isArray(importData.inventory) ? importData.inventory : [];

  const transactionsToAdd = importTransactions.filter((tx) => !existingTxIds.has(tx.transactionId));
  const sessionsToAdd = importSessions.filter((s) => !existingSessionIds.has(s.id));
  const categoriesToAdd = importCategories.filter(
    (name) => !existingCategoryNames.has(name.toLowerCase())
  );
  const inventoryToAdd = importInventory.filter((item) => !existingInventoryIds.has(item.id));

  // Build the full set of session IDs after merge (existing + new)
  const allSessionIdsAfterMerge = new Set([
    ...existingSessionIds,
    ...sessionsToAdd.map((s) => s.id),
  ]);

  // Count orphan transactions: new transactions with a non-null sessionId
  // that won't exist in the merged session set
  const orphanTransactions = transactionsToAdd.filter(
    (tx) =>
      tx.sessionId !== null &&
      tx.sessionId !== undefined &&
      !allSessionIdsAfterMerge.has(tx.sessionId)
  ).length;

  // Count skipped (duplicates)
  const skippedTransactions = importTransactions.length - transactionsToAdd.length;
  const skippedSessions = importSessions.length - sessionsToAdd.length;
  const skippedCategories = importCategories.length - categoriesToAdd.length;
  const skippedInventory = importInventory.length - inventoryToAdd.length;
  const skipped = skippedTransactions + skippedSessions + skippedCategories + skippedInventory;

  return {
    __isMergeResult: true,
    newTransactions: transactionsToAdd.length,
    newSessions: sessionsToAdd.length,
    newCategories: categoriesToAdd.length,
    newInventory: inventoryToAdd.length,
    skipped,
    orphanTransactions,
    transactionsToAdd,
    sessionsToAdd,
    categoriesToAdd,
    inventoryToAdd,
  };
}

/**
 * Apply a merge atomically to IndexedDB using Dexie transaction.
 * Rolls back on any failure.
 * @param {object} data - Either a raw DatabaseExport OR a pre-calculated MergeResult
 *   (from calculateMerge). Pass the MergeResult directly to avoid re-reading the DB.
 */
export async function applyMerge(data) {
  // Explicit flag is more reliable than duck-typing on transactionsToAdd
  const mergeResult = data.__isMergeResult === true ? data : await calculateMerge(data);
  const { transactionsToAdd, sessionsToAdd, categoriesToAdd, inventoryToAdd } = mergeResult;

  try {
    await db.transaction(
      'rw',
      db.transactions,
      db.sessions,
      db.categories,
      db.inventory,
      async () => {
        if (transactionsToAdd.length > 0) {
          await db.transactions.bulkAdd(transactionsToAdd);
        }
        if (sessionsToAdd.length > 0) {
          await db.sessions.bulkAdd(sessionsToAdd);
        }
        if (categoriesToAdd.length > 0) {
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
      }
    );
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: 'Merge gagal: ' + error.message };
  }
}
