/* ═══════════════════════════════════════════════════════════
   TabDatabase.test.jsx — ClearTask
   Unit tests + Property-based tests for TabDatabase component
   Feature: session-database
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import TabDatabase from './TabDatabase';

// ── Mock databaseManager so tests don't trigger downloads ──
vi.mock('../utils/databaseManager', () => ({
  exportDatabase: vi.fn(),
  validateImport: vi.fn(),
  calculateMerge: vi.fn(),
  applyMerge: vi.fn(),
}));

// ── Mock Toast to avoid setTimeout keeping tests alive ──
vi.mock('./Toast', () => ({
  default: ({ message }) => <div data-testid="toast">{message}</div>,
}));

// ── Mock MergePreviewModal to isolate TabDatabase tests ──
vi.mock('./MergePreviewModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }) =>
    isOpen ? (
      <div data-testid="merge-modal">
        <button onClick={onConfirm}>Terapkan Merge</button>
        <button onClick={onCancel}>Batal</button>
      </div>
    ) : null,
}));

import { exportDatabase } from '../utils/databaseManager';

// ── Fixtures ──────────────────────────────────────────────

const tx1 = {
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

function renderTabDatabase() {
  return render(<TabDatabase />);
}

// ═══════════════════════════════════════════════════════════
// DatabaseStats
// ═══════════════════════════════════════════════════════════

describe('TabDatabase — DatabaseStats', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('menampilkan nilai 0 saat localStorage kosong', () => {
    renderTabDatabase();

    expect(screen.getByText('Total Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Total Sesi')).toBeInTheDocument();
    expect(screen.getByText('Total Pemasukan')).toBeInTheDocument();
    // Values should be 0
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
  });

  it('menampilkan jumlah transaksi dan sesi yang benar', () => {
    localStorage.setItem('cleartask_transactions', JSON.stringify([tx1, tx2]));
    localStorage.setItem('cleartask_sessions', JSON.stringify([session1]));
    renderTabDatabase();

    expect(screen.getByText('2')).toBeInTheDocument(); // total transaksi
    expect(screen.getByText('1')).toBeInTheDocument(); // total sesi
  });

  it('menampilkan total pemasukan yang benar (Rp 35.000)', () => {
    localStorage.setItem('cleartask_transactions', JSON.stringify([tx1, tx2])); // 30000 + 5000 = 35000
    renderTabDatabase();

    expect(screen.getByText(/35\.000/)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// FilterSesi
// ═══════════════════════════════════════════════════════════

describe('TabDatabase — FilterSesi', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('menampilkan opsi "Semua Sesi" dan "Tanpa Sesi" sebagai default', () => {
    renderTabDatabase();

    const select = screen.getByTestId('filter-sesi-select');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Semua Sesi' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tanpa Sesi' })).toBeInTheDocument();
  });

  it('menampilkan setiap sesi dari localStorage dengan format nama — tanggal', () => {
    localStorage.setItem('cleartask_sessions', JSON.stringify([session1, session2]));
    renderTabDatabase();

    expect(screen.getByRole('option', { name: /Shift Pagi.*2025-07-14/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Shift Siang.*2025-07-15/ })).toBeInTheDocument();
  });

  it('nilai default filter adalah "all" (Semua Sesi)', () => {
    renderTabDatabase();

    const select = screen.getByTestId('filter-sesi-select');
    expect(select.value).toBe('all');
  });

  it('mengubah filter memperbarui nilai select', () => {
    localStorage.setItem('cleartask_sessions', JSON.stringify([session1]));
    localStorage.setItem('cleartask_transactions', JSON.stringify([tx1]));
    renderTabDatabase();

    const select = screen.getByTestId('filter-sesi-select');
    fireEvent.change(select, { target: { value: 'none' } });
    expect(select.value).toBe('none');
  });
});

// ═══════════════════════════════════════════════════════════
// TabelSemuaTransaksi
// ═══════════════════════════════════════════════════════════

describe('TabDatabase — TabelSemuaTransaksi', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('menampilkan pesan kosong saat tidak ada transaksi', () => {
    renderTabDatabase();

    expect(screen.getByText('Belum ada transaksi yang tercatat')).toBeInTheDocument();
  });

  it('menampilkan semua kolom yang benar', () => {
    localStorage.setItem('cleartask_transactions', JSON.stringify([tx1]));
    renderTabDatabase();

    const table = screen.getByTestId('tabel-semua-transaksi');
    expect(table.querySelector('th:nth-child(1)')).toHaveTextContent(/ID Transaksi/i);
    expect(table.querySelector('th:nth-child(2)')).toHaveTextContent(/Tanggal/i);
    expect(table.querySelector('th:nth-child(3)')).toHaveTextContent(/Nama Barang/i);
    expect(table.querySelector('th:nth-child(4)')).toHaveTextContent(/Kategori/i);
    expect(table.querySelector('th:nth-child(5)')).toHaveTextContent(/Total/i);
    expect(table.querySelector('th:nth-child(6)')).toHaveTextContent(/Metode Pembayaran/i);
    expect(table.querySelector('th:nth-child(7)')).toHaveTextContent(/Nama Sesi/i);
  });

  it('menampilkan data transaksi dengan benar', () => {
    localStorage.setItem('cleartask_transactions', JSON.stringify([tx1]));
    localStorage.setItem('cleartask_sessions', JSON.stringify([session1]));
    renderTabDatabase();

    expect(screen.getByText('TRX-001')).toBeInTheDocument();
    expect(screen.getByText('Nasi Goreng')).toBeInTheDocument();
    expect(screen.getByText('Makanan')).toBeInTheDocument();
    expect(screen.getByText('Tunai')).toBeInTheDocument();
    expect(screen.getByText('Shift Pagi')).toBeInTheDocument();
  });

  it('menampilkan "Tanpa Sesi" untuk transaksi dengan sessionId null', () => {
    localStorage.setItem('cleartask_transactions', JSON.stringify([tx2]));
    renderTabDatabase();

    // "Tanpa Sesi" appears in both the dropdown option and the table cell
    const matches = screen.getAllByText('Tanpa Sesi');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // At least one should be a table cell
    const tableCells = matches.filter((el) => el.tagName === 'TD');
    expect(tableCells.length).toBeGreaterThanOrEqual(1);
  });

  it('menampilkan transaksi terbaru di atas (descending by createdAt)', () => {
    // tx3 is newest (2025-07-15), tx1 is middle (2025-07-14), tx2 is oldest (2025-07-13)
    localStorage.setItem('cleartask_transactions', JSON.stringify([tx2, tx1, tx3])); // shuffled
    renderTabDatabase();

    const rows = screen.getAllByRole('row');
    // rows[0] = header, rows[1] = first data row (newest)
    expect(rows[1]).toHaveTextContent('TRX-003'); // tx3 is newest
    expect(rows[2]).toHaveTextContent('TRX-001');
    expect(rows[3]).toHaveTextContent('TRX-002'); // tx2 is oldest
  });

  it('filter "Tanpa Sesi" menampilkan hanya transaksi dengan sessionId null', () => {
    localStorage.setItem('cleartask_transactions', JSON.stringify([tx1, tx2, tx3]));
    localStorage.setItem('cleartask_sessions', JSON.stringify([session1, session2]));
    renderTabDatabase();

    const select = screen.getByTestId('filter-sesi-select');
    fireEvent.change(select, { target: { value: 'none' } });

    // Only tx2 has sessionId: null
    expect(screen.getByText('TRX-002')).toBeInTheDocument();
    expect(screen.queryByText('TRX-001')).not.toBeInTheDocument();
    expect(screen.queryByText('TRX-003')).not.toBeInTheDocument();
  });

  it('filter by session ID menampilkan hanya transaksi sesi tersebut', () => {
    localStorage.setItem('cleartask_transactions', JSON.stringify([tx1, tx2, tx3]));
    localStorage.setItem('cleartask_sessions', JSON.stringify([session1, session2]));
    renderTabDatabase();

    const select = screen.getByTestId('filter-sesi-select');
    fireEvent.change(select, { target: { value: 'session-001' } });

    expect(screen.getByText('TRX-001')).toBeInTheDocument();
    expect(screen.queryByText('TRX-002')).not.toBeInTheDocument();
    expect(screen.queryByText('TRX-003')).not.toBeInTheDocument();
  });

  it('filter "Semua Sesi" menampilkan semua transaksi', () => {
    localStorage.setItem('cleartask_transactions', JSON.stringify([tx1, tx2, tx3]));
    localStorage.setItem('cleartask_sessions', JSON.stringify([session1, session2]));
    renderTabDatabase();

    // Default is "all"
    expect(screen.getByText('TRX-001')).toBeInTheDocument();
    expect(screen.getByText('TRX-002')).toBeInTheDocument();
    expect(screen.getByText('TRX-003')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// Action Buttons
// ═══════════════════════════════════════════════════════════

describe('TabDatabase — Action Buttons', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('tombol "Export Database" ada di DOM', () => {
    renderTabDatabase();
    expect(screen.getByTestId('btn-export-database')).toBeInTheDocument();
    expect(screen.getByText('Export Database')).toBeInTheDocument();
  });

  it('tombol "Import & Merge Database" ada di DOM', () => {
    renderTabDatabase();
    expect(screen.getByTestId('btn-import-database')).toBeInTheDocument();
    expect(screen.getByText(/Import.*Merge Database/i)).toBeInTheDocument();
  });

  it('klik tombol Export memanggil exportDatabase()', () => {
    exportDatabase.mockImplementation(() => {});
    renderTabDatabase();

    fireEvent.click(screen.getByTestId('btn-export-database'));

    expect(exportDatabase).toHaveBeenCalledOnce();
  });
});

// ═══════════════════════════════════════════════════════════
// Property 8: Filter Sesi Akurat
// Validates: Requirements 8.5, 8.6, 8.7
// ═══════════════════════════════════════════════════════════

describe('Property 8: Filter Sesi Akurat', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('transaksi yang ditampilkan setelah filter tepat merupakan subset yang memenuhi kriteria', () => {
    // Use a small numRuns to keep test fast in CI
    fc.assert(
      fc.property(
        // Generate transactions with various sessionIds
        fc.array(
          fc.record({
            transactionId: fc.string({ minLength: 1, maxLength: 10 }).map((s) => `TX-${s}`),
            tanggal: fc.constant('2025-01-01'),
            createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
            namaBarang: fc.constant('Item'),
            kategori: fc.constant('Cat'),
            total: fc.integer({ min: 0, max: 10000 }),
            metode: fc.constant('Tunai'),
            status: fc.constant('Selesai'),
            sessionId: fc.option(fc.constantFrom('s1', 's2'), { nil: null }),
          }),
          { maxLength: 8 }
        ),
        // Filter choice
        fc.constantFrom('all', 'none', 's1', 's2'),
        (transactions, filterValue) => {
          // Deduplicate by transactionId
          const uniqueTx = transactions.filter(
            (tx, i, arr) => arr.findIndex((t) => t.transactionId === tx.transactionId) === i
          );

          // Clean up any previous render before this iteration to avoid DOM accumulation
          cleanup();

          localStorage.clear();
          localStorage.setItem('cleartask_transactions', JSON.stringify(uniqueTx));
          localStorage.setItem('cleartask_sessions', JSON.stringify([
            { id: 's1', nama: 'Sesi 1', tanggalMulai: '2025-01-01', status: 'ditutup' },
            { id: 's2', nama: 'Sesi 2', tanggalMulai: '2025-01-01', status: 'aktif' },
          ]));

          renderTabDatabase();

          const select = screen.getByTestId('filter-sesi-select');
          fireEvent.change(select, { target: { value: filterValue } });

          // Compute expected transactions
          let expected;
          if (filterValue === 'all') {
            expected = uniqueTx;
          } else if (filterValue === 'none') {
            expected = uniqueTx.filter((tx) => tx.sessionId === null || tx.sessionId === undefined);
          } else {
            expected = uniqueTx.filter((tx) => tx.sessionId === filterValue);
          }

          // Check each expected transaction is visible (use trim to handle whitespace)
          for (const tx of expected) {
            const trimmedId = tx.transactionId.trim();
            if (trimmedId.length === 0) continue; // skip empty IDs
            expect(screen.queryByText(trimmedId)).not.toBeNull();
          }

          // Check no unexpected transactions are visible
          const notExpected = uniqueTx.filter((tx) => !expected.includes(tx));
          for (const tx of notExpected) {
            const trimmedId = tx.transactionId.trim();
            if (trimmedId.length === 0) continue; // skip empty IDs
            // Only check if transactionId is unique enough to not appear in expected
            if (!expected.some((e) => e.transactionId.trim() === trimmedId)) {
              expect(screen.queryByText(trimmedId)).toBeNull();
            }
          }

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ═══════════════════════════════════════════════════════════
// Property 9: Kalkulasi DatabaseStats Selalu Akurat
// Validates: Requirements 6.1
// ═══════════════════════════════════════════════════════════

describe('Property 9: Kalkulasi DatabaseStats Selalu Akurat', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('totalPemasukan yang ditampilkan = sum semua field total dari setiap transaksi', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            transactionId: fc.string({ minLength: 1, maxLength: 8 }).map((s) => `TX-${s}`),
            tanggal: fc.constant('2025-01-01'),
            createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
            namaBarang: fc.constant('Item'),
            kategori: fc.constant('Cat'),
            total: fc.integer({ min: 0, max: 100000 }),
            metode: fc.constant('Tunai'),
            status: fc.constant('Selesai'),
            sessionId: fc.constant(null),
          }),
          { maxLength: 10 }
        ),
        (transactions) => {
          const uniqueTx = transactions.filter(
            (tx, i, arr) => arr.findIndex((t) => t.transactionId === tx.transactionId) === i
          );

          const expectedTotal = uniqueTx.reduce((sum, tx) => sum + tx.total, 0);

          // Clean up any previous render before this iteration
          cleanup();

          localStorage.clear();
          localStorage.setItem('cleartask_transactions', JSON.stringify(uniqueTx));

          renderTabDatabase();

          // Format expected total as Rupiah
          const formattedExpected = 'Rp ' + expectedTotal.toLocaleString('id-ID');
          // Use getAllByText since the same value may appear in table rows too
          const totalMatches = screen.getAllByText(formattedExpected);
          expect(totalMatches.length).toBeGreaterThanOrEqual(1);

          // Total transaksi count — use getAllByText since '0' may appear multiple times
          const countMatches = screen.getAllByText(String(uniqueTx.length));
          expect(countMatches.length).toBeGreaterThanOrEqual(1);

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });
});
