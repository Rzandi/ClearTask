/**
 * Unit Tests — TransactionTable.jsx (fitur aksi)
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 6.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionTable from '../components/TransactionTable';

// Mock EditTransactionModal
vi.mock('../components/EditTransactionModal', () => ({
  default: ({ isOpen, transaction }) =>
    isOpen ? (
      <div data-testid="edit-modal-open">{transaction?.transactionId}</div>
    ) : null,
}));

// Mock ConfirmDialog
vi.mock('../components/ConfirmDialog', () => ({
  default: ({ isOpen, message }) =>
    isOpen ? (
      <div data-testid="confirm-dialog-open">{message}</div>
    ) : null,
}));

// Helper: buat objek transaksi
function makeTx(overrides = {}) {
  return {
    id: 1,
    transactionId: 'TRX-00001',
    tanggal: '2025-01-15',
    kategori: 'Elektronik',
    namaBarang: 'Laptop',
    qty: 2,
    hargaSatuan: 5000000,
    total: 10000000,
    metode: 'Tunai',
    catatan: '',
    kasir: 'Admin',
    createdAt: '2025-01-15T00:00:00.000Z',
    status: 'Selesai',
    ...overrides,
  };
}

describe('TransactionTable — fitur aksi', () => {
  const defaultProps = {
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 12.1: Tombol Edit ada di setiap baris data
  it('12.1: tombol Edit ada di setiap baris data', () => {
    const transactions = [
      makeTx({ id: 1, transactionId: 'TRX-00001' }),
      makeTx({ id: 2, transactionId: 'TRX-00002' }),
    ];
    render(<TransactionTable transactions={transactions} {...defaultProps} />);

    const editButtons = screen.getAllByRole('button', {
      name: /Edit transaksi/i,
    });
    expect(editButtons).toHaveLength(2);
  });

  // 12.2: Tombol Hapus ada di setiap baris data
  it('12.2: tombol Hapus ada di setiap baris data', () => {
    const transactions = [
      makeTx({ id: 1, transactionId: 'TRX-00001' }),
      makeTx({ id: 2, transactionId: 'TRX-00002' }),
    ];
    render(<TransactionTable transactions={transactions} {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', {
      name: /Hapus transaksi/i,
    });
    expect(deleteButtons).toHaveLength(2);
  });

  // 12.3: Kolom aksi adalah kolom terakhir
  it('12.3: header kolom "Aksi" ada ketika ada data', () => {
    const transactions = [makeTx()];
    render(<TransactionTable transactions={transactions} {...defaultProps} />);

    expect(screen.getByText('Aksi')).toBeTruthy();
  });

  // 12.4: Kolom aksi tidak ada ketika tabel kosong
  it('12.4: header kolom "Aksi" tidak ada ketika tabel kosong', () => {
    render(<TransactionTable transactions={[]} {...defaultProps} />);

    expect(screen.queryByText('Aksi')).toBeNull();
  });

  // 12.5: Tombol Edit memiliki aria-label yang menyebutkan transactionId
  it('12.5: tombol Edit memiliki aria-label yang menyebutkan transactionId', () => {
    const transactions = [makeTx({ transactionId: 'TRX-00001' })];
    render(<TransactionTable transactions={transactions} {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: 'Edit transaksi TRX-00001' })
    ).toBeTruthy();
  });

  // 12.6: Tombol Hapus memiliki aria-label yang menyebutkan transactionId
  it('12.6: tombol Hapus memiliki aria-label yang menyebutkan transactionId', () => {
    const transactions = [makeTx({ transactionId: 'TRX-00001' })];
    render(<TransactionTable transactions={transactions} {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: 'Hapus transaksi TRX-00001' })
    ).toBeTruthy();
  });

  // 12.7: Klik tombol Edit membuka EditTransactionModal dengan data transaksi yang benar
  it('12.7: klik tombol Edit membuka EditTransactionModal dengan data transaksi yang benar', () => {
    const tx = makeTx({ transactionId: 'TRX-00001' });
    render(<TransactionTable transactions={[tx]} {...defaultProps} />);

    // Modal belum terbuka
    expect(screen.queryByTestId('edit-modal-open')).toBeNull();

    // Klik tombol Edit
    fireEvent.click(screen.getByRole('button', { name: 'Edit transaksi TRX-00001' }));

    // Modal terbuka dengan transactionId yang benar
    const modal = screen.getByTestId('edit-modal-open');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toBe('TRX-00001');
  });

  // 12.8: Klik tombol Hapus membuka ConfirmDialog dengan pesan yang menyebutkan transactionId
  it('12.8: klik tombol Hapus membuka ConfirmDialog dengan pesan yang menyebutkan transactionId', () => {
    const tx = makeTx({ id: 1, transactionId: 'TRX-00001' });
    render(<TransactionTable transactions={[tx]} {...defaultProps} />);

    // Dialog belum terbuka
    expect(screen.queryByTestId('confirm-dialog-open')).toBeNull();

    // Klik tombol Hapus
    fireEvent.click(screen.getByRole('button', { name: 'Hapus transaksi TRX-00001' }));

    // Dialog terbuka dengan pesan yang menyebutkan transactionId
    const dialog = screen.getByTestId('confirm-dialog-open');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('TRX-00001');
  });
});
