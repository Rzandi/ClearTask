/**
 * storage-edit.test.js
 * Unit tests (Task 7) dan Property tests (Task 8) untuk fungsi baru di storage.js
 *
 * Validates: Requirements 5.2, 5.3, 7.2, 7.5, 8.4, 9.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  saveTransactions,
  getTransactions,
  updateTransaction,
  deleteTransaction,
} from '../utils/storage';

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeTx(overrides = {}) {
  return {
    id: 1,
    transactionId: 'TRX-00001',
    tanggal: '2025-01-01',
    kategori: 'Elektronik',
    namaBarang: 'Laptop',
    qty: 1,
    hargaSatuan: 10000000,
    total: 10000000,
    metode: 'Tunai',
    catatan: '',
    kasir: 'Admin',
    createdAt: '2025-01-01T00:00:00.000Z',
    status: 'Selesai',
    ...overrides,
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — Unit Tests untuk storage.js (fungsi baru)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Task 7 — Unit Tests: updateTransaction', () => {
  // 7.1: updateTransaction memperbarui transaksi yang cocok dengan data baru
  it('7.1: memperbarui transaksi yang cocok dengan data baru', () => {
    const tx = makeTx({ id: 1, namaBarang: 'Laptop', qty: 1 });
    saveTransactions([tx]);

    updateTransaction(1, { namaBarang: 'Monitor', qty: 2 });

    const result = getTransactions().find((t) => t.id === 1);
    expect(result.namaBarang).toBe('Monitor');
    expect(result.qty).toBe(2);
  });

  // 7.2: updateTransaction tidak mengubah field immutable meskipun data update mencoba mengubahnya
  it('7.2: tidak mengubah field immutable (id, transactionId, createdAt, status) meskipun data update mencoba mengubahnya', () => {
    const tx = makeTx({
      id: 1,
      transactionId: 'TRX-00001',
      createdAt: '2025-01-01T00:00:00.000Z',
      status: 'Selesai',
    });
    saveTransactions([tx]);

    updateTransaction(1, {
      id: 9999,
      transactionId: 'HACKED',
      createdAt: 'HACKED',
      status: 'HACKED',
      namaBarang: 'Monitor',
    });

    const result = getTransactions().find((t) => t.id === 1);
    expect(result.id).toBe(1);
    expect(result.transactionId).toBe('TRX-00001');
    expect(result.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(result.status).toBe('Selesai');
    // Field yang boleh berubah tetap berubah
    expect(result.namaBarang).toBe('Monitor');
  });

  // 7.3: updateTransaction tidak mengubah transaksi lain dalam array
  it('7.3: tidak mengubah transaksi lain dalam array', () => {
    const tx1 = makeTx({ id: 1, namaBarang: 'Laptop' });
    const tx2 = makeTx({ id: 2, transactionId: 'TRX-00002', namaBarang: 'Mouse' });
    const tx3 = makeTx({ id: 3, transactionId: 'TRX-00003', namaBarang: 'Keyboard' });
    saveTransactions([tx1, tx2, tx3]);

    updateTransaction(1, { namaBarang: 'Monitor' });

    const transactions = getTransactions();
    const result2 = transactions.find((t) => t.id === 2);
    const result3 = transactions.find((t) => t.id === 3);

    expect(result2).toEqual(tx2);
    expect(result3).toEqual(tx3);
  });

  // 7.4: updateTransaction mengembalikan null jika id tidak ditemukan
  it('7.4: mengembalikan null jika id tidak ditemukan', () => {
    const tx = makeTx({ id: 1 });
    saveTransactions([tx]);

    const result = updateTransaction(999, { namaBarang: 'Monitor' });

    expect(result).toBeNull();
  });
});

describe('Task 7 — Unit Tests: deleteTransaction', () => {
  // 7.5: deleteTransaction menghapus transaksi yang cocok dari array
  it('7.5: menghapus transaksi yang cocok dari array', () => {
    const tx1 = makeTx({ id: 1 });
    const tx2 = makeTx({ id: 2, transactionId: 'TRX-00002' });
    saveTransactions([tx1, tx2]);

    deleteTransaction(1);

    const transactions = getTransactions();
    expect(transactions.find((t) => t.id === 1)).toBeUndefined();
    expect(transactions.find((t) => t.id === 2)).toBeDefined();
  });

  // 7.6: deleteTransaction mengurangi panjang array tepat 1
  it('7.6: mengurangi panjang array tepat 1', () => {
    const tx1 = makeTx({ id: 1 });
    const tx2 = makeTx({ id: 2, transactionId: 'TRX-00002' });
    const tx3 = makeTx({ id: 3, transactionId: 'TRX-00003' });
    saveTransactions([tx1, tx2, tx3]);

    deleteTransaction(2);

    expect(getTransactions()).toHaveLength(2);
  });

  // 7.7: deleteTransaction adalah no-op jika id tidak ditemukan (array tidak berubah)
  it('7.7: no-op jika id tidak ditemukan (array tidak berubah)', () => {
    const tx1 = makeTx({ id: 1 });
    const tx2 = makeTx({ id: 2, transactionId: 'TRX-00002' });
    saveTransactions([tx1, tx2]);

    deleteTransaction(999);

    const transactions = getTransactions();
    expect(transactions).toHaveLength(2);
    expect(transactions.find((t) => t.id === 1)).toBeDefined();
    expect(transactions.find((t) => t.id === 2)).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — Property Tests untuk storage.js menggunakan fast-check
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Generators ───────────────────────────────────────────────────────────────

const txArb = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  transactionId: fc.string({ minLength: 1, maxLength: 20 }),
  tanggal: fc.constant('2025-01-01'),
  kategori: fc.constant('Elektronik'),
  namaBarang: fc.string({ minLength: 1, maxLength: 50 }),
  qty: fc.integer({ min: 1, max: 100 }),
  hargaSatuan: fc.integer({ min: 0, max: 1000000 }),
  total: fc.integer({ min: 0, max: 100000000 }),
  metode: fc.constant('Tunai'),
  catatan: fc.constant(''),
  kasir: fc.constant('Admin'),
  createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
  status: fc.constant('Selesai'),
});

const updateDataArb = fc.record({
  namaBarang: fc.string({ minLength: 1, maxLength: 50 }),
  qty: fc.integer({ min: 1, max: 100 }),
  hargaSatuan: fc.integer({ min: 0, max: 1000000 }),
  id: fc.integer({ min: 9999, max: 99999 }),
  transactionId: fc.constant('HACKED'),
  createdAt: fc.constant('HACKED'),
  status: fc.constant('HACKED'),
});

describe('Task 8 — Property Tests: storage.js', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  // Property 4: Update mempertahankan field immutable
  it('Property 4: Update mempertahankan field immutable — Validates: Requirements 5.3', () => {
    // Feature: edit-transaction, Property 4: Update mempertahankan field immutable
    fc.assert(
      fc.property(txArb, updateDataArb, (tx, updateData) => {
        localStorage.clear();
        saveTransactions([tx]);
        updateTransaction(tx.id, updateData);
        const result = getTransactions().find((t) => t.id === tx.id);
        return (
          result.id === tx.id &&
          result.transactionId === tx.transactionId &&
          result.createdAt === tx.createdAt &&
          result.status === tx.status
        );
      })
    );
  });

  // Property 5: Update hanya mengubah transaksi target
  it('Property 5: Update hanya mengubah transaksi target — Validates: Requirements 5.2', () => {
    // Feature: edit-transaction, Property 5: Update hanya mengubah transaksi target
    // Array dengan 2+ transaksi, update satu, verifikasi yang lain tidak berubah
    const twoDistinctTxArb = fc
      .tuple(txArb, txArb)
      .filter(([a, b]) => a.id !== b.id);

    fc.assert(
      fc.property(twoDistinctTxArb, updateDataArb, ([tx1, tx2], updateData) => {
        localStorage.clear();
        saveTransactions([tx1, tx2]);
        updateTransaction(tx1.id, updateData);

        const transactions = getTransactions();
        const unchanged = transactions.find((t) => t.id === tx2.id);

        // tx2 harus identik dengan kondisi sebelum update
        return JSON.stringify(unchanged) === JSON.stringify(tx2);
      })
    );
  });

  // Property 6: Delete menghapus tepat satu
  it('Property 6: Delete menghapus tepat satu — Validates: Requirements 7.2', () => {
    // Feature: edit-transaction, Property 6: Delete menghapus tepat satu
    // Array dengan transaksi yang ada, delete, verifikasi panjang berkurang 1 dan id tidak ada
    const nonEmptyArrayArb = fc
      .array(txArb, { minLength: 1, maxLength: 10 })
      .chain((arr) => {
        // Pastikan semua id unik
        const uniqueArr = arr.filter(
          (tx, idx, self) => self.findIndex((t) => t.id === tx.id) === idx
        );
        if (uniqueArr.length === 0) return fc.constant(null);
        return fc
          .integer({ min: 0, max: uniqueArr.length - 1 })
          .map((idx) => ({ arr: uniqueArr, targetId: uniqueArr[idx].id }));
      })
      .filter((v) => v !== null);

    fc.assert(
      fc.property(nonEmptyArrayArb, ({ arr, targetId }) => {
        localStorage.clear();
        saveTransactions(arr);
        const beforeLength = getTransactions().length;

        deleteTransaction(targetId);

        const after = getTransactions();
        return (
          after.length === beforeLength - 1 &&
          after.find((t) => t.id === targetId) === undefined
        );
      })
    );
  });

  // Property 7: Delete ID tidak valid adalah no-op
  it('Property 7: Delete ID tidak valid adalah no-op — Validates: Requirements 7.5', () => {
    // Feature: edit-transaction, Property 7: Delete ID tidak valid adalah no-op
    // Array dengan transaksi, delete id yang tidak ada, verifikasi array identik
    const arrayWithMissingIdArb = fc
      .array(txArb, { minLength: 1, maxLength: 10 })
      .chain((arr) => {
        const uniqueArr = arr.filter(
          (tx, idx, self) => self.findIndex((t) => t.id === tx.id) === idx
        );
        const existingIds = new Set(uniqueArr.map((t) => t.id));
        // Pilih id yang pasti tidak ada dalam array
        return fc
          .integer({ min: 10001, max: 99999 })
          .filter((id) => !existingIds.has(id))
          .map((missingId) => ({ arr: uniqueArr, missingId }));
      });

    fc.assert(
      fc.property(arrayWithMissingIdArb, ({ arr, missingId }) => {
        localStorage.clear();
        saveTransactions(arr);
        const before = getTransactions();

        deleteTransaction(missingId);

        const after = getTransactions();
        return JSON.stringify(after) === JSON.stringify(before);
      })
    );
  });
});
