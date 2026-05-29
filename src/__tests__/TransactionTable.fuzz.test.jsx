import { describe, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import TransactionTable from '../components/TransactionTable';

import { toLocalDateString } from '../utils/formatters';

vi.mock('../components/EditTransactionModal', () => ({
  default: () => <div data-testid="edit-modal" />,
}));
vi.mock('../components/ConfirmDialog', () => ({
  default: () => <div data-testid="confirm-dialog" />,
}));

const arbTransaction = fc.record({
  id: fc.integer({ min: 1 }),
  transactionId: fc.string({ minLength: 1, maxLength: 50 }),
  tanggal: fc
    .date({ min: new Date('2000-01-01T00:00:00Z'), max: new Date('2100-01-01T00:00:00Z') })
    .map((d) => (Number.isNaN(d.getTime()) ? toLocalDateString(new Date()) : toLocalDateString(d))),
  kategori: fc.string(),
  subKategori: fc.oneof(fc.string(), fc.constant(undefined)),
  namaBarang: fc.string(),
  qty: fc.integer({ min: -100, max: 1000000 }),
  hargaSatuan: fc.integer({ min: -1000, max: 1000000000 }),
  total: fc.integer({ min: -100000, max: 2000000000 }),
  metode: fc.string(),
  catatan: fc.string(),
  kasir: fc.string(),
  createdAt: fc
    .date({ min: new Date('2000-01-01T00:00:00Z'), max: new Date('2100-01-01T00:00:00Z') })
    .map((d) => (Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString())),
  status: fc.string(),
});

describe('TransactionTable — Fuzz Testing', () => {
  it.skip('does not crash when rendering massive arrays of random transactions', () => {
    fc.assert(
      fc.property(fc.array(arbTransaction, { maxLength: 200 }), (transactions) => {
        const { unmount } = render(
          <TransactionTable transactions={transactions} onUpdate={vi.fn()} onDelete={vi.fn()} />
        );
        // If it renders without throwing, the test passes
        unmount();
      }),
      { numRuns: 50 }
    );
  });
});
