/* eslint-disable react-refresh/only-export-components */
/* ═══════════════════════════════════════════════════════════
   ExpensesContext — ClearTask (W3-11)
   Shared single useLiveQuery subscription for expenses table.
   ═══════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import type { ExpenseItem } from '../hooks/useExpenses';

export interface ExpensesContextValue {
  expenses: ExpenseItem[];
  addExpense: (expenseData: Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<ExpenseItem>;
  deleteExpense: (id: string) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Omit<ExpenseItem, 'id' | 'createdAt'>>) => Promise<void>;
}

export const ExpensesContext = createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children, limit = 1000 }: { children: React.ReactNode; limit?: number }) {
  const expenses =
    useLiveQuery(
      () =>
        limit > 0
          ? db.expenses.orderBy('tanggal').reverse().limit(limit).toArray()
          : db.expenses.orderBy('tanggal').reverse().toArray(),
      [limit]
    ) || [];

  const addExpense = useCallback(
    async (expenseData: Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
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
    },
    []
  );

  const deleteExpense = useCallback(async (id: string) => {
    await db.expenses.delete(id);
  }, []);

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Omit<ExpenseItem, 'id' | 'createdAt'>>) => {
      await db.expenses.update(id, {
        ...updates,
        updatedAt: new Date().toISOString(),
        syncStatus: 'local',
      });
    },
    []
  );

  const value: ExpensesContextValue = {
    expenses,
    addExpense,
    deleteExpense,
    updateExpense,
  };

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpensesContext(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) {
    throw new Error('useExpensesContext must be used within an ExpensesProvider');
  }
  return ctx;
}
