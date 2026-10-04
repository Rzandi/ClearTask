/* ═══════════════════════════════════════════════════════════
   transactionService.ts — ClearTask
   Unified, atomic business transaction service.
   Handles:
   - checkout (stock deduction + stock_movements ledger 'sale')
   - void / soft-delete (stock return + stock_movements ledger 'void')
   - restore (stock deduction + stock_movements ledger 'restore')
   - edit (quantity diff + stock_movements ledger 'edit')
   ═══════════════════════════════════════════════════════════ */

import db from './db';
import type { CartItem, StockMovement, Transaction, InventoryItem } from '../types/index';

const canonicalize = (s?: string): string => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

const generateUUID = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

export interface CheckoutResult {
  transaction: Transaction;
  stockWarnings: string[];
}

export const transactionService = {
  /**
   * Atomic Checkout:
   * Validates cart, increments sequence, registers unknown items,
   * updates inventory, records stock movement ledger, and saves transaction.
   */
  async createTransaction(
    orderData: Partial<Transaction>,
    currentUser: string = 'Admin'
  ): Promise<Transaction> {
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Keranjang belanja kosong');
    }
    if (orderData.total === undefined || orderData.total < 0) {
      throw new Error('Total transaksi tidak valid');
    }

    // W0-03: Validate each item
    for (const item of orderData.items) {
      const qty = Number(item.qty);
      if (item.qty === undefined || item.qty === null || isNaN(qty) || qty <= 0) {
        throw new Error(`Kuantitas barang "${item.namaBarang || 'item'}" harus lebih dari 0`);
      }
      const hargaSatuan = Number(item.hargaSatuan);
      if (
        item.hargaSatuan !== undefined &&
        item.hargaSatuan !== null &&
        (isNaN(hargaSatuan) || hargaSatuan < 0)
      ) {
        throw new Error(`Harga satuan barang "${item.namaBarang || 'item'}" tidak boleh negatif`);
      }
    }

    let newTx: Transaction | undefined;

    await db.transaction(
      'rw',
      [db.meta, db.transactions, db.inventory, db.stock_movements],
      async () => {
        // 1. Monotonic transaction sequence
        const metaSeq = await db.meta.get({ key: 'seq' });
        const seq = metaSeq ? metaSeq.value + 1 : 1;
        await db.meta.put({ ...(metaSeq || {}), key: 'seq', value: seq });

        // 2. Build fast lookup map from inventory for items in this cart (W0-15)
        const requestedNames = new Set(
          orderData.items!.map((it) => canonicalize(it.namaBarang)).filter(Boolean)
        );
        const requestedIds = new Set(
          orderData.items!.map((it) => it.inventoryId).filter(Boolean) as string[]
        );

        const invItems: InventoryItem[] = await db.inventory
          .filter((inv: any) => {
            if (inv.deletedAt) return false;
            if (inv.id && requestedIds.has(inv.id)) return true;
            const k = canonicalize(inv.namaBarang || inv.nama);
            return requestedNames.has(k);
          })
          .toArray();

        const invMap = new Map<string, InventoryItem>();
        for (const inv of invItems) {
          const key = canonicalize(inv.namaBarang || inv.nama);
          if (key && !invMap.has(key)) invMap.set(key, inv);
          if (inv.id) invMap.set(inv.id, inv);
        }

        const stockWarnings: string[] = [];
        const nowIso = new Date().toISOString();
        const sanitizedItems: CartItem[] = [];
        const movements: StockMovement[] = [];

        // 3. Process items and adjust stock
        for (const item of orderData.items!) {
          if (!item.namaBarang || !item.namaBarang.trim()) continue;

          const itemName = item.namaBarang.trim();
          const itemKey = canonicalize(itemName);
          let match = invMap.get(itemKey);
          const deductQty = Number(item.qty);

          if (match) {
            const currentStock = match.quantity || 0;
            const newQty = currentStock - deductQty;

            if (newQty < 0) {
              stockWarnings.push(
                `Stok "${match.namaBarang}" tidak cukup (sisa: ${currentStock}, dibutuhkan: ${deductQty}). Stok menjadi ${newQty}.`
              );
            }

            if (match.id) {
              await db.inventory.update(match.id, {
                quantity: newQty,
                updatedAt: nowIso,
                updatedBy: currentUser,
              });

              movements.push({
                id: generateUUID(),
                inventoryId: match.id,
                delta: -deductQty,
                reason: 'sale',
                refType: 'transaction',
                refId: seq,
                at: nowIso,
                by: currentUser,
                note: `Penjualan ${deductQty} ${match.satuan || 'Pcs'}`,
              });
            }

            match.quantity = newQty;

            sanitizedItems.push({
              ...item,
              inventoryId: match.id || null,
              namaSnapshot: match.namaBarang || itemName,
              hargaModalSnapshot: match.hargaModal !== undefined ? match.hargaModal : null,
              qty: deductQty,
              hargaSatuan: Math.round(Number(item.hargaSatuan) || 0),
              hargaModal: Math.round(Number(match.hargaModal || item.hargaModal) || 0),
              total: Math.round(
                item.total !== undefined && !isNaN(Number(item.total))
                  ? Number(item.total)
                  : deductQty * (Number(item.hargaSatuan) || 0)
              ),
            });
          } else {
            // Auto-detect new catalog item: register with initial quantity = 0
            const newId = generateUUID();
            const newProduct: InventoryItem = {
              id: newId,
              namaBarang: itemName,
              kategori: item.kategori || 'Lainnya',
              subKategori: item.subKategori || '',
              harga: item.hargaSatuan || 0,
              hargaModal: 0,
              satuan: 'Pcs',
              quantity: 0,
              createdAt: nowIso,
              updatedAt: nowIso,
              updatedBy: currentUser,
              syncStatus: 'local',
            };
            await db.inventory.add(newProduct);
            invMap.set(itemKey, newProduct);

            movements.push({
              id: generateUUID(),
              inventoryId: newId,
              delta: -deductQty,
              reason: 'sale',
              refType: 'transaction',
              refId: seq,
              at: nowIso,
              by: currentUser,
              note: `Penjualan item baru ${deductQty} Pcs`,
            });

            sanitizedItems.push({
              ...item,
              inventoryId: newId,
              namaSnapshot: itemName,
              hargaModalSnapshot: 0,
              qty: deductQty,
              hargaSatuan: Math.round(Number(item.hargaSatuan) || 0),
              hargaModal: 0,
              total: Math.round(
                item.total !== undefined && !isNaN(Number(item.total))
                  ? Number(item.total)
                  : deductQty * (Number(item.hargaSatuan) || 0)
              ),
            });
          }
        }

        // 4. Save stock movements ledger
        if (movements.length > 0) {
          await db.stock_movements.bulkAdd(movements);
        }

        // 5. Clock tampering guard
        const lastTx = await db.transactions.orderBy('createdAt').last();
        let nowMs = Date.now();
        if (lastTx && lastTx.createdAt) {
          const lastTxMs = new Date(lastTx.createdAt).getTime();
          if (lastTxMs >= nowMs) {
            nowMs = lastTxMs + 1000;
          }
        }
        const safeIsoTime = new Date(nowMs).toISOString();

        const roundedTotal = Math.round(Number(orderData.total) || 0);
        const roundedUangDiterima = Math.round(Number(orderData.uangDiterima) || roundedTotal);
        const roundedKembalian = Math.round(Number(orderData.kembalian) || 0);

        const kasirSlug =
          (orderData.kasir || currentUser)
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .slice(0, 4) || 'KSR';
        const txId = orderData.transactionId || `TRX-${kasirSlug}-${String(seq).padStart(5, '0')}`;

        // Update movements with final transactionId
        for (const m of movements) {
          m.refId = txId;
        }

        newTx = {
          ...orderData,
          items: sanitizedItems,
          total: roundedTotal,
          uangDiterima: roundedUangDiterima,
          kembalian: roundedKembalian,
          kasir: orderData.kasir || currentUser,
          transactionId: txId,
          createdAt: safeIsoTime,
          updatedAt: safeIsoTime,
          syncStatus: 'local',
          status: 'Selesai',
          ...(stockWarnings.length > 0 ? { stockWarnings } : {}),
        } as Transaction;

        const insertedId = await db.transactions.add(newTx);
        newTx.id = Number(insertedId);
      }
    );

    return newTx!;
  },

  /**
   * Atomic Void / Soft-Delete:
   * Returns deducted stock, writes 'void' stock_movements ledger, and sets deletedAt.
   */
  async voidTransaction(
    id: string | number,
    reason: string = 'Void kasir',
    currentUser: string = 'Admin'
  ): Promise<void> {
    const numId = Number(id);
    if (isNaN(numId)) return;

    await db.transaction(
      'rw',
      [db.transactions, db.inventory, db.stock_movements, db.sessions, db.audit_log],
      async () => {
        const tx = await db.transactions.get(numId);
        if (!tx || tx.deletedAt) return; // Idempotent guard

        const nowIso = new Date().toISOString();

        // W1-05: Mark closed session as postCloseAdjusted
        if (tx.sessionId) {
          const session = await db.sessions.get(tx.sessionId);
          if (session && session.status === 'ditutup') {
            await db.sessions.update(tx.sessionId, {
              postCloseAdjusted: true,
              updatedAt: nowIso,
            });
          }
        }
        const movements: StockMovement[] = [];

        // Restore inventory quantities
        if (Array.isArray(tx.items)) {
          for (const item of tx.items) {
            const qty = Number(item.qty) || 0;
            if (qty <= 0) continue;

            let targetInv: InventoryItem | undefined;
            if (item.inventoryId) {
              targetInv = await db.inventory.get(item.inventoryId);
            }
            if (!targetInv && item.namaBarang) {
              const canonical = canonicalize(item.namaBarang);
              targetInv = await db.inventory
                .filter((i: any) => canonicalize(i.namaBarang || i.nama) === canonical)
                .first();
            }

            if (targetInv && targetInv.id) {
              const newQty = (targetInv.quantity || 0) + qty;
              await db.inventory.update(targetInv.id, {
                quantity: newQty,
                updatedAt: nowIso,
                updatedBy: currentUser,
              });

              movements.push({
                id: generateUUID(),
                inventoryId: targetInv.id,
                delta: qty, // positive return
                reason: 'void',
                refType: 'transaction',
                refId: tx.transactionId || tx.id,
                at: nowIso,
                by: currentUser,
                note: `Void: ${reason}`,
              });
            }
          }
        }

        if (movements.length > 0) {
          await db.stock_movements.bulkAdd(movements);
        }

        await db.transactions.update(numId, {
          deletedAt: nowIso,
          voidReason: reason,
          updatedAt: nowIso,
          updatedBy: currentUser,
        });

        // W2-05: Log void action to audit_log
        await db.audit_log.add({
          id: generateUUID(),
          action: 'void',
          entity: 'transaction',
          entityId: tx.transactionId || tx.id,
          timestamp: nowIso,
          actor: currentUser,
          reason,
          details: { total: tx.total, itemCount: tx.items?.length },
        });
      }
    );
  },

  /**
   * Atomic Restore:
   * Re-deducts stock, records 'restore' stock_movements ledger, and removes deletedAt.
   */
  async restoreTransaction(id: string | number, currentUser: string = 'Admin'): Promise<void> {
    const numId = Number(id);
    if (isNaN(numId)) return;

    await db.transaction(
      'rw',
      [db.transactions, db.inventory, db.stock_movements, db.audit_log],
      async () => {
        const tx = await db.transactions.get(numId);
        if (!tx || !tx.deletedAt) return;

        const nowIso = new Date().toISOString();
        const movements: StockMovement[] = [];

        if (Array.isArray(tx.items)) {
          for (const item of tx.items) {
            const qty = Number(item.qty) || 0;
            if (qty <= 0) continue;

            let targetInv: InventoryItem | undefined;
            if (item.inventoryId) {
              targetInv = await db.inventory.get(item.inventoryId);
            }
            if (!targetInv && item.namaBarang) {
              const canonical = canonicalize(item.namaBarang);
              targetInv = await db.inventory
                .filter((i: any) => canonicalize(i.namaBarang || i.nama) === canonical)
                .first();
            }

            if (targetInv && targetInv.id) {
              const newQty = (targetInv.quantity || 0) - qty;
              await db.inventory.update(targetInv.id, {
                quantity: newQty,
                updatedAt: nowIso,
                updatedBy: currentUser,
              });

              movements.push({
                id: generateUUID(),
                inventoryId: targetInv.id,
                delta: -qty, // deduct again
                reason: 'restore',
                refType: 'transaction',
                refId: tx.transactionId || tx.id,
                at: nowIso,
                by: currentUser,
                note: 'Restore transaksi dari sampah',
              });
            }
          }
        }

        if (movements.length > 0) {
          await db.stock_movements.bulkAdd(movements);
        }

        delete tx.deletedAt;
        delete tx.voidReason;
        tx.updatedAt = nowIso;
        tx.updatedBy = currentUser;
        await db.transactions.put(tx);

        // W2-05: Log restore action to audit_log
        await db.audit_log.add({
          id: generateUUID(),
          action: 'restore',
          entity: 'transaction',
          entityId: tx.transactionId || tx.id,
          timestamp: nowIso,
          actor: currentUser,
          details: { total: tx.total },
        });
      }
    );
  },

  /**
   * Atomic Edit / Update:
   * Adjusts stock difference if items array changed, records 'edit' movements, and saves.
   */
  async updateTransaction(
    id: string | number,
    data: Partial<Transaction>,
    currentUser: string = 'Admin'
  ): Promise<Transaction | null> {
    const numId = Number(id);
    if (isNaN(numId)) return null;

    let updatedTx: Transaction | null = null;

    await db.transaction(
      'rw',
      [db.transactions, db.inventory, db.stock_movements, db.sessions, db.audit_log],
      async () => {
        const oldTx = await db.transactions.get(numId);
        if (!oldTx) return;

        const nowIso = new Date().toISOString();

        // W1-05: Mark closed session as postCloseAdjusted
        if (oldTx.sessionId) {
          const session = await db.sessions.get(oldTx.sessionId);
          if (session && session.status === 'ditutup') {
            await db.sessions.update(oldTx.sessionId, {
              postCloseAdjusted: true,
              updatedAt: nowIso,
            });
          }
        }

        // If items changed, calculate stock deltas
        if (data.items && Array.isArray(data.items)) {
          const oldMap = new Map<string, number>();
          for (const item of oldTx.items || []) {
            const key = item.inventoryId || canonicalize(item.namaBarang);
            oldMap.set(key, (oldMap.get(key) || 0) + (Number(item.qty) || 0));
          }

          const newMap = new Map<string, number>();
          for (const item of data.items) {
            const key = item.inventoryId || canonicalize(item.namaBarang);
            newMap.set(key, (newMap.get(key) || 0) + (Number(item.qty) || 0));
          }

          const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);
          const movements: StockMovement[] = [];

          for (const key of allKeys) {
            const oldQty = oldMap.get(key) || 0;
            const newQty = newMap.get(key) || 0;
            const diff = oldQty - newQty; // positive = item reduced (stock returned); negative = item added (stock deducted)

            if (diff !== 0) {
              // Find inventory
              let targetInv: InventoryItem | undefined;
              targetInv = await db.inventory.get(key);
              if (!targetInv) {
                targetInv = await db.inventory
                  .filter((i: any) => canonicalize(i.namaBarang || i.nama) === key)
                  .first();
              }

              if (targetInv && targetInv.id) {
                const adjustedStock = (targetInv.quantity || 0) + diff;
                await db.inventory.update(targetInv.id, {
                  quantity: adjustedStock,
                  updatedAt: nowIso,
                  updatedBy: currentUser,
                });

                movements.push({
                  id: generateUUID(),
                  inventoryId: targetInv.id,
                  delta: diff,
                  reason: 'edit',
                  refType: 'transaction',
                  refId: oldTx.transactionId || oldTx.id,
                  at: nowIso,
                  by: currentUser,
                  note: `Edit pesanan (selisih: ${diff > 0 ? '+' : ''}${diff})`,
                });
              }
            }
          }

          if (movements.length > 0) {
            await db.stock_movements.bulkAdd(movements);
          }
        }

        // W2-07: kasir cannot be overwritten via edit
        const { kasir: _ignoredKasir, ...safeChanges } = data;

        const changes = {
          ...safeChanges,
          updatedAt: nowIso,
          updatedBy: currentUser,
        };

        const updatedRows = await db.transactions.update(numId, changes);
        if (updatedRows > 0) {
          updatedTx = (await db.transactions.get(numId)) || null;

          // W2-05: Log edit action to audit_log
          await db.audit_log.add({
            id: generateUUID(),
            action: 'update',
            entity: 'transaction',
            entityId: oldTx.transactionId || oldTx.id,
            timestamp: nowIso,
            actor: currentUser,
            details: safeChanges,
          });
        }
      }
    );

    return updatedTx;
  },

  /**
   * Atomic Unpack (W1-09):
   * Converts 1 pack into `packRatio` loose stock.
   * Atomically decrements packStock by 1, increments quantity by packRatio,
   * and records a stock_movements ledger entry.
   */
  async unpackInventoryItem(
    itemId: string,
    currentUser: string = 'Admin'
  ): Promise<{ success: boolean; error?: string }> {
    return await db.transaction('rw', [db.inventory, db.stock_movements], async () => {
      const item: InventoryItem | undefined = await db.inventory.get(itemId);
      if (!item) {
        return { success: false, error: 'Barang tidak ditemukan' };
      }

      const ratio = Number(item.packRatio);
      if (!ratio || ratio <= 0) {
        return {
          success: false,
          error: `Rasio pack belum diatur untuk "${item.namaBarang}". Buka Edit Barang untuk mengatur rasio isi pack.`,
        };
      }

      const currentPackStock = Number(item.packStock) || 0;
      if (currentPackStock <= 0) {
        return {
          success: false,
          error: `Stok ${item.packUnit || 'Dus'} habis (0).`,
        };
      }

      const nowIso = new Date().toISOString();
      const newPackStock = currentPackStock - 1;
      const newQuantity = (Number(item.quantity) || 0) + ratio;

      await db.inventory.update(itemId, {
        packStock: newPackStock,
        quantity: newQuantity,
        updatedAt: nowIso,
        updatedBy: currentUser,
      });

      await db.stock_movements.add({
        id: generateUUID(),
        inventoryId: itemId,
        delta: ratio,
        reason: 'unpack',
        refType: 'unpack',
        refId: itemId,
        at: nowIso,
        by: currentUser,
        note: `Unpack 1 ${item.packUnit || 'Dus'} (+${ratio} ${item.satuan || 'Pcs'})`,
      });

      return { success: true };
    });
  },
};
