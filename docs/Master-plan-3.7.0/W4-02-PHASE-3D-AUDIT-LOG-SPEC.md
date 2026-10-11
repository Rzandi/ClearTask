# W4-02 Phase 3D: Audit Logging Specification

**Status:** 📋 Planning  
**Priority:** High  
**Effort:** M (2 orang-hari)  
**Started:** 2026-10-05  
**Dependencies:** Phase 3C Complete ✅

---

## 🎯 Objective

Implement comprehensive audit logging for all credit management operations to ensure:
1. **Accountability** - Track who did what and when
2. **Compliance** - Maintain audit trail for financial operations
3. **Debugging** - Trace issues in credit workflow
4. **Analytics** - Understand credit usage patterns

---

## 📊 Data Model

### Audit Logs Table (New)

```typescript
interface AuditLog {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
  action: AuditAction;           // Enum of tracked actions
  userId: string;                // Kasir name who performed action
  
  // Entity references
  entityType: AuditEntityType;   // What was affected
  entityId?: string | null;      // ID of affected entity
  
  // Context
  sessionId?: string | null;     // FK to sessions (if applicable)
  details?: AuditDetails;        // Action-specific JSON payload
  
  // Optional tracking
  ipAddress?: string | null;     // Future: for remote access
  userAgent?: string | null;     // Future: browser/device info
  
  createdAt: string;             // Redundant but useful for sorting
}

// Action types enum
type AuditAction = 
  | 'credit_transaction_created'
  | 'credit_ledger_entry_created'
  | 'session_closed_with_credit'
  | 'credit_payment_recorded'       // Phase 4
  | 'customer_created'
  | 'customer_updated'
  | 'customer_deactivated'
  | 'credit_balance_adjusted'       // Future: manual adjustment
  | 'audit_log_queried';            // Meta: someone viewed logs

// Entity types enum
type AuditEntityType =
  | 'transaction'
  | 'credit_ledger'
  | 'customer'
  | 'credit_payment'
  | 'session'
  | 'audit_log';

// Action-specific details (discriminated union)
type AuditDetails = 
  | CreditTransactionDetails
  | CreditLedgerDetails
  | SessionClosedDetails
  | CustomerDetails
  | PaymentDetails;

interface CreditTransactionDetails {
  transactionId: string;
  customerId: string;
  customerName: string;
  amount: number;
  items: Array<{
    nama: string;
    qty: number;
    harga: number;
  }>;
  previousBalance?: number;      // Customer balance before
  newBalance: number;            // Customer balance after
}

interface CreditLedgerDetails {
  ledgerId: string;
  customerId: string;
  customerName: string;
  type: 'debit' | 'credit';
  amount: number;
  balance: number;               // Running balance after entry
  refType: string;
  refId?: string | null;
}

interface SessionClosedDetails {
  sessionId: string;
  totalCreditAmount: number;
  creditTransactionCount: number;
  customers: Array<{
    customerId: string;
    customerName: string;
    amount: number;
  }>;
}

interface CustomerDetails {
  customerId: string;
  action: 'created' | 'updated' | 'deactivated';
  changes?: Partial<Customer>;   // For updates: changed fields only
  previousValues?: Partial<Customer>; // For updates: old values
}

interface PaymentDetails {
  paymentId: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  allocations: Array<{
    transactionId: string;
    amount: number;
  }>;
  previousBalance: number;
  newBalance: number;
}
```

---

## 🗄️ Database Schema

### Dexie Schema v12

```typescript
// In src/db/index.ts

const db = new Dexie('ClearTaskDB') as ClearTaskDB;

db.version(12).stores({
  // ... existing tables ...
  
  audit_logs: '++id, timestamp, action, userId, entityType, entityId, sessionId, createdAt',
});

// Add index on timestamp for fast range queries
// Add index on entityType + entityId for entity-specific queries
// Add index on sessionId for session-related audit trail
```

### Migration Plan

**From v11 → v12:**
- Add `audit_logs` table
- No data migration needed (new table starts empty)
- Backwards compatible (old code won't break)

---

## 🏗️ Architecture

### Service Layer

**New File:** `src/services/auditService.ts`

```typescript
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface LogAuditParams {
  action: AuditAction;
  userId: string;
  entityType: AuditEntityType;
  entityId?: string | null;
  sessionId?: string | null;
  details?: AuditDetails;
}

export const auditService = {
  /**
   * Log an audit event
   * @param params - Audit log parameters
   * @returns Promise<string> - Audit log ID
   */
  async logAction(params: LogAuditParams): Promise<string> {
    const auditId = uuidv4();
    const timestamp = new Date().toISOString();
    
    try {
      await db.audit_logs.add({
        id: auditId,
        timestamp,
        action: params.action,
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId || null,
        sessionId: params.sessionId || null,
        details: params.details || null,
        createdAt: timestamp,
      });
      
      console.log(`[AUDIT] ${params.action} by ${params.userId}`, params.details);
      return auditId;
    } catch (error) {
      // CRITICAL: Audit logging failure should NOT break app
      console.error('[AUDIT ERROR] Failed to log audit event:', error);
      console.error('[AUDIT ERROR] Params:', params);
      // Return empty ID instead of throwing
      return '';
    }
  },

  /**
   * Query audit logs with filters
   */
  async queryLogs(filters: {
    action?: AuditAction;
    userId?: string;
    entityType?: AuditEntityType;
    entityId?: string;
    sessionId?: string;
    startDate?: string;  // ISO date
    endDate?: string;    // ISO date
    limit?: number;
  }): Promise<AuditLog[]> {
    let query = db.audit_logs.orderBy('timestamp').reverse();
    
    // Apply filters
    if (filters.action) {
      query = query.filter(log => log.action === filters.action);
    }
    if (filters.userId) {
      query = query.filter(log => log.userId === filters.userId);
    }
    if (filters.entityType) {
      query = query.filter(log => log.entityType === filters.entityType);
    }
    if (filters.entityId) {
      query = query.filter(log => log.entityId === filters.entityId);
    }
    if (filters.sessionId) {
      query = query.filter(log => log.sessionId === filters.sessionId);
    }
    if (filters.startDate) {
      query = query.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      query = query.filter(log => log.timestamp <= filters.endDate!);
    }
    
    const limit = filters.limit || 100;
    return query.limit(limit).toArray();
  },

  /**
   * Get audit trail for specific entity
   */
  async getEntityAuditTrail(
    entityType: AuditEntityType,
    entityId: string
  ): Promise<AuditLog[]> {
    return db.audit_logs
      .where({ entityType, entityId })
      .reverse()
      .sortBy('timestamp');
  },

  /**
   * Get audit trail for session
   */
  async getSessionAuditTrail(sessionId: string): Promise<AuditLog[]> {
    return db.audit_logs
      .where('sessionId')
      .equals(sessionId)
      .reverse()
      .sortBy('timestamp');
  },

  /**
   * Get recent activity (dashboard)
   */
  async getRecentActivity(limit: number = 50): Promise<AuditLog[]> {
    return db.audit_logs
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  },

  /**
   * Export audit logs to CSV
   */
  async exportToCSV(filters: Parameters<typeof this.queryLogs>[0]): Promise<string> {
    const logs = await this.queryLogs(filters);
    
    const headers = ['Timestamp', 'Action', 'User', 'Entity Type', 'Entity ID', 'Session ID', 'Details'];
    const rows = logs.map(log => [
      log.timestamp,
      log.action,
      log.userId,
      log.entityType,
      log.entityId || '',
      log.sessionId || '',
      JSON.stringify(log.details || {}),
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csv;
  },

  /**
   * Clean old audit logs (retention policy)
   * @param daysToKeep - Keep logs from last X days (default: 365)
   */
  async cleanOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();
    
    const oldLogs = await db.audit_logs
      .where('timestamp')
      .below(cutoffISO)
      .toArray();
    
    const deletedCount = oldLogs.length;
    
    await db.audit_logs
      .where('timestamp')
      .below(cutoffISO)
      .delete();
    
    console.log(`[AUDIT] Cleaned ${deletedCount} logs older than ${daysToKeep} days`);
    return deletedCount;
  },
};
```

---

## 🔌 Integration Points

### 1. Credit Transaction Creation

**File:** `src/components/InputPenjualan.tsx`  
**Location:** After `db.transactions.add()` succeeds

```typescript
// In handleProsesPenjualan() after transaction saved
if (metodePembayaran === 'Credit' && selectedCustomerId) {
  const customer = await db.customers.get(selectedCustomerId);
  const customerBalance = customer?.totalPiutang || 0;
  
  await auditService.logAction({
    action: 'credit_transaction_created',
    userId: currentKasir, // From AuthContext
    entityType: 'transaction',
    entityId: newTransactionId,
    sessionId: currentSessionId,
    details: {
      transactionId: newTransactionId,
      customerId: selectedCustomerId,
      customerName: customer?.nama || 'Unknown',
      amount: totalAmount,
      items: cartItems.map(item => ({
        nama: item.nama,
        qty: item.qty,
        harga: item.harga,
      })),
      previousBalance: customerBalance,
      newBalance: customerBalance + totalAmount,
    },
  });
}
```

---

### 2. Credit Ledger Entry Creation

**File:** `src/services/creditService.ts` (to be created in Phase 4)  
**Location:** After `db.credit_ledger.add()` succeeds

```typescript
// In createCreditLedgerEntry()
await auditService.logAction({
  action: 'credit_ledger_entry_created',
  userId: currentKasir,
  entityType: 'credit_ledger',
  entityId: ledgerEntryId,
  sessionId: currentSessionId,
  details: {
    ledgerId: ledgerEntryId,
    customerId: ledgerEntry.customerId,
    customerName: customerName,
    type: ledgerEntry.type,
    amount: ledgerEntry.amount,
    balance: ledgerEntry.balance,
    refType: ledgerEntry.refType,
    refId: ledgerEntry.refId,
  },
});
```

---

### 3. Session Close with Credit

**File:** `src/hooks/useSession.ts`  
**Location:** In `closingSession()` after session saved

```typescript
// In closingSession() after successful close
if (stats.jumlahTransaksiKredit > 0) {
  await auditService.logAction({
    action: 'session_closed_with_credit',
    userId: currentKasir,
    entityType: 'session',
    entityId: sessionId,
    sessionId: sessionId,
    details: {
      sessionId: sessionId,
      totalCreditAmount: stats.totalPenjualanKredit,
      creditTransactionCount: stats.jumlahTransaksiKredit,
      customers: stats.creditCustomers.map(c => ({
        customerId: c.customerId,
        customerName: c.customerName,
        amount: c.amount,
      })),
    },
  });
}
```

---

### 4. Customer Management (Future)

**File:** `src/hooks/useCustomer.ts` or customer management component  
**Location:** In create/update/deactivate functions

```typescript
// Example: Customer created
await auditService.logAction({
  action: 'customer_created',
  userId: currentKasir,
  entityType: 'customer',
  entityId: newCustomerId,
  details: {
    customerId: newCustomerId,
    action: 'created',
    changes: {
      nama: customerData.nama,
      telepon: customerData.telepon,
      alamat: customerData.alamat,
    },
  },
});

// Example: Customer updated
await auditService.logAction({
  action: 'customer_updated',
  userId: currentKasir,
  entityType: 'customer',
  entityId: customerId,
  details: {
    customerId: customerId,
    action: 'updated',
    changes: updatedFields,
    previousValues: originalValues,
  },
});
```

---

## 🧪 Testing Strategy

### Unit Tests

**File:** `src/services/__tests__/auditService.test.ts`

```typescript
describe('auditService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('logAction', () => {
    it('should create audit log entry', async () => {
      const auditId = await auditService.logAction({
        action: 'credit_transaction_created',
        userId: 'Test Kasir',
        entityType: 'transaction',
        entityId: 'tx-123',
        sessionId: 'session-1',
        details: {
          transactionId: 'tx-123',
          customerId: 'cust-1',
          customerName: 'Test Customer',
          amount: 50000,
          items: [],
          newBalance: 50000,
        },
      });

      expect(auditId).toBeTruthy();
      
      const log = await db.audit_logs.get(auditId);
      expect(log).toBeDefined();
      expect(log?.action).toBe('credit_transaction_created');
      expect(log?.userId).toBe('Test Kasir');
      expect(log?.details).toMatchObject({
        amount: 50000,
      });
    });

    it('should NOT throw if audit log fails', async () => {
      // Simulate DB error by closing DB
      db.close();
      
      // Should not throw
      const auditId = await auditService.logAction({
        action: 'credit_transaction_created',
        userId: 'Test',
        entityType: 'transaction',
      });
      
      expect(auditId).toBe(''); // Returns empty string on error
    });
  });

  describe('queryLogs', () => {
    it('should filter by action', async () => {
      await auditService.logAction({
        action: 'credit_transaction_created',
        userId: 'Kasir A',
        entityType: 'transaction',
      });
      
      await auditService.logAction({
        action: 'customer_created',
        userId: 'Kasir B',
        entityType: 'customer',
      });
      
      const logs = await auditService.queryLogs({
        action: 'credit_transaction_created',
      });
      
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('credit_transaction_created');
    });

    it('should filter by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await auditService.logAction({
        action: 'credit_transaction_created',
        userId: 'Test',
        entityType: 'transaction',
      });
      
      const logs = await auditService.queryLogs({
        startDate: yesterday.toISOString(),
        endDate: tomorrow.toISOString(),
      });
      
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('getEntityAuditTrail', () => {
    it('should return all logs for specific entity', async () => {
      const entityId = 'tx-123';
      
      await auditService.logAction({
        action: 'credit_transaction_created',
        userId: 'Kasir',
        entityType: 'transaction',
        entityId: entityId,
      });
      
      await auditService.logAction({
        action: 'credit_ledger_entry_created',
        userId: 'Kasir',
        entityType: 'credit_ledger',
        entityId: 'ledger-1',
        details: { refId: entityId }, // References transaction
      });
      
      const trail = await auditService.getEntityAuditTrail('transaction', entityId);
      
      expect(trail).toHaveLength(1);
      expect(trail[0].entityId).toBe(entityId);
    });
  });

  describe('cleanOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      // Create old log (simulate by manipulating timestamp)
      const oldLog = {
        id: 'old-1',
        timestamp: '2025-01-01T00:00:00.000Z', // > 1 year ago
        action: 'credit_transaction_created',
        userId: 'Test',
        entityType: 'transaction',
        createdAt: '2025-01-01T00:00:00.000Z',
      };
      
      await db.audit_logs.add(oldLog);
      
      const deletedCount = await auditService.cleanOldLogs(365);
      
      expect(deletedCount).toBeGreaterThan(0);
      
      const remaining = await db.audit_logs.get('old-1');
      expect(remaining).toBeUndefined();
    });
  });
});
```

---

### Integration Tests

**Scenario:** Full credit transaction flow with audit trail

```typescript
it('should create complete audit trail for credit transaction', async () => {
  // 1. Create customer
  const customerId = await createCustomer({ nama: 'Test Customer' });
  
  // Verify customer creation audited
  let logs = await auditService.queryLogs({ action: 'customer_created' });
  expect(logs).toHaveLength(1);
  
  // 2. Create credit transaction
  const transactionId = await createCreditTransaction({
    customerId,
    amount: 50000,
  });
  
  // Verify transaction audited
  logs = await auditService.queryLogs({ action: 'credit_transaction_created' });
  expect(logs).toHaveLength(1);
  expect(logs[0].details.amount).toBe(50000);
  
  // 3. Close session
  await closeSession(sessionId);
  
  // Verify session close audited
  logs = await auditService.queryLogs({ action: 'session_closed_with_credit' });
  expect(logs).toHaveLength(1);
  
  // 4. Get full audit trail for transaction
  const trail = await auditService.getEntityAuditTrail('transaction', transactionId);
  expect(trail.length).toBeGreaterThan(0);
});
```

---

## 📊 UI Components (Future Phase)

### Audit Log Viewer (Phase 5 or beyond)

**Component:** `src/components/AuditLogViewer.tsx`

Features:
- Table view of recent audit logs
- Filters: action, user, date range, entity
- Export to CSV button
- Detail modal showing full JSON
- Pagination (show 50 per page)

**Location:** New tab in Settings or Admin section

---

## 🔒 Security Considerations

1. **No Sensitive Data in Details**
   - ❌ Do NOT log passwords, PINs, or auth tokens
   - ❌ Do NOT log full payment card details
   - ✅ DO log transaction amounts, customer names, actions

2. **Audit Log Immutability**
   - Audit logs should NEVER be updated (only created)
   - Deletion only through retention policy cleanup
   - No user-facing delete button

3. **Performance**
   - Audit logging is async - does NOT block main flow
   - Failure to log should NOT break transaction
   - Use try-catch with silent error handling

4. **Privacy Compliance**
   - Include retention policy (default 365 days)
   - Allow export for compliance requests
   - Consider GDPR right-to-be-forgotten for customer data

---

## 📈 Performance Impact

### Expected Overhead

| Operation | Before Audit | After Audit | Overhead |
|-----------|-------------|-------------|----------|
| Create transaction | ~50ms | ~55ms | +5ms |
| Close session | ~100ms | ~110ms | +10ms |
| Customer CRUD | ~30ms | ~35ms | +5ms |

**Mitigation:**
- Audit writes are async (non-blocking)
- IndexedDB adds are fast (<10ms typically)
- No sync I/O or network calls

---

## 🚀 Implementation Phases

### Phase 3D.1: Core Infrastructure (1 day)
- [x] Create audit log data model (`AuditLog` interface)
- [ ] Add `audit_logs` table to Dexie schema v12
- [ ] Write schema migration (v11 → v12)
- [ ] Create `auditService.ts` with all methods
- [ ] Write unit tests for `auditService`

### Phase 3D.2: Integration (0.5 day)
- [ ] Integrate audit logs into credit transaction flow
- [ ] Integrate audit logs into session close flow
- [ ] Add audit logs to customer management (when ready)
- [ ] Test integration with existing features

### Phase 3D.3: Testing & Documentation (0.5 day)
- [ ] Write integration tests
- [ ] Manual testing of audit trail
- [ ] Update documentation
- [ ] Create audit log query examples

---

## ✅ Acceptance Criteria

**Phase 3D is complete when:**
1. ✅ `audit_logs` table exists in schema v12
2. ✅ `auditService.ts` implemented with all methods
3. ✅ Unit tests pass (>90% coverage on service)
4. ✅ Integration tests pass (full credit flow audited)
5. ✅ Credit transactions automatically logged
6. ✅ Session close with credit automatically logged
7. ✅ Audit logs queryable via `auditService.queryLogs()`
8. ✅ Export to CSV functionality works
9. ✅ No performance degradation (< 10ms overhead)
10. ✅ Audit logging failures do NOT break app

---

## 🔜 Future Enhancements (Post-Phase 3D)

### Phase 4 Additions
- Log credit payment recordings
- Log payment allocations to transactions

### Phase 5 Additions
- Audit Log Viewer UI component
- Advanced filtering and search
- Real-time audit log streaming (WebSocket)

### Phase 6 Additions
- Anomaly detection (suspicious patterns)
- Automated alerts (large transactions, unusual activity)
- Compliance reports (monthly summaries)

---

## 📝 Notes

### Why Audit Logging Matters

1. **Regulatory Compliance** - Many jurisdictions require audit trails for financial transactions
2. **Fraud Detection** - Unusual patterns become visible in audit logs
3. **Dispute Resolution** - "Who did what when" questions answered definitively
4. **System Debugging** - Trace root cause of data issues
5. **Business Intelligence** - Understand how system is actually used

### Design Decisions

**Q: Why separate audit_logs table instead of embedding in transactions?**
A: Audit logs are append-only, queryable independently, and cover multiple entity types (not just transactions).

**Q: Why store details as JSON blob instead of normalized tables?**
A: Each action type has different detail schema. JSON provides flexibility without schema bloat. Still queryable via Dexie.

**Q: Why NOT throw errors on audit log failure?**
A: Audit logging is observability - it should never break business logic. Silent error logging with console.error is sufficient.

**Q: What about audit log for audit log queries (meta-audit)?**
A: Optional feature for Phase 5+. Can log `audit_log_queried` action when someone views logs. Useful for tracking who's investigating what.

---

**Status:** Ready for Implementation  
**Next:** Implement Phase 3D.1 (Core Infrastructure)
