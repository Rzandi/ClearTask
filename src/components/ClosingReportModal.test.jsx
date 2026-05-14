/* ═══════════════════════════════════════════════════════════
   ClosingReportModal.test.jsx — ClearTask
   Unit tests untuk komponen ClosingReportModal
   Feature: session-management
   ═══════════════════════════════════════════════════════════ */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClosingReportModal from './ClosingReportModal';

// Mock export utilities
vi.mock('../utils/exportExcel', () => ({ exportSessionExcel: vi.fn() }));
vi.mock('../utils/exportCSV', () => ({ exportSessionCSV: vi.fn() }));

// Sample session and transactions for tests
const mockSession = {
  id: 'test-session-id',
  nama: 'Shift Pagi',
  tanggalMulai: '2025-07-14',
  waktuMulai: '2025-07-14T01:30:00.000Z',
  tanggalTutup: '2025-07-14T05:00:00.000Z',
  waktuTutup: '2025-07-14T05:00:00.000Z',
  status: 'ditutup',
};

const mockTransactions = [
  {
    id: 1,
    transactionId: 'TRX-00001',
    tanggal: '2025-07-14',
    createdAt: '2025-07-14T02:00:00.000Z',
    kasir: 'Admin',
    kategori: 'Makanan',
    namaBarang: 'Nasi Goreng',
    qty: 2,
    hargaSatuan: 15000,
    total: 30000,
    metode: 'Tunai',
    catatan: '',
    status: 'sukses',
    sessionId: 'test-session-id',
  },
  {
    id: 2,
    transactionId: 'TRX-00002',
    tanggal: '2025-07-14',
    createdAt: '2025-07-14T03:00:00.000Z',
    kasir: 'Admin',
    kategori: 'Minuman',
    namaBarang: 'Es Teh',
    qty: 1,
    hargaSatuan: 5000,
    total: 5000,
    metode: 'QRIS',
    catatan: '',
    status: 'sukses',
    sessionId: 'test-session-id',
  },
];

describe('ClosingReportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 12.1 Unit test: tidak render ketika isOpen adalah false
  it('tidak render ketika isOpen adalah false', () => {
    const { container } = render(
      <ClosingReportModal
        isOpen={false}
        session={mockSession}
        transactions={mockTransactions}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  // 12.2 Unit test: tampilkan "Tidak ada transaksi dalam sesi ini" ketika transaksi kosong
  it('tampilkan pesan tidak ada transaksi ketika transactions kosong', () => {
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={[]}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Tidak ada transaksi dalam sesi ini')).toBeInTheDocument();
  });

  // 12.2 lanjutan: breakdown tidak ditampilkan ketika transaksi kosong
  it('tidak tampilkan breakdown ketika transactions kosong', () => {
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={[]}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Breakdown per Kategori')).not.toBeInTheDocument();
    expect(screen.queryByText('Breakdown per Metode Pembayaran')).not.toBeInTheDocument();
  });

  // 12.3 Unit test: tampilkan "Sesi Tanpa Nama" ketika nama sesi kosong
  it('tampilkan "Sesi Tanpa Nama" ketika session.nama kosong', () => {
    const sessionTanpaNama = { ...mockSession, nama: '' };
    render(
      <ClosingReportModal
        isOpen={true}
        session={sessionTanpaNama}
        transactions={[]}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Sesi Tanpa Nama')).toBeInTheDocument();
  });

  // 12.3 lanjutan: tampilkan nama sesi ketika nama terisi
  it('tampilkan nama sesi ketika session.nama terisi', () => {
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={mockTransactions}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Shift Pagi')).toBeInTheDocument();
  });

  // 12.4 Unit test: tombol "Selesai" memanggil onClose
  it('tombol Selesai memanggil onClose saat diklik', () => {
    const onClose = vi.fn();
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={mockTransactions}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText('Selesai'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 12.5 Unit test: tombol "Export Excel" dan "Export CSV" ada di DOM
  it('tombol Export Excel dan Export CSV ada di DOM', () => {
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={mockTransactions}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Export Excel')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  // Tambahan: tombol Export Excel memanggil exportSessionExcel
  it('tombol Export Excel memanggil exportSessionExcel dengan argumen yang benar', async () => {
    const { exportSessionExcel } = await import('../utils/exportExcel');
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={mockTransactions}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Export Excel'));
    expect(exportSessionExcel).toHaveBeenCalledWith(mockTransactions, mockSession);
  });

  // Tambahan: tombol Export CSV memanggil exportSessionCSV
  it('tombol Export CSV memanggil exportSessionCSV dengan argumen yang benar', async () => {
    const { exportSessionCSV } = await import('../utils/exportCSV');
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={mockTransactions}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Export CSV'));
    expect(exportSessionCSV).toHaveBeenCalledWith(mockTransactions, mockSession);
  });

  // Tambahan: modal tetap terbuka setelah export (tidak auto-close)
  it('modal tetap terbuka setelah klik Export Excel (tidak memanggil onClose)', () => {
    const onClose = vi.fn();
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={mockTransactions}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText('Export Excel'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('modal tetap terbuka setelah klik Export CSV (tidak memanggil onClose)', () => {
    const onClose = vi.fn();
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={mockTransactions}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText('Export CSV'));
    expect(onClose).not.toHaveBeenCalled();
  });

  // Tambahan: tampilkan breakdown ketika ada transaksi
  it('tampilkan breakdown kategori dan metode ketika ada transaksi', () => {
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={mockTransactions}
        onClose={vi.fn()}
      />
    );
    // Breakdown headers
    expect(screen.getByText('Breakdown per Kategori')).toBeInTheDocument();
    expect(screen.getByText('Breakdown per Metode Pembayaran')).toBeInTheDocument();
    // Kategori data
    expect(screen.getByText('Makanan')).toBeInTheDocument();
    expect(screen.getByText('Minuman')).toBeInTheDocument();
    // Metode data
    expect(screen.getByText('Tunai')).toBeInTheDocument();
    expect(screen.getByText('QRIS')).toBeInTheDocument();
  });

  // Tambahan: tampilkan total transaksi dan total pemasukan
  it('tampilkan total transaksi dan total pemasukan yang benar', () => {
    render(
      <ClosingReportModal
        isOpen={true}
        session={mockSession}
        transactions={mockTransactions}
        onClose={vi.fn()}
      />
    );
    // Total transaksi = 2
    expect(screen.getByText('2')).toBeInTheDocument();
    // Total pemasukan = 35000 → "Rp 35.000"
    expect(screen.getByText('Rp 35.000')).toBeInTheDocument();
  });
});
