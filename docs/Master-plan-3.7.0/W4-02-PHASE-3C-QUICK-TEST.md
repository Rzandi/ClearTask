# W4-02 Phase 3C: Quick Test Checklist (5 Minutes)

**Purpose:** Fast verification before moving to Phase 3D

---

## 🚀 Quick Test (Essential Only)

### 1. No Credit Scenario (30 seconds)
```
✓ Start fresh session
✓ Create 1 cash transaction
✓ Close session
✓ Verify NO credit section appears
```

### 2. Single Credit Scenario (60 seconds)
```
✓ Add items to cart (Rp 10,000)
✓ Select Metode: "Credit"
✓ Select customer: "Ibu Siti"
✓ Process transaction
✓ Close session
✓ Verify:
  - "Penjualan Kredit" section appears (amber theme)
  - Total: Rp 10.000
  - Badge: "1 transaksi"
  - Customer: "Ibu Siti" (not "Customer #...")
  - Amount: Rp 10.000
```

### 3. Multiple Customers Sorting (90 seconds)
```
✓ Create 3 credit transactions:
  - Customer A: Rp 50,000
  - Customer B: Rp 100,000
  - Customer C: Rp 25,000
✓ Close session
✓ Verify order:
  1. Customer B (Rp 100,000) ← First
  2. Customer A (Rp 50,000)
  3. Customer C (Rp 25,000)
```

### 4. Visual Check (30 seconds)
```
✓ Section has amber border
✓ Text is readable (contrast OK)
✓ Scrollbar appears if >3 customers
✓ Help text visible: "💡 Hutang ini sudah tercatat..."
```

### 5. Console Check (10 seconds)
```
✓ Open DevTools Console
✓ No errors (red lines)
✓ No warnings about missing keys
```

---

## ✅ Pass Criteria

**ALL of these must pass:**
- [ ] Credit section conditionally renders (hidden when no credit)
- [ ] Total amount calculated correctly
- [ ] Customer names enriched from DB (not fallback)
- [ ] Customers sorted by amount DESC
- [ ] UI matches amber theme
- [ ] No console errors

---

## 🐛 If Test Fails

**Option 1 - Minor Issues:**
- Document in `W4-02-BUGS.md`
- Fix immediately (likely <30 min)
- Re-run quick test

**Option 2 - Major Issues:**
- Run full test suite (`W4-02-PHASE-3C-TESTING-GUIDE.md`)
- Debug systematically
- Consider rolling back

---

**Time Required:** 5 minutes  
**Next Step:** Phase 3D (Audit Logging)
