import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TransactionTable from '../components/TransactionTable';

vi.mock('../components/EditTransactionModal', () => ({ default: () => null }));
vi.mock('../components/ConfirmDialog', () => ({ default: () => null }));

function makeTx(overrides = {}) {
  return {
    id: 1, transactionId: 'TRX-00001', tanggal: '2025-01-15',
    kategori: 'Elektronik', subKategori: 'Laptop', namaBarang: 'Laptop',
    qty: 1, hargaSatuan: 5000000, total: 5000000, metode: 'Tunai',
    catatan: '', kasir: 'Admin', createdAt: '2025-01-15T00:00:00.000Z', status: 'Selesai',
    ...overrides,
  };
}

describe('TransactionTable — kolom Sub-Kategori', () => {
  beforeEach(() => vi.clearAllMocks());

  it('6.1a: header kolom "Sub-Kategori" ada di DOM saat ada data', () => {
    render(<TransactionTable transactions={[makeTx()]} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Sub-Kategori')).toBeTruthy();
  });

  it('6.1b: transaksi dengan subKategori tidak kosong menampilkan nilainya', () => {
    render(<TransactionTable transactions={[makeTx({ subKategori: 'Laptop Gaming' })]} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Laptop Gaming')).toBeTruthy();
  });

  it('6.1c: transaksi tanpa field subKategori menampilkan "—"', () => {
    const tx = makeTx();
    delete tx.subKategori;
    render(<TransactionTable transactions={[tx]} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
