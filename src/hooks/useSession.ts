/* ═══════════════════════════════════════════════════════════
   useSession Hook — ClearTask
   Manages session lifecycle using Dexie
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toLocalDateString } from '../utils/formatters';
import db from '../services/db';
import type { Session, Transaction } from '../types/index';

// Re-export so existing imports from useSession.ts keep working
export type { Session } from '../types/index';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useSession(): {
  activeSession: Session | null;
  allSessions: Session[];
  isLoading: boolean;
  openSession: (nama?: string) => Promise<Session | undefined>;
  closeSession: () => Promise<Session>;
  getSessionTransactionsAsync: (sessionId: string) => Promise<Transaction[]>;
} {
  const rawSessions = useLiveQuery(() => db.sessions.toArray());
  const isLoading = rawSessions === undefined;
  const sessions: Session[] = rawSessions || [];

  const activeSession = sessions.find((s) => s.status === 'aktif') ?? null;

  const openSession = useCallback(async (nama: string = '') => {
    // Bug #10 fix: wrap check+insert in a Dexie transaction to prevent
    // TOCTOU race condition where two concurrent calls both pass the
    // "no active session" check before either writes.
    await db.transaction('rw', db.sessions, async () => {
      const currentActive = await db.sessions.where('status').equals('aktif').first();
      if (currentActive) {
        throw new Error('Sudah ada sesi aktif');
      }

      const now = new Date();
      const newSession = {
        id: generateUUID(),
        nama: typeof nama === 'string' ? nama : '',
        tanggalMulai: toLocalDateString(now),
        waktuMulai: now.toISOString(),
        tanggalTutup: null,
        waktuTutup: null,
        status: 'aktif',
      };

      await db.sessions.add(newSession);
    });

    // Return the newly created session by querying it back
    return await db.sessions.where('status').equals('aktif').first();
  }, []);

  const closeSession = useCallback(async () => {
    const active = await db.sessions.where('status').equals('aktif').first();
    if (!active) {
      throw new Error('Tidak ada sesi aktif');
    }

    const now = new Date();

    // W1-05: closingSnapshot
    const [activeTxs, archivedTxs] = await Promise.all([
      db.transactions.where('sessionId').equals(active.id).toArray(),
      db.archive_transactions
        ? db.archive_transactions.where('sessionId').equals(active.id).toArray()
        : Promise.resolve([]),
    ]);
    const validTxs = [...activeTxs, ...archivedTxs].filter((tx) => !tx.deletedAt);

    const paymentMethods: Record<string, number> = {};
    let totalRevenue = 0;
    let totalCash = 0;

    for (const tx of validTxs) {
      const total = Number(tx.total) || 0;
      totalRevenue += total;
      const method = tx.metode || 'Tunai';
      paymentMethods[method] = (paymentMethods[method] || 0) + total;
      if (method.toLowerCase() === 'tunai') {
        totalCash += total;
      }
    }

    const closed = {
      ...active,
      waktuTutup: now.toISOString(),
      tanggalTutup: toLocalDateString(now),
      status: 'ditutup',
      closingSnapshot: {
        totalTransactions: validTxs.length,
        totalRevenue,
        paymentMethods,
        totalCash,
        closedAt: now.toISOString(),
        closedBy: active.kasir || 'Admin',
      },
      updatedAt: now.toISOString(),
    };

    await db.sessions.put(closed);
    return closed;
  }, []);

  // W1-06: getSessionTransactionsAsync merges active and archived transactions
  // W0-02: Filter out voided/soft-deleted transactions (deletedAt !== null)
  const getSessionTransactionsAsync = useCallback(
    async (sessionId: string): Promise<Transaction[]> => {
      if (!sessionId) return [];
      const [activeTxs, archivedTxs] = await Promise.all([
        db.transactions.where('sessionId').equals(sessionId).toArray(),
        db.archive_transactions
          ? db.archive_transactions.where('sessionId').equals(sessionId).toArray()
          : Promise.resolve([]),
      ]);
      const combined = [...activeTxs, ...archivedTxs];
      return combined.filter((tx) => !tx.deletedAt);
    },
    []
  );

  return {
    activeSession,
    allSessions: sessions,
    isLoading,
    openSession,
    closeSession,
    getSessionTransactionsAsync, // Changed to Async
  };
}
