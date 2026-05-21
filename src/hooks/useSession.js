/* ═══════════════════════════════════════════════════════════
   useSession Hook — ClearTask
   Manages session lifecycle: open, close, persist, and query.
   All data stored in localStorage key 'cleartask_sessions'.
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback, useEffect } from 'react';
import { toLocalDateString } from '../utils/formatters';
import { STORAGE_KEYS } from '../constants/storageKeys';
import * as storageService from '../services/storageService';


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
    const raw = storageService.getItem(STORAGE_KEYS.SESSIONS);

    if (!Array.isArray(raw)) return [];

    // Filter out invalid objects
    const valid = raw.filter(
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
      const fixed = valid.map((s) =>
        s.status === 'aktif' && s.id !== keepId
          ? { ...s, status: 'ditutup', waktuTutup: s.waktuTutup ?? new Date().toISOString(), tanggalTutup: s.tanggalTutup ?? toLocalDateString(new Date()) }
          : s
      );
      // Persist fix so corruption doesn't recur
      try { storageService.setItem(STORAGE_KEYS.SESSIONS, fixed); } catch { /* best-effort */ }
      return fixed;
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
    storageService.setItem(STORAGE_KEYS.SESSIONS, sessions);
  } catch (e) {
    console.error('[useSession] Failed to save sessions:', e);
  }
}

// ── Hook ──────────────────────────────────────────────────

export function useSession() {
  const [sessions, setSessions] = useState(() => loadSessions());

  useEffect(() => {
    const refresh = () => setSessions(loadSessions());
    window.addEventListener('storage', refresh);
    window.addEventListener('local-storage-update', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('local-storage-update', refresh);
    };
  }, []);

  // ── Derived: active session ───────────────────────────
  const activeSession = sessions.find((s) => s.status === 'aktif') ?? null;

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
        tanggalMulai: toLocalDateString(now),
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
      tanggalTutup: toLocalDateString(now),
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
      const all = storageService.getItem(STORAGE_KEYS.TRANSACTIONS);
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
    getSessionTransactions,
  };
}
