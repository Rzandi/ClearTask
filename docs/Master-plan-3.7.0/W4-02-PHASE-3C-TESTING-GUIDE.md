# W4-02 Phase 3C: Testing Guide - Credit Sales in Closing Report

**Created:** 2026-10-05  
**Status:** Testing Phase  
**Target:** Manual verification of credit summary in session closing report

---

## 🎯 Testing Objective

Verify that credit sales are correctly displayed in the session closing report with:
1. Accurate total credit amount calculation
2. Correct transaction count
3. Customer names properly enriched from database
4. UI rendering correctly with amber theme
5. Conditional rendering (only shows when credit exists)

---

## 📋 Pre-Test Setup

### 1. Ensure Test Environment is Ready

```bash
# Start development server
npm run dev
```

### 2. Verify Database Schema

Open browser DevTools → Application → IndexedDB → ClearTaskDB

**Required tables:**
- ✅ `customers` - Should exist with at least 2-3 test customers
- ✅ `transactions` - Can be empty initially
- ✅ `sessions` - Current session should exist

### 3. Create Test Customers (if not already exist)

Navigate to **Hutang-Piutang tab** → Add customers:

| Nama Customer | Telepon | Notes |
|--------------|---------|-------|
| Ibu Siti | 081234567890 | Customer with highest credit |
| Pak Budi | 081234567891 | Customer with medium credit |
| Toko Maju | 081234567892 | Business customer |

---

## 🧪 Test Scenarios

### **Scenario 1: Closing Report WITHOUT Credit Transactions**

**Purpose:** Verify conditional rendering works (section hidden when no credit)

**Steps:**
1. Start fresh session or ensure current session has NO credit transactions
2. Create 2-3 regular cash/QRIS transactions
3. Click **"Tutup Sesi"** button
4. Wait for ClosingReportModal to appear

**Expected Result:**
- ✅ Modal displays normally
- ✅ "Penjualan Kredit" section **DOES NOT** appear
- ✅ Only regular sections shown (cash breakdown, payment methods, etc.)
- ✅ No errors in console

**Screenshot Location:** `test-screenshots/phase3c-no-credit.png`

---

### **Scenario 2: Single Credit Transaction**

**Purpose:** Verify basic credit display with one customer

**Steps:**
1. In POS (Kasir tab), add items to cart:
   - Example: 2x Indomie Goreng @ Rp3,000 = Rp6,000
2. Select **Metode Pembayaran: "Credit"**
3. Select customer: **"Ibu Siti"**
4. Click **"Proses Transaksi"**
5. Verify success toast appears
6. Click **"Tutup Sesi"**
7. ClosingReportModal appears

**Expected Result:**

**Credit Summary Section Visible:**
```
📊 Penjualan Kredit
─────────────────────────────────────
Total Hutang Baru:     Rp 6.000
[1 transaksi] badge

Breakdown per Customer:
┌─────────────────────────────────┐
│ • Ibu Siti          Rp 6.000    │
└─────────────────────────────────┘

💡 Hutang ini sudah tercatat di tab Hutang-Piutang
```

**Verify:**
- ✅ Section has amber border (`border-amber-500/30`)
- ✅ Background is amber tinted (`bg-amber-500/10`)
- ✅ Total amount is **Rp 6.000** (formatted with dots)
- ✅ Badge shows "1 transaksi"
- ✅ Customer name is **"Ibu Siti"** (not "Customer #...")
- ✅ Customer amount is **Rp 6.000**
- ✅ Help text visible at bottom
- ✅ No console errors

**Screenshot Location:** `test-screenshots/phase3c-single-credit.png`

---

### **Scenario 3: Multiple Credit Transactions (Same Customer)**

**Purpose:** Verify aggregation by customer works correctly

**Steps:**
1. Create 3 credit transactions for **same customer** (Ibu Siti):
   - Transaction 1: Rp 10,000
   - Transaction 2: Rp 15,000
   - Transaction 3: Rp 5,000
2. Click **"Tutup Sesi"**

**Expected Result:**

```
Total Hutang Baru:     Rp 30.000
[3 transaksi] badge

Breakdown per Customer:
• Ibu Siti          Rp 30.000
```

**Verify:**
- ✅ Total is **Rp 30,000** (sum of all 3)
- ✅ Badge shows "3 transaksi"
- ✅ Only **ONE** line for Ibu Siti (aggregated)
- ✅ Customer amount is **Rp 30,000** (not shown 3 times)

**Screenshot Location:** `test-screenshots/phase3c-aggregated-customer.png`

---

### **Scenario 4: Multiple Customers (Sorting Test)**

**Purpose:** Verify customers sorted by amount DESC (highest first)

**Steps:**
1. Create credit transactions for different customers:
   - Ibu Siti: Rp 50,000
   - Pak Budi: Rp 100,000 (highest)
   - Toko Maju: Rp 25,000
2. Click **"Tutup Sesi"**

**Expected Result:**

```
Total Hutang Baru:     Rp 175.000
[3 transaksi] badge

Breakdown per Customer:
• Pak Budi          Rp 100.000  ← First (highest)
• Ibu Siti          Rp 50.000   ← Second
• Toko Maju         Rp 25.000   ← Third (lowest)
```

**Verify:**
- ✅ Total is **Rp 175,000** (sum correct)
- ✅ **Pak Budi appears FIRST** (not alphabetical)
- ✅ Order is descending by amount
- ✅ All 3 customers visible

**Screenshot Location:** `test-screenshots/phase3c-sorted-customers.png`

---

### **Scenario 5: Many Customers (Scrollbar Test)**

**Purpose:** Verify scrollable list handles many customers gracefully

**Steps:**
1. Create credit transactions for **6+ customers** (if you don't have 6 customers, create more first)
2. Each with different amounts
3. Click **"Tutup Sesi"**

**Expected Result:**
- ✅ Customer list container has `max-h-[120px]` applied
- ✅ Scrollbar appears (vertical scroll)
- ✅ Can scroll to see all customers
- ✅ No layout overflow or broken UI
- ✅ Header and help text remain visible (not scrolled)

**Screenshot Location:** `test-screenshots/phase3c-scrollbar.png`

---

### **Scenario 6: Mixed Payment Methods**

**Purpose:** Verify credit section appears alongside other payment methods

**Steps:**
1. In one session, create:
   - 2x Cash transactions (Rp 20,000 each)
   - 1x QRIS transaction (Rp 15,000)
   - 2x Credit transactions (Rp 30,000 total)
2. Click **"Tutup Sesi"**

**Expected Result:**

Modal should show **ALL sections:**
1. ✅ Setoran Tunai (Cash reconciliation) - green theme
2. ✅ Breakdown per Metode Pembayaran - shows Cash + QRIS + Credit
3. ✅ **Penjualan Kredit** section - amber theme, shows Rp 30,000
4. ✅ All sections visually distinct (different colors)

**Verify Credit Section Position:**
- ✅ Appears **AFTER** "Breakdown per Metode Pembayaran"
- ✅ Appears **BEFORE** session notes (if any)
- ✅ Clear visual separation from other sections

**Screenshot Location:** `test-screenshots/phase3c-mixed-payments.png`

---

### **Scenario 7: Customer Name Enrichment**

**Purpose:** Verify customer names loaded from DB (not fallback "Customer #...")

**Steps:**
1. Open DevTools → IndexedDB → customers table
2. Note the `nama` field for a customer (e.g., "Ibu Siti")
3. Create credit transaction for that customer
4. Close session
5. **WITHOUT closing DevTools**, verify the displayed name in modal

**Expected Result:**
- ✅ Customer name in modal matches `customers.nama` from DB
- ✅ NOT showing "Customer #123" fallback
- ✅ If customer is deleted from DB mid-session, fallback shows (edge case)

**Screenshot Location:** `test-screenshots/phase3c-name-enrichment.png`

---

### **Scenario 8: Edge Case - Zero Credit Amount**

**Purpose:** Verify handling of Rp 0 transactions (edge case)

**Steps:**
1. Manually insert transaction via DevTools (or create one and modify):
   ```javascript
   // In DevTools Console
   db.transactions.add({
     id: 'test-zero-credit',
     items: [],
     subtotal: 0,
     total: 0,
     metode: 'kredit',
     customerId: 1, // Valid customer ID
     tanggal: new Date().toISOString().split('T')[0],
     sessionId: 'current-session-id',
     createdAt: new Date().toISOString(),
     createdBy: 'Test User'
   });
   ```
2. Close session

**Expected Result:**
- ✅ Transaction counted in badge (e.g., "1 transaksi")
- ✅ Amount shows **Rp 0** (not hidden)
- ✅ Customer listed with Rp 0
- ✅ No JavaScript errors

**Screenshot Location:** `test-screenshots/phase3c-zero-amount.png`

---

### **Scenario 9: Edge Case - Deleted Customer**

**Purpose:** Verify fallback when customer record deleted

**Steps:**
1. Create credit transaction for "Ibu Siti"
2. Before closing session, delete customer from DB:
   ```javascript
   // DevTools Console
   db.customers.delete(1); // Ibu Siti's ID
   ```
3. Close session

**Expected Result:**
- ✅ Credit section still appears
- ✅ Customer name shows fallback: **"Customer #1"** (not crash)
- ✅ Amount still calculated correctly
- ✅ No console errors

**Screenshot Location:** `test-screenshots/phase3c-deleted-customer.png`

---

### **Scenario 10: Performance Test**

**Purpose:** Verify performance with large dataset

**Steps:**
1. Use DevTools to bulk insert 20 credit transactions across 5 customers
2. Close session
3. Measure render time

**Expected Result:**
- ✅ Modal opens within **< 1 second**
- ✅ No lag or freeze
- ✅ `useMemo` prevents re-computation on every render
- ✅ No console warnings about performance

**Check DevTools Performance Tab:**
- React Component render time for `ClosingReportModal`
- `enrichedCreditCustomers` memo recomputation count

**Screenshot Location:** `test-screenshots/phase3c-performance.png`

---

## 🐛 Known Issues to Watch For

### Issue 1: Customer Name Not Loading
**Symptom:** Shows "Customer #123" instead of real name

**Possible Causes:**
- `useLiveQuery` on customers returned undefined
- `customerId` mismatch between transaction and customer table
- Customer deleted before modal rendered

**Debug:**
```javascript
// Add in ClosingReportModal.tsx (temporarily)
console.log('All Customers:', allCustomers);
console.log('Credit Customers from Stats:', stats.creditCustomers);
console.log('Enriched:', enrichedCreditCustomers);
```

---

### Issue 2: Amount Calculation Wrong
**Symptom:** Total credit doesn't match sum of transactions

**Possible Causes:**
- Transaction `total` field is string, not number
- Missing `Number()` cast in `sessionStats.ts`
- Filtered out transactions without `customerId`

**Debug:**
```javascript
// Check in sessionStats.ts
console.log('Credit Transactions:', activeTransactions.filter(tx => 
  tx.metode?.toLowerCase() === 'kredit'
));
```

---

### Issue 3: Section Not Appearing
**Symptom:** No credit section even though credit transactions exist

**Possible Causes:**
- Conditional render `stats.jumlahTransaksiKredit > 0` failing
- Stats calculation returning 0
- Transaction `metode` not exactly 'kredit' (case-sensitive)

**Debug:**
```javascript
// Add before return in ClosingReportModal
console.log('Stats:', stats);
console.log('Jumlah Kredit:', stats.jumlahTransaksiKredit);
```

---

### Issue 4: Scrollbar Not Appearing
**Symptom:** Customer list overflows without scroll

**Possible Causes:**
- Missing `overflow-y-auto` class
- `max-h-[120px]` not applied
- Tailwind config issue

**Verify in DevTools Elements Tab:**
```html
<div class="max-h-[120px] overflow-y-auto ...">
  <!-- Customer list -->
</div>
```

---

## ✅ Test Completion Checklist

After running all scenarios, verify:

- [ ] **Scenario 1** - No credit section when no credit transactions ✅
- [ ] **Scenario 2** - Single credit transaction displays correctly ✅
- [ ] **Scenario 3** - Same customer aggregation works ✅
- [ ] **Scenario 4** - Customer sorting (highest first) works ✅
- [ ] **Scenario 5** - Scrollbar appears with many customers ✅
- [ ] **Scenario 6** - Mixed payment methods all visible ✅
- [ ] **Scenario 7** - Customer name enrichment works ✅
- [ ] **Scenario 8** - Zero amount handled gracefully ✅
- [ ] **Scenario 9** - Deleted customer fallback works ✅
- [ ] **Scenario 10** - Performance acceptable (<1s render) ✅

### Visual Verification
- [ ] Amber theme applied (`border-amber-500/30`, `bg-amber-500/10`)
- [ ] Typography hierarchy clear (2xl for total, base for customers)
- [ ] Spacing consistent (gap-3, p-4)
- [ ] Mobile responsive (test on narrow viewport)

### Console Checks
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No Dexie query errors
- [ ] No infinite re-render loops

---

## 📸 Screenshot Locations

Save all test screenshots in:
```
ClearTask/test-screenshots/phase3c/
├── no-credit.png
├── single-credit.png
├── aggregated-customer.png
├── sorted-customers.png
├── scrollbar.png
├── mixed-payments.png
├── name-enrichment.png
├── zero-amount.png
├── deleted-customer.png
└── performance.png
```

---

## 🚀 Next Steps After Testing

1. **If all tests pass:**
   - ✅ Mark Phase 3C as COMPLETE
   - ✅ Proceed to Phase 3D (Audit Logging)

2. **If bugs found:**
   - Document bugs in `W4-02-BUGS.md`
   - Fix critical bugs before Phase 3D
   - Re-run failed scenarios

3. **Performance Issues:**
   - Profile with React DevTools
   - Optimize `useMemo` dependencies
   - Consider pagination if >50 customers

---

## 📝 Test Report Template

After testing, create `W4-02-PHASE-3C-TEST-REPORT.md`:

```markdown
# Phase 3C Test Report

**Tested By:** [Your Name]
**Date:** 2026-10-05
**Environment:** Development (npm run dev)
**Browser:** Chrome 130.x

## Results Summary
- Total Scenarios: 10
- Passed: X
- Failed: Y
- Blocked: Z

## Failed Scenarios
[List any failures with screenshots]

## Performance Metrics
- Modal render time: XXms
- Customer enrichment time: XXms

## Recommendations
[Any improvements or concerns]
```

---

## 🎓 Testing Tips

1. **Use DevTools Console** - Quick way to inspect data without UI
2. **Test on Mobile Viewport** - Responsive design critical
3. **Clear IndexedDB between tests** - Ensures clean state
4. **Take screenshots BEFORE fixing bugs** - Document the issue
5. **Test with real-world data** - Don't just use test data

---

**Status:** Ready for Testing  
**Next:** Run all 10 scenarios, document results, then proceed to Phase 3D
