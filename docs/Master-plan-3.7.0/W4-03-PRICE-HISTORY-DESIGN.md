# W4-03: Riwayat Perubahan Harga per Barang

> **Status:** 🔄 IN PROGRESS  
> **Priority:** Low (Medium effort)  
> **Complexity:** Medium (New table + service integration)  
> **Target:** v3.8.0 (2026-11-01)

---

## 📋 Overview

Mencatat setiap perubahan harga barang di inventory untuk audit trail, analisis margin historis, dan transparansi pricing. Setiap kali admin update harga jual atau harga modal di **Inventory Manager**, sistem akan otomatis menyimpan snapshot harga lama sebelum update.

### Business Value
- **Audit trail lengkap:** Siapa yang ubah harga kapan, dari berapa jadi berapa
- **Analisis margin historis:** Track profitability changes over time
- **Transparansi pricing:** Kasir/owner bisa lihat riwayat harga tanpa ribet
- **Investigasi keanehan:** Jika ada komplain "kok harganya naik?", tinggal cek history

---

## 🎯 Requirements

### Functional Requirements

#### FR-1: Auto-capture Price Changes
- Setiap `updateInventoryItem()` yang mengubah `hargaJual` atau `hargaModal`, sistem otomatis:
  1. Catat harga lama ke tabel `price_history` **SEBELUM** update
  2. Catat timestamp + user yang mengubah
  3. Catat reason (optional): "Penyesuaian supplier", "Promo", "Koreksi data", dll

#### FR-2: Bulk Import Tracking
- Import CSV yang mengubah harga juga harus tercatat di history
- Satu entry per barang yang harganya berubah
- Reason: "Bulk import CSV"

#### FR-3: Display History UI
- Di **Inventory Manager**, setiap row barang ada icon 📊 "Riwayat Harga"
- Klik icon → modal popup menampilkan tabel:
  ```
  Tanggal         | Harga Jual Lama | Harga Modal Lama | Diubah Oleh | Reason
  ──────────────────────────────────────────────────────────────────────────
  2026-09-15 10:30| Rp 5.000       | Rp 4.000         | Admin       | Penyesuaian supplier
  2026-08-01 08:00| Rp 4.500       | Rp 3.500         | Kasir Budi  | Promo Agustus
  2026-07-10 14:20| null           | Rp 3.000         | Admin       | Update modal saja
  ```

#### FR-4: Export to CSV
- Button **"Export Riwayat Harga"** di halaman Database
- Format CSV:
  ```csv
  Nama Barang,Tanggal,Harga Jual Lama,Harga Modal Lama,Harga Jual Baru,Harga Modal Baru,Diubah Oleh,Reason
  Indomie Goreng,2026-09-15 10:30,5000,4000,5500,4200,Admin,Penyesuaian supplier
  ```

#### FR-5: Cleanup Policy
- Data history disimpan permanent (tidak ada auto-purge)
- Manual cleanup via Database Manager:
  - "Hapus riwayat harga lebih dari N bulan yang lalu"
  - Konfirmasi dialog wajib

---

### Non-Functional Requirements

#### NFR-1: Performance
- Insert ke `price_history` tidak boleh bikin update inventory jadi lambat
- Query history per barang harus < 200ms untuk 1000+ entries

#### NFR-2: Data Integrity
- History entry **append-only** (tidak boleh di-edit atau di-delete)
- Jika inventory item di-soft-delete, history tetap ada (inventoryId still valid)

#### NFR-3: Storage
- Estimasi: 10 harga change/hari × 250 produk × 365 hari = ~912 KB/tahun
- Acceptable untuk IndexedDB limit

---

## 🏗️ Architecture

### Tech Stack
1. **Dexie Table:** `price_history` (new table)
2. **Service Layer:** Extend `inventoryService.ts` (from W1)
3. **UI Component:** `PriceHistoryModal.tsx` (new)
4. **Export:** Reuse `exportToCSV` helper dari `databaseManager.ts`

### File Structure
```
src/
├── services/
│   ├── db.ts                       // EDIT: Add price_history table (schema v13)
│   └── inventoryService.ts         // EDIT: Capture price changes
├── components/
│   ├── InventoryManager.tsx        // EDIT: Add 📊 icon per row
│   └── PriceHistoryModal.tsx       // NEW: Display history table
├── utils/
│   └── priceHistoryHelper.ts       // NEW: Query + export helpers
└── __tests__/
    └── priceHistory.test.ts        // NEW: Unit tests

docs/
└── W4-03-PRICE-HISTORY-DESIGN.md   // This file
```

---

## 📐 Data Model

### PriceHistoryEntry Type
```typescript
interface PriceHistoryEntry {
  id: string;                    // UUID
  inventoryId: string;           // FK to inventory.id
  
  // Harga SEBELUM update (snapshot lama)
  oldHargaJual: number | null;   // null jika pertama kali set
  oldHargaModal: number | null;
  
  // Harga SETELAH update (untuk reference)
  newHargaJual: number | null;
  newHargaModal: number | null;
  
  // Metadata
  changedAt: string;             // ISO timestamp
  changedBy: string;             // Nama kasir/admin
  reason?: string;               // Optional: "Penyesuaian supplier", "Promo", dll
  
  // Tracking
  changeType: 'manual' | 'bulk_import' | 'system';
}
```

### Dexie Schema (v13)
```typescript
// src/services/db.ts

db.version(13).stores({
  // ... existing tables
  price_history: '++id, inventoryId, changedAt, changedBy'
});

// Index strategy:
// - Primary index: inventoryId (untuk query per barang)
// - Secondary index: changedAt (untuk cleanup berdasarkan tanggal)
```

---

## 🔨 Implementation Phases

### Phase 1: Database Schema (0.5 day)
**Deliverables:**
1. Add `price_history` table to `db.ts` (schema v13)
2. Migration logic: No data migration needed (new table starts empty)
3. Type definition in `types/index.ts`:
   ```typescript
   export interface PriceHistoryEntry { ... }
   ```

**Test:**
- Manual: Restart app → verify v13 applied
- Unit test: Insert dummy history entry → query back

---

### Phase 2: Service Layer Integration (1 day)
**Deliverables:**
1. Extend `inventoryService.updateItem()`:
   ```typescript
   export async function updateInventoryItem(
     id: string,
     updates: Partial<InventoryItem>,
     changedBy: string,
     reason?: string
   ): Promise<void> {
     await db.transaction('rw', [db.inventory, db.price_history], async () => {
       const oldItem = await db.inventory.get(id);
       if (!oldItem) throw new Error('Item not found');
       
       // Check if price changed
       const priceChanged = 
         (updates.hargaJual !== undefined && updates.hargaJual !== oldItem.hargaJual) ||
         (updates.hargaModal !== undefined && updates.hargaModal !== oldItem.hargaModal);
       
       if (priceChanged) {
         // Capture old prices BEFORE update
         await db.price_history.add({
           id: uuidv4(),
           inventoryId: id,
           oldHargaJual: oldItem.hargaJual,
           oldHargaModal: oldItem.hargaModal,
           newHargaJual: updates.hargaJual ?? oldItem.hargaJual,
           newHargaModal: updates.hargaModal ?? oldItem.hargaModal,
           changedAt: new Date().toISOString(),
           changedBy,
           reason,
           changeType: 'manual'
         });
       }
       
       // Update inventory
       await db.inventory.update(id, updates);
     });
   }
   ```

2. Extend `importInventoryCSV()`:
   - Track price changes during bulk import
   - Batch insert to `price_history` (changeType: 'bulk_import')

**Test:**
- Unit test: Update harga → verify history entry created
- Unit test: Update non-price field → verify NO history entry
- Unit test: Bulk import → verify multiple history entries

---

### Phase 3: Query Helpers (0.5 day)
**Deliverables:**
1. Create `utils/priceHistoryHelper.ts`:
   ```typescript
   export async function getPriceHistory(
     inventoryId: string,
     limit: number = 50
   ): Promise<PriceHistoryEntry[]> {
     return await db.price_history
       .where('inventoryId')
       .equals(inventoryId)
       .reverse() // Latest first
       .limit(limit)
       .toArray();
   }
   
   export async function exportPriceHistory(
     inventoryId?: string // Optional: all items if undefined
   ): Promise<Blob> {
     const query = inventoryId
       ? db.price_history.where('inventoryId').equals(inventoryId)
       : db.price_history.toCollection();
     
     const history = await query.reverse().toArray();
     
     // Join with inventory for item names
     const enriched = await Promise.all(
       history.map(async (entry) => {
         const item = await db.inventory.get(entry.inventoryId);
         return {
           namaBarang: item?.nama || 'Unknown',
           tanggal: new Date(entry.changedAt).toLocaleString('id-ID'),
           hargaJualLama: entry.oldHargaJual,
           hargaModalLama: entry.oldHargaModal,
           hargaJualBaru: entry.newHargaJual,
           hargaModalBaru: entry.newHargaModal,
           diubahOleh: entry.changedBy,
           reason: entry.reason || '-'
         };
       })
     );
     
     return exportToCSV(enriched, 'riwayat-harga');
   }
   
   export async function cleanupOldHistory(
     monthsOld: number
   ): Promise<number> {
     const cutoffDate = new Date();
     cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);
     
     const oldEntries = await db.price_history
       .where('changedAt')
       .below(cutoffDate.toISOString())
       .toArray();
     
     await db.price_history.bulkDelete(oldEntries.map(e => e.id));
     return oldEntries.length;
   }
   ```

**Test:**
- Unit test: Query history per item → verify sorted by date DESC
- Unit test: Export all history → verify CSV format
- Unit test: Cleanup old entries → verify count correct

---

### Phase 4: UI Integration (1 day)
**Deliverables:**
1. Create `PriceHistoryModal.tsx`:
   ```tsx
   export default function PriceHistoryModal({ 
     inventoryId, 
     itemName,
     isOpen, 
     onClose 
   }: Props) {
     const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
     const [loading, setLoading] = useState(true);
     
     useEffect(() => {
       if (isOpen) {
         getPriceHistory(inventoryId, 50).then(setHistory).finally(() => setLoading(false));
       }
     }, [isOpen, inventoryId]);
     
     const handleExport = async () => {
       const blob = await exportPriceHistory(inventoryId);
       downloadBlob(blob, `riwayat-harga-${itemName}.csv`);
     };
     
     return (
       <Modal isOpen={isOpen} onClose={onClose} size="lg">
         <ModalHeader>📊 Riwayat Harga: {itemName}</ModalHeader>
         <ModalBody>
           {loading ? (
             <Spinner />
           ) : history.length === 0 ? (
             <p className="text-gray-400">Belum ada perubahan harga.</p>
           ) : (
             <table className="w-full text-sm">
               <thead>
                 <tr className="border-b border-gray-700">
                   <th>Tanggal</th>
                   <th>Harga Jual</th>
                   <th>Harga Modal</th>
                   <th>Diubah Oleh</th>
                   <th>Reason</th>
                 </tr>
               </thead>
               <tbody>
                 {history.map(entry => (
                   <tr key={entry.id}>
                     <td>{new Date(entry.changedAt).toLocaleString('id-ID')}</td>
                     <td>
                       <span className="text-red-400">
                         {formatIDR(entry.oldHargaJual)}
                       </span>
                       {' → '}
                       <span className="text-green-400">
                         {formatIDR(entry.newHargaJual)}
                       </span>
                     </td>
                     <td>
                       <span className="text-red-400">
                         {formatIDR(entry.oldHargaModal)}
                       </span>
                       {' → '}
                       <span className="text-green-400">
                         {formatIDR(entry.newHargaModal)}
                       </span>
                     </td>
                     <td>{entry.changedBy}</td>
                     <td className="text-gray-400">{entry.reason || '-'}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
         </ModalBody>
         <ModalFooter>
           <Button variant="outline" onClick={handleExport} disabled={history.length === 0}>
             📥 Export CSV
           </Button>
           <Button onClick={onClose}>Tutup</Button>
         </ModalFooter>
       </Modal>
     );
   }
   ```

2. Edit `InventoryManager.tsx`:
   - Add icon button 📊 di kolom "Actions" setiap row
   - onClick → open `PriceHistoryModal`

3. Edit form update inventory:
   - Add optional text field "Reason" (opsional)
   - Pass `reason` ke `updateInventoryItem()`

**Test:**
- Smoke test: Klik icon 📊 → modal muncul
- Smoke test: Update harga dengan reason → verify muncul di history
- Smoke test: Export CSV → verify file downloaded

---

### Phase 5: Database Manager Integration (0.5 day)
**Deliverables:**
1. Add section **"Riwayat Harga"** di `DatabaseManager.tsx`:
   - Statistik: "Total entries: X"
   - Button "Export Semua Riwayat Harga"
   - Button "Cleanup Riwayat > 12 Bulan" (dengan ConfirmDialog)

2. Cleanup logic:
   ```tsx
   const handleCleanup = async () => {
     const confirmed = await showConfirm({
       title: 'Hapus Riwayat Lama?',
       message: 'Ini akan menghapus semua riwayat harga lebih dari 12 bulan yang lalu. Data tidak bisa dikembalikan.',
       confirmText: 'Hapus',
       confirmVariant: 'danger'
     });
     
     if (confirmed) {
       const deletedCount = await cleanupOldHistory(12);
       showToast(`${deletedCount} entri riwayat dihapus.`, 'success');
     }
   };
   ```

**Test:**
- Manual: Klik Export Semua → verify CSV downloaded
- Manual: Klik Cleanup → verify ConfirmDialog muncul
- Manual: Konfirmasi cleanup → verify toast success

---

## 🧪 Testing Strategy

### Unit Tests (`priceHistory.test.ts`)
```typescript
describe('W4-03: Price History', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });
  
  it('should capture price change on manual update', async () => {
    const itemId = await db.inventory.add({
      nama: 'Test Item',
      hargaJual: 5000,
      hargaModal: 4000,
      // ... other fields
    });
    
    await updateInventoryItem(
      itemId,
      { hargaJual: 5500 },
      'Admin',
      'Penyesuaian supplier'
    );
    
    const history = await getPriceHistory(itemId);
    expect(history).toHaveLength(1);
    expect(history[0].oldHargaJual).toBe(5000);
    expect(history[0].newHargaJual).toBe(5500);
    expect(history[0].reason).toBe('Penyesuaian supplier');
  });
  
  it('should NOT create history entry if price unchanged', async () => {
    const itemId = await db.inventory.add({
      nama: 'Test Item',
      hargaJual: 5000,
      // ...
    });
    
    await updateInventoryItem(itemId, { nama: 'Updated Name' }, 'Admin');
    
    const history = await getPriceHistory(itemId);
    expect(history).toHaveLength(0);
  });
  
  it('should track bulk import price changes', async () => {
    // Create 3 items
    const ids = await Promise.all([
      db.inventory.add({ nama: 'Item1', hargaJual: 1000 }),
      db.inventory.add({ nama: 'Item2', hargaJual: 2000 }),
      db.inventory.add({ nama: 'Item3', hargaJual: 3000 })
    ]);
    
    // Bulk import with price changes
    await importInventoryCSV([
      { nama: 'Item1', hargaJual: 1500 },
      { nama: 'Item2', hargaJual: 2500 }
    ]);
    
    const allHistory = await db.price_history.toArray();
    expect(allHistory).toHaveLength(2);
    expect(allHistory.every(h => h.changeType === 'bulk_import')).toBe(true);
  });
  
  it('should export price history to CSV', async () => {
    const itemId = await db.inventory.add({
      nama: 'Test Item',
      hargaJual: 5000
    });
    
    await updateInventoryItem(itemId, { hargaJual: 5500 }, 'Admin', 'Test');
    await updateInventoryItem(itemId, { hargaJual: 6000 }, 'Kasir', 'Promo');
    
    const blob = await exportPriceHistory(itemId);
    const text = await blob.text();
    
    expect(text).toContain('Test Item');
    expect(text).toContain('5000');
    expect(text).toContain('5500');
    expect(text).toContain('6000');
  });
  
  it('should cleanup old history entries', async () => {
    const itemId = await db.inventory.add({ nama: 'Test' });
    
    // Add old entry (13 months ago)
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 13);
    await db.price_history.add({
      id: uuidv4(),
      inventoryId: itemId,
      oldHargaJual: 1000,
      newHargaJual: 1500,
      changedAt: oldDate.toISOString(),
      changedBy: 'Admin',
      changeType: 'manual'
    });
    
    // Add recent entry
    await updateInventoryItem(itemId, { hargaJual: 2000 }, 'Admin');
    
    const deletedCount = await cleanupOldHistory(12);
    expect(deletedCount).toBe(1);
    
    const remaining = await getPriceHistory(itemId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].newHargaJual).toBe(2000);
  });
});
```

### Integration Tests
- [ ] Update harga di InventoryManager → klik 📊 → verify history muncul
- [ ] Bulk import CSV dengan perubahan harga → verify history tercatat
- [ ] Export CSV dari modal → verify format benar

---

## 📦 Dependencies

### Existing Dependencies (No new packages needed)
- ✅ `dexie` (already installed)
- ✅ `uuid` (already installed)
- ✅ `exportToCSV` helper (already exists in databaseManager.ts)

### Prerequisites from W1
- ✅ Service layer pattern (`inventoryService.ts`)
- ✅ `db.transaction('rw', ...)` atomic updates
- ✅ Type definitions in `types/index.ts`

---

## 🚨 Known Issues & Risks

### Risk 1: Performance on Large History
- 1000+ price changes per item bisa bikin query lambat
- **Mitigation:** Default limit 50 entries, pagination jika > 50

### Risk 2: Bulk Import Overhead
- Import 250 items dengan semua harga berubah = 250 inserts ke price_history
- **Mitigation:** Batch insert dengan `bulkAdd()`, bukan loop individual

### Risk 3: Storage Growth
- ~1 MB/year (acceptable), tapi 5 tahun = 5 MB
- **Mitigation:** Manual cleanup policy via Database Manager

---

## ✅ Acceptance Criteria

### Must Have (v3.8.0)
- [x] Setiap update harga (manual/bulk) tercatat di `price_history`
- [x] Modal "Riwayat Harga" menampilkan max 50 entries terbaru
- [x] Export CSV per item working
- [x] Export CSV semua items working
- [x] Cleanup manual via Database Manager
- [x] Unit tests 5 scenarios lolos

### Nice to Have (v3.9.0+)
- [ ] Pagination jika history > 50 entries
- [ ] Filter by date range di modal
- [ ] Grafik line chart harga over time
- [ ] Audit log integration (log saat cleanup history)

---

## 📅 Timeline

| Phase | Days | Deliverables |
|-------|------|--------------|
| Phase 1: Schema | 0.5 | Dexie v13 + types |
| Phase 2: Service | 1.0 | updateItem + import integration |
| Phase 3: Helpers | 0.5 | Query + export + cleanup |
| Phase 4: UI | 1.0 | Modal + icon + form reason |
| Phase 5: DB Manager | 0.5 | Export all + cleanup button |
| **TOTAL** | **3.5 days** | Full feature ready |

**Target Release:** 2026-11-01 (v3.8.0)

---

## 🔗 References

- [Master Plan W4-03](./ClearTask-Master-Plan.md#w4---fitur-baru--nice-to-have)
- [Dexie Compound Indexes](https://dexie.org/docs/Compound-Index)
- [IndexedDB Best Practices](https://web.dev/indexeddb-best-practices/)

---

## 📝 Notes

- **Tidak ada soft-delete untuk history entries** — append-only, immutable
- **Reason field opsional** — tidak blocking update jika kosong
- **History tetap ada meskipun inventory item di-soft-delete**
- **Gunakan ISO timestamp** untuk sorting dan cleanup yang konsisten

