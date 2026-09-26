/**
 * useTransactions.softdelete.test.jsx
 * Verifikasi fix P0:
 * - totalCount tidak menghitung transaksi yang di-trash (deletedAt)
 * - recentTransactions tidak menampilkan transaksi yang di-trash
 * - useTransactionMetrics tidak menghitung transaksi yang di-trash
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTransactions } from '../hooks/useTransactions';
import { useTransactionMetrics } from '../hooks/useTransactionMetrics';
import { toLocalDateString } from '../utils/formatters';
import db from '../services/db';
import 'fake-indexeddb/auto';

beforeEach(async () => {
  await db.transactions.clear();
});

afterEach(async () => {
  await db.transactions.clear();
});

const today = toLocalDateString(new Date());

function makeTx(num, overrides = {}) {
  return {
    id: num,
    transactionId: `TRX-0000${num}`,
    tanggal: today,
    kategori: 'Makanan',
    items: [{ namaBarang: 'Kopi', qty: 1, hargaSatuan: 10000, total: 10000 }],
    total: 10000,
    metode: 'Tunai',
    kasir: 'Kasir 1',
    createdAt: new Date(1710000000000 + num * 60000).toISOString(),
    status: 'Selesai',
    ...overrides,
  };
}

describe('useTransactions — Soft Delete Filtering', () => {
  it('totalCount only counts active transactions (excludes deletedAt)', async () => {
    // Add 2 active transactions and 1 soft-deleted transaction
    await db.transactions.bulkAdd([
      makeTx(1),
      makeTx(2),
      makeTx(3, { deletedAt: new Date().toISOString() }),
    ]);

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.totalCount).toBe(2);
    });
  });

  it('recentTransactions excludes soft-deleted transactions', async () => {
    // 3 transactions: tx 3 is newest (highest createdAt), but deleted. tx 2 and tx 1 are active.
    await db.transactions.bulkAdd([
      makeTx(1, { createdAt: '2026-03-20T10:00:00Z' }),
      makeTx(2, { createdAt: '2026-03-20T11:00:00Z' }),
      makeTx(3, {
        createdAt: '2026-03-20T12:00:00Z',
        deletedAt: new Date().toISOString(),
      }),
    ]);

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.recentTransactions.length).toBe(2);
      expect(result.current.recentTransactions.map((tx) => tx.id)).toEqual([2, 1]);
    });
  });

  it('deleting a transaction updates totalCount and recentTransactions', async () => {
    await db.transactions.bulkAdd([
      makeTx(1, { createdAt: '2026-03-20T10:00:00Z' }),
      makeTx(2, { createdAt: '2026-03-20T11:00:00Z' }),
    ]);

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.totalCount).toBe(2);
      expect(result.current.recentTransactions.length).toBe(2);
    });

    await act(async () => {
      await result.current.deleteTransaction(2);
    });

    await waitFor(() => {
      expect(result.current.totalCount).toBe(1);
      expect(result.current.recentTransactions.length).toBe(1);
      expect(result.current.recentTransactions[0].id).toBe(1);
    });
  });

  it('restoring a transaction restores totalCount and recentTransactions', async () => {
    await db.transactions.bulkAdd([
      makeTx(1, { createdAt: '2026-03-20T10:00:00Z' }),
      makeTx(2, {
        createdAt: '2026-03-20T11:00:00Z',
        deletedAt: new Date().toISOString(),
      }),
    ]);

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.totalCount).toBe(1);
      expect(result.current.recentTransactions.length).toBe(1);
    });

    await act(async () => {
      await result.current.restoreTransaction(2);
    });

    await waitFor(() => {
      expect(result.current.totalCount).toBe(2);
      expect(result.current.recentTransactions.length).toBe(2);
    });
  });
});

describe('useTransactionMetrics — Soft Delete Filtering', () => {
  it('excludes soft-deleted transactions from today and yesterday metrics', async () => {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toLocalDateString(yesterdayDate);

    await db.transactions.bulkAdd([
      makeTx(1, { tanggal: today, total: 50000 }),
      makeTx(2, {
        tanggal: today,
        total: 30000,
        deletedAt: new Date().toISOString(),
      }),
      makeTx(3, { tanggal: yesterday, total: 40000 }),
      makeTx(4, {
        tanggal: yesterday,
        total: 20000,
        deletedAt: new Date().toISOString(),
      }),
    ]);

    const { result } = renderHook(() => useTransactionMetrics());

    await waitFor(() => {
      // todayTotal should be 50000 (ignoring 30000 deleted)
      expect(result.current.todayTotal).toBe(50000);
      // trendPercent: ((50000 - 40000) / 40000) * 100 = 25% (ignoring 20000 deleted from yesterday)
      expect(result.current.trendPercent).toBe(25);
      expect(result.current.isFirstDay).toBe(false);
    });
  });
});
