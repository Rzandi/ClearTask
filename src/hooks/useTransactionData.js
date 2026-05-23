/* ═══════════════════════════════════════════════════════════
   useTransactionData Hook — ClearTask
   Handles live query and CRUD for transactions with DB filtering.
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';

export function useTransactionData(filterDate, searchQuery, sortOrder) {
  // DB-level filtering to prevent Full Table Scan
  const rawTransactions = useLiveQuery(async () => {
    let collection;
    if (filterDate) {
      if (typeof filterDate === 'object' && filterDate.start && filterDate.end) {
        collection = db.transactions
          .where('tanggal')
          .between(filterDate.start, filterDate.end, true, true);
      } else if (typeof filterDate === 'string') {
        collection = db.transactions.where('tanggal').equals(filterDate);
      }
    } else {
      // Fallback limit for safety
      collection = db.transactions.orderBy('createdAt').reverse().limit(1000);
    }

    let txs = await collection.toArray();

    // JS filtering for text search (safe since data is already date-bounded or limited)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      txs = txs.filter(
        (tx) =>
          tx.transactionId?.toLowerCase().includes(q) ||
          tx.kasir?.toLowerCase().includes(q) ||
          (tx.items && tx.items.some((item) => item.namaBarang?.toLowerCase().includes(q)))
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
  const addTransaction = useCallback(async (orderData) => {
    if (!orderData.items || orderData.items.length === 0)
      throw new Error('Keranjang belanja kosong');
    if (orderData.total === undefined || orderData.total < 0)
      throw new Error('Total transaksi tidak valid');

    let newTx;
    await db.transaction('rw', [db.meta, db.transactions], async () => {
      const metaSeq = await db.meta.get({ key: 'seq' });
      const seq = metaSeq ? metaSeq.value + 1 : 1;
      await db.meta.put({ ...(metaSeq || {}), key: 'seq', value: seq });

      newTx = {
        ...orderData,
        transactionId: `TRX-${String(seq).padStart(5, '0')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'local',
        status: 'Selesai',
      };

      await db.transactions.add(newTx);
    });

    return newTx;
  }, []);

  // ── Update Transaction ──
  const updateTransaction = useCallback(async (id, data) => {
    const changes = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const updatedRows = await db.transactions.update(id, changes);
    if (updatedRows === 0) return null;

    return await db.transactions.get(id);
  }, []);

  // ── Delete Transaction ──
  const deleteTransaction = useCallback(async (id) => {
    await db.transactions.delete(id);
  }, []);

  return {
    isLoading,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
