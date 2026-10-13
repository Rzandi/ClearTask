/* ═══════════════════════════════════════════════════════════
   priceHistoryHelper — ClearTask W4-03
   Query, export, and cleanup utilities for price history
   ═══════════════════════════════════════════════════════════ */

import db from '../services/db';
import type { PriceHistoryEntry } from '../types/index';

/**
 * Get price history for a specific inventory item
 * @param inventoryId - Inventory item ID
 * @param limit - Max entries to return (default: 50)
 * @returns Array of price history entries, newest first
 */
export async function getPriceHistory(
  inventoryId: string,
  limit: number = 50
): Promise<PriceHistoryEntry[]> {
  const entries = await db.price_history
    .where('inventoryId')
    .equals(inventoryId)
    .sortBy('changedAt');

  return entries.reverse().slice(0, limit);
}

/**
 * Export price history to CSV
 * @param inventoryId - Optional: filter by item ID. If undefined, exports all history.
 */
export async function exportPriceHistory(inventoryId?: string): Promise<void> {
  const query = inventoryId
    ? db.price_history.where('inventoryId').equals(inventoryId)
    : db.price_history.toCollection();

  const history = await query.reverse().toArray();

  // Join with inventory for item names
  const enriched = await Promise.all(
    history.map(async (entry) => {
      const item = await db.inventory.get(entry.inventoryId);
      return {
        'Nama Barang': item?.namaBarang || item?.nama || 'Unknown',
        Tanggal: new Date(entry.changedAt).toLocaleString('id-ID'),
        'Harga Jual Lama': entry.oldHargaJual ?? '-',
        'Harga Modal Lama': entry.oldHargaModal ?? '-',
        'Harga Jual Baru': entry.newHargaJual ?? '-',
        'Harga Modal Baru': entry.newHargaModal ?? '-',
        'Diubah Oleh': entry.changedBy,
        Reason: entry.reason || '-',
      };
    })
  );

  // Generate CSV
  const firstRow = enriched[0];
  if (!firstRow) {
    throw new Error('Tidak ada data riwayat harga untuk di-export');
  }
  const headers = Object.keys(firstRow);
  const csvRows = [
    headers.join(','),
    ...enriched.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header as keyof typeof row]);
          // Escape commas and quotes
          return value.includes(',') || value.includes('"')
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Trigger download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = inventoryId ? `riwayat-harga-${inventoryId}.csv` : 'riwayat-harga-semua.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Delete price history entries older than specified months
 * @param monthsOld - Age threshold in months
 * @returns Count of deleted entries
 */
export async function cleanupOldHistory(monthsOld: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

  const oldEntries = await db.price_history
    .where('changedAt')
    .below(cutoffDate.toISOString())
    .toArray();

  if (oldEntries.length > 0) {
    await db.price_history.bulkDelete(oldEntries.map((e) => e.id));
  }

  return oldEntries.length;
}
