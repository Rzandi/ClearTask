/**
 * Tests for useSession hook
 * Tests loadSessions, saveSessions (pure functions) and useSession hook.
 *
 * Unit tests: 3.1 – 3.6
 * Property-based tests (fast-check): 3.7 – 3.15
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { loadSessions, saveSessions, useSession } from '../hooks/useSession.js';
import { toLocalDateString } from '../utils/formatters.js';

// ── Setup / Teardown ──────────────────────────────────────

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

// ── Helpers ───────────────────────────────────────────────

/** Build a minimal valid Session object */
function makeSession(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    nama: '',
    tanggalMulai: toLocalDateString(new Date()),
    waktuMulai: new Date().toISOString(),
    tanggalTutup: null,
    waktuTutup: null,
    status: 'aktif',
    ...overrides,
  };
}


// ── fast-check arbitraries ────────────────────────────────

/** Arbitrary for a valid Session id (UUID-like string) */
const arbId = fc.uuid();

/**
 * Arbitrary for an ISO date string "YYYY-MM-DD".
 * Uses integer-based generation to avoid fc.date() Invalid Date issues.
 */
const arbISODate = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }) // cap at 28 to avoid month-end edge cases
  )
  .map(([y, m, d]) => {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  });

/**
 * Arbitrary for an ISO datetime string.
 * Uses integer-based generation to avoid fc.date() Invalid Date issues.
 */
const arbISODatetime = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 999 })
  )
  .map(([y, mo, d, h, mi, s, ms]) => {
    const MM = String(mo).padStart(2, '0');
    const DD = String(d).padStart(2, '0');
    const HH = String(h).padStart(2, '0');
    const mm = String(mi).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    const SSS = String(ms).padStart(3, '0');
    return `${y}-${MM}-${DD}T${HH}:${mm}:${ss}.${SSS}Z`;
  });

/** Arbitrary for a valid closed Session */
const arbClosedSession = fc.record({
  id: arbId,
  nama: fc.string(),
  tanggalMulai: arbISODate,
  waktuMulai: arbISODatetime,
  tanggalTutup: arbISODate,
  waktuTutup: arbISODatetime,
  status: fc.constant('ditutup'),
});

/** Arbitrary for a valid active Session */
const arbActiveSession = fc.record({
  id: arbId,
  nama: fc.string(),
  tanggalMulai: arbISODate,
  waktuMulai: arbISODatetime,
  tanggalTutup: fc.constant(null),
  waktuTutup: fc.constant(null),
  status: fc.constant('aktif'),
});


/** Arbitrary for a valid SessionStore (at most one active session) */
const arbValidSessionStore = fc
  .tuple(
    fc.array(arbClosedSession, { minLength: 0, maxLength: 5 }),
    fc.option(arbActiveSession, { nil: null })
  )
  .map(([closed, active]) => (active ? [...closed, active] : closed));

/** Arbitrary for a session name (including empty string) */
const arbSessionName = fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 50 }));

// ── Unit Tests ────────────────────────────────────────────

describe('loadSessions', () => {
  // 3.1
  it('returns [] when localStorage is empty', () => {
    expect(loadSessions()).toEqual([]);
  });

  // 3.2
  it('returns [] when localStorage contains invalid JSON', () => {
    localStorage.setItem('cleartask_sessions', 'not-valid-json{{{');
    expect(loadSessions()).toEqual([]);
  });
});

describe('useSession — openSession', () => {
  // 3.3
  it('throws "Sudah ada sesi aktif" when an active session already exists', () => {
    const existing = makeSession({ status: 'aktif' });
    saveSessions([existing]);

    const { result } = renderHook(() => useSession());

    expect(() => {
      act(() => {
        result.current.openSession('New Session');
      });
    }).toThrow('Sudah ada sesi aktif');
  });
});

describe('useSession — closeSession', () => {
  // 3.4
  it('throws "Tidak ada sesi aktif" when there is no active session', () => {
    const { result } = renderHook(() => useSession());

    expect(() => {
      act(() => {
        result.current.closeSession();
      });
    }).toThrow('Tidak ada sesi aktif');
  });
});

describe('useSession — getActiveSession', () => {
  // 3.5
  it('returns the session with status "aktif"', () => {
    const active = makeSession({ status: 'aktif', nama: 'Shift Pagi' });
    saveSessions([active]);

    const { result } = renderHook(() => useSession());

    expect(result.current.activeSession).toMatchObject({
      id: active.id,
      status: 'aktif',
    });
  });

  // 3.6
  it('returns null after closeSession()', () => {
    const active = makeSession({ status: 'aktif' });
    saveSessions([active]);

    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.closeSession();
    });

    expect(result.current.activeSession).toBeNull();
  });
});

// ── Property-Based Tests ──────────────────────────────────

describe('PBT — Property 1: at most one active session after loadSessions', () => {
  // 3.7 — Validates: Requirements 2.6, 10.1
  it('the number of sessions with status "aktif" is never more than 1 after loadSessions()', () => {
    fc.assert(
      fc.property(arbValidSessionStore, (store) => {
        saveSessions(store);
        const loaded = loadSessions();
        const activeCount = loaded.filter((s) => s.status === 'aktif').length;
        expect(activeCount).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 2: new Session always has all required fields', () => {
  // 3.8 — Validates: Requirements 2.2, 2.4
  it('Session created by openSession() always has all required fields with correct values', () => {
    fc.assert(
      fc.property(arbSessionName, (nama) => {
        localStorage.clear();
        const { result } = renderHook(() => useSession());

        let newSession;
        act(() => {
          newSession = result.current.openSession(nama);
        });

        // id must be a non-empty string
        expect(typeof newSession.id).toBe('string');
        expect(newSession.id.length).toBeGreaterThan(0);

        // waktuMulai must be a valid ISO datetime
        expect(typeof newSession.waktuMulai).toBe('string');
        expect(() => new Date(newSession.waktuMulai)).not.toThrow();
        expect(new Date(newSession.waktuMulai).toISOString()).toBe(newSession.waktuMulai);

        // tanggalMulai must be a valid ISO date (YYYY-MM-DD)
        expect(typeof newSession.tanggalMulai).toBe('string');
        expect(newSession.tanggalMulai).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // status must be "aktif"
        expect(newSession.status).toBe('aktif');

        // tanggalTutup and waktuTutup must be null
        expect(newSession.tanggalTutup).toBeNull();
        expect(newSession.waktuTutup).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 3: round-trip save/load', () => {
  // 3.9 — Validates: Requirements 1.4
  it('saveSessions then loadSessions returns an array that deep-equals the input', () => {
    fc.assert(
      fc.property(arbValidSessionStore, (store) => {
        saveSessions(store);
        const loaded = loadSessions();
        expect(loaded).toEqual(store);
      }),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 4: closeSession sets correct fields', () => {
  // 3.10 — Validates: Requirements 4.2
  it('after closeSession(), session has status "ditutup" and non-null waktuTutup', () => {
    fc.assert(
      fc.property(arbActiveSession, (activeSession) => {
        localStorage.clear();
        saveSessions([activeSession]);

        const { result } = renderHook(() => useSession());

        let closedSession;
        act(() => {
          closedSession = result.current.closeSession();
        });

        expect(closedSession.status).toBe('ditutup');
        expect(typeof closedSession.waktuTutup).toBe('string');
        expect(closedSession.waktuTutup).not.toBeNull();
        expect(closedSession.waktuTutup.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 5: getActiveSession always returns exactly one or null', () => {
  // 3.11 — Validates: Requirements 1.5
  it('getActiveSession() always returns exactly one session with status "aktif" or null', () => {
    fc.assert(
      fc.property(arbValidSessionStore, (store) => {
        localStorage.clear();
        saveSessions(store);

        const { result } = renderHook(() => useSession());
        const active = result.current.activeSession;

        if (active === null) {
          // No active session — that's fine
          expect(active).toBeNull();
        } else {
          // Must be exactly one active session
          expect(active.status).toBe('aktif');
          const allActive = result.current.allSessions.filter((s) => s.status === 'aktif');
          expect(allActive.length).toBe(1);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 6: getSessionTransactions only returns matching transactions', () => {
  // 3.12 — Validates: Requirements 8.5
  it('getSessionTransactions(sessionId) only returns transactions with matching sessionId', () => {
    const arbTransaction = fc.record({
      id: fc.integer({ min: 1, max: 9999 }),
      sessionId: fc.oneof(fc.uuid(), fc.constant(null)),
      namaBarang: fc.string({ minLength: 1, maxLength: 20 }),
      total: fc.integer({ min: 0, max: 1_000_000 }),
    });

    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(arbTransaction, { minLength: 0, maxLength: 20 }),
        (targetSessionId, transactions) => {
          localStorage.clear();
          localStorage.setItem('cleartask_transactions', JSON.stringify(transactions));

          const { result } = renderHook(() => useSession());
          const filtered = result.current.getSessionTransactions(targetSessionId);

          // Every returned transaction must have the matching sessionId
          filtered.forEach((tx) => {
            expect(tx.sessionId).toBe(targetSessionId);
          });

          // Count expected matches
          const expected = transactions.filter((tx) => tx.sessionId === targetSessionId);
          expect(filtered.length).toBe(expected.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 13: integrity validation keeps only the latest active session', () => {
  // 3.13 — Validates: Requirements 10.1
  it('for SessionStore with >1 active sessions, only the one with latest waktuMulai remains active', () => {
    // Arbitrary for a store with at least 2 active sessions
    const arbMultiActiveStore = fc
      .array(arbActiveSession, { minLength: 2, maxLength: 5 })
      .filter((arr) => {
        // Ensure all waktuMulai are distinct so there's a clear "latest"
        const times = arr.map((s) => s.waktuMulai);
        return new Set(times).size === times.length;
      });

    fc.assert(
      fc.property(arbMultiActiveStore, (store) => {
        saveSessions(store);
        const loaded = loadSessions();

        const activeSessions = loaded.filter((s) => s.status === 'aktif');
        expect(activeSessions.length).toBe(1);

        // The remaining active session must be the one with the latest waktuMulai
        const latestTime = Math.max(...store.map((s) => new Date(s.waktuMulai).getTime()));
        const latestSession = store.find(
          (s) => new Date(s.waktuMulai).getTime() === latestTime
        );
        expect(activeSessions[0].id).toBe(latestSession.id);
      }),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 14: invalid Session objects are ignored by loadSessions', () => {
  // 3.14 — Validates: Requirements 10.2
  it('loadSessions() only returns valid objects (with id and status fields)', () => {
    // Arbitrary for an invalid session object (missing id or status)
    const arbInvalidSession = fc.oneof(
      // Missing id
      fc.record({
        nama: fc.string(),
        status: fc.constant('aktif'),
        waktuMulai: arbISODatetime,
      }),
      // Missing status
      fc.record({
        id: arbId,
        nama: fc.string(),
        waktuMulai: arbISODatetime,
      }),
      // Both missing
      fc.record({
        nama: fc.string(),
        waktuMulai: arbISODatetime,
      }),
      // null entry
      fc.constant(null),
      // non-object
      fc.integer()
    );

    fc.assert(
      fc.property(
        fc.array(arbClosedSession, { minLength: 0, maxLength: 5 }),
        fc.array(arbInvalidSession, { minLength: 1, maxLength: 5 }),
        (validSessions, invalidSessions) => {
          // Shuffle valid and invalid together
          const mixed = [...validSessions, ...invalidSessions].sort(() => Math.random() - 0.5);
          localStorage.setItem('cleartask_sessions', JSON.stringify(mixed));

          const loaded = loadSessions();

          // All returned sessions must have both id (string) and status (string)
          loaded.forEach((s) => {
            expect(s).not.toBeNull();
            expect(typeof s.id).toBe('string');
            expect(typeof s.status).toBe('string');
          });

          // The count of valid sessions returned must equal the number of valid input sessions
          expect(loaded.length).toBe(validSessions.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('PBT — Property 15: no two sessions share the same id', () => {
  // 3.15 — Validates: Requirements 10.3
  it('for all numbers of sessions created sequentially, no two sessions have the same id', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), (count) => {
        localStorage.clear();

        const ids = [];
        const { result } = renderHook(() => useSession());

        for (let i = 0; i < count; i++) {
          // Close any active session before opening a new one
          act(() => {
            try {
              result.current.closeSession();
            } catch {
              // No active session — that's fine for the first iteration
            }
          });

          act(() => {
            const session = result.current.openSession(`Session ${i}`);
            ids.push(session.id);
          });
        }

        // All ids must be unique
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }),
      { numRuns: 100 }
    );
  }, 10000);
});
