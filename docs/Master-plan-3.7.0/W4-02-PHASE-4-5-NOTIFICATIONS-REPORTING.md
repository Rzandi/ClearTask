# W4-02 Phase 4-5: Hutang-Piutang Notifications & Reporting

> **Status:** 🔄 PLANNED (following Phase 3D completion)  
> **Priority:** High  
> **Complexity:** Medium  
> **Target:** v3.7.0 (2026-10-10)  
> **Prerequisites:** ✅ Phase 1-3D Complete

---

## 📋 Overview

Melengkapi fitur Hutang-Piutang dengan sistem notifikasi proaktif dan laporan manajemen kredit yang komprehensif. Phase 4-5 ini fokus pada **business intelligence** dan **risk management** untuk meminimalkan bad debt.

### Previous Phases Recap
- ✅ **Phase 1:** Data layer (Customer, CreditLedger, CreditPayment) 
- ✅ **Phase 2:** UI components (CustomerSelector, CreditBadge, dll)
- ✅ **Phase 3A-3C:** Tab integration (Pelanggan + Piutang tabs)
- ✅ **Phase 3D:** POS integration + audit logging

**Completion Progress:** 75% → Target 100%

---

## 🎯 Phase 4: Notifications & Alerts

### FR-4.1: Low Credit Warning Badge
**Trigger:** Customer's `creditBalance` ≤ `creditLimit * 0.2` (20% remaining)

**Display:**
- Badge kuning ⚠️ di `CustomerSelector` dropdown
- Tooltip: "Kredit menipis: Rp X tersisa dari limit Rp Y"
- Badge juga muncul di Pelanggan tab (list view)

**Implementation:**
```typescript
// src/utils/creditHelper.ts
export function getCreditStatus(
  balance: number,
  limit: number
): 'safe' | 'warning' | 'exceeded' {
  if (balance > limit) return 'exceeded';
  if (balance >= limit * 0.8) return 'warning';
  return 'safe';
}

export function getCreditStatusBadge(status: CreditStatus) {
  switch (status) {
    case 'exceeded':
      return { icon: '🔴', text: 'LIMIT TERLAMPAUI', color: 'bg-red-500' };
    case 'warning':
      return { icon: '⚠️', text: 'Kredit Menipis', color: 'bg-yellow-500' };
    case 'safe':
      return { icon: '✅', text: 'Aman', color: 'bg-green-500' };
  }
}
```

---

### FR-4.2: Overdue Payment Reminder
**Trigger:** `CreditLedger` dengan `status: 'unpaid'` dan `dueDate < today`

**Display:**
- Panel "Piutang Jatuh Tempo" di Dashboard (top section)
- List pelanggan dengan total overdue amount
- Auto-refresh setiap hari (check at app startup)

**UI Component:**
```tsx
// src/components/OverduePanel.tsx
export default function OverduePanel() {
  const [overdueList, setOverdueList] = useState<OverdueSummary[]>([]);
  
  useEffect(() => {
    const fetchOverdue = async () => {
      const today = new Date().toISOString().split('T')[0];
      const ledgers = await db.credit_ledger
        .where('[status+dueDate]')
        .between(['unpaid', Dexie.minKey], ['unpaid', today])
        .toArray();
      
      // Group by customer
      const grouped = groupBy(ledgers, 'customerId');
      const summary = await Promise.all(
        Object.entries(grouped).map(async ([customerId, ledgers]) => {
          const customer = await db.customers.get(customerId);
          const totalOverdue = sumBy(ledgers, 'amount');
          const oldestDue = minBy(ledgers, 'dueDate')?.dueDate;
          
          return {
            customer,
            totalOverdue,
            oldestDue,
            count: ledgers.length
          };
        })
      );
      
      setOverdueList(summary.sort((a, b) => b.totalOverdue - a.totalOverdue));
    };
    
    fetchOverdue();
  }, []);
  
  if (overdueList.length === 0) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-green-900/20 to-cyan-900/20">
        <CardBody>
          <p className="flex items-center gap-2 text-green-400">
            ✅ <strong>Tidak ada piutang jatuh tempo</strong>
          </p>
        </CardBody>
      </Card>
    );
  }
  
  return (
    <Card className="mb-6 bg-gradient-to-r from-red-900/20 to-orange-900/20">
      <CardHeader>
        <h3 className="text-lg font-semibold text-red-400">
          🔔 Piutang Jatuh Tempo ({overdueList.length} pelanggan)
        </h3>
      </CardHeader>
      <CardBody>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left">Pelanggan</th>
              <th className="text-right">Total Overdue</th>
              <th className="text-center">Jatuh Tempo</th>
              <th className="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {overdueList.slice(0, 5).map(item => (
              <tr key={item.customer.id} className="border-b border-gray-800">
                <td>{item.customer.nama}</td>
                <td className="text-right text-red-400 font-bold">
                  {formatIDR(item.totalOverdue)}
                </td>
                <td className="text-center text-gray-400">
                  {formatDate(item.oldestDue)} ({daysAgo(item.oldestDue)} hari lalu)
                </td>
                <td className="text-center">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigateToPelangganDetail(item.customer.id)}
                  >
                    Lihat Detail
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {overdueList.length > 5 && (
          <p className="mt-2 text-gray-400 text-xs">
            ... dan {overdueList.length - 5} pelanggan lainnya
          </p>
        )}
      </CardBody>
    </Card>
  );
}
```

---

### FR-4.3: Daily Overdue Summary Toast
**Trigger:** Setiap app startup (hanya sekali per hari)

**Logic:**
```typescript
// src/hooks/useDailyOverdueCheck.ts
export function useDailyOverdueCheck() {
  useEffect(() => {
    const checkOverdue = async () => {
      const lastCheck = localStorage.getItem('lastOverdueCheck');
      const today = new Date().toISOString().split('T')[0];
      
      if (lastCheck === today) return; // Already checked today
      
      const overdueCount = await db.credit_ledger
        .where('[status+dueDate]')
        .between(['unpaid', Dexie.minKey], ['unpaid', today])
        .count();
      
      if (overdueCount > 0) {
        const totalOverdue = await db.credit_ledger
          .where('[status+dueDate]')
          .between(['unpaid', Dexie.minKey], ['unpaid', today])
          .toArray()
          .then(ledgers => sumBy(ledgers, 'amount'));
        
        showToast(
          `🔔 Ada ${overdueCount} piutang jatuh tempo (Total: ${formatIDR(totalOverdue)})`,
          'warning',
          { duration: 10000 } // 10 seconds
        );
      }
      
      localStorage.setItem('lastOverdueCheck', today);
    };
    
    checkOverdue();
  }, []);
}

// Usage in App.tsx
function App() {
  useDailyOverdueCheck();
  // ... rest of app
}
```

---

## 📊 Phase 5: Reporting & Analytics

### FR-5.1: Credit Aging Report
**Purpose:** Kategorikan piutang berdasarkan umur jatuh tempo

**Categories:**
- 🟢 **Current** (belum jatuh tempo)
- 🟡 **1-30 hari** (overdue ringan)
- 🟠 **31-60 hari** (overdue sedang)
- 🔴 **> 60 hari** (overdue berat, high risk)

**UI Component:**
```tsx
// src/components/CreditAgingReport.tsx
export default function CreditAgingReport() {
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  
  useEffect(() => {
    const calculateAging = async () => {
      const today = new Date();
      const allUnpaid = await db.credit_ledger
        .where('status')
        .equals('unpaid')
        .toArray();
      
      const buckets = {
        current: { count: 0, amount: 0 },
        days1_30: { count: 0, amount: 0 },
        days31_60: { count: 0, amount: 0 },
        over60: { count: 0, amount: 0 }
      };
      
      allUnpaid.forEach(ledger => {
        const dueDate = new Date(ledger.dueDate);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue < 0) {
          buckets.current.count++;
          buckets.current.amount += ledger.amount;
        } else if (daysOverdue <= 30) {
          buckets.days1_30.count++;
          buckets.days1_30.amount += ledger.amount;
        } else if (daysOverdue <= 60) {
          buckets.days31_60.count++;
          buckets.days31_60.amount += ledger.amount;
        } else {
          buckets.over60.count++;
          buckets.over60.amount += ledger.amount;
        }
      });
      
      setAgingData([
        { label: 'Current (belum jatuh tempo)', ...buckets.current, color: 'bg-green-600' },
        { label: '1-30 hari terlambat', ...buckets.days1_30, color: 'bg-yellow-600' },
        { label: '31-60 hari terlambat', ...buckets.days31_60, color: 'bg-orange-600' },
        { label: '> 60 hari terlambat', ...buckets.over60, color: 'bg-red-600' }
      ]);
    };
    
    calculateAging();
  }, []);
  
  const totalAmount = sumBy(agingData, 'amount');
  
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">📊 Aging Piutang</h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          {agingData.map(bucket => (
            <div key={bucket.label}>
              <div className="flex justify-between mb-1">
                <span className="text-sm">{bucket.label}</span>
                <span className="text-sm font-semibold">
                  {formatIDR(bucket.amount)} ({bucket.count} transaksi)
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div
                  className={`${bucket.color} h-3 rounded-full transition-all`}
                  style={{ width: `${(bucket.amount / totalAmount) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {((bucket.amount / totalAmount) * 100).toFixed(1)}% dari total
              </p>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex justify-between text-lg font-bold">
            <span>Total Piutang Aktif:</span>
            <span className="text-cyan-400">{formatIDR(totalAmount)}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
```

---

### FR-5.2: Customer Credit History Export
**Purpose:** Export laporan detail per customer untuk analisis eksternal

**Format CSV:**
```csv
Customer ID,Nama,Telepon,Credit Limit,Total Hutang,Status,Jatuh Tempo Terdekat,Overdue Days
CUST-001,Toko Makmur,081234567890,10000000,7500000,WARNING,2026-10-01,5
CUST-002,Warung Sejahtera,085678901234,5000000,2000000,SAFE,-,0
```

**Implementation:**
```typescript
// src/utils/creditReportHelper.ts
export async function exportCustomerCreditReport(): Promise<Blob> {
  const customers = await db.customers.toArray();
  
  const report = await Promise.all(
    customers.map(async customer => {
      const ledgers = await db.credit_ledger
        .where('customerId')
        .equals(customer.id)
        .toArray();
      
      const unpaidLedgers = ledgers.filter(l => l.status === 'unpaid');
      const totalHutang = sumBy(unpaidLedgers, 'amount');
      const status = getCreditStatus(totalHutang, customer.creditLimit);
      
      const nearestDue = minBy(
        unpaidLedgers.filter(l => new Date(l.dueDate) >= new Date()),
        'dueDate'
      );
      
      const overdueCount = unpaidLedgers.filter(
        l => new Date(l.dueDate) < new Date()
      ).length;
      
      return {
        'Customer ID': customer.id,
        'Nama': customer.nama,
        'Telepon': customer.telepon || '-',
        'Credit Limit': customer.creditLimit,
        'Total Hutang': totalHutang,
        'Status': status.toUpperCase(),
        'Jatuh Tempo Terdekat': nearestDue?.dueDate || '-',
        'Overdue Days': overdueCount > 0 
          ? Math.floor((new Date() - new Date(minBy(unpaidLedgers, 'dueDate')!.dueDate)) / (1000 * 60 * 60 * 24))
          : 0
      };
    })
  );
  
  return exportToCSV(report, 'laporan-kredit-customer');
}
```

---

### FR-5.3: Credit Summary Dashboard Widget
**Display:** Widget kompak di Dashboard untuk quick glance

```tsx
// src/components/CreditSummaryWidget.tsx
export default function CreditSummaryWidget() {
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    customersWithCredit: 0,
    overdueAmount: 0,
    overdueCount: 0
  });
  
  useEffect(() => {
    const calculateSummary = async () => {
      const allLedgers = await db.credit_ledger
        .where('status')
        .equals('unpaid')
        .toArray();
      
      const today = new Date().toISOString().split('T')[0];
      const overdue = allLedgers.filter(l => l.dueDate < today);
      
      const uniqueCustomers = new Set(allLedgers.map(l => l.customerId));
      
      setSummary({
        totalOutstanding: sumBy(allLedgers, 'amount'),
        customersWithCredit: uniqueCustomers.size,
        overdueAmount: sumBy(overdue, 'amount'),
        overdueCount: overdue.length
      });
    };
    
    calculateSummary();
  }, []);
  
  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20">
      <CardHeader>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          💳 Ringkasan Kredit
        </h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">Total Piutang</p>
            <p className="text-xl font-bold text-cyan-400">
              {formatIDR(summary.totalOutstanding)}
            </p>
            <p className="text-xs text-gray-500">
              {summary.customersWithCredit} pelanggan
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-400">Overdue</p>
            <p className="text-xl font-bold text-red-400">
              {formatIDR(summary.overdueAmount)}
            </p>
            <p className="text-xs text-gray-500">
              {summary.overdueCount} transaksi
            </p>
          </div>
        </div>
        
        <Button 
          className="w-full mt-4"
          variant="outline"
          size="sm"
          onClick={() => navigate('/pelanggan')}
        >
          Lihat Detail →
        </Button>
      </CardBody>
    </Card>
  );
}
```

---

## 🔨 Implementation Plan

### Phase 4: Notifications (1.5 days)
**Day 1:**
1. Create `src/utils/creditHelper.ts`:
   - `getCreditStatus()` - status calculation
   - `getCreditStatusBadge()` - badge config
   - `daysAgo()` - helper

2. Edit `src/components/CustomerSelector.tsx`:
   - Add warning badge for low credit customers
   - Add tooltip with credit info

3. Create `src/components/OverduePanel.tsx`:
   - Fetch overdue ledgers
   - Group by customer
   - Display top 5 overdue

4. Create `src/hooks/useDailyOverdueCheck.ts`:
   - Check localStorage for last check date
   - Query overdue count
   - Show toast if any

**Day 1.5:**
5. Integrate `OverduePanel` into Dashboard
6. Integrate `useDailyOverdueCheck` into App.tsx
7. Manual test all notification scenarios

---

### Phase 5: Reporting (1.5 days)
**Day 2:**
1. Create `src/components/CreditAgingReport.tsx`:
   - Calculate 4 aging buckets
   - Render progress bars
   - Show percentages

2. Create `src/components/CreditSummaryWidget.tsx`:
   - Query summary stats
   - Render compact widget

3. Edit `src/components/Dashboard.tsx`:
   - Add `CreditSummaryWidget` to top row
   - Add `OverduePanel` below widgets

**Day 2.5:**
4. Create `src/utils/creditReportHelper.ts`:
   - `exportCustomerCreditReport()` - CSV export
   - `exportAgingReport()` - aging buckets CSV

5. Edit `src/components/DatabaseManager.tsx`:
   - Add "Export Laporan Kredit" button
   - Add "Export Aging Report" button

6. Unit tests for report helpers

---

## 🧪 Testing Strategy

### Unit Tests (`creditNotifications.test.ts`)
```typescript
describe('W4-02 Phase 4: Notifications', () => {
  it('should calculate credit status correctly', () => {
    expect(getCreditStatus(9000, 10000)).toBe('warning'); // 90% used
    expect(getCreditStatus(5000, 10000)).toBe('safe');     // 50% used
    expect(getCreditStatus(11000, 10000)).toBe('exceeded'); // Over limit
  });
  
  it('should detect overdue ledgers', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await db.credit_ledger.add({
      id: uuidv4(),
      customerId: 'CUST-001',
      amount: 50000,
      status: 'unpaid',
      dueDate: yesterday.toISOString().split('T')[0],
      // ... other fields
    });
    
    const overdue = await db.credit_ledger
      .where('[status+dueDate]')
      .between(['unpaid', Dexie.minKey], ['unpaid', new Date().toISOString().split('T')[0]])
      .toArray();
    
    expect(overdue).toHaveLength(1);
  });
});

describe('W4-02 Phase 5: Reporting', () => {
  it('should calculate aging buckets correctly', async () => {
    const today = new Date();
    
    // Current (not due yet)
    await db.credit_ledger.add({
      id: uuidv4(),
      amount: 10000,
      status: 'unpaid',
      dueDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +10 days
    });
    
    // 1-30 days overdue
    await db.credit_ledger.add({
      id: uuidv4(),
      amount: 20000,
      status: 'unpaid',
      dueDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // -15 days
    });
    
    // > 60 days overdue
    await db.credit_ledger.add({
      id: uuidv4(),
      amount: 30000,
      status: 'unpaid',
      dueDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // -90 days
    });
    
    const buckets = await calculateAgingBuckets();
    expect(buckets.current.amount).toBe(10000);
    expect(buckets.days1_30.amount).toBe(20000);
    expect(buckets.over60.amount).toBe(30000);
  });
  
  it('should export customer credit report to CSV', async () => {
    await db.customers.add({
      id: 'CUST-001',
      nama: 'Test Customer',
      creditLimit: 1000000
    });
    
    await db.credit_ledger.add({
      id: uuidv4(),
      customerId: 'CUST-001',
      amount: 500000,
      status: 'unpaid',
      dueDate: '2026-11-01'
    });
    
    const blob = await exportCustomerCreditReport();
    const text = await blob.text();
    
    expect(text).toContain('Test Customer');
    expect(text).toContain('500000');
    expect(text).toContain('1000000');
  });
});
```

---

## ✅ Acceptance Criteria

### Phase 4: Notifications
- [x] Warning badge muncul di CustomerSelector untuk low credit
- [x] OverduePanel muncul di Dashboard jika ada piutang jatuh tempo
- [x] Daily toast notification hanya muncul sekali per hari
- [x] Toast menampilkan jumlah overdue + total amount

### Phase 5: Reporting
- [x] Credit Aging Report menampilkan 4 buckets dengan progress bars
- [x] CreditSummaryWidget menampilkan total outstanding + overdue
- [x] Export Customer Credit Report to CSV working
- [x] Export Aging Report to CSV working
- [x] All widgets integrated into Dashboard

---

## 📅 Timeline

| Phase | Days | Deliverables |
|-------|------|--------------|
| Phase 4: Notifications | 1.5 | Badges, OverduePanel, Daily toast |
| Phase 5: Reporting | 1.5 | Aging report, Summary widget, CSV exports |
| **TOTAL** | **3 days** | W4-02 100% complete |

**Target Release:** 2026-10-10 (v3.7.0)

---

## 📝 Notes

- **No SMS/Email integration** - notifications hanya in-app
- **Manual follow-up** - sistem cuma reminder, kasir yang hubungi customer
- **No auto-collection** - tidak ada auto-debit atau collection agency integration
- **Privacy:** Laporan hanya bisa diakses oleh admin (belum ada role system, semua user = admin)

