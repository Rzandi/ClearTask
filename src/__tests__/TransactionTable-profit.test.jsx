import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TransactionTable from '../components/TransactionTable';

describe('TransactionTable — Profit and Modal Columns', () => {
  const defaultProps = {
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };

  it('Renders Harga Modal and Keuntungan columns and calculates values correctly', () => {
    const transactions = [
      {
        id: 1,
        transactionId: 'TRX-00001',
        tanggal: '2026-06-11',
        kasir: 'Admin',
        metode: 'Tunai',
        total: 50000,
        createdAt: '2026-06-11T12:00:00.000Z',
        status: 'Selesai',
        items: [
          { namaBarang: 'Kopi Susu', qty: 2, hargaSatuan: 15000, hargaModal: 8000 }, // Total modal = 16000
          { namaBarang: 'Roti Bakar', qty: 1, hargaSatuan: 20000, hargaModal: 12000 }, // Total modal = 12000
        ],
      },
    ];

    render(<TransactionTable transactions={transactions} {...defaultProps} />);

    // Verify column headers are in DOM
    expect(screen.getByText('Harga Modal (Rp)')).not.toBeNull();
    expect(screen.getByText('Keuntungan (Rp)')).not.toBeNull();

    // Total Modal = 2 * 8000 + 1 * 12000 = 28000 -> "Rp 28.000"
    // Nominal = 50000 -> "Rp 50.000"
    // Keuntungan = 50000 - 28000 = 22000 -> "Rp 22.000"

    expect(screen.getByText('Rp 28.000')).not.toBeNull();
    expect(screen.getByText('Rp 22.000')).not.toBeNull();
  });
});
