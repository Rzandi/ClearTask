/* ═══════════════════════════════════════════════════════════
   useSession Hook — ClearTask
   Manages session lifecycle using Dexie
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toLocalDateString } from '../utils/formatters';
import db from '../services/db';

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useSession() {
  const rawSessions = useLiveQuery(() => db.sessions.toArray());
  const isLoading = rawSessions === undefined;
  const sessions = rawSessions || [];

  const activeSession = sessions.find((s) => s.status === 'aktif') ?? null;

  const openSession = useCallback(async (nama = '') => {
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
    const closed = {
      ...active,
      waktuTutup: now.toISOString(),
      tanggalTutup: toLocalDateString(now),
      status: 'ditutup',
    };

    await db.sessions.put(closed);
    return closed;
  }, []);

  // getSessionTransactions needs to be async now because it queries the DB
  const getSessionTransactionsAsync = useCallback(async (sessionId) => {
    if (!sessionId) return [];
    return await db.transactions.where('sessionId').equals(sessionId).toArray();
  }, []);

  return {
    activeSession,
    allSessions: sessions,
    isLoading,
    openSession,
    closeSession,
    getSessionTransactionsAsync, // Changed to Async
  };
}
