/* ═══════════════════════════════════════════════════════════
   Migration Utility — ClearTask
   Migrates existing localStorage data to IndexedDB (Dexie).
   Runs once on first load; idempotent (safe to re-run).
   ═══════════════════════════════════════════════════════════ */

import db from '../services/db';

const MIGRATION_FLAG = 'cleartask_migrated_to_idb';
const SEQ_KEY = 'cleartask_seq';

/**
 * Check if migration has already been performed.
 * Checks localStorage first (fast), then falls back to IndexedDB meta.
 * @returns {boolean}
 */
export function isMigrated(): boolean {
  try {
    return localStorage.getItem(MIGRATION_FLAG) === 'true';
  } catch {
    return false;
  }
}

/**
 * Check if migration flag exists in IndexedDB meta table.
 * Used as a backup check when localStorage has been cleared.
 * @returns {Promise<boolean>}
 */
async function isMigratedInDB(): Promise<boolean> {
  try {
    const record = await db.meta.get({ key: MIGRATION_FLAG });
    return record?.value === 'true';
  } catch {
    return false;
  }
}

/**
 * Read and parse a localStorage key safely.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Migrate all data from localStorage to IndexedDB.
 * This function is idempotent — calling it multiple times is safe.
 *
 * Strategy:
 * 1. Read all data from localStorage
 * 2. Write to IndexedDB inside a transaction
 * 3. Set migration flag in localStorage
 * 4. Do NOT delete localStorage data (kept as backup)
 *
 * @returns {Promise<{ success: boolean, counts: object, error: string|null }>}
 */
export interface MigrationResult {
  success: boolean;
  counts: Record<string, number>;
  error: string | null;
  skipped?: boolean;
}

export async function migrateToIndexedDB(): Promise<MigrationResult> {
  // Skip if already migrated (localStorage flag)
  if (isMigrated()) {
    return { success: true, counts: {}, error: null, skipped: true };
  }

  // Bug #3 fix: also check IndexedDB backup flag in case localStorage was cleared.
  // This prevents re-running migration and wiping existing IndexedDB data.
  if (await isMigratedInDB()) {
    // Restore the localStorage flag so future checks are fast
    try {
      localStorage.setItem(MIGRATION_FLAG, 'true');
    } catch {
      /* ignore */
    }
    return { success: true, counts: {}, error: null, skipped: true };
  }

  try {
    // ── 1. Read all localStorage data ──
    const transactions = readLS('cleartask_transactions', []);
    const sessions = readLS('cleartask_sessions', []);
    const categoriesData = readLS('cleartask_categories', { categories: [], subCategories: {} });
    const inventory = readLS('cleartask_inventory', []);
    const settings = readLS('cleartask_settings', null);
    const seq = parseInt(localStorage.getItem(SEQ_KEY) || '0', 10);

    // Bug #3 fix: if localStorage has no data to migrate, skip the destructive
    // clear+insert cycle entirely. Just mark as migrated and initialize defaults.
    const hasLocalData =
      (Array.isArray(transactions) && transactions.length > 0) ||
      (Array.isArray(sessions) && sessions.length > 0) ||
      (Array.isArray(inventory) && inventory.length > 0) ||
      settings !== null;

    if (!hasLocalData) {
      // No legacy data — just initialize defaults and mark done
      const existingSettings = await db.settings.get({ key: 'main' });
      if (!existingSettings) {
        await db.settings.add({
          key: 'main',
          kasirName: 'Admin',
          tokoName: '',
          theme: 'dark',
          accentColor: '#00ffa3',
        });
      }
      const existingSeq = await db.meta.get({ key: 'seq' });
      if (!existingSeq) {
        await db.meta.add({ key: 'seq', value: 0 });
      }
      try {
        localStorage.setItem(MIGRATION_FLAG, 'true');
      } catch {
        /* ignore */
      }
      try {
        await db.meta.put({ key: MIGRATION_FLAG, value: 'true' });
      } catch {
        /* ignore */
      }
      return { success: true, skipped: true, counts: {}, error: null };
    }

    // ── 2. Write to IndexedDB in a single transaction ──
    await db.transaction(
      'rw',
      [db.transactions, db.sessions, db.inventory, db.categories, db.settings, db.meta],
      async () => {
        // Clear existing data (idempotent reset)
        await Promise.all([
          db.transactions.clear(),
          db.sessions.clear(),
          db.inventory.clear(),
          db.categories.clear(),
          db.settings.clear(),
          db.meta.clear(),
        ]);

        // Bulk insert transactions
        if (Array.isArray(transactions) && transactions.length > 0) {
          // Strip the old numeric 'id' field — Dexie auto-generates a new one.
          // legacyId is intentionally NOT preserved (migration-report.md W6-1).
          const txData = transactions.map((tx: any) => {
            const { id: _oldId, legacyId: _legacyId, ...rest } = tx;
            return rest;
          });
          await db.transactions.bulkAdd(txData);
        }

        // Bulk insert sessions
        if (Array.isArray(sessions) && sessions.length > 0) {
          const sessionData = sessions.map((s: any, idx: number) => ({
            ...s,
            id: s.id || `legacy-session-${Date.now()}-${idx}`,
          }));
          await db.sessions.bulkPut(sessionData);
        }

        // Bulk insert inventory
        if (Array.isArray(inventory) && inventory.length > 0) {
          const invData = inventory.map((inv: any, idx: number) => ({
            ...inv,
            id: inv.id || `legacy-inv-${Date.now()}-${idx}`,
          }));
          await db.inventory.bulkPut(invData);
        }

        // Store categories as a single keyed document
        await db.categories.put({
          key: 'main',
          categories: categoriesData?.categories ?? [],
          subCategories: categoriesData?.subCategories ?? {},
        });

        // Store settings as a single keyed document
        if (settings) {
          await db.settings.put({ key: 'main', ...(settings as object) });
        } else {
          await db.settings.put({
            key: 'main',
            kasirName: 'Admin',
            tokoName: '',
            theme: 'dark',
            accentColor: '#00ffa3',
          });
        }

        // Store sequence counter
        await db.meta.put({ key: 'seq', value: seq });
      }
    );

    // ── 3. Mark migration as complete ──
    // Store flag in both localStorage AND IndexedDB meta table.
    // If localStorage is cleared, the IndexedDB flag acts as backup
    // preventing duplicate migration (migration-report.md W6-3).
    try {
      localStorage.setItem(MIGRATION_FLAG, 'true');
    } catch {
      // If localStorage is full, we still migrated successfully
    }
    // Backup flag in IndexedDB meta (survives localStorage.clear())
    try {
      await db.meta.put({ key: MIGRATION_FLAG, value: 'true' });
    } catch {
      // Non-fatal — localStorage flag is the primary check
    }

    return {
      success: true,
      skipped: false,
      counts: {
        transactions: Array.isArray(transactions) ? transactions.length : 0,
        sessions: Array.isArray(sessions) ? sessions.length : 0,
        inventory: Array.isArray(inventory) ? inventory.length : 0,
        categories: categoriesData?.categories?.length ?? 0,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('[Migration] Failed:', err);
    return {
      success: false,
      skipped: false,
      counts: {},
      error: err.message || 'Migration failed',
    };
  }
}
