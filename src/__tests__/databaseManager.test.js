/* ═══════════════════════════════════════════════════════════
   databaseManager.test.js — ClearTask
   Unit tests + Property-based tests for databaseManager.js
   Feature: session-database
   (Refactored for Async Dexie)
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import 'fake-indexeddb/auto';
import db from '../services/db';

// ── Mock downloadHelper so triggerDownload is interceptable in ESM ──
let capturedBlob = null;
let capturedFilename = null;

vi.mock('../utils/downloadHelper', () => ({
  triggerDownload: vi.fn((blob, filename) => {
    capturedBlob = blob;
    capturedFilename = filename;
  }),
}));

// Helper to get captured blob/filename
function getCapturedDownload() {
  return [capturedBlob, capturedFilename];
}

import {
  exportDatabase,
  validateImport,
  calculateMerge,
  applyMerge,
} from '../services/databaseManager';

// ── Dexie Setup Helper ────────────────────────────────────

async function setupDexie(data = {}) {
  await db.transactions.clear();
  await db.sessions.clear();
  await db.categories.clear();
  await db.inventory.clear();

  if (data.cleartask_transactions) {
    const txs =
      typeof data.cleartask_transactions === 'string'
        ? JSON.parse(data.cleartask_transactions)
        : data.cleartask_transactions;
    if (txs.length) await db.transactions.bulkAdd(txs);
  }
  if (data.cleartask_sessions) {
    const sessions =
      typeof data.cleartask_sessions === 'string'
        ? JSON.parse(data.cleartask_sessions)
        : data.cleartask_sessions;
    if (sessions.length) await db.sessions.bulkAdd(sessions);
  }
  if (data.cleartask_categories) {
    const cats =
      typeof data.cleartask_categories === 'string'
        ? JSON.parse(data.cleartask_categories)
        : data.cleartask_categories;
    await db.categories.put({ id: 1, key: 'main', categories: cats.categories });
  }
  if (data.cleartask_inventory) {
    const inv =
      typeof data.cleartask_inventory === 'string'
        ? JSON.parse(data.cleartask_inventory)
        : data.cleartask_inventory;
    if (inv.length) await db.inventory.bulkAdd(inv);
  }
}

// ── Fixtures ──────────────────────────────────────────────

const sampleTransaction = {
  id: 1,
  transactionId: 'TRX-00001',
  tanggal: '2025-07-14',
  createdAt: '2025-07-14T08:30:00.000Z',
  kasir: 'Admin',
  kategori: 'Makanan',
  namaBarang: 'Nasi Goreng',
  qty: 2,
  hargaSatuan: 15000,
  total: 30000,
  metode: 'Tunai',
  catatan: '',
  status: 'Selesai',
  sessionId: 'session-001',
};

const sampleSession = {
  id: 'session-001',
  nama: 'Shift Pagi',
  tanggalMulai: '2025-07-14',
  waktuMulai: '2025-07-14T01:00:00.000Z',
  tanggalTutup: '2025-07-14T05:00:00.000Z',
  waktuTutup: '2025-07-14T05:00:00.000Z',
  status: 'ditutup',
};

const sampleCategories = { categories: ['Makanan', 'Minuman'] };

const validExportData = {
  version: '1.0',
  exportedAt: '2025-07-14T08:30:00.000Z',
  transactions: [sampleTransaction],
  sessions: [sampleSession],
  categories: sampleCategories,
  inventory: [],
  metadata: { totalTransactions: 1, totalSessions: 1, totalInventory: 0, deviceInfo: 'test-agent' },
};

// ═══════════════════════════════════════════════════════════
// exportDatabase()
// ═══════════════════════════════════════════════════════════

describe('exportDatabase()', () => {
  beforeEach(async () => {
    capturedBlob = null;
    capturedFilename = null;
    await setupDexie();
  });

  it('memanggil triggerDownload dengan Blob dan nama file format ClearTask_DB_YYYY-MM-DD.json', async () => {
    await setupDexie({
      cleartask_transactions: [sampleTransaction],
      cleartask_sessions: [sampleSession],
      cleartask_categories: sampleCategories,
    });

    await exportDatabase();

    const [blob, filename] = getCapturedDownload();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
    expect(filename).toMatch(/^ClearTask_DB_\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('db kosong → menghasilkan file JSON dengan array/objek kosong', async () => {
    await setupDexie({});

    await exportDatabase();

    const [blob] = getCapturedDownload();
    const text = await blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.transactions).toEqual([]);
    expect(parsed.sessions).toEqual([]);
    expect(parsed.categories).toEqual({ categories: [] });
    expect(parsed.version).toBe('1.0');
    expect(parsed.exportedAt).toBeTruthy();
  });

  it('data lengkap → DatabaseExport memiliki semua field yang benar', async () => {
    await setupDexie({
      cleartask_transactions: [sampleTransaction],
      cleartask_sessions: [sampleSession],
      cleartask_categories: sampleCategories,
    });

    await exportDatabase();

    const [blob] = getCapturedDownload();
    const text = await blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.version).toBe('1.0');
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.transactions[0].transactionId).toBe('TRX-00001');
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.sessions[0].id).toBe('session-001');
    expect(parsed.categories.categories).toEqual(['Makanan', 'Minuman']);
    expect(parsed.metadata.totalTransactions).toBe(1);
    expect(parsed.metadata.totalSessions).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════
// validateImport()
// ═══════════════════════════════════════════════════════════

describe('validateImport()', () => {
  it('JSON tidak valid → valid: false', () => {
    const result = validateImport('not-json{{{');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/format JSON tidak valid/);
  });

  it('missing required fields → valid: false', () => {
    const data = { version: '1.0' }; // missing transactions, dll
    const result = validateImport(JSON.stringify(data));
    expect(result.valid).toBe(false);
  });

  it('versi salah → valid: false', () => {
    const data = { ...validExportData, version: '2.0' };
    const result = validateImport(JSON.stringify(data));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/versi database tidak didukung/);
  });

  it('tipe data salah → valid: false', () => {
    const data = { ...validExportData, transactions: {} }; // should be array
    const result = validateImport(JSON.stringify(data));
    expect(result.valid).toBe(false);
  });

  it('JSON valid → valid: true', () => {
    const result = validateImport(JSON.stringify(validExportData));
    expect(result.valid).toBe(true);
    expect(result.data).toEqual(validExportData);
  });
});

// ═══════════════════════════════════════════════════════════
// calculateMerge()
// ═══════════════════════════════════════════════════════════

describe('calculateMerge()', () => {
  beforeEach(async () => {
    await setupDexie({});
  });

  it('import ke database kosong → semua record adalah baru', async () => {
    const result = await calculateMerge(validExportData);
    expect(result.newTransactions).toBe(1);
    expect(result.newSessions).toBe(1);
    expect(result.newCategories).toBe(2);
    expect(result.skipped).toBe(0);
  });

  it('database ada isinya → pisahkan duplikat dan data baru', async () => {
    const existingTx = { ...sampleTransaction, transactionId: 'TRX-EXISTING', id: 2 };
    await setupDexie({
      cleartask_transactions: [existingTx],
      cleartask_sessions: [sampleSession],
      cleartask_categories: { categories: ['Makanan'] },
    });

    const importData = {
      ...validExportData,
      transactions: [sampleTransaction, existingTx], // 1 new, 1 dup
      sessions: [
        sampleSession,
        { id: 'session-new', nama: 'Shift Baru', tanggalMulai: '2025-07-15', status: 'aktif' },
      ], // 1 dup, 1 new
      categories: { categories: ['Makanan', 'Minuman', 'Snack'] }, // 1 dup, 2 new
    };

    const result = await calculateMerge(importData);

    expect(result.newTransactions).toBe(1);
    expect(result.newSessions).toBe(1);
    expect(result.newCategories).toBe(2);
    expect(result.skipped).toBe(3); // 1 tx + 1 session + 1 category
  });

  it('orphan transactions → dihitung dengan benar', async () => {
    const orphanTx = {
      ...sampleTransaction,
      transactionId: 'TRX-ORPHAN',
      sessionId: 'non-existent-session',
      id: 3,
    };
    const importData = {
      ...validExportData,
      transactions: [orphanTx],
      sessions: [], // no sessions imported
    };

    const result = await calculateMerge(importData);

    expect(result.orphanTransactions).toBe(1);
  });

  it('kategori perbandingan case-insensitive', async () => {
    await setupDexie({
      cleartask_categories: { categories: ['makanan'] }, // lowercase
    });

    const importData = {
      ...validExportData,
      categories: { categories: ['Makanan', 'Minuman'] }, // Makanan = dup
    };

    const result = await calculateMerge(importData);

    expect(result.newCategories).toBe(1); // only Minuman is new
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════
// applyMerge()
// ═══════════════════════════════════════════════════════════

describe('applyMerge()', () => {
  beforeEach(async () => {
    await setupDexie({});
  });

  it('merge berhasil → success: true, data baru tersimpan', async () => {
    const result = await applyMerge(validExportData);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();

    const storedTx = await db.transactions.toArray();
    expect(storedTx).toHaveLength(1);
    expect(storedTx[0].transactionId).toBe('TRX-00001');

    const storedSessions = await db.sessions.toArray();
    expect(storedSessions).toHaveLength(1);
    expect(storedSessions[0].id).toBe('session-001');
  });

  it('merge berhasil → tidak ada duplikat setelah merge', async () => {
    await setupDexie({
      cleartask_transactions: [sampleTransaction],
    });

    await applyMerge(validExportData); // apply same data again

    const storedTx = await db.transactions.toArray();
    const ids = storedTx.map((tx) => tx.transactionId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('rollback saat error → success: false', async () => {
    const originalTx = [{ ...sampleTransaction }];
    await setupDexie({
      cleartask_transactions: originalTx,
      cleartask_sessions: [sampleSession],
    });

    // Make bulkAdd throw to simulate failure
    vi.spyOn(db.transactions, 'bulkAdd').mockRejectedValueOnce(new Error('ConstraintError'));

    const newTx = { ...sampleTransaction, transactionId: 'TRX-NEW', id: 99 };
    const importData = {
      ...validExportData,
      transactions: [newTx],
      sessions: [],
      categories: { categories: [] },
    };

    const result = await applyMerge(importData);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Merge gagal/);

    const storedTx = await db.transactions.toArray();
    expect(storedTx).toEqual(originalTx); // unchanged
  });
});

// ═══════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS
// ═══════════════════════════════════════════════════════════

const txIdArb = fc.string({ minLength: 1, maxLength: 20 }).map((s) => `TX-${s}`);
const sessionIdArb = fc.uuid();

const transactionArb = fc.record({
  transactionId: txIdArb,
  id: fc.integer({ min: 1, max: 99999 }),
  tanggal: fc.constant('2025-01-01'),
  createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
  kasir: fc.string({ minLength: 1, maxLength: 10 }),
  kategori: fc.string({ minLength: 1, maxLength: 10 }),
  namaBarang: fc.string({ minLength: 1, maxLength: 20 }),
  qty: fc.integer({ min: 1, max: 100 }),
  hargaSatuan: fc.integer({ min: 0, max: 100000 }),
  total: fc.integer({ min: 0, max: 10000000 }),
  metode: fc.constantFrom('Tunai', 'QRIS', 'Transfer'),
  catatan: fc.constant(''),
  status: fc.constant('Selesai'),
  sessionId: fc.option(sessionIdArb, { nil: null }),
});

const sessionArb = fc.record({
  id: sessionIdArb,
  nama: fc.string({ minLength: 1, maxLength: 20 }),
  tanggalMulai: fc.constant('2025-01-01'),
  waktuMulai: fc.constant('2025-01-01T00:00:00.000Z'),
  status: fc.constantFrom('aktif', 'ditutup'),
});

const categoryNameArb = fc
  .string({ minLength: 1, maxLength: 15 })
  .filter((s) => s.trim().length > 0);

describe('Property 1: Round-Trip Export-Import', () => {
  beforeEach(async () => {
    capturedBlob = null;
    capturedFilename = null;
    await setupDexie({});
  });

  it('export lalu parse JSON menghasilkan data identik', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(transactionArb, { maxLength: 5, selector: (t) => t.id }),
        fc.uniqueArray(sessionArb, { maxLength: 3, selector: (s) => s.id }),
        fc.array(categoryNameArb, { maxLength: 5 }),
        async (transactions, sessions, categoryNames) => {
          capturedBlob = null;
          capturedFilename = null;
          await setupDexie({
            cleartask_transactions: transactions,
            cleartask_sessions: sessions,
            cleartask_categories: { categories: categoryNames },
          });

          await exportDatabase();

          const [blob] = getCapturedDownload();
          const text = await blob.text();
          const parsed = JSON.parse(text);

          const sortById = (a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0);
          expect(parsed.transactions.sort(sortById)).toEqual([...transactions].sort(sortById));
          expect(parsed.sessions.sort(sortById)).toEqual([...sessions].sort(sortById));
          expect(parsed.categories.categories).toEqual(categoryNames);
          expect(parsed.version).toBe('1.0');
        }
      ),
      { numRuns: 10 }
    );
  });
});
