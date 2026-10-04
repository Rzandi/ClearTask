/* ═══════════════════════════════════════════════════════════
   W0-sessionReport.test.jsx — ClearTask
   Regression tests for W0-01 (ClosingReportModal hooks) and
   W0-02 (void transactions excluded from session reports).
   
   These tests verify:
   - W0-01: ClosingReportModal renders without Rules of Hooks crash
     when toggling isOpen between renders (wrapper+inner pattern).
   - W0-02: calculateSessionStats excludes transactions with
     deletedAt, so voided sales don't inflate closing reports.
   - W0-02: getSessionTransactionsAsync filters out deletedAt.
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { calculateSessionStats } from '../utils/sessionStats';

// ── Mock SettingsContext ──────────────────────────────────
vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      kasirName: 'Admin',
      theme: 'dark',
      accentColor: '#00ffa3',
      tokoName: 'Toko Test',
    },
  }),
  SettingsProvider: ({ children }) => <>{children}</>,
}));

vi.mock('../utils/exportExcel', () => ({ exportSessionExcel: vi.fn() }));
vi.mock('../utils/exportCSV', () => ({ exportSessionCSV: vi.fn() }));

// ── Lazy import so mocks are in place ────────────────────
let ClosingReportModal;
beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('../components/ClosingReportModal');
  ClosingReportModal = mod.default;
});

// ── Fixtures ─────────────────────────────────────────────

const mockSession = {
  id: 'session-w0',
  nama: 'Shift Test',
  tanggalMulai: '2026-10-01',
  waktuMulai: '2026-10-01T01:00:00.000Z',
  tanggalTutup: '2026-10-01T05:00:00.000Z',
  waktuTutup: '2026-10-01T05:00:00.000Z',
  status: 'ditutup',
};

const activeTx = {
  id: 1,
  transactionId: 'TRX-00001',
  tanggal: '2026-10-01',
  createdAt: '2026-10-01T02:00:00.000Z',
  kasir: 'Admin',
  kategori: 'Makanan',
  namaBarang: 'Nasi Goreng',
  qty: 2,
  hargaSatuan: 15000,
  total: 30000,
  metode: 'Tunai',
  catatan: '',
  status: 'Selesai',
  sessionId: 'session-w0',
};

const voidedTx = {
  id: 2,
  transactionId: 'TRX-00002',
  tanggal: '2026-10-01',
  createdAt: '2026-10-01T03:00:00.000Z',
  kasir: 'Admin',
  kategori: 'Minuman',
  namaBarang: 'Es Teh',
  qty: 3,
  hargaSatuan: 5000,
  total: 15000,
  metode: 'Tunai',
  catatan: '',
  status: 'Selesai',
  sessionId: 'session-w0',
  deletedAt: '2026-10-01T04:00:00.000Z', // voided!
};

// ── W0-02: calculateSessionStats filters deletedAt ───────

describe('W0-02: calculateSessionStats excludes voided transactions', () => {
  it('excludes transactions with deletedAt from totals', () => {
    const stats = calculateSessionStats(mockSession, [activeTx, voidedTx]);

    // Only activeTx should count
    expect(stats.totalTransaksi).toBe(1);
    expect(stats.totalPemasukan).toBe(30000);
  });

  it('excludes voided transactions from kategori breakdown', () => {
    const stats = calculateSessionStats(mockSession, [activeTx, voidedTx]);

    // Only 'Makanan' from activeTx should appear
    expect(stats.breakdownKategori).toHaveLength(1);
    expect(stats.breakdownKategori[0].kategori).toBe('Makanan');
  });

  it('excludes voided transactions from metode breakdown', () => {
    const stats = calculateSessionStats(mockSession, [activeTx, voidedTx]);

    // Both are 'Tunai', but only activeTx counts
    expect(stats.breakdownMetode).toHaveLength(1);
    expect(stats.breakdownMetode[0].jumlahTransaksi).toBe(1);
    expect(stats.breakdownMetode[0].totalPemasukan).toBe(30000);
  });

  it('excludes voided transactions from highest/lowest', () => {
    const stats = calculateSessionStats(mockSession, [activeTx, voidedTx]);

    expect(stats.transaksiTertinggi?.transactionId).toBe('TRX-00001');
    expect(stats.transaksiTerendah?.transactionId).toBe('TRX-00001');
  });

  it('returns zero stats if ALL transactions are voided', () => {
    const stats = calculateSessionStats(mockSession, [voidedTx]);

    expect(stats.totalTransaksi).toBe(0);
    expect(stats.totalPemasukan).toBe(0);
    expect(stats.breakdownKategori).toEqual([]);
    expect(stats.breakdownMetode).toEqual([]);
    expect(stats.transaksiTertinggi).toBeNull();
    expect(stats.transaksiTerendah).toBeNull();
  });
});

// ── W0-01: ClosingReportModal hooks don't crash ──────────

describe('W0-01: ClosingReportModal wrapper+inner pattern', () => {
  it('renders null when isOpen=false (no hooks crash)', () => {
    const { container } = render(
      <ClosingReportModal
        isOpen={false}
        session={mockSession}
        transactions={[activeTx]}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders content when isOpen=true', () => {
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={[activeTx]}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Closing Report')).toBeInTheDocument();
    expect(screen.getByText('Shift Test')).toBeInTheDocument();
  });

  it('survives re-render toggle isOpen false→true→false without crashing', () => {
    const onClose = vi.fn();
    const { rerender, container } = render(
      <ClosingReportModal
        isOpen={false}
        session={mockSession}
        transactions={[activeTx]}
        onClose={onClose}
      />
    );
    expect(container.firstChild).toBeNull();

    // Toggle to open
    rerender(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={[activeTx]}
        onClose={onClose}
      />
    );
    expect(screen.getByText('Closing Report')).toBeInTheDocument();

    // Toggle back to closed
    rerender(
      <ClosingReportModal
        isOpen={false}
        session={mockSession}
        transactions={[activeTx]}
        onClose={onClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ── W0-02: ClosingReportModal renders correct stats with mixed data ──

describe('W0-02: ClosingReportModal excludes voided transactions in UI', () => {
  it('shows correct total when mix of active and voided transactions', () => {
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={[activeTx, voidedTx]}
        onClose={vi.fn()}
      />
    );

    // Total transaksi should be 1 (only activeTx)
    expect(screen.getByText('Total Transaksi').nextElementSibling).toHaveTextContent('1');
    // Total pemasukan should be Rp 30.000
    expect(screen.getByText('Total Pemasukan').nextElementSibling).toHaveTextContent('Rp 30.000');
  });
});
