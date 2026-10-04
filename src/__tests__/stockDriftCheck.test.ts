/* ═══════════════════════════════════════════════════════════
   W1-12 — Stock Drift Check Tests
   
   Tests for the admin "Cek Drift Stok" utility.
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach } from 'vitest';
import db from '../services/db';
import { checkStockDrift, fixStockDrift } from '../utils/stockDriftCheck';

// ── Helper ──────────────────────────────────────────────────

async function seedItemWithMovement(
  name: string,
  qty: number,
  kategori: string = 'Umum'
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.inventory.add({
    id,
    namaBarang: name,
    kategori,
    harga: 10000,
    hargaModal: 5000,
    satuan: 'Pcs',
    quantity: qty,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'local',
  });

  await db.stock_movements.add({
    id: `sm-${id}-opening`,
    inventoryId: id,
    delta: qty,
    reason: 'opening',
    refType: 'manual',
    refId: 'seed',
    at: now,
    by: 'TestSeed',
  });

  return id;
}

// ── Suite ────────────────────────────────────────────────────

describe('W1-12: Stock Drift Check Utility', () => {
  beforeEach(async () => {
    await db.inventory.clear();
    await db.stock_movements.clear();
    await db.transactions.clear();
    await db.meta.clear();
    await db.sessions.clear();
  });

  it('should report no drift when ledger and inventory match', async () => {
    await seedItemWithMovement('Beras 5kg', 20);
    await seedItemWithMovement('Gula Pasir', 15);

    const report = await checkStockDrift();

    expect(report.hasDrift).toBe(false);
    expect(report.totalItems).toBe(2);
    expect(report.consistentItems).toBe(2);
    expect(report.driftItems).toHaveLength(0);
    expect(report.summary).toContain('Semua stok konsisten');
  });

  it('should detect positive drift (inventory inflated)', async () => {
    const id = await seedItemWithMovement('Test Inflated', 50);

    // Directly tamper inventory quantity WITHOUT recording a movement
    await db.inventory.update(id, { quantity: 55 });

    const report = await checkStockDrift();

    expect(report.hasDrift).toBe(true);
    expect(report.driftItems).toHaveLength(1);
    expect(report.driftItems[0].namaBarang).toBe('Test Inflated');
    expect(report.driftItems[0].drift).toBe(5); // 55 - 50
    expect(report.driftItems[0].currentQty).toBe(55);
    expect(report.driftItems[0].ledgerQty).toBe(50);
  });

  it('should detect negative drift (inventory deflated)', async () => {
    const id = await seedItemWithMovement('Test Deflated', 30);

    // Directly reduce inventory without movement
    await db.inventory.update(id, { quantity: 25 });

    const report = await checkStockDrift();

    expect(report.hasDrift).toBe(true);
    expect(report.driftItems[0].drift).toBe(-5); // 25 - 30
  });

  it('should detect orphan items (no movements)', async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Add inventory item without any movements
    await db.inventory.add({
      id,
      namaBarang: 'Orphan Item',
      kategori: 'Umum',
      harga: 5000,
      quantity: 10,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local',
    });

    const report = await checkStockDrift();

    expect(report.orphanItems).toHaveLength(1);
    expect(report.orphanItems[0].namaBarang).toBe('Orphan Item');
    expect(report.summary).toContain('Barang tanpa riwayat movement: 1');
  });

  it('should detect orphan movements (no inventory)', async () => {
    const fakeId = 'nonexistent-inventory-id';

    await db.stock_movements.add({
      id: 'orphan-movement-1',
      inventoryId: fakeId,
      delta: 10,
      reason: 'opening',
      refType: 'manual',
      refId: 'ghost',
      at: new Date().toISOString(),
      by: 'Ghost',
    });

    const report = await checkStockDrift();

    expect(report.hasDrift).toBe(true);
    expect(report.orphanMovements).toHaveLength(1);
    expect(report.orphanMovements[0].inventoryId).toBe(fakeId);
    expect(report.summary).toContain('Movement tanpa barang: 1');
  });

  it('should exclude soft-deleted items from check', async () => {
    const id = await seedItemWithMovement('Deleted Item', 10);

    // Soft-delete
    await db.inventory.update(id, { deletedAt: new Date().toISOString() });

    // Tamper the quantity (should not appear in drift report)
    await db.inventory.update(id, { quantity: 999 });

    const report = await checkStockDrift();

    // The deleted item should not appear in driftItems
    expect(report.driftItems.find((d) => d.namaBarang === 'Deleted Item')).toBeUndefined();
  });

  it('should generate correct summary text', async () => {
    await seedItemWithMovement('Item A', 10);
    const id = await seedItemWithMovement('Item B', 20);
    await db.inventory.update(id, { quantity: 25 }); // Tamper

    const report = await checkStockDrift();

    expect(report.summary).toContain('Total barang diperiksa: 2');
    expect(report.summary).toContain('Konsisten: 1');
    expect(report.summary).toContain('Drift terdeteksi: 1');
    expect(report.summary).toContain('Item B');
  });

  describe('fixStockDrift', () => {
    it('should fix drift by adding corrective adjust movements', async () => {
      const id = await seedItemWithMovement('Fix Me', 30);
      await db.inventory.update(id, { quantity: 35 }); // +5 drift

      const report = await checkStockDrift();
      expect(report.hasDrift).toBe(true);

      const fixed = await fixStockDrift(report);
      expect(fixed).toBe(1);

      // After fix, ledger should match current qty
      const postReport = await checkStockDrift();
      expect(postReport.hasDrift).toBe(false);
      expect(postReport.consistentItems).toBe(1);
    });

    it('should return 0 when there is no drift to fix', async () => {
      await seedItemWithMovement('All Good', 50);

      const report = await checkStockDrift();
      const fixed = await fixStockDrift(report);

      expect(fixed).toBe(0);
    });

    it('should record adjust movements with correct metadata', async () => {
      const id = await seedItemWithMovement('Adjust Check', 100);
      await db.inventory.update(id, { quantity: 90 }); // -10 drift

      const report = await checkStockDrift();
      await fixStockDrift(report, 'OwnerBudi');

      const adjustMovements = await db.stock_movements.where('inventoryId').equals(id).toArray();

      const adjustEntry = adjustMovements.find((m) => m.reason === 'adjust');
      expect(adjustEntry).toBeDefined();
      expect(adjustEntry!.delta).toBe(-10); // -10 to bring ledger from 100 down to 90
      expect(adjustEntry!.by).toBe('OwnerBudi');
      expect(adjustEntry!.note).toContain('Koreksi drift');
    });
  });
});
