/* ═══════════════════════════════════════════════════════════
   useTransactions Hook — ClearTask
   Composes specialized sub‑hooks for data, filter, and metrics.
   ═══════════════════════════════════════════════════════════ */

import { useTransactionData } from './useTransactionData';
import { useTransactionFilter } from './useTransactionFilter';
import { useTransactionMetrics } from './useTransactionMetrics';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';

export function useTransactions() {
  // Filtering, searching, sorting state
  const { searchQuery, setSearchQuery, filterDate, setFilterDate, sortOrder, setSortOrder } =
    useTransactionFilter();

  // Core data + CRUD (filtered via DB)
  const { isLoading, transactions, addTransaction, updateTransaction, deleteTransaction } =
    useTransactionData(filterDate, searchQuery, sortOrder);

  // Daily metrics derived independently
  const todayMetrics = useTransactionMetrics();

  // Global counts and recents (always updated, lightweight)
  const totalCount = useLiveQuery(() => db.transactions.count()) || 0;
  const recentTransactions =
    useLiveQuery(() => db.transactions.orderBy('createdAt').reverse().limit(5).toArray()) || [];

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
  };
}
