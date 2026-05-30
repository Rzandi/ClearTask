/* ═══════════════════════════════════════════════════════════
   useExpenses — ClearTask
   Hook for managing Expenses (Keluaran) in Dexie (IndexedDB)
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';

export interface ExpenseItem {
  id?: string;
  tanggal: string;
  kategori: string;
  namaKeluaran: string;
  jumlah: number;
  catatan?: string;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'local' | 'synced';
}

export function useExpenses() {
  const expenses = useLiveQuery(() => db.expenses.orderBy('tanggal').reverse().toArray()) || [];

  const addExpense = useCallback(async (expenseData: Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
    // Generate UUID similar to inventory hook
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'ex-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

    const newExpense: ExpenseItem = {
      ...expenseData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'local',
    };

    await db.expenses.add(newExpense);
    return newExpense;
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    await db.expenses.delete(id);
  }, []);

  return {
    expenses,
    addExpense,
    deleteExpense,
  };
}
