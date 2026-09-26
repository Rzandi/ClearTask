/* ═══════════════════════════════════════════════════════════
   useTransactionData Hook — ClearTask
   Handles live query and CRUD for transactions with DB filtering.
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSettings } from '../contexts/SettingsContext';
import db from '../services/db';

import { type Transaction } from '../types/index';

export function useTransactionData(
  filterDate: any,
  searchQuery: string,
  sortOrder: string
): {
  isLoading: boolean;
  transactions: Transaction[];
  addTransaction: (orderData: any) => Promise<Transaction>;
  updateTransaction: (id: string | number, data: any) => Promise<Transaction | null>;
  deleteTransaction: (id: string | number) => Promise<void>;
  restoreTransaction: (id: string | number) => Promise<void>;
} {
  const { settings } = useSettings();
  const currentUser = settings?.kasirName || 'Admin';

  // DB-level filtering to prevent Full Table Scan
  const rawTransactions = useLiveQuery(async () => {
    let txs: Transaction[];

    if (filterDate) {
      let collection: any;
      if (typeof filterDate === 'object' && filterDate.start && filterDate.end) {
        collection = db.transactions
          .where('tanggal')
          .between(filterDate.start, filterDate.end, true, true);
      } else if (typeof filterDate === 'string') {
        collection = db.transactions.where('tanggal').equals(filterDate);
      } else {
        collection = db.transactions.orderBy('createdAt').reverse();
      }
      txs = await collection.toArray();
    } else if (searchQuery && searchQuery.trim()) {
      // P0-FIX (bug_brutal #6): When searching globally without date filter,
      // query all transactions so older records (>1000) can still be found
      txs = await db.transactions.orderBy('createdAt').reverse().toArray();
    } else {
      // Default view without date or search: limit to 1000 most recent for performance
      txs = await db.transactions.orderBy('createdAt').reverse().limit(1000).toArray();
    }

    // QOL C: Filter out soft-deleted items
    txs = txs.filter((tx) => !tx.deletedAt);

    // JS filtering for text search (safe since data is already date-bounded or limited)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      txs = txs.filter(
        (tx) =>
          tx.transactionId?.toLowerCase().includes(q) ||
          tx.kasir?.toLowerCase().includes(q) ||
          (tx.items && tx.items.some((item: any) => item.namaBarang?.toLowerCase().includes(q)))
      );
    }

    // Sort
    txs.sort((a, b) => {
      if (sortOrder === 'newest')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOrder === 'oldest')
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOrder === 'highest') return (b.total || 0) - (a.total || 0);
      if (sortOrder === 'lowest') return (a.total || 0) - (b.total || 0);
      return 0;
    });

    return txs;
  }, [filterDate, searchQuery, sortOrder]);

  const isLoading = rawTransactions === undefined;
  const transactions = rawTransactions || [];

  // ── Add Transaction ──
  const addTransaction = useCallback(async (orderData: any) => {
    if (!orderData.items || orderData.items.length === 0)
      throw new Error('Keranjang belanja kosong');
    if (orderData.total === undefined || orderData.total < 0)
      throw new Error('Total transaksi tidak valid');

    let newTx: Transaction | undefined;
    await db.transaction('rw', [db.meta, db.transactions, db.inventory], async () => {
      const metaSeq = await db.meta.get({ key: 'seq' });
      const seq = metaSeq ? metaSeq.value + 1 : 1;
      await db.meta.put({ ...(metaSeq || {}), key: 'seq', value: seq });

      // P0-FIX: Build inventory lookup Map for O(1) access (was O(items × inventory))
      const invItems = await db.inventory.toArray();
      const invMap = new Map<string, (typeof invItems)[0]>();
      for (const inv of invItems) {
        const key = (inv.namaBarang || '').trim().toLowerCase();
        if (key) invMap.set(key, inv);
      }

      // Deduct stock and auto-detect new products
      const stockWarnings: string[] = [];

      for (const item of orderData.items) {
        if (!item.namaBarang || !item.namaBarang.trim()) continue;

        const itemName = item.namaBarang.trim().toLowerCase();
        const match = invMap.get(itemName);

        if (match) {
          // P0-FIX: Allow negative stock for accurate data tracking
          // Previously Math.max(0, ...) silently clamped — hiding oversell
          const currentStock = match.quantity || 0;
          const deductQty = item.qty || 1;
          const newQty = currentStock - deductQty;

          if (newQty < 0) {
            stockWarnings.push(
              `Stok "${match.namaBarang}" tidak cukup (sisa: ${currentStock}, dibutuhkan: ${deductQty}). Stok menjadi ${newQty}.`
            );
          }

          await db.inventory.update(match.id, {
            quantity: newQty,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser,
          });
          // Update map reference for subsequent items of same product in cart
          match.quantity = newQty;
        } else {
          // Auto-detect new product: register with default Stock = 0, Modal = 0
          const newProduct = {
            id:
              typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                    const r = (Math.random() * 16) | 0;
                    const v = c === 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                  }),
            namaBarang: item.namaBarang.trim(),
            kategori: item.kategori || 'Lainnya',
            subKategori: item.subKategori || '',
            harga: item.hargaSatuan || 0,
            hargaModal: 0,
            satuan: 'Pcs',
            quantity: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser,
            syncStatus: 'local',
          };
          await db.inventory.add(newProduct);
        }
      }

      // Item 28: Clock Tampering Guard — Monotonic timestamp verification
      const lastTx = await db.transactions.orderBy('createdAt').last();
      let nowMs = Date.now();
      if (lastTx && lastTx.createdAt) {
        const lastTxMs = new Date(lastTx.createdAt).getTime();
        if (lastTxMs >= nowMs) {
          nowMs = lastTxMs + 1000; // Monotonic sequence guarantee
        }
      }
      const safeIsoTime = new Date(nowMs).toISOString();

      // Item 34: Floating Point Precision Guard — Round all currency values
      const roundedTotal = Math.round(Number(orderData.total) || 0);
      const roundedUangDiterima = Math.round(Number(orderData.uangDiterima) || roundedTotal);
      const roundedKembalian = Math.round(Number(orderData.kembalian) || 0);

      const sanitizedItems = (orderData.items || []).map((item: any) => ({
        ...item,
        hargaSatuan: Math.round(Number(item.hargaSatuan) || 0),
        hargaModal: Math.round(Number(item.hargaModal) || 0),
        total: Math.round(Number(item.total) || (item.qty * item.hargaSatuan) || 0),
      }));

      // Item 33: Collision-Free Device Prefix
      const kasirSlug = (orderData.kasir || currentUser).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'KSR';
      const txId = orderData.transactionId || `TRX-${kasirSlug}-${String(seq).padStart(5, '0')}`;

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
        // P0-FIX: Attach stock warnings so UI can display insufficient stock info
        ...(stockWarnings.length > 0 ? { stockWarnings } : {}),
      };

      await db.transactions.add(newTx);
    });

    return newTx!;
  }, []);

  // ── Update Transaction ──
  const updateTransaction = useCallback(
    async (id: string | number, data: any) => {
      const numId = Number(id);
      if (isNaN(numId)) return null;

      const changes = {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      };

      const updatedRows = await db.transactions.update(numId, changes);
      if (updatedRows === 0) return null;

      return await db.transactions.get(numId);
    },
    [currentUser]
  );

  // ── Delete Transaction (Soft Delete — QOL C) ──
  const deleteTransaction = useCallback(async (id: string | number) => {
    const numId = Number(id);
    if (isNaN(numId)) return;

    await db.transactions.update(numId, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  // ── Restore Soft-Deleted Transaction ──
  const restoreTransaction = useCallback(async (id: string | number) => {
    const numId = Number(id);
    if (isNaN(numId)) return;

    const record = await db.transactions.get(numId);
    if (!record) return;
    // Remove deletedAt field entirely
    delete record.deletedAt;
    record.updatedAt = new Date().toISOString();
    await db.transactions.put(record);
  }, []);

  return {
    isLoading,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
  };
}
