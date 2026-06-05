/* ═══════════════════════════════════════════════════════════
   Test Setup — ClearTask
   Configures the test environment for Vitest.
   - jest-dom matchers for DOM assertions
   - fake-indexeddb for IndexedDB simulation in jsdom
   - Mock localStorage for backward compatibility
   ═══════════════════════════════════════════════════════════ */

import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

global.IS_REACT_ACT_ENVIRONMENT = true;

import db from './services/db';
import { beforeEach, afterEach, vi } from 'vitest';

// ── Global mock: SettingsContext ────────────────────────────
// SettingsProvider uses useLiveQuery which returns `undefined` until Dexie
// resolves, causing a loading spinner that blocks all component tests.
// This global mock provides a stable settings value for all tests.
// Tests that specifically test SettingsContext behaviour override this mock
// locally with vi.mock() in their own file.
vi.mock('./contexts/SettingsContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSettings: () => ({
      settings: {
        kasirName: 'Admin',
        tokoName: 'Toko Test',
        theme: 'dark',
        accentColor: '#00ffa3',
      },
      updateSettings: vi.fn(),
      saveSettings: vi.fn().mockResolvedValue(undefined),
      openSettingsSnapshot: vi.fn(),
      rollbackSettings: vi.fn().mockResolvedValue(undefined),
    }),
    // SettingsProvider becomes a transparent wrapper in tests
    SettingsProvider: ({ children }) => children,
  };
});

// ── Mock localStorage for remaining UI tests that might still check native ──
const mockLocalStorage = {
  store: {},
  getItem: function (key) {
    return this.store[key] || null;
  },
  setItem: function (key, value) {
    this.store[key] = String(value);
  },
  removeItem: function (key) {
    delete this.store[key];
  },
  clear: function () {
    this.store = {};
  },
};

// Store original and inject mock
if (!window.__nativeLocalStorage) {
  window.__nativeLocalStorage = window.localStorage;
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
  enumerable: true,
  writable: true,
});

// ── Setup / Teardown ────────────────────────────────────────

beforeEach(async () => {
  // Clear all IndexedDB tables for isolation
  await db.transactions.clear();
  await db.sessions.clear();
  await db.inventory.clear();
  await db.categories.clear();
  await db.settings.clear();
  await db.meta.clear();

  // Clear native localStorage
  window.localStorage.clear();
});

afterEach(async () => {
  if (window.__idbPromises && window.__idbPromises.length > 0) {
    await Promise.allSettled(window.__idbPromises);
    window.__idbPromises = [];
  }
  vi.restoreAllMocks();
});
