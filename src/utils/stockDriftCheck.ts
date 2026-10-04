// ═══════════════════════════════════════════════════════════
//  stockDriftCheck.ts — ClearTask (W1-12)
//
//  Admin utility: "Cek Drift Stok"
//
//  Compares inventory.quantity against the sum of all
//  stock_movements.delta for each inventoryId.
//
//  If drift is found, something wrote to inventory.quantity
//  without recording a stock_movement (or vice versa).
//
//  Usage:
//    import { checkStockDrift } from '../utils/stockDriftCheck';
//    const report = await checkStockDrift();
//    if (report.hasDrift) { // show to admin }
// ═══════════════════════════════════════════════════════════

import db from '../services/db';
import type { StockMovement, InventoryItem } from '../types/index';

export interface DriftItem {
  inventoryId: string;
  namaBarang: string;
  kategori: string;
  /** Current value of inventory.quantity */
  currentQty: number;
  /** Sum of all stock_movements.delta for this item */
  ledgerQty: number;
  /** currentQty - ledgerQty. Positive = qty inflated, Negative = qty deflated */
  drift: number;
  /** Movement count for this item (helps diagnose root cause) */
  movementCount: number;
}

export interface DriftReport {
  /** Whether any drift was detected */
  hasDrift: boolean;
  /** Timestamp of the check */
  checkedAt: string;
  /** Total inventory items checked */
  totalItems: number;
  /** Items with zero drift */
  consistentItems: number;
  /** Items with non-zero drift */
  driftItems: DriftItem[];
  /** Items in inventory that have NO movements at all (possible orphans) */
  orphanItems: { inventoryId: string; namaBarang: string; currentQty: number }[];
  /** Movement records pointing to inventoryIds not in inventory table */
  orphanMovements: { inventoryId: string; movementCount: number; totalDelta: number }[];
  /** Summary text for display */
  summary: string;
}

/**
 * Check stock drift across all inventory items.
 * This is the core admin utility for W1-12.
 */
export async function checkStockDrift(): Promise<DriftReport> {
  const items: InventoryItem[] = await db.inventory
    .filter((item: InventoryItem) => !item.deletedAt)
    .toArray();
  const movements: StockMovement[] = await db.stock_movements.toArray();

  // Build per-item delta sum and movement count
  const deltaMap = new Map<string, number>();
  const countMap = new Map<string, number>();
  const inventoryIds = new Set<string>();

  for (const item of items) {
    if (item.id) inventoryIds.add(item.id);
  }

  for (const m of movements) {
    const prev = deltaMap.get(m.inventoryId) || 0;
    deltaMap.set(m.inventoryId, prev + m.delta);
    countMap.set(m.inventoryId, (countMap.get(m.inventoryId) || 0) + 1);
  }

  const driftItems: DriftItem[] = [];
  const orphanItems: DriftReport['orphanItems'] = [];

  for (const item of items) {
    if (!item.id) continue;

    const currentQty = item.quantity ?? 0;
    const ledgerQty = deltaMap.get(item.id) ?? 0;
    const movementCount = countMap.get(item.id) ?? 0;
    const drift = currentQty - ledgerQty;

    if (movementCount === 0) {
      orphanItems.push({
        inventoryId: item.id,
        namaBarang: item.namaBarang,
        currentQty,
      });
    } else if (drift !== 0) {
      driftItems.push({
        inventoryId: item.id,
        namaBarang: item.namaBarang,
        kategori: item.kategori,
        currentQty,
        ledgerQty,
        drift,
        movementCount,
      });
    }
  }

  // Check for orphan movements (movements referencing non-existent inventory)
  const orphanMovements: DriftReport['orphanMovements'] = [];
  const movementInventoryIds = new Set(deltaMap.keys());
  for (const movInvId of movementInventoryIds) {
    if (!inventoryIds.has(movInvId)) {
      orphanMovements.push({
        inventoryId: movInvId,
        movementCount: countMap.get(movInvId) || 0,
        totalDelta: deltaMap.get(movInvId) || 0,
      });
    }
  }

  const consistentItems = items.filter((i) => {
    if (!i.id) return false;
    const ledger = deltaMap.get(i.id) ?? 0;
    const count = countMap.get(i.id) ?? 0;
    return count > 0 && (i.quantity ?? 0) === ledger;
  }).length;

  const hasDrift = driftItems.length > 0 || orphanMovements.length > 0;

  // Build summary
  let summary = `Cek Drift Stok — ${new Date().toLocaleString('id-ID')}\n`;
  summary += `Total barang diperiksa: ${items.length}\n`;
  summary += `Konsisten: ${consistentItems}\n`;
  summary += `Drift terdeteksi: ${driftItems.length}\n`;

  if (orphanItems.length > 0) {
    summary += `Barang tanpa riwayat movement: ${orphanItems.length}\n`;
  }
  if (orphanMovements.length > 0) {
    summary += `Movement tanpa barang: ${orphanMovements.length}\n`;
  }

  if (driftItems.length > 0) {
    summary += '\n--- Detail Drift ---\n';
    for (const d of driftItems) {
      summary += `• ${d.namaBarang}: stok=${d.currentQty}, ledger=${d.ledgerQty}, drift=${d.drift > 0 ? '+' : ''}${d.drift}\n`;
    }
  }

  if (!hasDrift && orphanItems.length === 0) {
    summary += '\n✅ Semua stok konsisten dengan ledger.';
  }

  return {
    hasDrift,
    checkedAt: new Date().toISOString(),
    totalItems: items.length,
    consistentItems,
    driftItems,
    orphanItems,
    orphanMovements,
    summary,
  };
}

/**
 * Auto-fix drift by recording corrective 'adjust' movements.
 * CAUTION: Only call after admin review.
 */
export async function fixStockDrift(
  report: DriftReport,
  currentUser: string = 'Admin'
): Promise<number> {
  if (!report.hasDrift || report.driftItems.length === 0) return 0;

  const now = new Date().toISOString();
  const corrections: StockMovement[] = report.driftItems.map((d) => ({
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `fix-${d.inventoryId}-${Date.now()}`,
    inventoryId: d.inventoryId,
    delta: d.drift, // Add drift to ledger so ledger matches currentQty
    reason: 'adjust' as const,
    refType: 'manual' as const,
    refId: 'drift-fix',
    at: now,
    by: currentUser,
    note: `Koreksi drift: qty=${d.currentQty}, ledger=${d.ledgerQty}, koreksi=${d.drift > 0 ? '+' : ''}${d.drift}`,
  }));

  await db.stock_movements.bulkAdd(corrections);
  return corrections.length;
}
