/* ═══════════════════════════════════════════════════════════
   customerService.test.ts — ClearTask W4-02
   Unit tests for customer credit management service.
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { ClearTaskDB } from '../services/db';
import * as customerService from '../services/customerService';
import type { Customer, CreditLedger, CreditPayment } from '../types';

// Mock IndexedDB with fake-indexeddb
import 'fake-indexeddb/auto';

describe('customerService', () => {
  let db: ClearTaskDB;

  beforeEach(async () => {
    // Reset IndexedDB before each test
    await Dexie.delete('ClearTaskDB');

    // Import fresh instance
    const dbModule = await import('../services/db');
    db = dbModule.default;

    // Wait for db to open
    await db.open();
  });

  // ── Customer CRUD Tests ────────────────────────────────────

  describe('createCustomer', () => {
    it('should create a customer with all fields', async () => {
      const customer = await customerService.createCustomer({
        nama: 'Toko Berkah',
        telepon: '081234567890',
        alamat: 'Jl. Merdeka No. 123',
        catatan: 'Pelanggan tetap',
      });

      expect(customer.id).toBeDefined();
      expect(customer.nama).toBe('Toko Berkah');
      expect(customer.telepon).toBe('081234567890');
      expect(customer.alamat).toBe('Jl. Merdeka No. 123');
      expect(customer.catatan).toBe('Pelanggan tetap');
      expect(customer.totalHutang).toBe(0);
      expect(customer.deletedAt).toBeNull();
      expect(customer.syncStatus).toBe('local');
    });

    it('should create a customer with only name', async () => {
      const customer = await customerService.createCustomer({
        nama: 'Toko Jaya',
      });

      expect(customer.nama).toBe('Toko Jaya');
      expect(customer.telepon).toBeUndefined();
      expect(customer.alamat).toBeUndefined();
      expect(customer.catatan).toBeUndefined();
      expect(customer.totalHutang).toBe(0);
    });

    it('should trim whitespace from input', async () => {
      const customer = await customerService.createCustomer({
        nama: '  Toko Makmur  ',
        telepon: '  0812345  ',
      });

      expect(customer.nama).toBe('Toko Makmur');
      expect(customer.telepon).toBe('0812345');
    });
  });

  describe('updateCustomer', () => {
    it('should update customer fields', async () => {
      const customer = await customerService.createCustomer({
        nama: 'Toko A',
        telepon: '0811111',
      });

      await customerService.updateCustomer(customer.id, {
        nama: 'Toko B',
        alamat: 'Jl. Baru',
      });

      const updated = await customerService.getCustomerById(customer.id);
      expect(updated?.nama).toBe('Toko B');
      expect(updated?.alamat).toBe('Jl. Baru');
      expect(updated?.telepon).toBe('0811111'); // Unchanged
    });

    it('should update updatedAt timestamp', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });
      const originalUpdatedAt = customer.updatedAt;

      // Wait 1ms to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      await customerService.updateCustomer(customer.id, { nama: 'Updated' });

      const updated = await customerService.getCustomerById(customer.id);
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('deleteCustomer', () => {
    it('should soft delete customer', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });

      await customerService.deleteCustomer(customer.id);

      const deleted = await customerService.getCustomerById(customer.id);
      expect(deleted).toBeUndefined(); // Filtered out by deletedAt

      // But still exists in DB
      const raw = await db.customers.get(customer.id);
      expect(raw?.deletedAt).toBeDefined();
    });
  });

  describe('getAllCustomers', () => {
    it('should return all non-deleted customers sorted by name', async () => {
      await customerService.createCustomer({ nama: 'Zebra' });
      await customerService.createCustomer({ nama: 'Alpha' });
      const deleted = await customerService.createCustomer({ nama: 'Deleted' });
      await customerService.deleteCustomer(deleted.id);

      const customers = await customerService.getAllCustomers();

      expect(customers).toHaveLength(2);
      expect(customers[0]?.nama).toBe('Alpha');
      expect(customers[1]?.nama).toBe('Zebra');
    });
  });

  describe('searchCustomers', () => {
    beforeEach(async () => {
      await customerService.createCustomer({
        nama: 'Toko Berkah Jaya',
        telepon: '081234567890',
      });
      await customerService.createCustomer({
        nama: 'Warung Maju',
        telepon: '087654321098',
      });
    });

    it('should search by name', async () => {
      const results = await customerService.searchCustomers('berkah');
      expect(results).toHaveLength(1);
      expect(results[0]?.nama).toBe('Toko Berkah Jaya');
    });

    it('should search by phone', async () => {
      const results = await customerService.searchCustomers('0876');
      expect(results).toHaveLength(1);
      expect(results[0]?.nama).toBe('Warung Maju');
    });

    it('should be case-insensitive', async () => {
      const results = await customerService.searchCustomers('MAJU');
      expect(results).toHaveLength(1);
      expect(results[0]?.nama).toBe('Warung Maju');
    });

    it('should return empty for no match', async () => {
      const results = await customerService.searchCustomers('xyz');
      expect(results).toHaveLength(0);
    });
  });

  // ── Credit Ledger Tests ────────────────────────────────────

  describe('createCreditLedger', () => {
    it('should create credit ledger and update customer totalHutang', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });

      const ledger = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 50000,
        catatan: 'Belanja mingguan',
      });

      expect(ledger.id).toBeDefined();
      expect(ledger.customerId).toBe(customer.id);
      expect(ledger.jumlahKredit).toBe(50000);
      expect(ledger.sisaHutang).toBe(50000);
      expect(ledger.status).toBe('belum_lunas');

      // Check customer totalHutang updated
      const updatedCustomer = await customerService.getCustomerById(customer.id);
      expect(updatedCustomer?.totalHutang).toBe(50000);
    });

    it('should support optional due date', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });

      const ledger = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 100000,
        tanggalJatuhTempo: '2026-12-31',
      });

      expect(ledger.tanggalJatuhTempo).toBe('2026-12-31');
    });
  });

  describe('getCustomerCreditLedgers', () => {
    it('should return ledgers for specific customer', async () => {
      const customer1 = await customerService.createCustomer({ nama: 'Customer 1' });
      const customer2 = await customerService.createCustomer({ nama: 'Customer 2' });

      await customerService.createCreditLedger({
        customerId: customer1.id,
        transactionId: 'TRX-001',
        jumlahKredit: 10000,
      });
      await customerService.createCreditLedger({
        customerId: customer1.id,
        transactionId: 'TRX-002',
        jumlahKredit: 20000,
      });
      await customerService.createCreditLedger({
        customerId: customer2.id,
        transactionId: 'TRX-003',
        jumlahKredit: 30000,
      });

      const ledgers = await customerService.getCustomerCreditLedgers(customer1.id);

      expect(ledgers).toHaveLength(2);
      expect(ledgers.every((l) => l.customerId === customer1.id)).toBe(true);
    });
  });

  describe('getAllUnpaidLedgers', () => {
    it('should return only unpaid ledgers', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });

      const ledger1 = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 50000,
      });

      const ledger2 = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-002',
        jumlahKredit: 30000,
      });

      // Pay ledger1 fully
      await customerService.createPayment({
        ledgerId: ledger1.id,
        jumlahBayar: 50000,
        metodePembayaran: 'tunai',
        createdBy: 'Test',
      });

      const unpaidLedgers = await customerService.getAllUnpaidLedgers();

      expect(unpaidLedgers).toHaveLength(1);
      expect(unpaidLedgers[0]?.id).toBe(ledger2.id);
    });
  });

  // ── Payment Tests ──────────────────────────────────────────

  describe('createPayment', () => {
    it('should create payment and update ledger sisaHutang', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });
      const ledger = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 100000,
      });

      const payment = await customerService.createPayment({
        ledgerId: ledger.id,
        jumlahBayar: 30000,
        metodePembayaran: 'tunai',
        createdBy: 'Kasir A',
      });

      expect(payment.id).toBeDefined();
      expect(payment.jumlahBayar).toBe(30000);
      expect(payment.metodePembayaran).toBe('tunai');
      expect(payment.createdBy).toBe('Kasir A');

      // Check ledger updated
      const updatedLedger = await customerService.getCreditLedgerById(ledger.id);
      expect(updatedLedger?.sisaHutang).toBe(70000);
      expect(updatedLedger?.status).toBe('belum_lunas');

      // Check customer totalHutang updated
      const updatedCustomer = await customerService.getCustomerById(customer.id);
      expect(updatedCustomer?.totalHutang).toBe(70000);
    });

    it('should mark ledger as lunas when fully paid', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });
      const ledger = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 50000,
      });

      await customerService.createPayment({
        ledgerId: ledger.id,
        jumlahBayar: 50000,
        metodePembayaran: 'transfer',
        createdBy: 'Kasir B',
      });

      const updatedLedger = await customerService.getCreditLedgerById(ledger.id);
      expect(updatedLedger?.sisaHutang).toBe(0);
      expect(updatedLedger?.status).toBe('lunas');

      const updatedCustomer = await customerService.getCustomerById(customer.id);
      expect(updatedCustomer?.totalHutang).toBe(0);
    });

    it('should handle multiple partial payments', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });
      const ledger = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 100000,
      });

      await customerService.createPayment({
        ledgerId: ledger.id,
        jumlahBayar: 25000,
        metodePembayaran: 'tunai',
        createdBy: 'Kasir A',
      });

      await customerService.createPayment({
        ledgerId: ledger.id,
        jumlahBayar: 25000,
        metodePembayaran: 'tunai',
        createdBy: 'Kasir B',
      });

      await customerService.createPayment({
        ledgerId: ledger.id,
        jumlahBayar: 50000,
        metodePembayaran: 'transfer',
        createdBy: 'Kasir A',
      });

      const updatedLedger = await customerService.getCreditLedgerById(ledger.id);
      expect(updatedLedger?.sisaHutang).toBe(0);
      expect(updatedLedger?.status).toBe('lunas');

      const payments = await customerService.getLedgerPayments(ledger.id);
      expect(payments).toHaveLength(3);
    });

    it('should throw error if payment exceeds sisaHutang', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });
      const ledger = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 50000,
      });

      await expect(
        customerService.createPayment({
          ledgerId: ledger.id,
          jumlahBayar: 60000,
          metodePembayaran: 'tunai',
          createdBy: 'Test',
        })
      ).rejects.toThrow('melebihi sisa hutang');
    });

    it('should throw error if payment amount is zero or negative', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });
      const ledger = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 50000,
      });

      await expect(
        customerService.createPayment({
          ledgerId: ledger.id,
          jumlahBayar: 0,
          metodePembayaran: 'tunai',
          createdBy: 'Test',
        })
      ).rejects.toThrow('harus > 0');

      await expect(
        customerService.createPayment({
          ledgerId: ledger.id,
          jumlahBayar: -1000,
          metodePembayaran: 'tunai',
          createdBy: 'Test',
        })
      ).rejects.toThrow('harus > 0');
    });
  });

  // ── Aggregation Tests ──────────────────────────────────────

  describe('getCustomersWithDebt', () => {
    it('should return customers with debt sorted by totalHutang descending', async () => {
      const customer1 = await customerService.createCustomer({ nama: 'Low Debt' });
      const customer2 = await customerService.createCustomer({ nama: 'High Debt' });
      const customer3 = await customerService.createCustomer({ nama: 'No Debt' });

      await customerService.createCreditLedger({
        customerId: customer1.id,
        transactionId: 'TRX-001',
        jumlahKredit: 10000,
      });

      await customerService.createCreditLedger({
        customerId: customer2.id,
        transactionId: 'TRX-002',
        jumlahKredit: 50000,
      });

      const customersWithDebt = await customerService.getCustomersWithDebt();

      expect(customersWithDebt).toHaveLength(2);
      expect(customersWithDebt[0]?.nama).toBe('High Debt');
      expect(customersWithDebt[0]?.totalHutang).toBe(50000);
      expect(customersWithDebt[0]?.unpaidCount).toBe(1);
      expect(customersWithDebt[1]?.nama).toBe('Low Debt');
      expect(customersWithDebt[1]?.totalHutang).toBe(10000);
    });

    it('should track oldest debt date', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });

      // Create ledgers (will have same date in test, but structure is ready)
      await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 10000,
      });

      await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-002',
        jumlahKredit: 20000,
      });

      const customersWithDebt = await customerService.getCustomersWithDebt();

      expect(customersWithDebt[0]?.oldestDebtDate).toBeDefined();
      expect(customersWithDebt[0]?.unpaidCount).toBe(2);
    });
  });

  describe('getDebtSummary', () => {
    it('should return correct debt summary', async () => {
      const customer1 = await customerService.createCustomer({ nama: 'Customer 1' });
      const customer2 = await customerService.createCustomer({ nama: 'Customer 2' });
      const customer3 = await customerService.createCustomer({ nama: 'Customer 3' });

      const ledger1 = await customerService.createCreditLedger({
        customerId: customer1.id,
        transactionId: 'TRX-001',
        jumlahKredit: 50000,
      });

      const ledger2 = await customerService.createCreditLedger({
        customerId: customer2.id,
        transactionId: 'TRX-002',
        jumlahKredit: 30000,
      });

      // Pay ledger1 partially
      await customerService.createPayment({
        ledgerId: ledger1.id,
        jumlahBayar: 20000,
        metodePembayaran: 'tunai',
        createdBy: 'Test',
      });

      const summary = await customerService.getDebtSummary();

      expect(summary.totalCustomers).toBe(3);
      expect(summary.customersWithDebt).toBe(2);
      expect(summary.totalOutstanding).toBe(60000); // 30k + 30k
      expect(summary.totalLedgers).toBe(2);
      expect(summary.unpaidLedgers).toBe(2);
    });
  });

  describe('recalculateCustomerDebt', () => {
    it('should recalculate totalHutang correctly', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });

      // Add multiple ledgers
      const ledger1 = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 30000,
      });

      const ledger2 = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-002',
        jumlahKredit: 20000,
      });

      // Pay ledger1 partially
      await customerService.createPayment({
        ledgerId: ledger1.id,
        jumlahBayar: 10000,
        metodePembayaran: 'tunai',
        createdBy: 'Test',
      });

      // Manually recalculate
      await customerService.recalculateCustomerDebt(customer.id);

      const updatedCustomer = await customerService.getCustomerById(customer.id);
      expect(updatedCustomer?.totalHutang).toBe(40000); // 20k (ledger1) + 20k (ledger2)
    });

    it('should handle fully paid customer', async () => {
      const customer = await customerService.createCustomer({ nama: 'Test' });

      const ledger = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-001',
        jumlahKredit: 50000,
      });

      await customerService.createPayment({
        ledgerId: ledger.id,
        jumlahBayar: 50000,
        metodePembayaran: 'tunai',
        createdBy: 'Test',
      });

      const updatedCustomer = await customerService.getCustomerById(customer.id);
      expect(updatedCustomer?.totalHutang).toBe(0);
    });
  });

  // ── Audit Logging Integration Tests ─────────────────────────
  describe('Audit Logging Integration', () => {
    it('records audit log on createCustomer', async () => {
      const customer = await customerService.createCustomer({
        nama: 'Audit Customer',
        telepon: '08123456789',
        createdBy: 'Kasir Super',
      });

      const auditLogs = await db.audit_log.toArray();
      const match = auditLogs.find(
        (l) => l.action === 'customer_created' && l.entityId === customer.id
      );
      expect(match).toBeDefined();
      expect(match?.actor).toBe('Kasir Super');
      expect(match?.details?.nama).toBe('Audit Customer');
    });

    it('records audit log on updateCustomer', async () => {
      const customer = await customerService.createCustomer({ nama: 'Old Name' });
      await customerService.updateCustomer(customer.id, {
        nama: 'New Name',
        updatedBy: 'Kasir Editor',
      });

      const auditLogs = await db.audit_log.toArray();
      const match = auditLogs.find(
        (l) => l.action === 'customer_updated' && l.entityId === customer.id
      );
      expect(match).toBeDefined();
      expect(match?.actor).toBe('Kasir Editor');
      expect(match?.details?.changes?.nama).toBe('New Name');
    });

    it('records audit log on deleteCustomer', async () => {
      const customer = await customerService.createCustomer({ nama: 'To Delete' });
      await customerService.deleteCustomer(customer.id, 'Kasir Deleter');

      const auditLogs = await db.audit_log.toArray();
      const match = auditLogs.find(
        (l) => l.action === 'customer_deactivated' && l.entityId === customer.id
      );
      expect(match).toBeDefined();
      expect(match?.actor).toBe('Kasir Deleter');
      expect(match?.details?.customerName).toBe('To Delete');
    });

    it('records audit log on createPayment and queries via getLogsForCustomer', async () => {
      const { auditService } = await import('../services/auditService');
      const customer = await customerService.createCustomer({ nama: 'Paying Customer' });
      const ledger = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TRX-PAY-1',
        jumlahKredit: 100000,
      });

      const payment = await customerService.createPayment({
        ledgerId: ledger.id,
        jumlahBayar: 40000,
        metodePembayaran: 'tunai',
        catatan: 'Cicilan 1',
        createdBy: 'Kasir Kas',
      });

      const auditLogs = await db.audit_log.toArray();
      const paymentLog = auditLogs.find(
        (l) => l.action === 'credit_payment_recorded' && l.entityId === payment.id
      );
      expect(paymentLog).toBeDefined();
      expect(paymentLog?.actor).toBe('Kasir Kas');
      expect(paymentLog?.details?.jumlahBayar).toBe(40000);

      // Verify getLogsForCustomer retrieves customer creation AND payment logs
      const customerLogs = await auditService.getLogsForCustomer(customer.id);
      expect(customerLogs.length).toBeGreaterThanOrEqual(2);
      const actions = customerLogs.map((l) => l.action);
      expect(actions).toContain('customer_created');
      expect(actions).toContain('credit_payment_recorded');
    });
  });

  // ── W4-02 Phase 4: FIFO & Overdue Tracking Tests ───────────────

  describe('payCustomerDebtFIFO', () => {
    it('allocates payment across multiple ledgers oldest-first and updates totalHutang atomically', async () => {
      const customer = await customerService.createCustomer({ nama: 'Customer FIFO' });

      // Create ledger 1 (oldest)
      const l1 = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TX-FIFO-1',
        jumlahKredit: 40000,
        tanggalTransaksi: '2026-10-01',
      });

      // Create ledger 2 (newer)
      const l2 = await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TX-FIFO-2',
        jumlahKredit: 60000,
        tanggalTransaksi: '2026-10-05',
      });

      expect((await customerService.getCustomerById(customer.id))?.totalHutang).toBe(100000);

      // Pay 70,000 via FIFO: should pay l1 (40k, lunas) and l2 (30k, sisa 30k)
      const result = await customerService.payCustomerDebtFIFO({
        customerId: customer.id,
        jumlahBayar: 70000,
        metodePembayaran: 'transfer',
        catatan: 'Pelunasan bertahap',
        createdBy: 'Kasir FIFO',
      });

      expect(result.totalAllocated).toBe(70000);
      expect(result.remainingPayment).toBe(0);
      expect(result.payments).toHaveLength(2);

      // Verify l1 is fully paid
      const updatedL1 = await customerService.getCreditLedgerById(l1.id);
      expect(updatedL1?.sisaHutang).toBe(0);
      expect(updatedL1?.status).toBe('lunas');

      // Verify l2 is partially paid
      const updatedL2 = await customerService.getCreditLedgerById(l2.id);
      expect(updatedL2?.sisaHutang).toBe(30000);
      expect(updatedL2?.status).toBe('belum_lunas');

      // Verify customer total debt is now 30,000
      const updatedCust = await customerService.getCustomerById(customer.id);
      expect(updatedCust?.totalHutang).toBe(30000);
    });

    it('throws error if customer has no unpaid ledgers', async () => {
      const customer = await customerService.createCustomer({ nama: 'Customer No Debt' });
      await expect(
        customerService.payCustomerDebtFIFO({
          customerId: customer.id,
          jumlahBayar: 50000,
          metodePembayaran: 'tunai',
          createdBy: 'Kasir',
        })
      ).rejects.toThrow('Pelanggan tidak memiliki hutang yang belum lunas');
    });
  });

  describe('getOverdueLedgers & getOverdueSummary', () => {
    it('filters overdue ledgers based on due date and reference date', async () => {
      const customer = await customerService.createCustomer({ nama: 'Overdue Customer' });

      // Overdue ledger (due 2026-10-05)
      await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TX-DUE-1',
        jumlahKredit: 50000,
        tanggalTransaksi: '2026-10-01',
        tanggalJatuhTempo: '2026-10-05',
      });

      // Current ledger (due 2026-10-20)
      await customerService.createCreditLedger({
        customerId: customer.id,
        transactionId: 'TX-DUE-2',
        jumlahKredit: 30000,
        tanggalTransaksi: '2026-10-10',
        tanggalJatuhTempo: '2026-10-20',
      });

      const overdueLedgers = await customerService.getOverdueLedgers(customer.id, '2026-10-10');
      expect(overdueLedgers).toHaveLength(1);
      expect(overdueLedgers[0]?.transactionId).toBe('TX-DUE-1');

      const summary = await customerService.getOverdueSummary('2026-10-10');
      expect(summary.overdueCount).toBeGreaterThanOrEqual(1);
      expect(summary.totalOverdueAmount).toBeGreaterThanOrEqual(50000);
      expect(summary.affectedCustomersCount).toBeGreaterThanOrEqual(1);
    });
  });
});
