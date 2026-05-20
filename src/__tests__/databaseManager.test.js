/* ═══════════════════════════════════════════════════════════
   databaseManager.test.js — ClearTask
   Unit tests + Property-based tests for databaseManager.js
   Feature: session-database
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ── Mock file-saver so tests don't trigger actual downloads ──
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

import { saveAs } from 'file-saver';
import {
  exportDatabase,
  validateImport,
  calculateMerge,
  applyMerge,
} from '../utils/databaseManager';

// ── localStorage mock helpers ─────────────────────────────

function setupLocalStorage(data = {}) {
  const store = { ...data };
  const mock = {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
    _store: store,
  };
  vi.stubGlobal('localStorage', mock);
  return mock;
}

function teardownLocalStorage() {
  vi.unstubAllGlobals();
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
  metadata: { totalTransactions: 1, totalSessions: 1, deviceInfo: 'test-agent' },
};

// ═══════════════════════════════════════════════════════════
// exportDatabase()
// ═══════════════════════════════════════════════════════════

describe('exportDatabase()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    teardownLocalStorage();
  });

  it('memanggil saveAs dengan Blob dan nama file format ClearTask_DB_YYYY-MM-DD.json', async () => {
    setupLocalStorage({
      cleartask_transactions: JSON.stringify([sampleTransaction]),
      cleartask_sessions: JSON.stringify([sampleSession]),
      cleartask_categories: JSON.stringify(sampleCategories),
    });

    await exportDatabase();

    expect(saveAs).toHaveBeenCalledOnce();
    const [blob, filename] = saveAs.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
    expect(filename).toMatch(/^ClearTask_DB_\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('localStorage kosong → menghasilkan file JSON dengan array/objek kosong', async () => {
    setupLocalStorage({});

    await exportDatabase();

    expect(saveAs).toHaveBeenCalledOnce();
    const [blob] = saveAs.mock.calls[0];
    const text = await blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.transactions).toEqual([]);
    expect(parsed.sessions).toEqual([]);
    expect(parsed.categories).toEqual({ categories: [] });
    expect(parsed.version).toBe('1.0');
    expect(parsed.exportedAt).toBeTruthy();
  });

  it('data lengkap → DatabaseExport memiliki semua field yang benar', async () => {
    setupLocalStorage({
      cleartask_transactions: JSON.stringify([sampleTransaction]),
      cleartask_sessions: JSON.stringify([sampleSession]),
      cleartask_categories: JSON.stringify(sampleCategories),
    });

    await exportDatabase();

    const [blob] = saveAs.mock.calls[0];
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
  it('JSON tidak valid → valid: false dengan pesan error yang sesuai', () => {
    const result = validateImport('not-json{{{');
    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBe('File tidak dapat dibaca: format JSON tidak valid');
  });

  it('field wajib hilang (version) → valid: false', () => {
    const data = { exportedAt: '2025-01-01', transactions: [], sessions: [] };
    const result = validateImport(JSON.stringify(data));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File tidak valid: struktur data tidak dikenali');
  });

  it('field wajib hilang (exportedAt) → valid: false', () => {
    const data = { version: '1.0', transactions: [], sessions: [] };
    const result = validateImport(JSON.stringify(data));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File tidak valid: struktur data tidak dikenali');
  });

  it('field wajib hilang (transactions) → valid: false', () => {
    const data = { version: '1.0', exportedAt: '2025-01-01', sessions: [] };
    const result = validateImport(JSON.stringify(data));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File tidak valid: struktur data tidak dikenali');
  });

  it('field wajib hilang (sessions) → valid: false', () => {
    const data = { version: '1.0', exportedAt: '2025-01-01', transactions: [] };
    const result = validateImport(JSON.stringify(data));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File tidak valid: struktur data tidak dikenali');
  });

  it('transactions bukan array → valid: false', () => {
    const data = { version: '1.0', exportedAt: '2025-01-01', transactions: 'not-array', sessions: [] };
    const result = validateImport(JSON.stringify(data));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File tidak valid: format data transaksi atau sesi tidak dikenali');
  });

  it('sessions bukan array → valid: false', () => {
    const data = { version: '1.0', exportedAt: '2025-01-01', transactions: [], sessions: { id: 1 } };
    const result = validateImport(JSON.stringify(data));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File tidak valid: format data transaksi atau sesi tidak dikenali');
  });

  it('data valid → valid: true, data berisi objek yang di-parse', () => {
    const result = validateImport(JSON.stringify(validExportData));
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ version: '1.0' });
    expect(result.data.transactions).toHaveLength(1);
  });

  it('string kosong → valid: false', () => {
    const result = validateImport('');
    expect(result.valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// calculateMerge()
// ═══════════════════════════════════════════════════════════

describe('calculateMerge()', () => {
  afterEach(() => {
    teardownLocalStorage();
  });

  it('semua data baru → newTransactions, newSessions, newCategories sesuai jumlah impor', () => {
    setupLocalStorage({});

    const result = calculateMerge(validExportData);

    expect(result.newTransactions).toBe(1);
    expect(result.newSessions).toBe(1);
    expect(result.newCategories).toBe(2);
    expect(result.skipped).toBe(0);
  });

  it('semua duplikat → newTransactions=0, skipped=jumlah total item', () => {
    setupLocalStorage({
      cleartask_transactions: JSON.stringify([sampleTransaction]),
      cleartask_sessions: JSON.stringify([sampleSession]),
      cleartask_categories: JSON.stringify(sampleCategories),
    });

    const result = calculateMerge(validExportData);

    expect(result.newTransactions).toBe(0);
    expect(result.newSessions).toBe(0);
    expect(result.newCategories).toBe(0);
    expect(result.skipped).toBe(4); // 1 tx + 1 session + 2 categories
  });

  it('campuran baru dan duplikat → hitungan akurat', () => {
    const existingTx = { ...sampleTransaction, transactionId: 'TRX-EXISTING' };
    setupLocalStorage({
      cleartask_transactions: JSON.stringify([existingTx]),
      cleartask_sessions: JSON.stringify([sampleSession]),
      cleartask_categories: JSON.stringify({ categories: ['Makanan'] }),
    });

    const importData = {
      ...validExportData,
      transactions: [sampleTransaction, existingTx], // 1 new, 1 dup
      sessions: [sampleSession, { id: 'session-new', nama: 'Shift Baru', tanggalMulai: '2025-07-15', status: 'aktif' }], // 1 dup, 1 new
      categories: { categories: ['Makanan', 'Minuman', 'Snack'] }, // 1 dup, 2 new
    };

    const result = calculateMerge(importData);

    expect(result.newTransactions).toBe(1);
    expect(result.newSessions).toBe(1);
    expect(result.newCategories).toBe(2);
    expect(result.skipped).toBe(3); // 1 tx + 1 session + 1 category
  });

  it('orphan transactions → dihitung dengan benar', () => {
    setupLocalStorage({});

    const orphanTx = { ...sampleTransaction, transactionId: 'TRX-ORPHAN', sessionId: 'non-existent-session' };
    const importData = {
      ...validExportData,
      transactions: [orphanTx],
      sessions: [], // no sessions imported
    };

    const result = calculateMerge(importData);

    expect(result.orphanTransactions).toBe(1);
  });

  it('tidak mengubah localStorage', () => {
    const lsMock = setupLocalStorage({
      cleartask_transactions: JSON.stringify([sampleTransaction]),
    });

    calculateMerge(validExportData);

    expect(lsMock.setItem).not.toHaveBeenCalled();
  });

  it('kategori perbandingan case-insensitive', () => {
    setupLocalStorage({
      cleartask_categories: JSON.stringify({ categories: ['makanan'] }), // lowercase
    });

    const importData = {
      ...validExportData,
      categories: { categories: ['Makanan', 'Minuman'] }, // Makanan = dup (case-insensitive)
    };

    const result = calculateMerge(importData);

    expect(result.newCategories).toBe(1); // only Minuman is new
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════
// applyMerge()
// ═══════════════════════════════════════════════════════════

describe('applyMerge()', () => {
  afterEach(() => {
    teardownLocalStorage();
  });

  it('merge berhasil → success: true, data baru tersimpan di localStorage', () => {
    setupLocalStorage({});

    const result = applyMerge(validExportData);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();

    const storedTx = JSON.parse(localStorage.getItem('cleartask_transactions'));
    expect(storedTx).toHaveLength(1);
    expect(storedTx[0].transactionId).toBe('TRX-00001');

    const storedSessions = JSON.parse(localStorage.getItem('cleartask_sessions'));
    expect(storedSessions).toHaveLength(1);
    expect(storedSessions[0].id).toBe('session-001');
  });

  it('merge berhasil → tidak ada duplikat setelah merge', () => {
    setupLocalStorage({
      cleartask_transactions: JSON.stringify([sampleTransaction]),
    });

    applyMerge(validExportData); // apply same data again

    const storedTx = JSON.parse(localStorage.getItem('cleartask_transactions'));
    const ids = storedTx.map((tx) => tx.transactionId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('rollback saat localStorage.setItem melempar error → success: false, data tidak berubah', () => {
    const originalTx = [sampleTransaction];
    const lsMock = setupLocalStorage({
      cleartask_transactions: JSON.stringify(originalTx),
      cleartask_sessions: JSON.stringify([sampleSession]),
      cleartask_categories: JSON.stringify(sampleCategories),
    });

    // Make setItem throw on first call
    let callCount = 0;
    lsMock.setItem.mockImplementation((key, value) => {
      callCount++;
      if (callCount === 1) {
        throw new Error('QuotaExceededError');
      }
      lsMock._store[key] = value;
    });

    const newTx = { ...sampleTransaction, transactionId: 'TRX-NEW', id: 99 };
    const importData = { ...validExportData, transactions: [newTx], sessions: [], categories: { categories: [] } };

    const result = applyMerge(importData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Merge gagal: penyimpanan tidak mencukupi');

    // Data should be rolled back to original
    const storedTx = JSON.parse(lsMock._store['cleartask_transactions'] ?? 'null');
    expect(storedTx).toEqual(originalTx);
  });

  it('applyMerge tidak menyentuh cleartask_settings', () => {
    const lsMock = setupLocalStorage({
      cleartask_settings: JSON.stringify({ theme: 'dark' }),
    });

    applyMerge(validExportData);

    // settings should never be written
    const settingsCalls = lsMock.setItem.mock.calls.filter(([key]) => key === 'cleartask_settings');
    expect(settingsCalls).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS
// Feature: session-database
// ═══════════════════════════════════════════════════════════

// ── Arbitraries ───────────────────────────────────────────

// Unique-ID string that won't collide with fixed fixtures
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

const categoryNameArb = fc.string({ minLength: 1, maxLength: 15 }).filter((s) => s.trim().length > 0);

function makeExportData(transactions, sessions, categoryNames) {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    transactions,
    sessions,
    categories: { categories: categoryNames },
    metadata: {
      totalTransactions: transactions.length,
      totalSessions: sessions.length,
      deviceInfo: 'test',
    },
  };
}

// ── Property 1: Round-Trip Export-Import ──────────────────
// Validates: Requirements 1.3, 1.6

describe('Property 1: Round-Trip Export-Import', () => {
  afterEach(() => {
    teardownLocalStorage();
    vi.clearAllMocks();
  });

  it('export lalu parse JSON menghasilkan data identik dengan yang ada di localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionArb, { maxLength: 5 }),
        fc.array(sessionArb, { maxLength: 3 }),
        fc.array(categoryNameArb, { maxLength: 5 }),
        async (transactions, sessions, categoryNames) => {
          vi.clearAllMocks();
          setupLocalStorage({
            cleartask_transactions: JSON.stringify(transactions),
            cleartask_sessions: JSON.stringify(sessions),
            cleartask_categories: JSON.stringify({ categories: categoryNames }),
          });

          await exportDatabase();

          const [blob] = saveAs.mock.calls[0];
          const text = await blob.text();
          const parsed = JSON.parse(text);

          expect(parsed.transactions).toEqual(transactions);
          expect(parsed.sessions).toEqual(sessions);
          expect(parsed.categories.categories).toEqual(categoryNames);
          expect(parsed.version).toBe('1.0');

          teardownLocalStorage();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 2: Validasi Menolak Semua Struktur Tidak Valid ──
// Validates: Requirements 2.2, 2.4, 2.6, 2.8, 2.9

describe('Property 2: Validasi Menolak Semua Struktur Tidak Valid', () => {
  it('objek JSON tanpa setidaknya satu field wajib → valid: false', () => {
    const requiredFields = ['version', 'exportedAt', 'transactions', 'sessions'];

    fc.assert(
      fc.property(
        // Generate a subset of required fields to OMIT (at least 1)
        fc.subarray(requiredFields, { minLength: 1 }),
        (fieldsToOmit) => {
          const base = {
            version: '1.0',
            exportedAt: '2025-01-01T00:00:00.000Z',
            transactions: [],
            sessions: [],
          };
          fieldsToOmit.forEach((f) => delete base[f]);

          const result = validateImport(JSON.stringify(base));
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('transactions atau sessions bukan array → valid: false', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // transactions is not an array
          fc.record({
            version: fc.constant('1.0'),
            exportedAt: fc.constant('2025-01-01'),
            transactions: fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.object()),
            sessions: fc.constant([]),
          }),
          // sessions is not an array
          fc.record({
            version: fc.constant('1.0'),
            exportedAt: fc.constant('2025-01-01'),
            transactions: fc.constant([]),
            sessions: fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.object()),
          })
        ),
        (data) => {
          const result = validateImport(JSON.stringify(data));
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Merge Tidak Menghasilkan Duplikat ─────────
// Validates: Requirements 3.2, 3.3, 9.1, 9.2

describe('Property 3: Merge Tidak Menghasilkan Duplikat', () => {
  afterEach(() => {
    teardownLocalStorage();
  });

  it('setelah applyMerge, tidak ada dua transaksi dengan transactionId sama', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { maxLength: 5 }),
        fc.array(transactionArb, { maxLength: 5 }),
        fc.array(sessionArb, { maxLength: 3 }),
        (existingTxs, importTxs, importSessions) => {
          // Ensure unique transactionIds within each array
          const uniqueExisting = existingTxs.filter(
            (tx, i, arr) => arr.findIndex((t) => t.transactionId === tx.transactionId) === i
          );
          const uniqueImport = importTxs.filter(
            (tx, i, arr) => arr.findIndex((t) => t.transactionId === tx.transactionId) === i
          );

          setupLocalStorage({
            cleartask_transactions: JSON.stringify(uniqueExisting),
            cleartask_sessions: JSON.stringify([]),
            cleartask_categories: JSON.stringify({ categories: [] }),
          });

          const importData = makeExportData(uniqueImport, importSessions, []);
          applyMerge(importData);

          const stored = JSON.parse(localStorage.getItem('cleartask_transactions') ?? '[]');
          const ids = stored.map((tx) => tx.transactionId);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);

          teardownLocalStorage();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('setelah applyMerge, tidak ada dua sesi dengan id sama', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { maxLength: 4 }),
        fc.array(sessionArb, { maxLength: 4 }),
        (existingSessions, importSessions) => {
          const uniqueExisting = existingSessions.filter(
            (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
          );
          const uniqueImport = importSessions.filter(
            (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
          );

          setupLocalStorage({
            cleartask_transactions: JSON.stringify([]),
            cleartask_sessions: JSON.stringify(uniqueExisting),
            cleartask_categories: JSON.stringify({ categories: [] }),
          });

          const importData = makeExportData([], uniqueImport, []);
          applyMerge(importData);

          const stored = JSON.parse(localStorage.getItem('cleartask_sessions') ?? '[]');
          const ids = stored.map((s) => s.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);

          teardownLocalStorage();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 4: Merge Bersifat Idempoten ─────────────────
// Validates: Requirements 3.1, 3.2, 3.3

describe('Property 4: Merge Bersifat Idempoten', () => {
  afterEach(() => {
    teardownLocalStorage();
  });

  it('applyMerge dua kali menghasilkan state identik dengan satu kali', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { maxLength: 4 }),
        fc.array(sessionArb, { maxLength: 3 }),
        fc.array(categoryNameArb, { maxLength: 4 }),
        (transactions, sessions, categories) => {
          // Deduplicate
          const uniqueTx = transactions.filter(
            (tx, i, arr) => arr.findIndex((t) => t.transactionId === tx.transactionId) === i
          );
          const uniqueSessions = sessions.filter(
            (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
          );
          const uniqueCategories = [...new Set(categories)];

          setupLocalStorage({
            cleartask_transactions: JSON.stringify([]),
            cleartask_sessions: JSON.stringify([]),
            cleartask_categories: JSON.stringify({ categories: [] }),
          });

          const importData = makeExportData(uniqueTx, uniqueSessions, uniqueCategories);

          // First apply
          applyMerge(importData);
          const afterFirst = {
            tx: localStorage.getItem('cleartask_transactions'),
            sessions: localStorage.getItem('cleartask_sessions'),
            categories: localStorage.getItem('cleartask_categories'),
          };

          // Second apply (same data)
          applyMerge(importData);
          const afterSecond = {
            tx: localStorage.getItem('cleartask_transactions'),
            sessions: localStorage.getItem('cleartask_sessions'),
            categories: localStorage.getItem('cleartask_categories'),
          };

          // Parse and compare (order may differ, so compare sets)
          const txFirst = JSON.parse(afterFirst.tx ?? '[]').map((t) => t.transactionId).sort();
          const txSecond = JSON.parse(afterSecond.tx ?? '[]').map((t) => t.transactionId).sort();
          expect(txFirst).toEqual(txSecond);

          const sessFirst = JSON.parse(afterFirst.sessions ?? '[]').map((s) => s.id).sort();
          const sessSecond = JSON.parse(afterSecond.sessions ?? '[]').map((s) => s.id).sort();
          expect(sessFirst).toEqual(sessSecond);

          teardownLocalStorage();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 5: Batal Tidak Mengubah Data ────────────────
// Validates: Requirements 3.1, 4.7

describe('Property 5: Batal Tidak Mengubah Data (calculateMerge tidak menulis)', () => {
  afterEach(() => {
    teardownLocalStorage();
  });

  it('calculateMerge tidak mengubah localStorage sama sekali', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { maxLength: 4 }),
        fc.array(sessionArb, { maxLength: 3 }),
        fc.array(transactionArb, { maxLength: 4 }),
        fc.array(sessionArb, { maxLength: 3 }),
        (existingTx, existingSessions, importTx, importSessions) => {
          const uniqueExistingTx = existingTx.filter(
            (tx, i, arr) => arr.findIndex((t) => t.transactionId === tx.transactionId) === i
          );
          const uniqueExistingSessions = existingSessions.filter(
            (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
          );

          const lsMock = setupLocalStorage({
            cleartask_transactions: JSON.stringify(uniqueExistingTx),
            cleartask_sessions: JSON.stringify(uniqueExistingSessions),
            cleartask_categories: JSON.stringify({ categories: [] }),
          });

          const importData = makeExportData(importTx, importSessions, []);
          calculateMerge(importData);

          // setItem must never be called
          expect(lsMock.setItem).not.toHaveBeenCalled();

          teardownLocalStorage();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 6: Settings Tidak Tersentuh Saat Merge ──────
// Validates: Requirements 3.5

describe('Property 6: Settings Tidak Tersentuh Saat Merge', () => {
  afterEach(() => {
    teardownLocalStorage();
  });

  it('applyMerge tidak pernah membaca atau menulis cleartask_settings', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { maxLength: 3 }),
        fc.array(sessionArb, { maxLength: 2 }),
        fc.record({ theme: fc.constantFrom('dark', 'light'), kasirName: fc.string() }),
        (transactions, sessions, settings) => {
          const lsMock = setupLocalStorage({
            cleartask_settings: JSON.stringify(settings),
          });

          const importData = makeExportData(transactions, sessions, []);
          applyMerge(importData);

          // setItem must never be called with cleartask_settings
          const settingsWrites = lsMock.setItem.mock.calls.filter(
            ([key]) => key === 'cleartask_settings'
          );
          expect(settingsWrites).toHaveLength(0);

          // getItem for settings should not be called either
          const settingsReads = lsMock.getItem.mock.calls.filter(
            ([key]) => key === 'cleartask_settings'
          );
          expect(settingsReads).toHaveLength(0);

          teardownLocalStorage();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 7: Atomicity Merge — Rollback Sempurna ──────
// Validates: Requirements 4.8, 9.5

describe('Property 7: Atomicity Merge — Rollback Sempurna', () => {
  afterEach(() => {
    teardownLocalStorage();
  });

  it('jika setItem gagal pada write ke-N, semua key kembali ke kondisi sebelum merge', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { maxLength: 3 }),
        fc.array(sessionArb, { maxLength: 2 }),
        fc.integer({ min: 1, max: 3 }), // which write call to fail (1, 2, or 3)
        (existingTx, existingSessions, failOnCall) => {
          const uniqueTx = existingTx.filter(
            (tx, i, arr) => arr.findIndex((t) => t.transactionId === tx.transactionId) === i
          );
          const uniqueSessions = existingSessions.filter(
            (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
          );

          const originalTxStr = JSON.stringify(uniqueTx);
          const originalSessionsStr = JSON.stringify(uniqueSessions);
          const originalCategoriesStr = JSON.stringify({ categories: [] });

          const lsMock = setupLocalStorage({
            cleartask_transactions: originalTxStr,
            cleartask_sessions: originalSessionsStr,
            cleartask_categories: originalCategoriesStr,
          });

          let callCount = 0;
          lsMock.setItem.mockImplementation((key, value) => {
            callCount++;
            if (callCount === failOnCall) {
              throw new Error('QuotaExceededError');
            }
            lsMock._store[key] = value;
          });

          // Import data with new items to trigger actual writes
          const newTx = { ...uniqueTx[0] ?? sampleTransaction, transactionId: 'TRX-ROLLBACK-TEST' };
          const importData = makeExportData([newTx], [], []);

          const result = applyMerge(importData);

          expect(result.success).toBe(false);

          // All keys must be restored to original values
          expect(lsMock._store['cleartask_transactions']).toBe(originalTxStr);
          expect(lsMock._store['cleartask_sessions']).toBe(originalSessionsStr);
          expect(lsMock._store['cleartask_categories']).toBe(originalCategoriesStr);

          teardownLocalStorage();
        }
      ),
      { numRuns: 100 }
    );
  });
});
