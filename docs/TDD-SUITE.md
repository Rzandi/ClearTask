# 🧪 ClearTask v3.1.0 — TDD Suite & Characterization Testing (Fase 2)

> **Agent:** Architect Agent  
> **Status:** Pending Approval (URG-2)

This document establishes the **Characterization Testing Plan** to lock existing legacy logic and defines the **TDD RED Slices** for new structural upgrades.

---

## 🔍 1. Edge Case Analysis & Worst-Case Scenarios

Here is a list of critical edge cases mapped under **A-ADD validation guidelines**:

1. **Edge Case 1: Transaction Migration Corruption (v2 to v3 array shift)**
   - _Scenario:_ Existing transactions with single `namaBarang` fields must not lose details or fail to mount in the new cart list (`items[]`).
2. **Edge Case 2: Memory Overflow on Large Dexie Bulk Loads**
   - _Scenario:_ Merging an import file of >5,000 transactions might lock the JavaScript engine. Bulk additions must be batched.
3. **Edge Case 3: Storage Quota Exceeded (Silent Drop)**
   - _Scenario:_ When the browser disk space is full, Dexie writes throw `QuotaExceededError`. The write must abort clean (rollback) and notify the user via UI Toast.
4. **Edge Case 4: Timezone Shift at Midnight WIB (00:00 - 06:59)**
   - _Scenario:_ Local date comparison in transaction lookups can yield "yesterday's date" if standard `toISOString` splits are used instead of local formatters.
5. **Edge Case 5: Empty Cart Submissions**
   - _Scenario:_ Pressing submit on `InputPenjualan` when no items are selected. The validation layer must throw validation errors.
6. **Edge Case 6: Stale Cashier Binding**
   - _Scenario:_ Cashier changes name in settings, but input form continues recording under default `'Admin'` context.
7. **Edge Case 7: Double Import Merge Collisions**
   - _Scenario:_ Merging identical files twice. `calculateMerge` must detect existing transactional UUIDs (`transactionId`) and skip duplicate insertion.
8. **Edge Case 8: Web Worker Crash on SAW Calculations**
   - _Scenario:_ Failure to load worker script or parsing invalid data structures. The hook must gracefully catch errors and fall back to clean states.
9. **Edge Case 9: Extreme SAW Weight Modifications**
   - _Scenario:_ Weight controls set to `0` or exceeding sum total of `1.0`. Normalizer must distribute or throw validation alerts.
10. **Edge Case 10: Date Filter Boundary Overlap**
    - _Scenario:_ Date range filtering matching bounds exactly at `23:59:59` or `00:00:00`. Date parsing must include full localized day strings.

---

## 🏗️ 2. Legacy Characterization Testing (Locking Old Behaviors)

These unit tests are verified as **GREEN** to ensure zero regressions in standard workflows:

### Test Case 1: Timezone Standardization Verification

- **Target:** `src/__tests__/toLocalDateString.test.js`
- **Assertion:** Verifies that a Date input at WIB midnight (UTC+7) maps exactly to the local calendar date, not UTC.
- **Test Code:**
  ```javascript
  const date = new Date(2024, 0, 15, 1, 0, 0); // Jan 15 WIB
  expect(toLocalDateString(date)).toBe('2024-01-15');
  ```

### Test Case 2: Transaction CRUD Isolation

- **Target:** `src/__tests__/useTransactions-edit.test.jsx`
- **Assertion:** Ensures adding, updating, and deleting transactions atomically modifies the database without leaking cross-talk records.

### Test Case 3: Session Operations Validation

- **Target:** `src/__tests__/useSession.test.js`
- **Assertion:** Asserts that `openSession` and `closeSession` populate start and close timestamps and compute metrics correctly.

---

## 🔴 3. TDD RED Slices (Failing Scenarios for New Expansions)

These tests will be written inside `src/__tests__` as **RED** first to ensure we write strict validation code:

### Test Case 4: QuotaExceededError Bubble-Up (RED)

- **Goal:** Verify storage write failures are not swallowed.
- **Test Spec:** Mock IndexedDB store to simulate quota exhaustion and check if hooks bubble the error.
- **Test Code:**
  ```javascript
  it('throws QuotaExceededError to parent hook on storage exhaustion', async () => {
    vi.spyOn(db.transactions, 'add').mockRejectedValue(new Error('QuotaExceededError'));
    await expect(addTransaction(mockTxData)).rejects.toThrow('QuotaExceededError');
  });
  ```

### Test Case 5: SAW Analysis Web Worker Contract Verification (RED)

- **Goal:** Verify that worker inputs and outputs map correctly.
- **Test Spec:** Feed mock inputs (criteria, transaction array, stocks) to Web Worker and expect correct ranking outputs.

### Test Case 6: Double Import Merge Prevention (RED)

- **Goal:** Skip existing transactions dynamically.
- **Test Spec:** Calculate merges with existing `transactionId` in payload and expect `skipped` count to increment.
