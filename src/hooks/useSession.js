/* ═══════════════════════════════════════════════════════════
   useSession Hook — ClearTask
   Manages session lifecycle: open, close, persist, and query.
   All data stored in localStorage key 'cleartask_sessions'.
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback } from 'react';

const SESSIONS_KEY = 'cleartask_sessions';
const TRANSACTIONS_KEY = 'cleartask_transactions';

// ── Internal helpers ──────────────────────────────────────

/**
 * Generate a UUID v4. Uses crypto.randomUUID() if available,
 * falls back to a manual implementation for older browsers.
 * @returns {string}
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Read and parse sessions from localStorage.
 * Filters out invalid objects (missing id or status).
 * Runs integrity validation: if >1 active session found,
 * keeps only the most recent one (by waktuMulai).
 * @returns {Session[]}
 */
export function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw === null) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter out invalid objects
    const valid = parsed.filter(
      (s) => s && typeof s.id === 'string' && typeof s.status === 'string'
    );

    // Integrity check: at most one active session
    const activeSessions = valid.filter((s) => s.status === 'aktif');
    if (activeSessions.length > 1) {
      // Keep only the most recent active session
      activeSessions.sort(
        (a, b) => new Date(b.waktuMulai).getTime() - new Date(a.waktuMulai).getTime()
      );
      const keepId = activeSessions[0].id;
      return valid.map((s) =>
        s.status === 'aktif' && s.id !== keepId
          ? { ...s, status: 'ditutup', waktuTutup: s.waktuTutup ?? new Date().toISOString(), tanggalTutup: s.tanggalTutup ?? new Date().toISOString().split('T')[0] }
          : s
      );
    }

    return valid;
  } catch {
    return [];
  }
}

/**
 * Save sessions array to localStorage.
 * @param {Session[]} sessions
 */
export function saveSessions(sessions) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('[useSession] Failed to save sessions:', e);
  }
}

// ── Hook ──────────────────────────────────────────────────

export function useSession() {
  const [sessions, setSessions] = useState(() => loadSessions());

  // ── Derived: active session ───────────────────────────
  const activeSession = sessions.find((s) => s.status === 'aktif') ?? null;

  // ── getActiveSession ──────────────────────────────────
  const getActiveSession = useCallback(() => {
    return sessions.find((s) => s.status === 'aktif') ?? null;
  }, [sessions]);

  // ── openSession ───────────────────────────────────────
  const openSession = useCallback(
    (nama = '') => {
      const current = sessions.find((s) => s.status === 'aktif');
      if (current) {
        throw new Error('Sudah ada sesi aktif');
      }

      const now = new Date();
      const newSession = {
        id: generateUUID(),
        nama: typeof nama === 'string' ? nama : '',
        tanggalMulai: now.toISOString().split('T')[0],
        waktuMulai: now.toISOString(),
        tanggalTutup: null,
        waktuTutup: null,
        status: 'aktif',
      };

      const updated = [...sessions, newSession];
      saveSessions(updated);
      setSessions(updated);
      return newSession;
    },
    [sessions]
  );

  // ── closeSession ──────────────────────────────────────
  const closeSession = useCallback(() => {
    const active = sessions.find((s) => s.status === 'aktif');
    if (!active) {
      throw new Error('Tidak ada sesi aktif');
    }

    const now = new Date();
    const closed = {
      ...active,
      waktuTutup: now.toISOString(),
      tanggalTutup: now.toISOString().split('T')[0],
      status: 'ditutup',
    };

    const updated = sessions.map((s) => (s.id === active.id ? closed : s));
    saveSessions(updated);
    setSessions(updated);
    return closed;
  }, [sessions]);

  // ── getSessionTransactions ────────────────────────────
  const getSessionTransactions = useCallback((sessionId) => {
    try {
      const raw = localStorage.getItem(TRANSACTIONS_KEY);
      if (!raw) return [];
      const all = JSON.parse(raw);
      if (!Array.isArray(all)) return [];
      return all.filter((tx) => tx.sessionId === sessionId);
    } catch {
      return [];
    }
  }, []);

  return {
    activeSession,
    allSessions: sessions,
    openSession,
    closeSession,
    getActiveSession,
    getSessionTransactions,
  };
}
