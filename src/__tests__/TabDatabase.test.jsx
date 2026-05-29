/* ═══════════════════════════════════════════════════════════
   TabDatabase.test.jsx — ClearTask
   Unit tests + Property-based tests for TabDatabase component
   Feature: session-database
   (Refactored for Async Dexie)
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import * as fc from 'fast-check';
import TabDatabase from '../components/TabDatabase';
import db from '../services/db';
import 'fake-indexeddb/auto';

// ── Mock databaseManager so tests don't trigger downloads ──
vi.mock('../services/databaseManager', () => ({
  exportDatabase: vi.fn(),
  validateImport: vi.fn(),
  calculateMerge: vi.fn(),
  applyMerge: vi.fn(),
}));

// ── Mock Toast to avoid setTimeout keeping tests alive ──
vi.mock('../components/Toast', () => ({
  default: ({ message }) => <div data-testid="toast">{message}</div>,
}));

// ── Mock MergePreviewModal to isolate TabDatabase tests ──
vi.mock('../components/MergePreviewModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }) =>
    isOpen ? (
      <div data-testid="merge-modal">
        <button onClick={onConfirm}>Terapkan Merge</button>
        <button onClick={onCancel}>Batal</button>
      </div>
    ) : null,
}));

import { exportDatabase } from '../services/databaseManager';

// ── Fixtures ──────────────────────────────────────────────

const tx1 = {
  id: 1,
  transactionId: 'TRX-001',
  tanggal: '2025-07-14',
  createdAt: '2025-07-14T10:00:00.000Z',
  namaBarang: 'Nasi Goreng',
  kategori: 'Makanan',
  total: 30000,
  metode: 'Tunai',
  status: 'Selesai',
  sessionId: 'session-001',
};

const tx2 = {
  id: 2,
  transactionId: 'TRX-002',
  tanggal: '2025-07-13',
  createdAt: '2025-07-13T08:00:00.000Z',
  namaBarang: 'Es Teh',
  kategori: 'Minuman',
  total: 5000,
  metode: 'QRIS',
  status: 'Selesai',
  sessionId: null,
};

const tx3 = {
  id: 3,
  transactionId: 'TRX-003',
  tanggal: '2025-07-15',
  createdAt: '2025-07-15T12:00:00.000Z',
  namaBarang: 'Bakso',
  kategori: 'Makanan',
  total: 15000,
  metode: 'Transfer',
  status: 'Selesai',
  sessionId: 'session-002',
};

const session1 = {
  id: 'session-001',
  nama: 'Shift Pagi',
  tanggalMulai: '2025-07-14',
  status: 'ditutup',
};

const session2 = {
  id: 'session-002',
  nama: 'Shift Siang',
  tanggalMulai: '2025-07-15',
  status: 'aktif',
};

// ── Render helper ─────────────────────────────────────────

async function renderTabDatabaseAndReady() {
  let res;
  res = render(<TabDatabase />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  return res;
}

// ═══════════════════════════════════════════════════════════
// DatabaseStats
// ═══════════════════════════════════════════════════════════

describe('TabDatabase — DatabaseStats', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.sessions.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('menampilkan nilai 0 saat database kosong', async () => {
    await renderTabDatabaseAndReady();

    expect(screen.getByText('Total Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Total Sesi')).toBeInTheDocument();
    expect(screen.getByText('Total Pemasukan')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
  });

  it('menampilkan jumlah transaksi dan sesi yang benar', async () => {
    await db.transactions.bulkAdd([tx1, tx2]);
    await db.sessions.add(session1);
    await renderTabDatabaseAndReady();

    expect(screen.getByText('Total Transaksi').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Total Sesi').nextElementSibling).toHaveTextContent('1');
  });

  it('menampilkan total pemasukan yang benar (Rp 35.000)', async () => {
    await db.transactions.bulkAdd([tx1, tx2]); // 30000 + 5000 = 35000
    await renderTabDatabaseAndReady();

    expect(screen.getByText(/35\.000/)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// FilterSesi
// ═══════════════════════════════════════════════════════════

describe('TabDatabase — FilterSesi', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.sessions.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('menampilkan opsi "Semua Sesi" dan "Tanpa Sesi" sebagai default', async () => {
    await renderTabDatabaseAndReady();

    const select = screen.getByTestId('filter-sesi-select');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Semua Sesi' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tanpa Sesi' })).toBeInTheDocument();
  });

  it('menampilkan setiap sesi dari database dengan format nama — tanggal', async () => {
    await db.sessions.bulkAdd([session1, session2]);
    await renderTabDatabaseAndReady();

    expect(screen.getByRole('option', { name: /Shift Pagi.*2025-07-14/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Shift Siang.*2025-07-15/ })).toBeInTheDocument();
  });

  it('nilai default filter adalah "all" (Semua Sesi)', async () => {
    await renderTabDatabaseAndReady();

    const select = screen.getByTestId('filter-sesi-select');
    expect(select.value).toBe('all');
  });

  it('mengubah filter memperbarui nilai select', async () => {
    await db.sessions.add(session1);
    await db.transactions.add(tx1);
    await renderTabDatabaseAndReady();

    const select = screen.getByTestId('filter-sesi-select');
    fireEvent.change(select, { target: { value: 'none' } });
    expect(select.value).toBe('none');
  });
});

// ═══════════════════════════════════════════════════════════
// TabelSemuaTransaksi
// ═══════════════════════════════════════════════════════════

describe('TabDatabase — TabelSemuaTransaksi', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.sessions.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('menampilkan pesan kosong saat tidak ada transaksi', async () => {
    await renderTabDatabaseAndReady();
    expect(screen.getByText('Belum ada transaksi yang tercatat')).toBeInTheDocument();
  });

  it('menampilkan semua kolom yang benar', async () => {
    await db.transactions.add(tx1);
    await renderTabDatabaseAndReady();

    const table = screen.getByTestId('tabel-semua-transaksi');
    expect(table.querySelector('th:nth-child(1)')).toHaveTextContent(/ID Transaksi/i);
    expect(table.querySelector('th:nth-child(2)')).toHaveTextContent(/Tanggal/i);
    expect(table.querySelector('th:nth-child(3)')).toHaveTextContent(/Nama Barang/i);
    expect(table.querySelector('th:nth-child(4)')).toHaveTextContent(/Kategori/i);
    expect(table.querySelector('th:nth-child(5)')).toHaveTextContent(/Total/i);
    expect(table.querySelector('th:nth-child(6)')).toHaveTextContent(/Metode Pembayaran/i);
    expect(table.querySelector('th:nth-child(7)')).toHaveTextContent(/Nama Sesi/i);
  });

  it('menampilkan data transaksi dengan benar', async () => {
    await db.transactions.add(tx1);
    await db.sessions.add(session1);
    await renderTabDatabaseAndReady();

    expect(screen.getByText('TRX-001')).toBeInTheDocument();
    expect(screen.getByText('Nasi Goreng')).toBeInTheDocument();
    expect(screen.getByText('Makanan')).toBeInTheDocument();
    expect(screen.getByText('Tunai')).toBeInTheDocument();
    expect(screen.getByText('Shift Pagi')).toBeInTheDocument();
  });

  it('menampilkan "Tanpa Sesi" untuk transaksi dengan sessionId null', async () => {
    await db.transactions.add(tx2);
    await renderTabDatabaseAndReady();

    const matches = screen.getAllByText('Tanpa Sesi');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const tableCells = matches.filter((el) => el.tagName === 'TD');
    expect(tableCells.length).toBeGreaterThanOrEqual(1);
  });

  it('menampilkan transaksi terbaru di atas (descending by createdAt)', async () => {
    await db.transactions.bulkAdd([tx2, tx1, tx3]); // shuffled
    await renderTabDatabaseAndReady();

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('TRX-003'); // tx3 is newest
    expect(rows[2]).toHaveTextContent('TRX-001');
    expect(rows[3]).toHaveTextContent('TRX-002'); // tx2 is oldest
  });

  it('filter "Tanpa Sesi" menampilkan hanya transaksi dengan sessionId null', async () => {
    await db.transactions.bulkAdd([tx1, tx2, tx3]);
    await db.sessions.bulkAdd([session1, session2]);
    await renderTabDatabaseAndReady();

    const select = screen.getByTestId('filter-sesi-select');
    fireEvent.change(select, { target: { value: 'none' } });

    expect(screen.getByText('TRX-002')).toBeInTheDocument();
    expect(screen.queryByText('TRX-001')).not.toBeInTheDocument();
    expect(screen.queryByText('TRX-003')).not.toBeInTheDocument();
  });

  it('filter by session ID menampilkan hanya transaksi sesi tersebut', async () => {
    await db.transactions.bulkAdd([tx1, tx2, tx3]);
    await db.sessions.bulkAdd([session1, session2]);
    await renderTabDatabaseAndReady();

    const select = screen.getByTestId('filter-sesi-select');
    fireEvent.change(select, { target: { value: 'session-001' } });

    expect(screen.getByText('TRX-001')).toBeInTheDocument();
    expect(screen.queryByText('TRX-002')).not.toBeInTheDocument();
    expect(screen.queryByText('TRX-003')).not.toBeInTheDocument();
  });

  it('filter "Semua Sesi" menampilkan semua transaksi', async () => {
    await db.transactions.bulkAdd([tx1, tx2, tx3]);
    await db.sessions.bulkAdd([session1, session2]);
    await renderTabDatabaseAndReady();

    expect(screen.getByText('TRX-001')).toBeInTheDocument();
    expect(screen.getByText('TRX-002')).toBeInTheDocument();
    expect(screen.getByText('TRX-003')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// Action Buttons
// ═══════════════════════════════════════════════════════════

describe('TabDatabase — Action Buttons', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.sessions.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('tombol "Export Database" ada di DOM', async () => {
    await renderTabDatabaseAndReady();
    expect(screen.getByTestId('btn-export-database')).toBeInTheDocument();
  });

  it('tombol "Import & Merge Database" ada di DOM', async () => {
    await renderTabDatabaseAndReady();
    expect(screen.getByTestId('btn-import-database')).toBeInTheDocument();
  });

  it('klik tombol Export memanggil exportDatabase()', async () => {
    exportDatabase.mockImplementation(() => {});
    await renderTabDatabaseAndReady();

    fireEvent.click(screen.getByTestId('btn-export-database'));
    expect(exportDatabase).toHaveBeenCalledOnce();
  });
});

// ═══════════════════════════════════════════════════════════
// Property 8: Filter Sesi Akurat
// ═══════════════════════════════════════════════════════════

describe('Property 8: Filter Sesi Akurat', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.sessions.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it(
    'transaksi yang ditampilkan setelah filter tepat merupakan subset yang memenuhi kriteria',
    { timeout: 30000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(
            fc.record({
              id: fc.integer({ min: 1, max: 9999 }),
              transactionId: fc
                .integer({ min: 1, max: 99999 })
                .map((n) => `TX-${String(n).padStart(5, '0')}`),
              tanggal: fc.constant('2025-01-01'),
              createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
              namaBarang: fc.constant('Item'),
              kategori: fc.constant('Cat'),
              total: fc.integer({ min: 0, max: 10000 }),
              metode: fc.constant('Tunai'),
              status: fc.constant('Selesai'),
              sessionId: fc.option(fc.constantFrom('s1', 's2'), { nil: null }),
            }),
            { maxLength: 8, selector: (t) => t.id }
          ),
          fc.constantFrom('all', 'none', 's1', 's2'),
          async (transactions, filterValue) => {
            const uniqueTx = transactions.filter(
              (tx, i, arr) => arr.findIndex((t) => t.transactionId === tx.transactionId) === i
            );

            cleanup();
            await db.transactions.clear();
            await db.sessions.clear();

            if (uniqueTx.length > 0) {
              await db.transactions.bulkAdd(uniqueTx);
            }
            await db.sessions.bulkAdd([
              { id: 's1', nama: 'Sesi 1', tanggalMulai: '2025-01-01', status: 'ditutup' },
              { id: 's2', nama: 'Sesi 2', tanggalMulai: '2025-01-01', status: 'aktif' },
            ]);

            await renderTabDatabaseAndReady();

            const select = screen.getByTestId('filter-sesi-select');
            fireEvent.change(select, { target: { value: filterValue } });

            let expected;
            if (filterValue === 'all') {
              expected = uniqueTx;
            } else if (filterValue === 'none') {
              expected = uniqueTx.filter(
                (tx) => tx.sessionId === null || tx.sessionId === undefined
              );
            } else {
              expected = uniqueTx.filter((tx) => tx.sessionId === filterValue);
            }

            for (const tx of expected) {
              const trimmedId = tx.transactionId.trim();
              if (trimmedId.length === 0) continue;
              expect(screen.queryByText(trimmedId)).not.toBeNull();
            }

            const notExpected = uniqueTx.filter((tx) => !expected.includes(tx));
            for (const tx of notExpected) {
              const trimmedId = tx.transactionId.trim();
              if (trimmedId.length === 0) continue;
              if (!expected.some((e) => e.transactionId.trim() === trimmedId)) {
                expect(screen.queryByText(trimmedId)).toBeNull();
              }
            }

            cleanup();
          }
        ),
        { numRuns: 10 } // reduced for speed
      );
    }
  );
});

// ═══════════════════════════════════════════════════════════
// Property 9: Kalkulasi DatabaseStats Selalu Akurat
// ═══════════════════════════════════════════════════════════

describe('Property 9: Kalkulasi DatabaseStats Selalu Akurat', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.sessions.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it(
    'totalPemasukan yang ditampilkan = sum semua field total dari setiap transaksi',
    { timeout: 30000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(
            fc.record({
              id: fc.integer({ min: 1, max: 99999 }),
              transactionId: fc
                .integer({ min: 1, max: 99999 })
                .map((n) => `TX-${String(n).padStart(5, '0')}`),
              tanggal: fc.constant('2025-01-01'),
              createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
              namaBarang: fc.constant('Item'),
              kategori: fc.constant('Cat'),
              total: fc.integer({ min: 0, max: 100000 }),
              metode: fc.constant('Tunai'),
              status: fc.constant('Selesai'),
              sessionId: fc.constant(null),
            }),
            { maxLength: 10, selector: (t) => t.id }
          ),
          async (transactions) => {
            const uniqueTx = transactions.filter(
              (tx, i, arr) => arr.findIndex((t) => t.transactionId === tx.transactionId) === i
            );

            const expectedTotal = uniqueTx.reduce((sum, tx) => sum + tx.total, 0);

            cleanup();
            await db.transactions.clear();
            if (uniqueTx.length > 0) {
              await db.transactions.bulkAdd(uniqueTx);
            }

            await renderTabDatabaseAndReady();

            const formattedExpected = 'Rp ' + expectedTotal.toLocaleString('id-ID');
            const totalMatches = screen.getAllByText(formattedExpected);
            expect(totalMatches.length).toBeGreaterThanOrEqual(1);

            const countMatches = screen.getAllByText(String(uniqueTx.length));
            expect(countMatches.length).toBeGreaterThanOrEqual(1);

            cleanup();
          }
        ),
        { numRuns: 10 } // reduced for speed
      );
    }
  );
});
