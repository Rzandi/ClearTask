/* ═══════════════════════════════════════════════════════════
   Database Manager — ClearTask
   Handles export, import validation, merge calculation,
   and atomic merge application for the full database.
   ═══════════════════════════════════════════════════════════ */



const KEYS = {
  TRANSACTIONS: 'cleartask_transactions',
  SESSIONS: 'cleartask_sessions',
  CATEGORIES: 'cleartask_categories',
  INVENTORY: 'cleartask_inventory',
};

// ── Internal helpers ──────────────────────────────────────

/**
 * Read and parse a localStorage key, returning a fallback on failure.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function readKey(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// ── Exported functions ────────────────────────────────────

/**
 * Read all data from localStorage and trigger a JSON file download.
 * Handles empty localStorage gracefully (uses [] / {} defaults).
 * @returns {void}
 */
export async function exportDatabase() {
  const { saveAs } = await import('file-saver');

  const transactions = readKey(KEYS.TRANSACTIONS, []);
  const sessions = readKey(KEYS.SESSIONS, []);
  const categories = readKey(KEYS.CATEGORIES, { categories: [] });
  const inventory = readKey(KEYS.INVENTORY, []);

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
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `ClearTask_DB_${dateStr}.json`;

  saveAs(blob, filename);
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
 * Calculate what would be added by a merge, without modifying localStorage.
 * @param {object} importData - A validated DatabaseExport object
 * @returns {object} MergeResult
 */
export function calculateMerge(importData) {
  // Read existing data
  const existingTransactions = readKey(KEYS.TRANSACTIONS, []);
  const existingSessions = readKey(KEYS.SESSIONS, []);
  const existingCategories = readKey(KEYS.CATEGORIES, { categories: [] });
  const existingInventory = readKey(KEYS.INVENTORY, []);

  const existingTxIds = new Set(
    (Array.isArray(existingTransactions) ? existingTransactions : []).map(
      (tx) => tx.transactionId
    )
  );
  const existingSessionIds = new Set(
    (Array.isArray(existingSessions) ? existingSessions : []).map((s) => s.id)
  );
  const existingCategoryNames = new Set(
    (existingCategories?.categories ?? []).map((c) => c.toLowerCase())
  );
  const existingInventoryIds = new Set(
    (Array.isArray(existingInventory) ? existingInventory : []).map((item) => item.id)
  );

  // Identify new items
  const importTransactions = Array.isArray(importData.transactions) ? importData.transactions : [];
  const importSessions = Array.isArray(importData.sessions) ? importData.sessions : [];
  const importCategories = importData.categories?.categories ?? [];
  const importInventory = Array.isArray(importData.inventory) ? importData.inventory : [];

  const transactionsToAdd = importTransactions.filter(
    (tx) => !existingTxIds.has(tx.transactionId)
  );
  const sessionsToAdd = importSessions.filter((s) => !existingSessionIds.has(s.id));
  const categoriesToAdd = importCategories.filter(
    (name) => !existingCategoryNames.has(name.toLowerCase())
  );
  const inventoryToAdd = importInventory.filter(
    (item) => !existingInventoryIds.has(item.id)
  );

  // Build the full set of session IDs after merge (existing + new)
  const allSessionIdsAfterMerge = new Set([
    ...existingSessionIds,
    ...sessionsToAdd.map((s) => s.id),
  ]);

  // Count orphan transactions: new transactions with a non-null sessionId
  // that won't exist in the merged session set
  const orphanTransactions = transactionsToAdd.filter(
    (tx) => tx.sessionId !== null && tx.sessionId !== undefined && !allSessionIdsAfterMerge.has(tx.sessionId)
  ).length;

  // Count skipped (duplicates)
  const skippedTransactions = importTransactions.length - transactionsToAdd.length;
  const skippedSessions = importSessions.length - sessionsToAdd.length;
  const skippedCategories = importCategories.length - categoriesToAdd.length;
  const skippedInventory = importInventory.length - inventoryToAdd.length;
  const skipped = skippedTransactions + skippedSessions + skippedCategories + skippedInventory;

  return {
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
 * Apply a merge atomically to localStorage.
 * Backs up all keys before writing; rolls back on any failure.
 * @param {object} importData - A validated DatabaseExport object
 * @returns {{ success: boolean, error: string|null }}
 */
export function applyMerge(importData) {
  const { transactionsToAdd, sessionsToAdd, categoriesToAdd, inventoryToAdd } = calculateMerge(importData);

  // Backup current values (raw strings, may be null)
  const backup = {
    [KEYS.TRANSACTIONS]: localStorage.getItem(KEYS.TRANSACTIONS),
    [KEYS.SESSIONS]: localStorage.getItem(KEYS.SESSIONS),
    [KEYS.CATEGORIES]: localStorage.getItem(KEYS.CATEGORIES),
    [KEYS.INVENTORY]: localStorage.getItem(KEYS.INVENTORY),
  };

  // Build merged arrays
  const existingTransactions = readKey(KEYS.TRANSACTIONS, []);
  const existingSessions = readKey(KEYS.SESSIONS, []);
  const existingCategories = readKey(KEYS.CATEGORIES, { categories: [] });
  const existingInventory = readKey(KEYS.INVENTORY, []);

  const mergedTransactions = [
    ...(Array.isArray(existingTransactions) ? existingTransactions : []),
    ...transactionsToAdd,
  ];
  const mergedSessions = [
    ...(Array.isArray(existingSessions) ? existingSessions : []),
    ...sessionsToAdd,
  ];
  const existingCatList = existingCategories?.categories ?? [];
  const mergedCategories = {
    ...existingCategories,
    categories: [...existingCatList, ...categoriesToAdd],
  };
  const mergedInventory = [
    ...(Array.isArray(existingInventory) ? existingInventory : []),
    ...inventoryToAdd,
  ];

  // Attempt atomic write
  try {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(mergedTransactions));
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(mergedSessions));
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(mergedCategories));
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(mergedInventory));
    return { success: true, error: null };
  } catch {
    // Rollback: restore all keys from backup
    for (const [key, value] of Object.entries(backup)) {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Best-effort rollback
        }
      }
    }
    return { success: false, error: 'Merge gagal: penyimpanan tidak mencukupi' };
  }
}
