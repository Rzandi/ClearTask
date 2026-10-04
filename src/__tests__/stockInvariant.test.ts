/* ═══════════════════════════════════════════════════════════
   W1-11 — Stock Invariant Tests (fake-indexeddb)
   
   Verifies the fundamental data integrity invariant:
   
     inventory.quantity === Σ stock_movements.delta
       (for each inventoryId)
   
   Tests cover: checkout → void → restore → edit → unpack
   
   These tests run against the real Dexie schema with
   fake-indexeddb, exercising the actual transactionService
   atomic operations to prove consistency.
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach } from 'vitest';
import db from '../services/db';
import { transactionService } from '../services/transactionService';
import type { StockMovement, InventoryItem } from '../types/index';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Verify the stock ledger invariant for ALL items in the inventory.
 * Returns a list of items where inventory.quantity !== sum(deltas).
 */
async function checkInvariant(): Promise<
  {
    inventoryId: string;
    name: string;
    currentQty: number;
    ledgerQty: number;
    drift: number;
  }[]
> {
  const items: InventoryItem[] = await db.inventory.toArray();
  const movements: StockMovement[] = await db.stock_movements.toArray();

  // Build per-item delta sum
  const deltaMap = new Map<string, number>();
  for (const m of movements) {
    const prev = deltaMap.get(m.inventoryId) || 0;
    deltaMap.set(m.inventoryId, prev + m.delta);
  }

  const violations: {
    inventoryId: string;
    name: string;
    currentQty: number;
    ledgerQty: number;
    drift: number;
  }[] = [];

  for (const item of items) {
    if (!item.id) continue;
    const ledgerQty = deltaMap.get(item.id) || 0;
    const currentQty = item.quantity ?? 0;
    if (currentQty !== ledgerQty) {
      violations.push({
        inventoryId: item.id,
        name: item.namaBarang,
        currentQty,
        ledgerQty,
        drift: currentQty - ledgerQty,
      });
    }
  }

  return violations;
}

/**
 * Seed an inventory item and its opening stock movement.
 */
async function seedItem(
  name: string,
  qty: number,
  opts: Partial<InventoryItem> = {}
): Promise<string> {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `test-${name}-${Date.now()}`;

  const now = new Date().toISOString();

  await db.inventory.add({
    id,
    namaBarang: name,
    kategori: opts.kategori || 'Umum',
    harga: opts.harga || 10000,
    hargaModal: opts.hargaModal || 5000,
    satuan: opts.satuan || 'Pcs',
    quantity: qty,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'local',
    ...opts,
  });

  // Opening stock movement — mirrors migration v12 logic
  await db.stock_movements.add({
    id: `sm-${id}-opening`,
    inventoryId: id,
    delta: qty,
    reason: 'opening',
    refType: 'manual',
    refId: 'test-seed',
    at: now,
    by: 'TestSeed',
    note: `Saldo awal test: ${qty}`,
  });

  return id;
}

// ── Test Suite ───────────────────────────────────────────────

describe('W1-11: Stock Ledger Invariant Tests', () => {
  beforeEach(async () => {
    // Clear all relevant tables
    await db.transactions.clear();
    await db.inventory.clear();
    await db.stock_movements.clear();
    await db.meta.clear();
    await db.sessions.clear();
  });

  it('should hold invariant after seeding (opening balance)', async () => {
    await seedItem('Indomie Goreng', 100);
    await seedItem('Teh Botol', 50);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });

  it('should hold invariant after a single checkout', async () => {
    await seedItem('Indomie Goreng', 100);

    await transactionService.createTransaction({
      tanggal: '2026-10-01',
      sessionId: null,
      kasir: 'Admin',
      items: [
        {
          namaBarang: 'Indomie Goreng',
          qty: 3,
          hargaSatuan: 3500,
          total: 10500,
        },
      ],
      total: 10500,
      uangDiterima: 11000,
      kembalian: 500,
      metode: 'Tunai',
    });

    // Verify qty
    const item = (await db.inventory.toArray()).find((i) => i.namaBarang === 'Indomie Goreng');
    expect(item!.quantity).toBe(97);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });

  it('should hold invariant after checkout + void', async () => {
    await seedItem('Teh Botol', 50);

    const tx = await transactionService.createTransaction({
      tanggal: '2026-10-01',
      sessionId: null,
      kasir: 'Admin',
      items: [{ namaBarang: 'Teh Botol', qty: 5, hargaSatuan: 5000, total: 25000 }],
      total: 25000,
      uangDiterima: 25000,
      kembalian: 0,
      metode: 'Tunai',
    });

    // Stock should be 45
    let item = (await db.inventory.toArray()).find((i) => i.namaBarang === 'Teh Botol');
    expect(item!.quantity).toBe(45);

    // Void the transaction
    await transactionService.voidTransaction(tx.id!, 'Test void');

    // Stock should be restored to 50
    item = (await db.inventory.toArray()).find((i) => i.namaBarang === 'Teh Botol');
    expect(item!.quantity).toBe(50);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });

  it('should hold invariant after checkout + void + restore', async () => {
    await seedItem('Kopi Sachet', 200);

    const tx = await transactionService.createTransaction({
      tanggal: '2026-10-01',
      sessionId: null,
      kasir: 'Admin',
      items: [
        {
          namaBarang: 'Kopi Sachet',
          qty: 10,
          hargaSatuan: 2000,
          total: 20000,
        },
      ],
      total: 20000,
      uangDiterima: 20000,
      kembalian: 0,
      metode: 'Tunai',
    });

    // 200 - 10 = 190
    await transactionService.voidTransaction(tx.id!, 'Batal');
    // 190 + 10 = 200

    await transactionService.restoreTransaction(tx.id!);
    // 200 - 10 = 190

    const item = (await db.inventory.toArray()).find((i) => i.namaBarang === 'Kopi Sachet');
    expect(item!.quantity).toBe(190);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });

  it('should hold invariant after multiple checkouts on the same item', async () => {
    await seedItem('Gula Pasir', 30);

    for (let i = 0; i < 5; i++) {
      await transactionService.createTransaction({
        tanggal: '2026-10-01',
        sessionId: null,
        kasir: 'Admin',
        items: [{ namaBarang: 'Gula Pasir', qty: 2, hargaSatuan: 15000, total: 30000 }],
        total: 30000,
        uangDiterima: 50000,
        kembalian: 20000,
        metode: 'Tunai',
      });
    }

    // 30 - (5 * 2) = 20
    const item = (await db.inventory.toArray()).find((i) => i.namaBarang === 'Gula Pasir');
    expect(item!.quantity).toBe(20);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });

  it('should hold invariant after an edit that changes qty', async () => {
    await seedItem('Minyak Goreng', 50);

    const tx = await transactionService.createTransaction({
      tanggal: '2026-10-01',
      sessionId: null,
      kasir: 'Admin',
      items: [
        {
          namaBarang: 'Minyak Goreng',
          qty: 3,
          hargaSatuan: 18000,
          total: 54000,
        },
      ],
      total: 54000,
      uangDiterima: 54000,
      kembalian: 0,
      metode: 'Tunai',
    });

    // Stock: 50 - 3 = 47
    // Edit: change qty from 3 to 5 (diff = 3 - 5 = -2, so stock deducted by 2 more)
    await transactionService.updateTransaction(tx.id!, {
      items: [
        {
          namaBarang: 'Minyak Goreng',
          qty: 5,
          hargaSatuan: 18000,
          total: 90000,
        },
      ],
      total: 90000,
    });

    // Stock: 47 + (3 - 5) = 47 - 2 = 45
    const item = (await db.inventory.toArray()).find((i) => i.namaBarang === 'Minyak Goreng');
    expect(item!.quantity).toBe(45);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });

  it('should hold invariant after edit that reduces qty (stock returned)', async () => {
    await seedItem('Sabun Cuci', 40);

    const tx = await transactionService.createTransaction({
      tanggal: '2026-10-01',
      sessionId: null,
      kasir: 'Admin',
      items: [{ namaBarang: 'Sabun Cuci', qty: 10, hargaSatuan: 8000, total: 80000 }],
      total: 80000,
      uangDiterima: 100000,
      kembalian: 20000,
      metode: 'Tunai',
    });

    // Stock: 40 - 10 = 30
    // Edit: reduce qty from 10 to 4 (diff = 10 - 4 = +6, stock returned by 6)
    await transactionService.updateTransaction(tx.id!, {
      items: [{ namaBarang: 'Sabun Cuci', qty: 4, hargaSatuan: 8000, total: 32000 }],
      total: 32000,
    });

    // Stock: 30 + 6 = 36
    const item = (await db.inventory.toArray()).find((i) => i.namaBarang === 'Sabun Cuci');
    expect(item!.quantity).toBe(36);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });

  it('should hold invariant after unpack operation', async () => {
    const id = await seedItem('Susu Kotak', 10, {
      packUnit: 'Dus',
      packRatio: 12,
      packStock: 5,
    });

    await transactionService.unpackInventoryItem(id);

    // Loose stock: 10 + 12 = 22
    const item = await db.inventory.get(id);
    expect(item!.quantity).toBe(22);
    expect(item!.packStock).toBe(4);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });

  it('should hold invariant after oversell (negative stock)', async () => {
    await seedItem('Keju Slice', 2);

    await transactionService.createTransaction({
      tanggal: '2026-10-01',
      sessionId: null,
      kasir: 'Admin',
      items: [{ namaBarang: 'Keju Slice', qty: 5, hargaSatuan: 25000, total: 125000 }],
      total: 125000,
      uangDiterima: 125000,
      kembalian: 0,
      metode: 'Tunai',
    });

    // Stock: 2 - 5 = -3 (negative is allowed, logged as warning)
    const item = (await db.inventory.toArray()).find((i) => i.namaBarang === 'Keju Slice');
    expect(item!.quantity).toBe(-3);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });

  it('should hold invariant with mixed operations on multiple items', async () => {
    await seedItem('Roti Tawar', 20);
    await seedItem('Selai Coklat', 15);
    await seedItem('Mentega', 30);

    // Checkout 1: Roti + Selai
    const tx1 = await transactionService.createTransaction({
      tanggal: '2026-10-01',
      sessionId: null,
      kasir: 'Admin',
      items: [
        { namaBarang: 'Roti Tawar', qty: 2, hargaSatuan: 15000, total: 30000 },
        {
          namaBarang: 'Selai Coklat',
          qty: 1,
          hargaSatuan: 22000,
          total: 22000,
        },
      ],
      total: 52000,
      uangDiterima: 52000,
      kembalian: 0,
      metode: 'Tunai',
    });

    // Checkout 2: Mentega
    const tx2 = await transactionService.createTransaction({
      tanggal: '2026-10-01',
      sessionId: null,
      kasir: 'Admin',
      items: [{ namaBarang: 'Mentega', qty: 3, hargaSatuan: 12000, total: 36000 }],
      total: 36000,
      uangDiterima: 50000,
      kembalian: 14000,
      metode: 'Tunai',
    });

    // Void tx1
    await transactionService.voidTransaction(tx1.id!, 'Batal');

    // Edit tx2: change Mentega qty from 3 to 1
    await transactionService.updateTransaction(tx2.id!, {
      items: [{ namaBarang: 'Mentega', qty: 1, hargaSatuan: 12000, total: 12000 }],
      total: 12000,
    });

    // Expected:
    // Roti: 20 - 2 + 2 (void) = 20
    // Selai: 15 - 1 + 1 (void) = 15
    // Mentega: 30 - 3 + (3-1=2 edit) = 29
    const items = await db.inventory.toArray();
    const roti = items.find((i) => i.namaBarang === 'Roti Tawar');
    const selai = items.find((i) => i.namaBarang === 'Selai Coklat');
    const mentega = items.find((i) => i.namaBarang === 'Mentega');

    expect(roti!.quantity).toBe(20);
    expect(selai!.quantity).toBe(15);
    expect(mentega!.quantity).toBe(29);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });

  it('should record correct movement reasons for each operation', async () => {
    const id = await seedItem('Test Item', 100);

    // Checkout
    const tx = await transactionService.createTransaction({
      tanggal: '2026-10-01',
      sessionId: null,
      kasir: 'Admin',
      items: [{ namaBarang: 'Test Item', qty: 5, hargaSatuan: 1000, total: 5000 }],
      total: 5000,
      uangDiterima: 5000,
      kembalian: 0,
      metode: 'Tunai',
    });

    // Void
    await transactionService.voidTransaction(tx.id!, 'Test');
    // Restore
    await transactionService.restoreTransaction(tx.id!);

    const movements: StockMovement[] = await db.stock_movements
      .where('inventoryId')
      .equals(id)
      .toArray();

    const reasons = movements.map((m) => m.reason);
    expect(reasons).toContain('opening');
    expect(reasons).toContain('sale');
    expect(reasons).toContain('void');
    expect(reasons).toContain('restore');
  });

  it('should reject invalid operations gracefully without corrupting ledger', async () => {
    await seedItem('Guard Item', 10);

    // Attempt checkout with qty <= 0
    await expect(
      transactionService.createTransaction({
        tanggal: '2026-10-01',
        sessionId: null,
        kasir: 'Admin',
        items: [{ namaBarang: 'Guard Item', qty: 0, hargaSatuan: 1000, total: 0 }],
        total: 0,
        uangDiterima: 0,
        kembalian: 0,
        metode: 'Tunai',
      })
    ).rejects.toThrow();

    // Ensure no corruption
    const item = (await db.inventory.toArray()).find((i) => i.namaBarang === 'Guard Item');
    expect(item!.quantity).toBe(10);

    const violations = await checkInvariant();
    expect(violations).toEqual([]);
  });
});
