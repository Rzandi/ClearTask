import { describe, it, expect } from 'vitest';
import {
  isLedgerOverdue,
  getDaysOverdue,
  getCreditStatus,
  getCreditStatusBadge,
  allocatePaymentFIFO,
  generateWhatsAppReminderUrl,
} from '../utils/creditHelper';
import type { CreditLedger, Customer } from '../types';

describe('creditHelper - W4-02 Phase 4', () => {
  const mockLedger = (overrides: Partial<CreditLedger> = {}): CreditLedger => ({
    id: 'ledger-1',
    transactionId: 'TX-001',
    customerId: 'cust-1',
    jumlahKredit: 100000,
    sisaHutang: 100000,
    tanggalTransaksi: '2026-10-01',
    tanggalJatuhTempo: '2026-10-10',
    status: 'belum_lunas',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    syncStatus: 'local',
    ...overrides,
  });

  describe('isLedgerOverdue', () => {
    it('returns true when due date has passed reference date and ledger is unpaid', () => {
      const ledger = mockLedger({ tanggalJatuhTempo: '2026-10-05', sisaHutang: 50000 });
      expect(isLedgerOverdue(ledger, '2026-10-10')).toBe(true);
    });

    it('returns false when due date is in the future', () => {
      const ledger = mockLedger({ tanggalJatuhTempo: '2026-10-15' });
      expect(isLedgerOverdue(ledger, '2026-10-10')).toBe(false);
    });

    it('returns false when status is lunas even if due date has passed', () => {
      const ledger = mockLedger({
        status: 'lunas',
        sisaHutang: 0,
        tanggalJatuhTempo: '2026-10-01',
      });
      expect(isLedgerOverdue(ledger, '2026-10-10')).toBe(false);
    });

    it('returns false when tanggalJatuhTempo is not set', () => {
      const ledger = mockLedger({ tanggalJatuhTempo: undefined });
      expect(isLedgerOverdue(ledger, '2026-10-10')).toBe(false);
    });
  });

  describe('getDaysOverdue', () => {
    it('calculates the exact number of days late', () => {
      const ledger = mockLedger({ tanggalJatuhTempo: '2026-10-05' });
      expect(getDaysOverdue(ledger, '2026-10-10')).toBe(5);
    });

    it('returns 0 when not overdue', () => {
      const ledger = mockLedger({ tanggalJatuhTempo: '2026-10-15' });
      expect(getDaysOverdue(ledger, '2026-10-10')).toBe(0);
    });
  });

  describe('getCreditStatus & getCreditStatusBadge', () => {
    it('evaluates status correctly with creditLimit', () => {
      expect(getCreditStatus(50000, 100000)).toBe('safe');
      expect(getCreditStatus(85000, 100000)).toBe('warning');
      expect(getCreditStatus(120000, 100000)).toBe('exceeded');
    });

    it('evaluates status correctly without creditLimit (default 0)', () => {
      expect(getCreditStatus(0, 0)).toBe('safe');
      expect(getCreditStatus(50000, 0)).toBe('warning');
    });

    it('returns proper badge properties for all statuses', () => {
      const safe = getCreditStatusBadge('safe');
      expect(safe.icon).toBe('✅');
      expect(safe.text).toBe('Aman');

      const warn = getCreditStatusBadge('warning');
      expect(warn.icon).toBe('⚠️');
      expect(warn.text).toBe('Kredit Menipis');

      const exceeded = getCreditStatusBadge('exceeded');
      expect(exceeded.icon).toBe('🔴');
      expect(exceeded.text).toBe('Limit Terlampaui');
    });
  });

  describe('allocatePaymentFIFO', () => {
    const l1 = mockLedger({
      id: 'l1',
      transactionId: 'TX-01',
      tanggalTransaksi: '2026-10-01',
      sisaHutang: 50000,
    });
    const l2 = mockLedger({
      id: 'l2',
      transactionId: 'TX-02',
      tanggalTransaksi: '2026-10-03',
      sisaHutang: 75000,
    });
    const l3 = mockLedger({
      id: 'l3',
      transactionId: 'TX-03',
      tanggalTransaksi: '2026-10-05',
      sisaHutang: 100000,
    });

    it('allocates partially to the oldest ledger', () => {
      const result = allocatePaymentFIFO([l1, l2, l3], 30000);
      expect(result.totalAllocated).toBe(30000);
      expect(result.remainingPayment).toBe(0);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0]?.ledgerId).toBe('l1');
      expect(result.allocations[0]?.allocatedAmount).toBe(30000);
      expect(result.allocations[0]?.newSisaHutang).toBe(20000);
      expect(result.allocations[0]?.newStatus).toBe('belum_lunas');
    });

    it('allocates across multiple ledgers using FIFO order', () => {
      // 50k to l1 (fully paid), 50k to l2 (partial 25k remaining)
      const result = allocatePaymentFIFO([l3, l1, l2], 100000);
      expect(result.totalAllocated).toBe(100000);
      expect(result.remainingPayment).toBe(0);
      expect(result.allocations).toHaveLength(2);

      expect(result.allocations[0]?.ledgerId).toBe('l1');
      expect(result.allocations[0]?.allocatedAmount).toBe(50000);
      expect(result.allocations[0]?.newStatus).toBe('lunas');

      expect(result.allocations[1]?.ledgerId).toBe('l2');
      expect(result.allocations[1]?.allocatedAmount).toBe(50000);
      expect(result.allocations[1]?.newSisaHutang).toBe(25000);
      expect(result.allocations[1]?.newStatus).toBe('belum_lunas');
    });

    it('handles excess payment amount when paying full debt', () => {
      const result = allocatePaymentFIFO([l1], 80000);
      expect(result.totalAllocated).toBe(50000);
      expect(result.remainingPayment).toBe(30000);
      expect(result.allocations[0]?.newStatus).toBe('lunas');
    });

    it('returns empty allocation if payment is 0 or ledgers are empty', () => {
      expect(allocatePaymentFIFO([], 50000).allocations).toEqual([]);
      expect(allocatePaymentFIFO([l1], 0).allocations).toEqual([]);
    });
  });

  describe('generateWhatsAppReminderUrl', () => {
    const customer: Customer = {
      id: 'c1',
      nama: 'Budi Santoso',
      telepon: '08123456789',
      totalHutang: 150000,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
      syncStatus: 'local',
    };

    it('generates valid WhatsApp URL with normalized phone number 628...', () => {
      const url = generateWhatsAppReminderUrl(customer, []);
      expect(url).not.toBeNull();
      expect(url).toContain('wa.me/628123456789');
      expect(url).toContain(encodeURIComponent('Budi Santoso'));
    });

    it('returns null if customer does not have phone number', () => {
      const noPhoneCust = { ...customer, telepon: undefined };
      expect(generateWhatsAppReminderUrl(noPhoneCust, [])).toBeNull();
    });

    it('includes overdue notice if there are overdue ledgers', () => {
      const overdueLedger = mockLedger({ tanggalJatuhTempo: '2020-01-01', sisaHutang: 50000 });
      const url = generateWhatsAppReminderUrl(customer, [overdueLedger]);
      expect(decodeURIComponent(url!)).toContain('jatuh tempo');
    });
  });
});
