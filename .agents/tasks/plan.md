# Implementation Plan: W4-03 Price History Feature

## Project Context

**Project Type:** React + TypeScript SPA with Dexie (IndexedDB) offline-first architecture  
**Database:** Dexie v4.4.2 (currently schema v14, needs v15 for price_history)  
**State Management:** React Context + `useLiveQuery` from dexie-react-hooks  
**Testing:** Vitest + @testing-library/react + fake-indexeddb  
**Build:** Vite + TypeScript 6.0  
**Current Schema Version:** v14 (credit system from W4-02)  
**Target Schema Version:** v15 (adds `price_history` table)

**Key Patterns Discovered:**
- **Atomic transactions:** Updates use `db.transaction('rw', [tables...], async () => {...})` for consistency
- **Hooks pattern:** `useInventory` in `src/hooks/useInventory.ts` provides CRUD operations via context
- **Type definitions:** All types defined in `src/types/index.ts` as single source of truth
- **Soft delete:** `deletedAt` field instead of hard deletes (inventory items, customers, transactions)
- **User tracking:** Every mutation includes `updatedBy: currentUser` from settings context
- **UUID generation:** `crypto.randomUUID()` with fallback for compatibility
- **UI components:** Modal pattern with glass-card styling, ConfirmDialog for destructive actions, Toast notifications

**Testing Commands:**
- Build: `npm run build`
- Tests: `npm run test:run`
- Test watch: `npm run test` or `npm run test:watch`

**CSV Export Pattern:** Found in InventoryManager.tsx - create CSV string, convert to Blob, trigger download via temporary anchor element

---

## Implementation Plan

- [ ] 1. **Add `price_history` table to database schema (Dexie v15) and `PriceHistoryEntry` type definition**
      
      Extend `db.ts` to version 15 with new `price_history` table using compound index for efficient queries. Add complete type definition in `types/index.ts` matching the design doc interface.
      
      **Files:**
      - `src/services/db.ts` (EDIT: add version 15 with price_history table)
      - `src/types/index.ts` (EDIT: add PriceHistoryEntry interface)
      
      **Verify:** Run `npm run build` and check browser console for "Database upgraded to version 15" message. Open Application > IndexedDB in DevTools and confirm `price_history` table exists with indexes `inventoryId` and `changedAt`.

- [ ] 2. **Modify `updateInventoryItem` hook to capture price changes atomically**
      
      Extend `useInventory.ts` `updateInventoryItem` function to:
      1. Fetch old item data BEFORE update
      2. Compare `hargaJual` and `hargaModal` values
      3. If either changed, insert history entry to `price_history` within same transaction
      4. Then update inventory item
      All wrapped in single `db.transaction('rw', [db.inventory, db.price_history], ...)` for atomicity.
      
      **Files:**
      - `src/hooks/useInventory.ts` (EDIT: extend updateInventoryItem with price history capture)
      
      **Verify:** Run `npm run test:run -- useInventory` to confirm existing inventory tests still pass. Manually test: update item price in UI, check `price_history` table in DevTools has new entry with correct old/new values.

- [ ] 3. **Extend CSV bulk import to track price changes during import**
      
      In `InventoryManager.tsx` `handleImportCSV` function, after processing each row that updates an existing item:
      1. Check if `hargaJual` or `hargaModal` changed
      2. If changed, batch collect history entries
      3. After loop, `bulkAdd` all history entries with `changeType: 'bulk_import'` and `reason: 'Bulk import CSV'`
      
      **Files:**
      - `src/components/InventoryManager.tsx` (EDIT: add price history tracking in handleImportCSV)
      
      **Verify:** Run `npm run test:run -- InventoryManager` for existing tests. Manual test: import CSV with price changes, verify `price_history` table contains entries with `changeType: 'bulk_import'`.

- [ ] 4. **Create price history helper utility functions**
      
      Create new file `src/utils/priceHistoryHelper.ts` with three exported functions:
      - `getPriceHistory(inventoryId, limit=50)`: Query history entries for one item, sorted by changedAt DESC
      - `exportPriceHistory(inventoryId?)`: Generate CSV blob from history, join with inventory for item names
      - `cleanupOldHistory(monthsOld)`: Delete entries older than N months, return count deleted
      
      Follow existing patterns from `src/utils/formatters.ts` for utility structure.
      
      **Files:**
      - `src/utils/priceHistoryHelper.ts` (NEW: query, export, and cleanup functions)
      
      **Verify:** Run `npm run test:run -- priceHistoryHelper` (after creating unit tests in step 7). Functions should handle empty results gracefully and maintain data integrity.

- [ ] 5. **Create PriceHistoryModal component to display price change history**
      
      Create new React component following existing modal patterns (similar to `ConfirmDialog.tsx` structure):
      - Props: `inventoryId`, `itemName`, `isOpen`, `onClose`
      - useEffect to load history via `getPriceHistory` when modal opens
      - Table showing: Date (formatted locale), Old Harga Jual → New Harga Jual, Old Harga Modal → New Harga Modal, Changed By, Reason
      - Show old value in red, new value in green with arrow between
      - "Export CSV" button calls `exportPriceHistory(inventoryId)` and triggers download
      - Empty state message: "Belum ada perubahan harga"
      - Loading spinner while fetching
      
      **Files:**
      - `src/components/PriceHistoryModal.tsx` (NEW: modal component for displaying history table)
      
      **Verify:** Manual smoke test - render modal in isolation, verify table renders with mock data and styling matches existing glass-card theme.

- [ ] 6. **Add price history icon and reason field to InventoryManager**
      
      Modify `InventoryManager.tsx`:
      1. Add 📊 icon button in Actions column of inventory table (desktop view) and card actions (mobile view)
      2. onClick opens `PriceHistoryModal` with selected item's ID and name
      3. Add state for modal: `showPriceHistory` and `priceHistoryItem`
      4. In `InventoryModal` form (edit mode), add optional text input field "Alasan Perubahan" below price fields
      5. Pass `reason` parameter to `updateInventoryItem` when provided
      
      **Files:**
      - `src/components/InventoryManager.tsx` (EDIT: add 📊 icon, modal state, reason field in form)
      - `src/components/InventoryModal.tsx` (EDIT: add optional reason text input field)
      
      **Verify:** Run `npm run test:run -- InventoryManager` for regression. Manual test: click 📊 icon → modal opens with history; update price with reason → reason appears in history table.

- [ ] 7. **Create comprehensive unit tests for price history feature**
      
      Create `src/__tests__/priceHistory.test.ts` with 5 test scenarios from design doc:
      1. "should capture price change on manual update" - verify history entry created with correct old/new values and reason
      2. "should NOT create history entry if price unchanged" - verify no history when updating non-price fields
      3. "should track bulk import price changes" - verify multiple history entries with changeType 'bulk_import'
      4. "should export price history to CSV" - verify CSV format and content correctness
      5. "should cleanup old history entries" - verify deletion of entries older than N months while preserving recent ones
      
      Use `fake-indexeddb` for test database, follow existing test patterns from `src/__tests__/` directory.
      
      **Files:**
      - `src/__tests__/priceHistory.test.ts` (NEW: unit tests covering 5 scenarios)
      
      **Verify:** Run `npm run test:run -- priceHistory.test.ts` → all 5 tests pass.

- [ ] 8. **Add Price History management section to Database Manager (if exists)**
      
      IF `src/components/DatabaseManager.tsx` exists (file not found during exploration, but mentioned in design):
      - Add "Riwayat Harga" statistics section showing total history entries count
      - Add "Export Semua Riwayat Harga" button calling `exportPriceHistory()` without inventoryId
      - Add "Cleanup Riwayat > 12 Bulan" button with ConfirmDialog before calling `cleanupOldHistory(12)`
      
      ELSE skip this step and document that Database Manager integration should be added later when that component is created.
      
      **Files:**
      - `src/components/DatabaseManager.tsx` (EDIT if exists: add Price History section with export and cleanup)
      
      **Verify:** If file exists: manual test export all → CSV downloads; cleanup → ConfirmDialog appears → entries deleted after confirmation. If file doesn't exist: document as future enhancement in code comments.

---

## Acceptance Criteria

**Must Have (v3.8.0):**
- ✅ Every price update (manual/bulk) creates `price_history` entry
- ✅ PriceHistoryModal displays up to 50 most recent entries per item
- ✅ Export CSV per item works from modal
- ✅ Export CSV all items works (if DatabaseManager exists)
- ✅ Manual cleanup via DatabaseManager (if exists) or future enhancement
- ✅ All 5 unit test scenarios pass

**Data Integrity Rules:**
- History entries are append-only (no edit or delete except manual cleanup)
- History persists even if inventory item is soft-deleted (inventoryId remains valid)
- Price changes captured atomically in same transaction as inventory update
- Old price snapshot recorded BEFORE update happens

**Performance Targets:**
- Query 50 history entries < 200ms
- Bulk import with price tracking maintains < 2 sec for 250 items
- CSV export generation < 500ms for 1000 entries

---

## Notes

- Schema version increment: v14 → v15 (credit system was v14, price history is v15)
- No service layer file found (`inventoryService.ts` doesn't exist) - all logic is in `useInventory` hook
- Database version upgrade migration: no data migration needed, new table starts empty
- UI components follow glass-card design system with Tailwind CSS v4
- CSV format follows existing pattern: headers + data rows with proper quote escaping
- Reason field is optional - updates work without reason, just won't appear in history
- Desktop and mobile views need separate icon placement (table row vs card actions)
- All mutations must include `updatedBy` from current user settings
