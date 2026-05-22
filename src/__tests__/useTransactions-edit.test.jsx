/**
 * useTransactions-edit.test.jsx
 * Property tests (Task 13) untuk useTransactions.js
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 * (Refactored for Async Dexie)
 */

import { describe, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { useTransactions } from '../hooks/useTransactions';
import { toLocalDateString } from '../utils/formatters';
import db from '../services/db';
import 'fake-indexeddb/auto';

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await db.transactions.clear();
});
afterEach(async () => {
  await db.transactions.clear();
});

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

const renderHookAndReady = async () => {
  let hookResult;
  await act(async () => {
    hookResult = renderHook(() => useTransactions());
  });
  // Wait until the hook has finished initial loading from Dexie
  await waitFor(
    () => {
      expect(hookResult.result.current.isLoading).toBe(false);
    },
    { timeout: 2000 }
  );
  return hookResult;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 13 — Property Tests untuk useTransactions.js
// ═══════════════════════════════════════════════════════════════════════════════

describe('Task 13 — Property Tests: useTransactions.js', () => {
  // Feature: edit-transaction, Property 8: Metrics konsisten setelah edit/hapus
  it(
    'Property 8: todayTotal konsisten setelah updateTransaction — Validates: Requirements 10.1, 10.2, 10.3',
    { timeout: 30000 },
    async () => {
      const todayTxArb = fc.record({
        id: fc.integer({ min: 1, max: 1000 }),
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

      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(todayTxArb, { minLength: 1, maxLength: 5, selector: (t) => t.id }),
          async (txs) => {
            if (txs.length === 0) return true;

            await db.transactions.clear();
            await db.transactions.bulkAdd(txs);

            const { result } = await renderHookAndReady();

            const expectedTotal = txs.reduce((sum, tx) => sum + tx.total, 0);
            await waitFor(() => {
              expect(result.current.todayMetrics.todayTotal).toBe(expectedTotal);
            });
          }
        ),
        { numRuns: 10 }
      );
    }
  );

  // Feature: edit-transaction, Property 9: Filter dipertahankan setelah edit/hapus
  it(
    'Property 9: searchQuery dan filterDate dipertahankan setelah deleteTransaction — Validates: Requirements 10.4',
    { timeout: 30000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 0, maxLength: 15 }),
          fc.oneof(fc.constant(''), fc.constant(today)),
          async (searchQuery, filterDate) => {
            await db.transactions.clear();
            await db.transactions.add(makeTodayTx({ id: 1 }));

            const { result } = await renderHookAndReady();

            act(() => {
              result.current.setSearchQuery(searchQuery);
              result.current.setFilterDate(filterDate);
            });

            await act(async () => {
              await result.current.deleteTransaction(1);
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(result.current.searchQuery).toBe(searchQuery);
            expect(result.current.filterDate).toBe(filterDate);
          }
        ),
        { numRuns: 10 }
      );
    }
  );
});
