/* ═══════════════════════════════════════════════════════════
   auditService.test.ts — ClearTask W4-02 Phase 3D
   Unit tests for the audit logging service.
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';

// ── Helpers ─────────────────────────────────────────────────
// Re-import modules fresh before every test so a db.close() in one test
// does not contaminate the next one.

async function freshModules() {
  vi.resetModules();
  const dbModule = await import('../services/db');
  const svcModule = await import('../services/auditService');
  const db = dbModule.default;
  await db.open();
  return { db, auditService: svcModule.auditService };
}

// ── Suite ────────────────────────────────────────────────────

describe('auditService', () => {
  beforeEach(async () => {
    await Dexie.delete('ClearTaskDB');
  });

  // ── Core log() ──────────────────────────────────────────────

  describe('log()', () => {
    it('creates an audit entry with generated id and timestamp', async () => {
      const { db, auditService } = await freshModules();

      await auditService.log({
        action: 'create',
        entity: 'transaction',
        entityId: 'tx-001',
        actor: 'Kasir A',
      });

      const all = await db.audit_log.toArray();
      expect(all).toHaveLength(1);

      const entry = all[0];
      expect(entry.id).toBeTruthy();
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
      expect(entry.action).toBe('create');
      expect(entry.entity).toBe('transaction');
      expect(entry.entityId).toBe('tx-001');
      expect(entry.actor).toBe('Kasir A');
    });

    it('stores optional details payload', async () => {
      const { db, auditService } = await freshModules();

      await auditService.log({
        action: 'credit_transaction_created',
        entity: 'transaction',
        entityId: '42',
        actor: 'Budi',
        details: { amount: 75000, customerId: 'cust-uuid' },
      });

      const entry = (await db.audit_log.toArray())[0];
      expect(entry.details).toEqual({ amount: 75000, customerId: 'cust-uuid' });
    });

    it('does NOT throw when the DB write fails', async () => {
      const { db, auditService } = await freshModules();
      db.close(); // intentionally break writes

      await expect(
        auditService.log({
          action: 'create',
          entity: 'transaction',
          entityId: 'x',
          actor: 'test',
        })
      ).resolves.toBeUndefined();
    });
  });

  // ── Credit helpers ──────────────────────────────────────────

  describe('logCreditTransactionCreated()', () => {
    it('writes action=credit_transaction_created with correct details', async () => {
      const { db, auditService } = await freshModules();

      await auditService.logCreditTransactionCreated({
        transactionId: 'TXN-001',
        dbId: 7,
        customerId: 'cust-uuid-1',
        customerName: 'Ibu Siti',
        amount: 50000,
        sessionId: 'sess-1',
        kasir: 'Kasir B',
        itemCount: 3,
      });

      const entry = (await db.audit_log.toArray())[0];
      expect(entry.action).toBe('credit_transaction_created');
      expect(entry.entity).toBe('transaction');
      expect(entry.entityId).toBe('7');
      expect(entry.actor).toBe('Kasir B');
      expect(entry.details.transactionId).toBe('TXN-001');
      expect(entry.details.customerId).toBe('cust-uuid-1');
      expect(entry.details.customerName).toBe('Ibu Siti');
      expect(entry.details.amount).toBe(50000);
      expect(entry.details.sessionId).toBe('sess-1');
      expect(entry.details.itemCount).toBe(3);
    });
  });

  describe('logCreditLedgerCreated()', () => {
    it('writes action=credit_ledger_created with correct details', async () => {
      const { db, auditService } = await freshModules();

      await auditService.logCreditLedgerCreated({
        ledgerId: 'ledger-uuid-1',
        customerId: 'cust-uuid-1',
        customerName: 'Pak Budi',
        transactionId: 'TXN-002',
        amount: 30000,
        kasir: 'Admin',
      });

      const entry = (await db.audit_log.toArray())[0];
      expect(entry.action).toBe('credit_ledger_created');
      expect(entry.entity).toBe('credit_ledger');
      expect(entry.entityId).toBe('ledger-uuid-1');
      expect(entry.details.amount).toBe(30000);
      expect(entry.details.transactionId).toBe('TXN-002');
    });
  });

  describe('logSessionClosedWithCredit()', () => {
    it('writes action=session_closed_with_credit with customer breakdown', async () => {
      const { db, auditService } = await freshModules();

      const customers = [
        { customerId: 'c1', customerName: 'Ibu Siti', amount: 50000 },
        { customerId: 'c2', customerName: 'Pak Budi', amount: 20000 },
      ];

      await auditService.logSessionClosedWithCredit({
        sessionId: 'sess-abc',
        totalCreditAmount: 70000,
        jumlahTransaksiKredit: 2,
        customers,
        kasir: 'Admin',
      });

      const entry = (await db.audit_log.toArray())[0];
      expect(entry.action).toBe('session_closed_with_credit');
      expect(entry.entity).toBe('session');
      expect(entry.entityId).toBe('sess-abc');
      expect(entry.details.totalCreditAmount).toBe(70000);
      expect(entry.details.jumlahTransaksiKredit).toBe(2);
      expect(entry.details.customers).toHaveLength(2);
      expect(entry.details.customers[0].customerName).toBe('Ibu Siti');
    });
  });

  describe('logCreditPaymentRecorded()', () => {
    it('writes action=credit_payment_recorded', async () => {
      const { db, auditService } = await freshModules();

      await auditService.logCreditPaymentRecorded({
        paymentId: 'pay-001',
        ledgerId: 'ledger-001',
        customerId: 'cust-1',
        customerName: 'Toko Maju',
        jumlahBayar: 25000,
        metodePembayaran: 'Tunai',
        kasir: 'Kasir C',
      });

      const entry = (await db.audit_log.toArray())[0];
      expect(entry.action).toBe('credit_payment_recorded');
      expect(entry.entity).toBe('credit_payment');
      expect(entry.details.jumlahBayar).toBe(25000);
      expect(entry.details.metodePembayaran).toBe('Tunai');
    });
  });

  describe('logCustomerCreated()', () => {
    it('writes action=customer_created', async () => {
      const { db, auditService } = await freshModules();

      await auditService.logCustomerCreated({
        customerId: 'cust-new',
        nama: 'Pelanggan Baru',
        telepon: '08100000000',
        kasir: 'Admin',
      });

      const entry = (await db.audit_log.toArray())[0];
      expect(entry.action).toBe('customer_created');
      expect(entry.entity).toBe('customer');
      expect(entry.entityId).toBe('cust-new');
      expect(entry.details.nama).toBe('Pelanggan Baru');
      expect(entry.details.telepon).toBe('08100000000');
    });
  });

  describe('logCustomerUpdated()', () => {
    it('writes action=customer_updated with changes', async () => {
      const { db, auditService } = await freshModules();

      await auditService.logCustomerUpdated({
        customerId: 'cust-1',
        changes: { telepon: '082200000000' },
        kasir: 'Admin',
      });

      const entry = (await db.audit_log.toArray())[0];
      expect(entry.action).toBe('customer_updated');
      expect(entry.details.changes).toEqual({ telepon: '082200000000' });
    });
  });

  describe('logCustomerDeactivated()', () => {
    it('writes action=customer_deactivated', async () => {
      const { db, auditService } = await freshModules();

      await auditService.logCustomerDeactivated({
        customerId: 'cust-1',
        customerName: 'Ibu Siti',
        kasir: 'Admin',
      });

      const entry = (await db.audit_log.toArray())[0];
      expect(entry.action).toBe('customer_deactivated');
      expect(entry.details.customerName).toBe('Ibu Siti');
    });
  });

  // ── Query helpers ───────────────────────────────────────────

  describe('getRecentLogs()', () => {
    it('returns logs sorted newest first', async () => {
      const { db, auditService } = await freshModules();

      await db.audit_log.bulkAdd([
        { id: 'a', timestamp: '2026-10-01T10:00:00.000Z', action: 'create', entity: 'transaction', entityId: '1', actor: 'K' },
        { id: 'b', timestamp: '2026-10-01T12:00:00.000Z', action: 'create', entity: 'transaction', entityId: '2', actor: 'K' },
        { id: 'c', timestamp: '2026-10-01T11:00:00.000Z', action: 'create', entity: 'transaction', entityId: '3', actor: 'K' },
      ]);

      const logs = await auditService.getRecentLogs(10);
      expect(logs[0]!.id).toBe('b'); // newest first
      expect(logs[1]!.id).toBe('c');
      expect(logs[2]!.id).toBe('a');
    });

    it('respects the limit parameter', async () => {
      const { auditService } = await freshModules();

      for (let i = 0; i < 5; i++) {
        await auditService.log({ action: 'create', entity: 'transaction', entityId: String(i), actor: 'K' });
      }
      const logs = await auditService.getRecentLogs(3);
      expect(logs).toHaveLength(3);
    });

    it('filters by entity type when provided', async () => {
      const { auditService } = await freshModules();

      await auditService.log({ action: 'create',                entity: 'transaction',   entityId: '1', actor: 'K' });
      await auditService.log({ action: 'customer_created',      entity: 'customer',      entityId: '2', actor: 'K' });
      await auditService.log({ action: 'credit_ledger_created', entity: 'credit_ledger', entityId: '3', actor: 'K' });

      const txLogs = await auditService.getRecentLogs(10, 'transaction');
      expect(txLogs).toHaveLength(1);
      expect(txLogs[0]!.entity).toBe('transaction');
    });

    it('returns empty array on DB error without throwing', async () => {
      const { db, auditService } = await freshModules();
      db.close();

      const logs = await auditService.getRecentLogs();
      expect(Array.isArray(logs)).toBe(true);
      expect(logs).toHaveLength(0);
    });
  });

  describe('getEntityAuditTrail()', () => {
    it('returns only logs matching entity + entityId', async () => {
      const { auditService } = await freshModules();

      await auditService.log({ action: 'credit_transaction_created', entity: 'transaction',   entityId: 'tx-1', actor: 'K' });
      await auditService.log({ action: 'create',                     entity: 'transaction',   entityId: 'tx-2', actor: 'K' }); // different id
      await auditService.log({ action: 'credit_ledger_created',      entity: 'credit_ledger', entityId: 'tx-1', actor: 'K' }); // different entity

      const trail = await auditService.getEntityAuditTrail('transaction', 'tx-1');
      expect(trail).toHaveLength(1);
      expect(trail[0]!.entityId).toBe('tx-1');
      expect(trail[0]!.entity).toBe('transaction');
    });

    it('returns empty array when no matching entries', async () => {
      const { auditService } = await freshModules();

      const trail = await auditService.getEntityAuditTrail('session', 'nonexistent');
      expect(trail).toHaveLength(0);
    });
  });

  describe('getLogsByAction()', () => {
    it('returns only logs with the specified action', async () => {
      const { auditService } = await freshModules();

      await auditService.log({ action: 'credit_transaction_created', entity: 'transaction', entityId: '1', actor: 'K' });
      await auditService.log({ action: 'credit_transaction_created', entity: 'transaction', entityId: '2', actor: 'K' });
      await auditService.log({ action: 'session_closed_with_credit', entity: 'session',     entityId: 's1', actor: 'K' });

      const creditLogs = await auditService.getLogsByAction('credit_transaction_created');
      expect(creditLogs).toHaveLength(2);
      creditLogs.forEach((log) => expect(log.action).toBe('credit_transaction_created'));
    });

    it('returns empty array when no logs match the action', async () => {
      const { auditService } = await freshModules();

      const logs = await auditService.getLogsByAction('credit_payment_recorded');
      expect(logs).toHaveLength(0);
    });
  });

  // ── exportToCSV() ───────────────────────────────────────────

  describe('exportToCSV()', () => {
    it('returns a CSV string with header row', async () => {
      const { auditService } = await freshModules();

      await auditService.log({ action: 'create', entity: 'transaction', entityId: '1', actor: 'Admin' });

      const csv = await auditService.exportToCSV();
      expect(typeof csv).toBe('string');
      const lines = csv.split('\n');
      expect(lines[0]).toBe('timestamp,action,entity,entityId,actor,details');
    });

    it('contains the logged entry in the CSV body', async () => {
      const { auditService } = await freshModules();

      await auditService.log({
        action: 'customer_created',
        entity: 'customer',
        entityId: 'cust-99',
        actor: 'Kasir Z',
      });

      const csv = await auditService.exportToCSV();
      expect(csv).toContain('customer_created');
      expect(csv).toContain('cust-99');
      expect(csv).toContain('Kasir Z');
    });

    it('escapes double-quotes inside fields', async () => {
      const { auditService } = await freshModules();

      await auditService.log({
        action: 'create',
        entity: 'transaction',
        entityId: '1',
        actor: 'Admin "Super"',
      });

      const csv = await auditService.exportToCSV();
      expect(csv).toContain('Admin ""Super""');
    });

    it('returns empty string on error without throwing', async () => {
      const { db, auditService } = await freshModules();
      db.close();

      const csv = await auditService.exportToCSV();
      expect(typeof csv).toBe('string');
    });
  });

  // ── cleanOldLogs() ──────────────────────────────────────────

  describe('cleanOldLogs()', () => {
    it('deletes logs older than the retention period', async () => {
      const { db, auditService } = await freshModules();

      await db.audit_log.bulkAdd([
        {
          id: 'old-1',
          timestamp: '2024-01-01T00:00:00.000Z', // > 365 days ago from Oct 2026
          action: 'create', entity: 'transaction', entityId: '1', actor: 'K',
        },
        {
          id: 'recent-1',
          timestamp: new Date().toISOString(),
          action: 'create', entity: 'transaction', entityId: '2', actor: 'K',
        },
      ]);

      const deleted = await auditService.cleanOldLogs(365);

      expect(deleted).toBe(1);
      expect(await db.audit_log.get('old-1')).toBeUndefined();
      expect(await db.audit_log.get('recent-1')).toBeDefined();
    });

    it('returns 0 when no logs exceed the retention period', async () => {
      const { auditService } = await freshModules();

      await auditService.log({ action: 'create', entity: 'transaction', entityId: '1', actor: 'K' });

      const deleted = await auditService.cleanOldLogs(365);
      expect(deleted).toBe(0);
    });

    it('returns 0 without throwing when DB is closed', async () => {
      const { db, auditService } = await freshModules();
      db.close();

      const deleted = await auditService.cleanOldLogs(365);
      expect(deleted).toBe(0);
    });
  });

  // ── ID uniqueness ───────────────────────────────────────────

  describe('id uniqueness', () => {
    it('generates unique IDs for every log entry', async () => {
      const { db, auditService } = await freshModules();
      const N = 20;

      for (let i = 0; i < N; i++) {
        await auditService.log({ action: 'create', entity: 'transaction', entityId: String(i), actor: 'K' });
      }

      const all = await db.audit_log.toArray();
      const ids = all.map((e: any) => e.id);
      expect(new Set(ids).size).toBe(N);
    });
  });
});
