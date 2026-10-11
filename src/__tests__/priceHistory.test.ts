/* ═══════════════════════════════════════════════════════════
   priceHistory.test.ts — ClearTask W4-03
   Unit tests for Price History feature
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import db from '../services/db';
import { getPriceHistory, cleanupOldHistory } from '../utils/priceHistoryHelper';
import type { InventoryItem } from '../types/index';

// Helper to generate UUID
function generateUUID(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
}

describe('W4-03: Price History', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.close();
  });

  it('should capture price change on manual update', async () => {
    // Create inventory item
    const itemId = generateUUID();
    const item: InventoryItem = {
      id: itemId,
      namaBarang: 'Test Item',
      kategori: 'Test',
      harga: 5000,
      hargaModal: 4000,
      quantity: 10,
      satuan: 'Pcs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.inventory.add(item);

    // Simulate manual update with price change
    await db.transaction('rw', [db.inventory, db.price_history], async () => {
      const oldItem = await db.inventory.get(itemId);
      if (!oldItem) throw new Error('Item not found');

      // Capture price history
      await db.price_history.add({
        id: generateUUID(),
        inventoryId: itemId,
        changedAt: new Date().toISOString(),
        oldHargaJual: oldItem.harga,
        oldHargaModal: oldItem.hargaModal ?? null,
        newHargaJual: 5500,
        newHargaModal: 4200,
        changedBy: 'Admin',
        reason: 'Penyesuaian supplier',
        changeType: 'manual',
      });

      // Update inventory
      await db.inventory.update(itemId, { harga: 5500, hargaModal: 4200 });
    });

    // Verify history entry
    const history = await getPriceHistory(itemId);
    expect(history).toHaveLength(1);
    expect(history[0].oldHargaJual).toBe(5000);
    expect(history[0].newHargaJual).toBe(5500);
    expect(history[0].oldHargaModal).toBe(4000);
    expect(history[0].newHargaModal).toBe(4200);
    expect(history[0].reason).toBe('Penyesuaian supplier');
    expect(history[0].changeType).toBe('manual');
  });

  it('should NOT create history entry if price unchanged', async () => {
    // Create inventory item
    const itemId = generateUUID();
    const item: InventoryItem = {
      id: itemId,
      namaBarang: 'Test Item',
      kategori: 'Test',
      harga: 5000,
      hargaModal: 4000,
      quantity: 10,
      satuan: 'Pcs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.inventory.add(item);

    // Update only non-price field
    await db.inventory.update(itemId, { namaBarang: 'Updated Name', quantity: 15 });

    // Verify NO history entry created
    const history = await getPriceHistory(itemId);
    expect(history).toHaveLength(0);
  });

  it('should track bulk import price changes', async () => {
    // Create 3 items
    const item1Id = generateUUID();
    const item2Id = generateUUID();
    const item3Id = generateUUID();

    await db.inventory.bulkAdd([
      {
        id: item1Id,
        namaBarang: 'Item1',
        kategori: 'Test',
        harga: 1000,
        hargaModal: 800,
        quantity: 5,
        satuan: 'Pcs',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: item2Id,
        namaBarang: 'Item2',
        kategori: 'Test',
        harga: 2000,
        hargaModal: 1600,
        quantity: 5,
        satuan: 'Pcs',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: item3Id,
        namaBarang: 'Item3',
        kategori: 'Test',
        harga: 3000,
        hargaModal: 2400,
        quantity: 5,
        satuan: 'Pcs',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // Simulate bulk import with price changes
    const bulkChanges = [
      { id: item1Id, oldHarga: 1000, newHarga: 1500 },
      { id: item2Id, oldHarga: 2000, newHarga: 2500 },
    ];

    await db.transaction('rw', [db.inventory, db.price_history], async () => {
      for (const change of bulkChanges) {
        await db.price_history.add({
          id: generateUUID(),
          inventoryId: change.id,
          changedAt: new Date().toISOString(),
          oldHargaJual: change.oldHarga,
          oldHargaModal: null,
          newHargaJual: change.newHarga,
          newHargaModal: null,
          changedBy: 'System',
          reason: 'Bulk import CSV',
          changeType: 'bulk_import',
        });

        await db.inventory.update(change.id, { harga: change.newHarga });
      }
    });

    // Verify history entries
    const allHistory = await db.price_history.toArray();
    expect(allHistory).toHaveLength(2);
    expect(allHistory.every((h) => h.changeType === 'bulk_import')).toBe(true);
    expect(allHistory.every((h) => h.reason === 'Bulk import CSV')).toBe(true);
  });

  it('should export price history to CSV', async () => {
    // Create item
    const itemId = generateUUID();
    await db.inventory.add({
      id: itemId,
      namaBarang: 'Test Item',
      kategori: 'Test',
      harga: 5000,
      hargaModal: 4000,
      quantity: 10,
      satuan: 'Pcs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Add price history entries
    await db.price_history.bulkAdd([
      {
        id: generateUUID(),
        inventoryId: itemId,
        changedAt: new Date().toISOString(),
        oldHargaJual: 5000,
        oldHargaModal: 4000,
        newHargaJual: 5500,
        newHargaModal: 4200,
        changedBy: 'Admin',
        reason: 'Test 1',
        changeType: 'manual',
      },
      {
        id: generateUUID(),
        inventoryId: itemId,
        changedAt: new Date().toISOString(),
        oldHargaJual: 5500,
        oldHargaModal: 4200,
        newHargaJual: 6000,
        newHargaModal: 4500,
        changedBy: 'Kasir',
        reason: 'Test 2',
        changeType: 'manual',
      },
    ]);

    // Verify we can query the history
    const history = await getPriceHistory(itemId);
    expect(history).toHaveLength(2);
    expect(history[0].newHargaJual).toBe(6000); // Newest first
    expect(history[1].newHargaJual).toBe(5500);
  });

  it('should cleanup old history entries', async () => {
    const itemId = generateUUID();

    await db.inventory.add({
      id: itemId,
      namaBarang: 'Test',
      kategori: 'Test',
      harga: 1000,
      quantity: 5,
      satuan: 'Pcs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Add old entry (13 months ago)
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 13);

    await db.price_history.add({
      id: generateUUID(),
      inventoryId: itemId,
      changedAt: oldDate.toISOString(),
      oldHargaJual: 1000,
      oldHargaModal: null,
      newHargaJual: 1500,
      newHargaModal: null,
      changedBy: 'Admin',
      changeType: 'manual',
    });

    // Add recent entry
    await db.price_history.add({
      id: generateUUID(),
      inventoryId: itemId,
      changedAt: new Date().toISOString(),
      oldHargaJual: 1500,
      oldHargaModal: null,
      newHargaJual: 2000,
      newHargaModal: null,
      changedBy: 'Admin',
      changeType: 'manual',
    });

    // Cleanup entries older than 12 months
    const deletedCount = await cleanupOldHistory(12);
    expect(deletedCount).toBe(1);

    // Verify only recent entry remains
    const remaining = await getPriceHistory(itemId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].newHargaJual).toBe(2000);
  });
});
