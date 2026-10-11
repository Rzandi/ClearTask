/* ═══════════════════════════════════════════════════════════
   auditService.ts — ClearTask
   Append-only audit trail logging service.

   Design principles:
   - NEVER throw — audit failure must not break business logic.
   - All writes are async fire-and-forget (await inside try/catch).
   - Keep details payload serialisable (no circular refs, no class instances).
   ═══════════════════════════════════════════════════════════ */

import db from './db';
import type { AuditLogEntry } from '../types/index';

// ── UUID helper ────────────────────────────────────────────

const generateUUID = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'aud-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

// ── Core log function ──────────────────────────────────────

export const auditService = {
  /**
   * Append an audit event to the audit_log table.
   * Silent on failure — audit logging must never break business logic.
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const fullEntry: AuditLogEntry = {
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        ...entry,
      };
      await db.audit_log.add(fullEntry);
    } catch (err) {
      console.warn('[AuditService] Failed to record audit log:', err);
    }
  },

  // ── Credit-specific helpers ────────────────────────────────

  /**
   * Log when a credit transaction is created at POS.
   *
   * @param params.transactionId  - The saved transaction's string ID (transactionId field)
   * @param params.dbId           - The Dexie auto-increment numeric id (transaction.id)
   * @param params.customerId     - Customer UUID
   * @param params.customerName   - Customer display name
   * @param params.amount         - Grand total of the transaction (Rp)
   * @param params.sessionId      - Active session ID (nullable)
   * @param params.kasir          - Cashier name
   * @param params.itemCount      - Number of line items in the cart
   */
  async logCreditTransactionCreated(params: {
    transactionId: string;
    dbId: number | string;
    customerId: string;
    customerName: string;
    amount: number;
    sessionId: string | null;
    kasir: string;
    itemCount: number;
  }): Promise<void> {
    await auditService.log({
      action: 'credit_transaction_created',
      entity: 'transaction',
      entityId: String(params.dbId),
      actor: params.kasir,
      details: {
        transactionId: params.transactionId,
        customerId: params.customerId,
        customerName: params.customerName,
        amount: params.amount,
        itemCount: params.itemCount,
        sessionId: params.sessionId,
      },
    });
  },

  /**
   * Log when a credit ledger entry is created.
   *
   * @param params.ledgerId       - CreditLedger UUID
   * @param params.customerId     - Customer UUID
   * @param params.customerName   - Customer display name
   * @param params.transactionId  - Linked transaction string ID
   * @param params.amount         - Ledger amount (Rp)
   * @param params.kasir          - Cashier name
   */
  async logCreditLedgerCreated(params: {
    ledgerId: string;
    customerId: string;
    customerName: string;
    transactionId: string;
    amount: number;
    kasir: string;
  }): Promise<void> {
    await auditService.log({
      action: 'credit_ledger_created',
      entity: 'credit_ledger',
      entityId: params.ledgerId,
      actor: params.kasir,
      details: {
        customerId: params.customerId,
        customerName: params.customerName,
        transactionId: params.transactionId,
        amount: params.amount,
      },
    });
  },

  /**
   * Log when a session is closed and it contained credit transactions.
   * Should be called only when jumlahTransaksiKredit > 0.
   *
   * @param params.sessionId              - Session ID being closed
   * @param params.totalCreditAmount      - Sum of all credit transaction totals (Rp)
   * @param params.jumlahTransaksiKredit  - Number of credit transactions in session
   * @param params.customers              - Per-customer credit summary array
   * @param params.kasir                  - Cashier who closed the session
   */
  async logSessionClosedWithCredit(params: {
    sessionId: string;
    totalCreditAmount: number;
    jumlahTransaksiKredit: number;
    customers: Array<{ customerId: string; customerName: string; amount: number }>;
    kasir: string;
  }): Promise<void> {
    await auditService.log({
      action: 'session_closed_with_credit',
      entity: 'session',
      entityId: params.sessionId,
      actor: params.kasir,
      details: {
        totalCreditAmount: params.totalCreditAmount,
        jumlahTransaksiKredit: params.jumlahTransaksiKredit,
        customers: params.customers,
      },
    });
  },

  /**
   * Log when a credit payment is recorded against a ledger entry.
   * Placeholder for Phase 4 — added now so integration is ready.
   *
   * @param params.paymentId        - CreditPayment UUID
   * @param params.ledgerId         - CreditLedger UUID being paid
   * @param params.customerId       - Customer UUID
   * @param params.customerName     - Customer display name
   * @param params.jumlahBayar      - Payment amount (Rp)
   * @param params.metodePembayaran - Payment method string
   * @param params.kasir            - Cashier name
   */
  async logCreditPaymentRecorded(params: {
    paymentId: string;
    ledgerId: string;
    customerId: string;
    customerName: string;
    jumlahBayar: number;
    metodePembayaran: string;
    kasir: string;
  }): Promise<void> {
    await auditService.log({
      action: 'credit_payment_recorded',
      entity: 'credit_payment',
      entityId: params.paymentId,
      actor: params.kasir,
      details: {
        ledgerId: params.ledgerId,
        customerId: params.customerId,
        customerName: params.customerName,
        jumlahBayar: params.jumlahBayar,
        metodePembayaran: params.metodePembayaran,
      },
    });
  },

  /**
   * Log customer creation.
   */
  async logCustomerCreated(params: {
    customerId: string;
    nama: string;
    telepon?: string;
    kasir: string;
  }): Promise<void> {
    await auditService.log({
      action: 'customer_created',
      entity: 'customer',
      entityId: params.customerId,
      actor: params.kasir,
      details: {
        nama: params.nama,
        telepon: params.telepon ?? null,
      },
    });
  },

  /**
   * Log customer update.
   */
  async logCustomerUpdated(params: {
    customerId: string;
    changes: Record<string, any>;
    kasir: string;
  }): Promise<void> {
    await auditService.log({
      action: 'customer_updated',
      entity: 'customer',
      entityId: params.customerId,
      actor: params.kasir,
      details: { changes: params.changes },
    });
  },

  /**
   * Log customer soft-delete.
   */
  async logCustomerDeactivated(params: {
    customerId: string;
    customerName: string;
    kasir: string;
  }): Promise<void> {
    await auditService.log({
      action: 'customer_deactivated',
      entity: 'customer',
      entityId: params.customerId,
      actor: params.kasir,
      details: { customerName: params.customerName },
    });
  },

  // ── Query helpers ──────────────────────────────────────────

  /**
   * Return the most recent N audit logs, optionally filtered by entity type.
   */
  async getRecentLogs(limit: number = 50, entity?: AuditLogEntry['entity']): Promise<AuditLogEntry[]> {
    try {
      const query = db.audit_log.orderBy('timestamp').reverse();
      if (entity) {
        return (await query
          .filter((log: AuditLogEntry) => log.entity === entity)
          .limit(limit)
          .toArray()) as AuditLogEntry[];
      }
      return (await query.limit(limit).toArray()) as AuditLogEntry[];
    } catch {
      return [];
    }
  },

  /**
   * Return all audit logs for a specific entity id (newest first).
   */
  async getEntityAuditTrail(
    entity: AuditLogEntry['entity'],
    entityId: string
  ): Promise<AuditLogEntry[]> {
    try {
      return (await db.audit_log
        .where('entityId')
        .equals(entityId)
        .filter((log: AuditLogEntry) => log.entity === entity)
        .reverse()
        .sortBy('timestamp')) as AuditLogEntry[];
    } catch {
      return [];
    }
  },

  /**
   * Return audit logs for a specific action type (newest first, capped at limit).
   */
  async getLogsByAction(
    action: AuditLogEntry['action'],
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      return (await db.audit_log
        .orderBy('timestamp')
        .reverse()
        .filter((log: AuditLogEntry) => log.action === action)
        .limit(limit)
        .toArray()) as AuditLogEntry[];
    } catch {
      return [];
    }
  },

  /**
   * Export audit logs as a CSV string.
   * Columns: timestamp, action, entity, entityId, actor, details (JSON)
   */
  async exportToCSV(limit: number = 500): Promise<string> {
    try {
      const logs = await auditService.getRecentLogs(limit);
      const header = 'timestamp,action,entity,entityId,actor,details';
      const escape = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
      const rows = logs.map((log) =>
        [
          escape(log.timestamp),
          escape(log.action),
          escape(log.entity),
          escape(String(log.entityId)),
          escape(log.actor),
          escape(JSON.stringify(log.details ?? {})),
        ].join(',')
      );
      return [header, ...rows].join('\n');
    } catch (err) {
      console.warn('[AuditService] exportToCSV failed:', err);
      return '';
    }
  },

  /**
   * Delete audit logs older than `daysToKeep` days.
   * Returns the number of records deleted.
   */
  async cleanOldLogs(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysToKeep);
      const cutoffISO = cutoff.toISOString();

      const old = await db.audit_log
        .filter((log: AuditLogEntry) => log.timestamp < cutoffISO)
        .toArray();

      if (old.length === 0) return 0;

      await db.audit_log.bulkDelete(old.map((l: AuditLogEntry) => l.id));
      console.info(`[AuditService] Cleaned ${old.length} logs older than ${daysToKeep} days.`);
      return old.length;
    } catch (err) {
      console.warn('[AuditService] cleanOldLogs failed:', err);
      return 0;
    }
  },
};
