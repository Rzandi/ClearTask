/* ═══════════════════════════════════════════════════════════
   useTransactionData Hook — ClearTask
   Handles live query and CRUD for transactions with DB filtering.
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSettings } from '../contexts/SettingsContext';
import db from '../services/db';
import { transactionService } from '../services/transactionService';

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

  // ── Add Transaction (W1-04: Delegates to transactionService) ──
  const addTransaction = useCallback(
    async (orderData: any) => {
      return await transactionService.createTransaction(orderData, currentUser);
    },
    [currentUser]
  );

  // ── Update Transaction (W1-04: Delegates to transactionService) ──
  const updateTransaction = useCallback(
    async (id: string | number, data: any) => {
      return await transactionService.updateTransaction(id, data, currentUser);
    },
    [currentUser]
  );

  // ── Delete / Void Transaction (W1-04: Delegates to transactionService) ──
  const deleteTransaction = useCallback(
    async (id: string | number, reason?: string) => {
      await transactionService.voidTransaction(id, reason, currentUser);
    },
    [currentUser]
  );

  // ── Restore Soft-Deleted Transaction (W1-04: Delegates to transactionService) ──
  const restoreTransaction = useCallback(
    async (id: string | number) => {
      await transactionService.restoreTransaction(id, currentUser);
    },
    [currentUser]
  );

  return {
    isLoading,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
  };
}
