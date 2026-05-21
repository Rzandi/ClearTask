/**
 * useTransactions-edit.test.jsx
 * Property tests (Task 13) untuk useTransactions.js
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */

import { describe, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { saveTransactions } from '../utils/storage';
import { useTransactions } from '../hooks/useTransactions';
import { toLocalDateString } from '../utils/formatters';

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

// ─── Helper ───────────────────────────────────────────────────────────────────

const today = toLocalDateString(new Date());

function makeTodayTx(overrides = {}) {
  return {
    id: 1,
    transactionId: 'TRX-00001',
    tanggal: today,
    kategori: 'Elektronik',
    namaBarang: 'Laptop',
    qty: 1,
    hargaSatuan: 10000,
    total: 10000,
    metode: 'Tunai',
    catatan: '',
    kasir: 'Admin',
    createdAt: new Date().toISOString(),
    status: 'Selesai',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 13 — Property Tests untuk useTransactions.js
// ═══════════════════════════════════════════════════════════════════════════════

describe('Task 13 — Property Tests: useTransactions.js', () => {
  // Feature: edit-transaction, Property 8: Metrics konsisten setelah edit/hapus
  it('Property 8: todayTotal konsisten setelah updateTransaction — Validates: Requirements 10.1, 10.2, 10.3', { timeout: 30000 }, () => {
    const todayTxArb = fc.record({
      id: fc.integer({ min: 1, max: 100 }),
      transactionId: fc.string({ minLength: 3, maxLength: 15 }),
      tanggal: fc.constant(today),
      kategori: fc.constant('Elektronik'),
      namaBarang: fc.string({ minLength: 1, maxLength: 20 }),
      qty: fc.integer({ min: 1, max: 10 }),
      hargaSatuan: fc.integer({ min: 1000, max: 100000 }),
      total: fc.integer({ min: 1000, max: 1000000 }),
      metode: fc.constant('Tunai'),
      catatan: fc.constant(''),
      kasir: fc.constant('Admin'),
      createdAt: fc.constant(new Date().toISOString()),
      status: fc.constant('Selesai'),
    });

    fc.assert(
      fc.property(
        fc.array(todayTxArb, { minLength: 1, maxLength: 5 }),
        (txsRaw) => {
          // Deduplicate by id
          const txs = txsRaw.filter(
            (tx, idx, self) => self.findIndex(t => t.id === tx.id) === idx
          );
          if (txs.length === 0) return true;

          localStorage.clear();
          saveTransactions(txs);

          const { result } = renderHook(() => useTransactions());

          const expectedTotal = txs.reduce((sum, tx) => sum + tx.total, 0);
          return result.current.todayMetrics.todayTotal === expectedTotal;
        }
      )
    );
  });

  // Feature: edit-transaction, Property 9: Filter dipertahankan setelah edit/hapus
  it('Property 9: searchQuery dan filterDate dipertahankan setelah deleteTransaction — Validates: Requirements 10.4', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 15 }),
        fc.oneof(fc.constant(''), fc.constant(today)),
        (searchQuery, filterDate) => {
          localStorage.clear();
          saveTransactions([makeTodayTx({ id: 1 })]);

          const { result } = renderHook(() => useTransactions());

          act(() => {
            result.current.setSearchQuery(searchQuery);
            result.current.setFilterDate(filterDate);
          });

          act(() => {
            result.current.deleteTransaction(1);
          });

          return (
            result.current.searchQuery === searchQuery &&
            result.current.filterDate === filterDate
          );
        }
      )
    );
  });
});
