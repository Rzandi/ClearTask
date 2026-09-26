/* ═══════════════════════════════════════════════════════════
   useTransactions Hook — ClearTask
   Composes specialized sub‑hooks for data, filter, and metrics.
   ═══════════════════════════════════════════════════════════ */

import { useTransactionData } from './useTransactionData';
import { useTransactionFilter, type TransactionFilterState } from './useTransactionFilter';
import { useTransactionMetrics, type TransactionMetrics } from './useTransactionMetrics';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import { type Transaction } from '../utils/sessionStats';

export interface UseTransactionsResult extends TransactionFilterState {
  isLoading: boolean;
  transactions: Transaction[];
  todayMetrics: TransactionMetrics;
  totalCount: number;
  recentTransactions: Transaction[];
  addTransaction: (tx: any) => Promise<Transaction>;
  updateTransaction: (id: string | number, updates: any) => Promise<Transaction | null>;
  deleteTransaction: (id: string | number) => Promise<void>;
  restoreTransaction: (id: string | number) => Promise<void>;
}

export function useTransactions(): UseTransactionsResult {
  // Filtering, searching, sorting state
  const { searchQuery, setSearchQuery, filterDate, setFilterDate, sortOrder, setSortOrder } =
    useTransactionFilter();

  // Core data + CRUD (filtered via DB)
  const { isLoading, transactions, addTransaction, updateTransaction, deleteTransaction, restoreTransaction } =
    useTransactionData(filterDate, searchQuery, sortOrder);

  // Daily metrics derived independently
  const todayMetrics = useTransactionMetrics();

  // P0-FIX: Exclude soft-deleted transactions from global counts and recents
  const totalCount = useLiveQuery(async () => {
    return await db.transactions.filter((tx: any) => !tx.deletedAt).count();
  }) || 0;
  const recentTransactions =
    useLiveQuery(async () => {
      const txs = await db.transactions.orderBy('createdAt').reverse().limit(20).toArray();
      return txs.filter((tx: any) => !tx.deletedAt).slice(0, 5);
    }) || [];

  return {
    isLoading,
    transactions,
    todayMetrics,
    totalCount,
    recentTransactions,
    searchQuery,
    setSearchQuery,
    filterDate,
    setFilterDate,
    sortOrder,
    setSortOrder,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
  };
}
