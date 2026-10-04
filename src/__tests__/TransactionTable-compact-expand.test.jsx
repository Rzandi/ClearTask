/* ═══════════════════════════════════════════════════════════
   TransactionTable-compact-expand.test.jsx — ClearTask (Roadmap 5.C)
   Tests for Mode Ringkas toggle and Expandable Row item breakdown
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionTable from '../components/TransactionTable';

vi.mock('../components/EditTransactionModal', () => ({ default: () => null }));
vi.mock('../components/ConfirmDialog', () => ({ default: () => null }));
vi.mock('../components/StrukModal', () => ({ default: () => null }));

describe('TransactionTable — Mode Ringkas & Expandable Row (Roadmap 5.C)', () => {
  const sampleTransactions = [
    {
      id: 'tx-1',
      transactionId: 'TRX-1001',
      tanggal: '2026-10-04',
      createdAt: '2026-10-04T10:00:00.000Z',
      kasir: 'Budi',
      metode: 'Tunai',
      total: 75000,
      status: 'Selesai',
      catatan: 'Pelanggan langganan',
      items: [
        {
          namaBarang: 'Kopi Kenangan Mantan',
          qty: 2,
          hargaSatuan: 25000,
          hargaModal: 15000,
          subKategori: 'Minuman Kopi',
        },
        {
          namaBarang: 'Roti Bakar Coklat',
          qty: 1,
          hargaSatuan: 25000,
          hargaModal: 12000,
          subKategori: 'Snack',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 13 columns by default (Mode Lengkap)', () => {
    render(
      <TransactionTable transactions={sampleTransactions} onUpdate={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByText('Harga Modal (Rp)')).not.toBeNull();
    expect(screen.getByText('Keuntungan (Rp)')).not.toBeNull();
    expect(screen.getByText('Sub-Kategori')).not.toBeNull();
    expect(screen.getByText('Mode Ringkas')).not.toBeNull();
  });

  it('switches to Mode Ringkas when toggle button is clicked', () => {
    render(
      <TransactionTable transactions={sampleTransactions} onUpdate={vi.fn()} onDelete={vi.fn()} />
    );

    const toggleBtn = screen.getByRole('button', { name: /Beralih ke mode ringkas/i });
    fireEvent.click(toggleBtn);

    // In Mode Ringkas, secondary column headers are hidden from table
    expect(screen.queryByText('Harga Modal (Rp)')).toBeNull();
    expect(screen.queryByText('Keuntungan (Rp)')).toBeNull();
    expect(screen.getByText('Tampilkan 13 Kolom')).not.toBeNull();
  });

  it('expands row to show item breakdown table when chevron is clicked', () => {
    render(
      <TransactionTable transactions={sampleTransactions} onUpdate={vi.fn()} onDelete={vi.fn()} />
    );

    const expandBtn = screen.getByRole('button', { name: /Buka rincian TRX-1001/i });
    fireEvent.click(expandBtn);

    // Detailed breakdown is now visible
    expect(screen.getAllByText('Kopi Kenangan Mantan').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Roti Bakar Coklat')).not.toBeNull();
    expect(screen.getByText('Minuman Kopi')).not.toBeNull();
    expect(screen.getAllByText(/Pelanggan langganan/).length).toBeGreaterThanOrEqual(2);
  });
});
