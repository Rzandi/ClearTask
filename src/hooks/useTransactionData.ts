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
    let collection: any = db.transactions.orderBy('createdAt').reverse().limit(1000);
    if (filterDate) {
      if (typeof filterDate === 'object' && filterDate.start && filterDate.end) {
        collection = db.transactions
          .where('tanggal')
          .between(filterDate.start, filterDate.end, true, true);
      } else if (typeof filterDate === 'string') {
        collection = db.transactions.where('tanggal').equals(filterDate);
      }
    }

    let txs: Transaction[] = await collection.toArray();

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

      // Deduct stock and auto-detect new products
      const invItems = await db.inventory.toArray();

      for (const item of orderData.items) {
        if (!item.namaBarang || !item.namaBarang.trim()) continue;

        const itemName = item.namaBarang.trim().toLowerCase();
        const match = invItems.find(
          (inv) => (inv.namaBarang || '').trim().toLowerCase() === itemName
        );

        if (match) {
          const newQty = Math.max(0, (match.quantity || 0) - (item.qty || 1));
          await db.inventory.update(match.id, {
            quantity: newQty,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser,
          });
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
      };

      await db.transactions.add(newTx);
    });

    return newTx!;
  }, []);

  // ── Update Transaction ──
  const updateTransaction = useCallback(
    async (id: string | number, data: any) => {
      const changes = {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      };

      const numId = Number(id);
      const updatedRows = await db.transactions.update(numId, changes);
      if (updatedRows === 0) return null;

      return await db.transactions.get(numId);
    },
    [currentUser]
  );

  // ── Delete Transaction (Soft Delete — QOL C) ──
  const deleteTransaction = useCallback(async (id: string | number) => {
    await db.transactions.update(Number(id), {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  // ── Restore Soft-Deleted Transaction ──
  const restoreTransaction = useCallback(async (id: string | number) => {
    const numId = Number(id);
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
