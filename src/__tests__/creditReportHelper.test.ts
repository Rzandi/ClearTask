import { describe, it, expect, beforeEach, vi } from 'vitest';
import db from '../services/db';
import {
  calculateAgingBuckets,
  getTopDebtors,
  exportCustomerCreditReportCSV,
  exportAgingReportCSV,
} from '../utils/creditReportHelper';
import * as downloadHelper from '../utils/downloadHelper';
import type { Customer, CreditLedger } from '../types';

describe('creditReportHelper - W4-02 Phase 5', () => {
  beforeEach(async () => {
    await db.customers.clear();
    await db.credit_ledger.clear();
    vi.restoreAllMocks();
  });

  const mockCustomer = (id: string, nama: string, totalHutang: number): Customer => ({
    id,
    nama,
    telepon: '0812345678',
    alamat: 'Jl. Test No. 1',
    totalHutang,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    syncStatus: 'local',
  });

  const mockLedger = (
    id: string,
    customerId: string,
    sisaHutang: number,
    tanggalJatuhTempo?: string
  ): CreditLedger => ({
    id,
    customerId,
    transactionId: `TX-${id}`,
    jumlahKredit: sisaHutang,
    sisaHutang,
    tanggalTransaksi: '2026-08-01',
    tanggalJatuhTempo,
    status: 'belum_lunas',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    syncStatus: 'local',
  });

  describe('calculateAgingBuckets', () => {
    it('accurately groups unpaid ledgers into 4 aging tiers', async () => {
      const refDate = '2026-10-15';

      // 1. Current (due 2026-10-20, not yet due)
      await db.credit_ledger.add(mockLedger('L1', 'C1', 100000, '2026-10-20'));

      // 2. 1-30 days overdue (due 2026-10-05 = 10 days overdue)
      await db.credit_ledger.add(mockLedger('L2', 'C1', 200000, '2026-10-05'));

      // 3. 31-60 days overdue (due 2026-09-05 = 40 days overdue)
      await db.credit_ledger.add(mockLedger('L3', 'C1', 300000, '2026-09-05'));

      // 4. >60 days overdue (due 2026-07-15 = ~92 days overdue)
      await db.credit_ledger.add(mockLedger('L4', 'C1', 400000, '2026-07-15'));

      // 5. Ledger without due date (falls into current)
      await db.credit_ledger.add(mockLedger('L5', 'C1', 50000, undefined));

      const report = await calculateAgingBuckets(refDate);

      expect(report.totalAmount).toBe(1050000);
      expect(report.totalUnpaidCount).toBe(5);

      // Current bucket (100k + 50k = 150k)
      expect(report.buckets.current.amount).toBe(150000);
      expect(report.buckets.current.count).toBe(2);

      // 1-30 days bucket (200k)
      expect(report.buckets.days1_30.amount).toBe(200000);
      expect(report.buckets.days1_30.count).toBe(1);

      // 31-60 days bucket (300k)
      expect(report.buckets.days31_60.amount).toBe(300000);
      expect(report.buckets.days31_60.count).toBe(1);

      // >60 days bucket (400k)
      expect(report.buckets.over60.amount).toBe(400000);
      expect(report.buckets.over60.count).toBe(1);

      // Overdue totals: 200k + 300k + 400k = 900k
      expect(report.overdueAmount).toBe(900000);
      expect(report.overdueCount).toBe(3);

      // Check percentage calculation
      expect(report.buckets.current.percentage).toBeCloseTo((150000 / 1050000) * 100, 1);
    });

    it('handles empty database gracefully with 0 totals and 0 percentages', async () => {
      const report = await calculateAgingBuckets();
      expect(report.totalAmount).toBe(0);
      expect(report.totalUnpaidCount).toBe(0);
      expect(report.overdueAmount).toBe(0);
      expect(report.buckets.current.amount).toBe(0);
      expect(report.buckets.current.percentage).toBe(0);
    });
  });

  describe('getTopDebtors', () => {
    it('returns customers sorted by total debt descending up to the limit', async () => {
      await db.customers.bulkAdd([
        mockCustomer('c1', 'Andi', 50000),
        mockCustomer('c2', 'Budi', 300000),
        mockCustomer('c3', 'Citra', 150000),
        mockCustomer('c4', 'Doni', 0), // Should be excluded (0 debt)
      ]);

      const top = await getTopDebtors(2);
      expect(top).toHaveLength(2);
      expect(top[0]?.nama).toBe('Budi');
      expect(top[0]?.totalHutang).toBe(300000);
      expect(top[1]?.nama).toBe('Citra');
      expect(top[1]?.totalHutang).toBe(150000);
    });
  });

  describe('CSV Exports', () => {
    it('exports customer credit report CSV with triggerDownload', async () => {
      const spy = vi.spyOn(downloadHelper, 'triggerDownload').mockImplementation(() => {});

      await db.customers.add(mockCustomer('c1', 'Toko Berkah', 250000));
      await db.credit_ledger.add(mockLedger('l1', 'c1', 250000, '2026-10-01'));

      await exportCustomerCreditReportCSV('2026-10-10');

      expect(spy).toHaveBeenCalledTimes(1);
      const [blob, filename] = spy.mock.calls[0] as [Blob, string];
      expect(filename).toContain('laporan-piutang-pelanggan-2026-10-10.csv');
      expect(blob.type).toContain('text/csv');
    });

    it('exports aging report CSV with triggerDownload', async () => {
      const spy = vi.spyOn(downloadHelper, 'triggerDownload').mockImplementation(() => {});

      await db.credit_ledger.add(mockLedger('l1', 'c1', 100000, '2026-10-01'));

      await exportAgingReportCSV('2026-10-10');

      expect(spy).toHaveBeenCalledTimes(1);
      const [blob, filename] = spy.mock.calls[0] as [Blob, string];
      expect(filename).toContain('laporan-aging-piutang-2026-10-10.csv');
      expect(blob.type).toContain('text/csv');
    });
  });
});
