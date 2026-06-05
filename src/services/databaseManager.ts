/* ═══════════════════════════════════════════════════════════
   Database Manager — ClearTask
   Handles export, import validation, merge calculation,
   and atomic merge application for the full database.
   ═══════════════════════════════════════════════════════════ */
import db from './db';
import { toLocalDateString } from '../utils/formatters';
import { triggerDownload } from '../utils/downloadHelper';
import { KATEGORI_DEFAULT, SUBKATEGORI_PRESET } from '../hooks/useCategories';

export interface DatabaseExport {
  version: string;
  exportedAt: string;
  transactions: any[];
  sessions: any[];
  categories: any;
  inventory: any[];
  expenses?: any[];
  archive_transactions?: any[];
  saw_criterias?: any[];
  saw_history?: any[];
  metadata: {
    totalTransactions: number;
    totalSessions: number;
    totalInventory: number;
    totalExpenses?: number;
    totalArchiveTransactions?: number;
    totalSawCriterias?: number;
    totalSawHistory?: number;
    deviceInfo: string;
  };
}

export interface MergeResult {
  __isMergeResult: boolean;
  newTransactions: number;
  newSessions: number;
  newCategories: number;
  newInventory: number;
  newExpenses: number;
  newArchiveTransactions: number;
  newSawHistory: number;
  sawCriteriaUpdated: boolean;
  skipped: number;
  orphanTransactions: number;
  transactionsToAdd: any[];
  sessionsToAdd: any[];
  categoriesToAdd: string[];
  inventoryToAdd: any[];
  expensesToAdd: any[];
  archiveTransactionsToAdd: any[];
  sawHistoryToAdd: any[];
  sawCriteriasToPut: any | null;
  categoriesRecordToPut?: any;
}

// ── Exported functions ────────────────────────────────────

/**
 * Read all data from IndexedDB and trigger a JSON file download.
 * Handles empty database gracefully.
 * @returns {Promise<void>}
 */
export async function exportDatabase(): Promise<void> {
  const transactions = await db.transactions.toArray();
  const sessions = await db.sessions.toArray();
  const categoriesDb = await db.categories.toArray();
  const categories = categoriesDb.length > 0 ? categoriesDb[0] : { categories: [] };
  const inventory = await db.inventory.toArray();
  const expenses = await db.expenses.toArray();
  const archiveTransactions = await db.archive_transactions.toArray();
  const sawCriterias = await db.saw_criterias.toArray();
  const sawHistory = await db.saw_history.toArray();

  const exportData: DatabaseExport = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    transactions: Array.isArray(transactions) ? transactions : [],
    sessions: Array.isArray(sessions) ? sessions : [],
    categories: categories && typeof categories === 'object' ? categories : { categories: [] },
    inventory: Array.isArray(inventory) ? inventory : [],
    expenses: Array.isArray(expenses) ? expenses : [],
    archive_transactions: Array.isArray(archiveTransactions) ? archiveTransactions : [],
    saw_criterias: Array.isArray(sawCriterias) ? sawCriterias : [],
    saw_history: Array.isArray(sawHistory) ? sawHistory : [],
    metadata: {
      totalTransactions: Array.isArray(transactions) ? transactions.length : 0,
      totalSessions: Array.isArray(sessions) ? sessions.length : 0,
      totalInventory: Array.isArray(inventory) ? inventory.length : 0,
      totalExpenses: Array.isArray(expenses) ? expenses.length : 0,
      totalArchiveTransactions: Array.isArray(archiveTransactions) ? archiveTransactions.length : 0,
      totalSawCriterias: Array.isArray(sawCriterias) ? sawCriterias.length : 0,
      totalSawHistory: Array.isArray(sawHistory) ? sawHistory.length : 0,
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
export function validateImport(jsonString: string): {
  valid: boolean;
  data: any;
  error: string | null;
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
  const existingSawCriterias = await db.saw_criterias.toArray();
  const existingSawHistory = await db.saw_history.toArray();

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
  const existingSawHistoryCreatedAts = new Set(existingSawHistory.map((h: any) => h.createdAt));

  // Identify new items
  const importTransactions = Array.isArray(importData.transactions) ? importData.transactions : [];
  const importSessions = Array.isArray(importData.sessions) ? importData.sessions : [];
  const importCategories = importData.categories?.categories ?? [];
  const importInventory = Array.isArray(importData.inventory) ? importData.inventory : [];
  const importExpenses = Array.isArray(importData.expenses) ? importData.expenses : [];
  const importArchiveTransactions = Array.isArray(importData.archive_transactions)
    ? importData.archive_transactions
    : [];
  const importSawCriterias = Array.isArray(importData.saw_criterias)
    ? importData.saw_criterias
    : [];
  const importSawHistory = Array.isArray(importData.saw_history) ? importData.saw_history : [];

  const seenTxIds = new Set(existingTxIds);
  const transactionsToAdd = importTransactions.filter((tx: any) => {
    if (!tx.transactionId) return false;
    if (seenTxIds.has(tx.transactionId)) return false;
    seenTxIds.add(tx.transactionId);
    return true;
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

  const seenArchiveTxIds = new Set(existingArchiveTxIds);
  const archiveTransactionsToAdd = importArchiveTransactions.filter((tx: any) => {
    if (!tx.transactionId) return false;
    if (seenArchiveTxIds.has(tx.transactionId)) return false;
    seenArchiveTxIds.add(tx.transactionId);
    return true;
  });

  const seenSawHistoryCreatedAts = new Set(existingSawHistoryCreatedAts);
  const sawHistoryToAdd = importSawHistory.filter((h: any) => {
    if (!h.createdAt) return false;
    if (seenSawHistoryCreatedAts.has(h.createdAt)) return false;
    seenSawHistoryCreatedAts.add(h.createdAt);
    return true;
  });

  // SAW criteria logic: latest one wins based on updatedAt timestamp
  let sawCriteriasToPut: any | null = null;
  let sawCriteriaUpdated = false;
  if (importSawCriterias.length > 0) {
    const importCrit = importSawCriterias[importSawCriterias.length - 1];
    if (existingSawCriterias.length > 0) {
      const existingCrit = existingSawCriterias[0];
      const existingTime = new Date(existingCrit.updatedAt || 0).getTime();
      const importTime = new Date(importCrit.updatedAt || 0).getTime();
      if (importTime > existingTime) {
        sawCriteriasToPut = { ...importCrit, id: existingCrit.id };
        sawCriteriaUpdated = true;
      }
    } else {
      sawCriteriasToPut = { ...importCrit };
      delete sawCriteriasToPut.id;
      sawCriteriaUpdated = true;
    }
  }

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
  const seenInventoryIds = new Set(existingInventoryIds);
  const inventoryToAdd = importInventory.filter((item: any) => {
    if (!item.id) return false;
    if (seenInventoryIds.has(item.id)) return false;
    seenInventoryIds.add(item.id);

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
  const skippedSawHistory = importSawHistory.length - sawHistoryToAdd.length;

  const skipped =
    skippedTransactions +
    skippedSessions +
    skippedCategories +
    skippedInventory +
    skippedExpenses +
    skippedArchiveTransactions +
    skippedSawHistory;

  return {
    __isMergeResult: true,
    newTransactions: transactionsToAdd.length,
    newSessions: sessionsToAdd.length,
    newCategories: categoriesToAdd.length,
    newInventory: inventoryToAdd.length,
    newExpenses: expensesToAdd.length,
    newArchiveTransactions: archiveTransactionsToAdd.length,
    newSawHistory: sawHistoryToAdd.length,
    sawCriteriaUpdated,
    skipped,
    orphanTransactions,
    transactionsToAdd,
    sessionsToAdd,
    categoriesToAdd,
    inventoryToAdd,
    expensesToAdd,
    archiveTransactionsToAdd,
    sawHistoryToAdd,
    sawCriteriasToPut,
    categoriesRecordToPut,
  };
}

/**
 * Apply a merge atomically to IndexedDB using Dexie transaction.
 * Rolls back on any failure.
 * @param {object} data - Either a raw DatabaseExport OR a pre-calculated MergeResult
 *   (from calculateMerge). Pass the MergeResult directly to avoid re-reading the DB.
 */
export async function applyMerge(data: any): Promise<{ success: boolean; error: string | null }> {
  // Explicit flag is more reliable than duck-typing on transactionsToAdd
  const mergeResult = data.__isMergeResult === true ? data : await calculateMerge(data);
  const {
    transactionsToAdd,
    sessionsToAdd,
    categoriesToAdd,
    inventoryToAdd,
    expensesToAdd,
    archiveTransactionsToAdd,
    sawHistoryToAdd,
    sawCriteriasToPut,
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
        db.saw_criterias,
        db.saw_history,
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
        if (sawHistoryToAdd.length > 0) {
          await db.saw_history.bulkAdd(sawHistoryToAdd);
        }
        if (sawCriteriasToPut) {
          if (sawCriteriasToPut.id) {
            await db.saw_criterias.put(sawCriteriasToPut);
          } else {
            await db.saw_criterias.add(sawCriteriasToPut);
          }
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
