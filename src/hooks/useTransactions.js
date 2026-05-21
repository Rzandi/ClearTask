/* ═══════════════════════════════════════════════════════════
   useTransactions Hook — ClearTask
   Custom hook for transaction CRUD, filtering, and metrics
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  getTransactions,
  addTransaction as addTx,
  updateTransaction as updateTx,
  deleteTransaction as deleteTx,
} from '../utils/storage';
import { getTodayISO, toLocalDateString } from '../utils/formatters';

export function useTransactions() {
  const [transactions, setTransactions] = useState(() => getTransactions());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'

  // ── Add Transaction ──
  const addTransaction = useCallback((data) => {
    const newTx = addTx(data);
    setTransactions(prev => [newTx, ...prev]);
    return newTx;
  }, []);

  // ── Update Transaction ──
  const updateTransaction = useCallback((id, data) => {
    updateTx(id, data);
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...data } : tx));
  }, []);

  // ── Delete Transaction ──
  const deleteTransaction = useCallback((id) => {
    deleteTx(id);
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }, []);

  // ── Refresh from storage ──
  const refresh = useCallback(() => {
    setTransactions(getTransactions());
  }, []);

  useEffect(() => {
    window.addEventListener('storage', refresh);
    window.addEventListener('local-storage-update', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('local-storage-update', refresh);
    };
  }, [refresh]);

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
      if (sortOrder === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOrder === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOrder === 'highest') return (b.total || 0) - (a.total || 0);
      if (sortOrder === 'lowest') return (a.total || 0) - (b.total || 0);
      return 0;
    });

    return result;
  }, [transactions, searchQuery, filterDate, sortOrder]);

  // ── Today's Metrics ──
  const todayMetrics = useMemo(() => {
    const today = getTodayISO();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = toLocalDateString(yesterday);

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
    updateTransaction,
    deleteTransaction,
    refresh,
    searchQuery,
    setSearchQuery,
    filterDate,
    setFilterDate,
    sortOrder,
    setSortOrder,
  };
}
