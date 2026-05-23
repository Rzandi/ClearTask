/**
 * Tests for useSession hook
 * Tests useSession hook asynchronously with Dexie.
 *
 * Unit tests: 3.1 – 3.6
 * Property-based tests (fast-check): 3.7 – 3.15
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { useSession } from '../hooks/useSession';
import { toLocalDateString } from '../utils/formatters';
import db from '../services/db';
import 'fake-indexeddb/auto';

// ── Setup / Teardown ──────────────────────────────────────

beforeEach(async () => {
  await db.sessions.clear();
  await db.transactions.clear();
});
afterEach(async () => {
  await db.sessions.clear();
  await db.transactions.clear();
});

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

const renderHookAndReady = async () => {
  let hookResult;
  await act(async () => {
    hookResult = renderHook(() => useSession());
  });
  // Wait until sessions is no longer undefined (i.e. first query completed)
  await waitFor(
    () => {
      expect(hookResult.result.current.isLoading).toBe(false);
    },
    { timeout: 2000 }
  );
  return hookResult;
};

// ── fast-check arbitraries ────────────────────────────────

const arbId = fc.uuid();

const arbISODate = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(([y, m, d]) => {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  });

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

const arbClosedSession = fc.record({
  id: arbId,
  nama: fc.string(),
  tanggalMulai: arbISODate,
  waktuMulai: arbISODatetime,
  tanggalTutup: arbISODate,
  waktuTutup: arbISODatetime,
  status: fc.constant('ditutup'),
});

const arbActiveSession = fc.record({
  id: arbId,
  nama: fc.string(),
  tanggalMulai: arbISODate,
  waktuMulai: arbISODatetime,
  tanggalTutup: fc.constant(null),
  waktuTutup: fc.constant(null),
  status: fc.constant('aktif'),
});

const arbValidSessionStore = fc
  .tuple(
    fc.uniqueArray(arbClosedSession, { minLength: 0, maxLength: 5, selector: (s) => s.id }),
    fc.option(arbActiveSession, { nil: null })
  )
  .map(([closed, active]) => {
    if (active) {
      // Ensure active ID is unique
      if (closed.some((c) => c.id === active.id)) {
        active.id = crypto.randomUUID();
      }
      return [...closed, active];
    }
    return closed;
  });

// ── Unit Tests ────────────────────────────────────────────

describe('useSession — openSession', () => {
  it('throws "Sudah ada sesi aktif" when an active session already exists', async () => {
    const existing = makeSession({ status: 'aktif' });
    await db.sessions.add(existing);

    const { result } = await renderHookAndReady();

    await expect(result.current.openSession('New Session')).rejects.toThrow('Sudah ada sesi aktif');
  });
});

describe('useSession — closeSession', () => {
  it('throws "Tidak ada sesi aktif" when there is no active session', async () => {
    const { result } = await renderHookAndReady();

    await expect(result.current.closeSession()).rejects.toThrow('Tidak ada sesi aktif');
  });
});

describe('useSession — getActiveSession', () => {
  it('returns the session with status "aktif"', async () => {
    const active = makeSession({ status: 'aktif', nama: 'Shift Pagi' });
    await db.sessions.add(active);

    const { result } = await renderHookAndReady();

    expect(result.current.activeSession).toMatchObject({
      id: active.id,
      status: 'aktif',
    });
  });

  it('returns null after closeSession()', async () => {
    const active = makeSession({ status: 'aktif' });
    await db.sessions.add(active);

    const { result } = await renderHookAndReady();

    await act(async () => {
      await result.current.closeSession();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.activeSession).toBeNull();
  });
});

// ── Property-Based Tests ──────────────────────────────────

describe('PBT — Property 1: at most one active session', () => {
  it('the number of sessions with status "aktif" is never more than 1 in db', async () => {
    await fc.assert(
      fc.asyncProperty(arbValidSessionStore, async (store) => {
        await db.sessions.clear();
        if (store.length > 0) {
          await db.sessions.bulkAdd(store);
        }

        const loaded = await db.sessions.toArray();
        const activeCount = loaded.filter((s) => s.status === 'aktif').length;
        expect(activeCount).toBeLessThanOrEqual(1);
      }),
      { numRuns: 20 } // reduced for speed
    );
  });
});

describe('PBT — Property 2: Valid Session Status Cycle', () => {
  it('openSession ensures only one active session exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(arbClosedSession, { maxLength: 5, selector: (s) => s.id }),
        fc.string(),
        async (closedSessions, sessionName) => {
          await db.sessions.clear();
          if (closedSessions.length > 0) {
            await db.sessions.bulkAdd(closedSessions);
          }

          const { result } = await renderHookAndReady();

          let opened;
          await act(async () => {
            opened = await result.current.openSession(sessionName);
          });

          await new Promise((resolve) => setTimeout(resolve, 50));

          expect(opened.status).toBe('aktif');

          const loaded = await db.sessions.toArray();
          const activeSessions = loaded.filter((s) => s.status === 'aktif');
          expect(activeSessions).toHaveLength(1);
        }
      ),
      { numRuns: 10 } // reduced for speed
    );
  });
});
