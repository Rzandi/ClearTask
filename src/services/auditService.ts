/* ═══════════════════════════════════════════════════════════
   auditService.ts — ClearTask
   Append-only audit trail logging service.
   ═══════════════════════════════════════════════════════════ */

import db from './db';
import type { AuditLogEntry } from '../types/index';

const generateUUID = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'aud-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

export const auditService = {
  /**
   * Append an audit event to the audit_log table.
   * Runs atomically if within an existing db.transaction, or standalone.
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
      console.warn('Failed to record audit log:', err);
    }
  },

  /**
   * Query recent audit logs, optionally filtered by entity.
   */
  async getRecentLogs(limit: number = 50, entity?: string): Promise<AuditLogEntry[]> {
    try {
      let query = db.audit_log.orderBy('timestamp').reverse();
      if (entity) {
        return (await query
          .filter((log) => log.entity === entity)
          .limit(limit)
          .toArray()) as AuditLogEntry[];
      }
      return (await query.limit(limit).toArray()) as AuditLogEntry[];
    } catch {
      return [];
    }
  },
};
