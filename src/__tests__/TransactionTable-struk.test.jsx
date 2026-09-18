/* ═══════════════════════════════════════════════════════════
   TransactionTable-struk.test.jsx — ClearTask
   Sprint 6 S6.5: Unit test tombol struk dan StrukModal preview
   di TransactionTable (fitur baru Sprint 3 kita).
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionTable from '../components/TransactionTable';

// Mock StrukModal — cukup verifikasi ia di-render dengan order yang benar
vi.mock('../components/StrukModal', () => ({
  default: ({ order, onClose }) => (
    <div data-testid="struk-modal">
      <span data-testid="struk-tx-id">{order?.transactionId}</span>
      <button data-testid="struk-close-btn" onClick={onClose}>
        Tutup
      </button>
    </div>
  ),
}));

// Mock EditTransactionModal agar tidak perlu full render
vi.mock('../components/EditTransactionModal', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="edit-modal-open" /> : null),
}));

// Mock ConfirmDialog
vi.mock('../components/ConfirmDialog', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="confirm-dialog-open" /> : null),
}));

// ─── Helpers ─────────────────────────────────────────────

function makeTx(overrides = {}) {
  return {
    id: 1,
    transactionId: 'TRX-00001',
    tanggal: '2025-01-15',
    kasir: 'Admin',
    metode: 'Tunai',
    total: 30000,
    uangDiterima: 50000,
    kembalian: 20000,
    catatan: '',
    createdAt: '2025-01-15T08:00:00.000Z',
    status: 'Selesai',
    items: [{ namaBarang: 'Nasi Goreng', qty: 2, hargaSatuan: 15000, total: 30000 }],
    ...overrides,
  };
}

function renderTable(transactions = [makeTx()]) {
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const { container } = render(
    <TransactionTable transactions={transactions} onUpdate={onUpdate} onDelete={onDelete} />
  );
  return { container, onUpdate, onDelete };
}

// ═══════════════════════════════════════════════════════════
// Render tombol struk
// ═══════════════════════════════════════════════════════════

describe('TransactionTable — tombol struk', () => {
  it('menampilkan tombol "Lihat Struk" di kolom Aksi', () => {
    renderTable();
    const strutBtn = screen.getByRole('button', {
      name: /lihat struk transaksi TRX-00001/i,
    });
    expect(strutBtn).toBeInTheDocument();
  });

  it('ada 3 tombol aksi per baris: struk, edit, hapus', () => {
    renderTable();
    const strucBtn = screen.getByLabelText(/lihat struk/i);
    const editBtn = screen.getByLabelText(/edit transaksi/i);
    const deleteBtn = screen.getByLabelText(/hapus transaksi/i);
    expect(strucBtn).toBeInTheDocument();
    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();
  });

  it('tidak menampilkan tombol aksi jika transactions kosong', () => {
    renderTable([]);
    const strucBtns = screen.queryAllByLabelText(/lihat struk/i);
    expect(strucBtns).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════
// Klik struk → buka StrukModal
// ═══════════════════════════════════════════════════════════

describe('TransactionTable — klik struk membuka StrukModal', () => {
  it('StrukModal tidak muncul sebelum tombol diklik', () => {
    renderTable();
    expect(screen.queryByTestId('struk-modal')).not.toBeInTheDocument();
  });

  it('klik tombol struk → StrukModal muncul', () => {
    renderTable();
    const strutBtn = screen.getByLabelText(/lihat struk/i);
    fireEvent.click(strutBtn);
    expect(screen.getByTestId('struk-modal')).toBeInTheDocument();
  });

  it('StrukModal menerima transactionId yang benar', () => {
    renderTable([makeTx({ transactionId: 'TRX-TESTING' })]);
    const strutBtn = screen.getByLabelText(/lihat struk transaksi TRX-TESTING/i);
    fireEvent.click(strutBtn);
    expect(screen.getByTestId('struk-tx-id').textContent).toBe('TRX-TESTING');
  });

  it('tutup StrukModal → modal hilang', () => {
    renderTable();
    fireEvent.click(screen.getByLabelText(/lihat struk/i));
    expect(screen.getByTestId('struk-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('struk-close-btn'));
    expect(screen.queryByTestId('struk-modal')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// Multi-row: benar membuka struk row yang diklik
// ═══════════════════════════════════════════════════════════

describe('TransactionTable — multi row struk', () => {
  it('klik struk baris ke-2 membuka modal dengan transactionId baris ke-2', () => {
    const txs = [
      makeTx({ id: 1, transactionId: 'TRX-ALPHA' }),
      makeTx({ id: 2, transactionId: 'TRX-BETA' }),
      makeTx({ id: 3, transactionId: 'TRX-GAMMA' }),
    ];
    renderTable(txs);

    const strucBtns = screen.getAllByLabelText(/lihat struk/i);
    expect(strucBtns).toHaveLength(3);

    // Klik row ke-2 (TRX-BETA)
    fireEvent.click(strucBtns[1]);
    expect(screen.getByTestId('struk-tx-id').textContent).toBe('TRX-BETA');
  });

  it('tutup modal lalu buka struk row berbeda → modal update dengan data baru', () => {
    const txs = [
      makeTx({ id: 1, transactionId: 'TRX-FIRST' }),
      makeTx({ id: 2, transactionId: 'TRX-SECOND' }),
    ];
    renderTable(txs);

    const [btnFirst, btnSecond] = screen.getAllByLabelText(/lihat struk/i);

    // Buka first
    fireEvent.click(btnFirst);
    expect(screen.getByTestId('struk-tx-id').textContent).toBe('TRX-FIRST');

    // Tutup
    fireEvent.click(screen.getByTestId('struk-close-btn'));
    expect(screen.queryByTestId('struk-modal')).not.toBeInTheDocument();

    // Buka second
    fireEvent.click(btnSecond);
    expect(screen.getByTestId('struk-tx-id').textContent).toBe('TRX-SECOND');
  });
});

// ═══════════════════════════════════════════════════════════
// Tombol struk tidak mengganggu tombol Edit dan Hapus
// ═══════════════════════════════════════════════════════════

describe('TransactionTable — isolasi tombol aksi', () => {
  it('klik tombol edit tidak membuka StrukModal', () => {
    renderTable();
    fireEvent.click(screen.getByLabelText(/edit transaksi/i));
    expect(screen.queryByTestId('struk-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('edit-modal-open')).toBeInTheDocument();
  });

  it('klik tombol hapus tidak membuka StrukModal', () => {
    renderTable();
    fireEvent.click(screen.getByLabelText(/hapus transaksi/i));
    expect(screen.queryByTestId('struk-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('confirm-dialog-open')).toBeInTheDocument();
  });
});
