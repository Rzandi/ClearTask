/* ═══════════════════════════════════════════════════════════
   useTransactions Hook — ClearTask
   Custom hook for transaction CRUD, filtering, and metrics
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback, useMemo } from 'react';
import { getTransactions, addTransaction as addTx } from '../utils/storage';
import { getTodayISO } from '../utils/formatters';

export function useTransactions() {
  const [transactions, setTransactions] = useState(() => getTransactions());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'

  // ── Add Transaction ──
  const addTransaction = useCallback((data) => {
    const newTx = addTx(data);
    setTransactions(getTransactions());
    return newTx;
  }, []);

  // ── Refresh from storage ──
  const refresh = useCallback(() => {
    setTransactions(getTransactions());
  }, []);

  // ── Filtered & Sorted Transactions ──
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by date
    if (filterDate) {
      result = result.filter((tx) => tx.tanggal === filterDate);
    }

    // Search by ID or kasir
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (tx) =>
          tx.transactionId?.toLowerCase().includes(q) ||
          tx.kasir?.toLowerCase().includes(q) ||
          tx.namaBarang?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [transactions, searchQuery, filterDate, sortOrder]);

  // ── Today's Metrics ──
  const todayMetrics = useMemo(() => {
    const today = getTodayISO();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split('T')[0];

    const todayTxs = transactions.filter((tx) => tx.tanggal === today);
    const yesterdayTxs = transactions.filter((tx) => tx.tanggal === yesterdayISO);

    const todayTotal = todayTxs.reduce((sum, tx) => sum + (tx.total || 0), 0);
    const yesterdayTotal = yesterdayTxs.reduce((sum, tx) => sum + (tx.total || 0), 0);

    let trendPercent = 0;
    if (yesterdayTotal > 0) {
      trendPercent = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
    }

    return {
      todayTotal,
      yesterdayTotal,
      trendPercent,
      todayCount: todayTxs.length,
      isFirstDay: yesterdayTotal === 0,
    };
  }, [transactions]);

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    todayMetrics,
    addTransaction,
    refresh,
    searchQuery,
    setSearchQuery,
    filterDate,
    setFilterDate,
    sortOrder,
    setSortOrder,
  };
}
