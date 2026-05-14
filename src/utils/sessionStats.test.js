/* ═══════════════════════════════════════════════════════════
   sessionStats.test.js — ClearTask
   Unit + Property-based tests for session statistics calculation
   Feature: session-management
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateSessionStats } from './sessionStats';

// ── Fixtures ──────────────────────────────────────────────

const sampleSession = {
  id: 'session-001',
  nama: 'Shift Pagi',
  tanggalMulai: '2025-07-14',
  waktuMulai: '2025-07-14T01:00:00.000Z',
  tanggalTutup: '2025-07-14',
  waktuTutup: '2025-07-14T05:00:00.000Z',
  status: 'ditutup',
};

const sampleTransaction1 = {
  id: 1,
  transactionId: 'TRX-00001',
  tanggal: '2025-07-14',
  createdAt: '2025-07-14T08:30:00.000Z',
  kasir: 'Admin',
  kategori: 'Makanan',
  namaBarang: 'Nasi Goreng',
  qty: 2,
  hargaSatuan: 15000,
  total: 30000,
  metode: 'Tunai',
  catatan: '',
  status: 'Selesai',
  sessionId: 'session-001',
};

const sampleTransaction2 = {
  id: 2,
  transactionId: 'TRX-00002',
  tanggal: '2025-07-14',
  createdAt: '2025-07-14T09:00:00.000Z',
  kasir: 'Admin',
  kategori: 'Minuman',
  namaBarang: 'Es Teh',
  qty: 3,
  hargaSatuan: 5000,
  total: 15000,
  metode: 'QRIS',
  catatan: '',
  status: 'Selesai',
  sessionId: 'session-001',
};

const sampleTransaction3 = {
  id: 3,
  transactionId: 'TRX-00003',
  tanggal: '2025-07-14',
  createdAt: '2025-07-14T09:30:00.000Z',
  kasir: 'Admin',
  kategori: 'Makanan',
  namaBarang: 'Mie Goreng',
  qty: 1,
  hargaSatuan: 20000,
  total: 20000,
  metode: 'Tunai',
  catatan: '',
  status: 'Selesai',
  sessionId: 'session-001',
};

// ── Unit Tests ────────────────────────────────────────────

describe('calculateSessionStats — empty transactions', () => {
  // 8.1 — Session without transactions returns stats with zero values
  it('returns stats with all zero values and empty arrays when no transactions', () => {
    const stats = calculateSessionStats(sampleSession, []);

    expect(stats.session).toBe(sampleSession);
    expect(stats.totalTransaksi).toBe(0);
    expect(stats.totalPemasukan).toBe(0);
    expect(stats.breakdownKategori).toEqual([]);
    expect(stats.breakdownMetode).toEqual([]);
    expect(stats.transaksiTertinggi).toBeNull();
    expect(stats.transaksiTerendah).toBeNull();
  });
});

describe('calculateSessionStats — single transaction', () => {
  // 8.2 — One transaction: transaksiTertinggi and transaksiTerendah are the same
  it('returns the same transaction for both highest and lowest when only one transaction', () => {
    const stats = calculateSessionStats(sampleSession, [sampleTransaction1]);

    expect(stats.totalTransaksi).toBe(1);
    expect(stats.totalPemasukan).toBe(30000);
    expect(stats.transaksiTertinggi).toBe(sampleTransaction1);
    expect(stats.transaksiTerendah).toBe(sampleTransaction1);
  });
});

describe('calculateSessionStats — multiple transactions', () => {
  it('calculates correct totals for multiple transactions', () => {
    const transactions = [sampleTransaction1, sampleTransaction2, sampleTransaction3];
    const stats = calculateSessionStats(sampleSession, transactions);

    expect(stats.totalTransaksi).toBe(3);
    expect(stats.totalPemasukan).toBe(65000); // 30000 + 15000 + 20000
  });

  it('identifies correct highest and lowest transactions', () => {
    const transactions = [sampleTransaction1, sampleTransaction2, sampleTransaction3];
    const stats = calculateSessionStats(sampleSession, transactions);

    expect(stats.transaksiTertinggi).toBe(sampleTransaction1); // 30000
    expect(stats.transaksiTerendah).toBe(sampleTransaction2); // 15000
  });

  it('groups transactions by kategori correctly', () => {
    const transactions = [sampleTransaction1, sampleTransaction2, sampleTransaction3];
    const stats = calculateSessionStats(sampleSession, transactions);

    expect(stats.breakdownKategori).toHaveLength(2);

    const makanan = stats.breakdownKategori.find((b) => b.kategori === 'Makanan');
    expect(makanan).toBeDefined();
    expect(makanan.jumlahTransaksi).toBe(2);
    expect(makanan.totalPemasukan).toBe(50000); // 30000 + 20000

    const minuman = stats.breakdownKategori.find((b) => b.kategori === 'Minuman');
    expect(minuman).toBeDefined();
    expect(minuman.jumlahTransaksi).toBe(1);
    expect(minuman.totalPemasukan).toBe(15000);
  });

  it('groups transactions by metode correctly', () => {
    const transactions = [sampleTransaction1, sampleTransaction2, sampleTransaction3];
    const stats = calculateSessionStats(sampleSession, transactions);

    expect(stats.breakdownMetode).toHaveLength(2);

    const tunai = stats.breakdownMetode.find((b) => b.metode === 'Tunai');
    expect(tunai).toBeDefined();
    expect(tunai.jumlahTransaksi).toBe(2);
    expect(tunai.totalPemasukan).toBe(50000); // 30000 + 20000

    const qris = stats.breakdownMetode.find((b) => b.metode === 'QRIS');
    expect(qris).toBeDefined();
    expect(qris.jumlahTransaksi).toBe(1);
    expect(qris.totalPemasukan).toBe(15000);
  });
});

// ── Property-Based Tests ──────────────────────────────────

describe('PBT — Property 9: totalPemasukan and totalTransaksi always accurate', () => {
  // 8.3 — Validates: Requirements 4.7, 4.8
  it('totalPemasukan equals sum of all totals and totalTransaksi equals array length', () => {
    const arbTransaction = fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      transactionId: fc.string({ minLength: 1, maxLength: 15 }),
      tanggal: fc.constant('2025-01-01'),
      createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
      kasir: fc.string({ minLength: 1, maxLength: 15 }),
      kategori: fc.constantFrom('Makanan', 'Minuman', 'Snack'),
      namaBarang: fc.string({ minLength: 1, maxLength: 20 }),
      qty: fc.integer({ min: 1, max: 100 }),
      hargaSatuan: fc.integer({ min: 1000, max: 100000 }),
      total: fc.integer({ min: 1000, max: 1000000 }),
      metode: fc.constantFrom('Tunai', 'QRIS', 'Transfer'),
      catatan: fc.string({ minLength: 0, maxLength: 30 }),
      status: fc.constant('Selesai'),
      sessionId: fc.constant('session-001'),
    });

    fc.assert(
      fc.property(fc.array(arbTransaction, { minLength: 0, maxLength: 50 }), (transactions) => {
        const stats = calculateSessionStats(sampleSession, transactions);

        const expectedTotal = transactions.reduce((sum, tx) => sum + tx.total, 0);
        expect(stats.totalPemasukan).toBe(expectedTotal);
        expect(stats.totalTransaksi).toBe(transactions.length);
      }),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 10: breakdown kategori covers all transactions', () => {
  // 8.4 — Validates: Requirements 4.9
  it('sum of jumlahTransaksi from all breakdownKategori entries equals totalTransaksi', () => {
    const arbTransaction = fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      transactionId: fc.string({ minLength: 1, maxLength: 15 }),
      tanggal: fc.constant('2025-01-01'),
      createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
      kasir: fc.string({ minLength: 1, maxLength: 15 }),
      kategori: fc.constantFrom('Makanan', 'Minuman', 'Snack', 'Lainnya'),
      namaBarang: fc.string({ minLength: 1, maxLength: 20 }),
      qty: fc.integer({ min: 1, max: 100 }),
      hargaSatuan: fc.integer({ min: 1000, max: 100000 }),
      total: fc.integer({ min: 1000, max: 1000000 }),
      metode: fc.constantFrom('Tunai', 'QRIS', 'Transfer'),
      catatan: fc.string({ minLength: 0, maxLength: 30 }),
      status: fc.constant('Selesai'),
      sessionId: fc.constant('session-001'),
    });

    fc.assert(
      fc.property(fc.array(arbTransaction, { minLength: 1, maxLength: 50 }), (transactions) => {
        const stats = calculateSessionStats(sampleSession, transactions);

        const sumFromBreakdown = stats.breakdownKategori.reduce(
          (sum, b) => sum + b.jumlahTransaksi,
          0
        );

        expect(sumFromBreakdown).toBe(stats.totalTransaksi);

        // Also verify totalPemasukan from breakdown matches overall total
        const sumPemasukanFromBreakdown = stats.breakdownKategori.reduce(
          (sum, b) => sum + b.totalPemasukan,
          0
        );
        expect(sumPemasukanFromBreakdown).toBe(stats.totalPemasukan);
      }),
      { numRuns: 100 }
    );
  });
});
