/* ═══════════════════════════════════════════════════════════
   settings.property.test.js — Property-Based Tests (fast-check)
   Feature: settings-populated
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, renderHook, act } from '@testing-library/react';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock file-saver so tests don't trigger actual downloads
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock formatters
vi.mock('../utils/formatters', () => ({
  formatRupiah: (v) => String(v),
  formatDate: (v) => String(v),
  formatTime: (v) => String(v),
}));

// Shared state for ExcelJS mock
const mockExcelState = {
  rows: [],
  addRowCalls: [],
};

vi.mock('exceljs', () => {
  const makeCell = () => ({
    font: null,
    fill: null,
    alignment: null,
    border: null,
    numFmt: null,
    value: null,
  });

  class MockWorkbook {
    constructor() {
      this.creator = '';
      this.created = null;
      mockExcelState.rows = [];
      mockExcelState.addRowCalls = [];

      this._sheet = {
        addRow(values) {
          const cells = (Array.isArray(values) ? values : []).map(() => makeCell());
          (Array.isArray(values) ? values : []).forEach((v, i) => {
            cells[i].value = v;
          });
          const row = {
            values,
            _cells: cells,
            getCell: (n) => cells[n - 1] || makeCell(),
            eachCell: (fn) => cells.forEach((c, i) => fn(c, i + 1)),
          };
          mockExcelState.rows.push(row);
          mockExcelState.addRowCalls.push(values);
          return row;
        },
        columns: [],
      };

      this.xlsx = {
        writeBuffer: vi.fn(async () => new ArrayBuffer(8)),
      };
    }

    addWorksheet(_name, _opts) {
      return this._sheet;
    }
  }

  return {
    default: { Workbook: MockWorkbook },
  };
});

// ─── Imports ─────────────────────────────────────────────────────────────────

import * as SettingsModule from '../contexts/SettingsContext';
import {
  loadFromStorage,
  applyThemeToDOM,
  defaultSettings,
  SettingsProvider,
  useSettings,
} from '../contexts/SettingsContext';
import { exportToExcel } from '../utils/exportExcel';
import Sidebar from '../components/layout/Sidebar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearLocalStorage() {
  localStorage.clear();
}

function makeMockSettings(overrides = {}) {
  return {
    settings: { ...defaultSettings, ...overrides },
    updateSettings: vi.fn(),
    saveSettings: vi.fn(),
    openSettingsSnapshot: vi.fn(),
    rollbackSettings: vi.fn(),
  };
}

// ─── Property Tests ───────────────────────────────────────────────────────────

describe('Property-Based Tests: settings-populated', () => {
  let useSettingsSpy;

  beforeEach(() => {
    clearLocalStorage();
    vi.clearAllMocks();
    mockExcelState.rows = [];
    mockExcelState.addRowCalls = [];
    // Reset html classes and CSS vars
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.style.removeProperty('--color-primary');
    // Create spy on useSettings (restored to real impl by default)
    useSettingsSpy = vi.spyOn(SettingsModule, 'useSettings');
  });

  afterEach(() => {
    clearLocalStorage();
    useSettingsSpy?.mockRestore();
  });

  // ─── Property 1: Settings Round-Trip ────────────────────────────────────────
  it(
    'Property 1: Settings Round-Trip — saveSettings lalu loadFromStorage menghasilkan objek identik',
    () => {
      /**
       * Validates: Requirements 1.1, 1.3, 4.7, 4.8, 5.5, 5.6, 6.4
       */
      fc.assert(
        fc.property(
          fc.record({
            kasirName: fc.string(),
            tokoName: fc.string(),
            theme: fc.constantFrom('dark', 'light'),
            accentColor: fc.constantFrom('#00ffa3', '#58a6ff', '#bc8cff', '#f0b429'),
          }),
          (settings) => {
            // Save to localStorage (simulating saveSettings)
            localStorage.setItem('cleartask_settings', JSON.stringify(settings));

            // Read back via loadFromStorage
            const loaded = loadFromStorage();

            // Should be identical
            expect(loaded.kasirName).toBe(settings.kasirName);
            expect(loaded.tokoName).toBe(settings.tokoName);
            expect(loaded.theme).toBe(settings.theme);
            expect(loaded.accentColor).toBe(settings.accentColor);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ─── Property 2: Fallback ke Default untuk Input Tidak Valid ─────────────────
  it(
    'Property 2: Fallback ke Default — string tidak valid mengembalikan defaultSettings',
    () => {
      /**
       * Validates: Requirements 1.2, 1.5, 5.7
       */
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('not json'),
            fc.constant('{invalid'),
            fc.constant('null'),
            fc.constant('undefined'),
            fc.constant('')
          ),
          (invalidString) => {
            localStorage.setItem('cleartask_settings', invalidString);
            const loaded = loadFromStorage();

            expect(loaded).toEqual(defaultSettings);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ─── Property 3: Sidebar Selalu Mencerminkan Settings Terkini ────────────────
  it(
    'Property 3: Sidebar Selalu Mencerminkan Settings Terkini',
    () => {
      /**
       * Validates: Requirements 2.3, 2.4, 3.3, 3.4, 7.2
       */
      fc.assert(
        fc.property(
          fc.record({
            kasirName: fc.string(),
            tokoName: fc.string(),
          }),
          ({ kasirName, tokoName }) => {
            // Mock useSettings to return the generated values
            useSettingsSpy.mockReturnValue(makeMockSettings({ kasirName, tokoName }));

            const { container, unmount } = render(
              React.createElement(Sidebar, {
                activeTab: 'input',
                onTabChange: vi.fn(),
                onHelpOpen: vi.fn(),
              })
            );

            // Sidebar should show kasirName or fallback 'Admin'
            const expectedKasir = kasirName || 'Admin';
            const allLeafElements = Array.from(container.querySelectorAll('*')).filter(
              (el) => el.children.length === 0
            );
            const kasirFound = allLeafElements.some(
              (el) => el.textContent === expectedKasir
            );
            expect(kasirFound).toBe(true);

            // Sidebar should show tokoName or fallback 'Pencatatan Penjualan'
            const expectedToko = tokoName || 'Pencatatan Penjualan';
            const tokoFound = allLeafElements.some(
              (el) => el.textContent === expectedToko
            );
            expect(tokoFound).toBe(true);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ─── Property 4: Avatar Inisial Kasir ────────────────────────────────────────
  it(
    'Property 4: Avatar Inisial Kasir — non-kosong menampilkan huruf pertama uppercase, kosong menampilkan "A"',
    () => {
      /**
       * Validates: Requirements 3.5, 7.3
       */
      // Test non-empty kasirName (filter whitespace-only since they render as
      // whitespace characters which are valid per spec but hard to query)
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          (kasirName) => {
            useSettingsSpy.mockReturnValue(makeMockSettings({ kasirName }));

            const { container, unmount } = render(
              React.createElement(Sidebar, {
                activeTab: 'input',
                onTabChange: vi.fn(),
                onHelpOpen: vi.fn(),
              })
            );

            const expectedInitial = kasirName.charAt(0).toUpperCase();
            const allLeafElements = Array.from(container.querySelectorAll('*')).filter(
              (el) => el.children.length === 0
            );
            const avatarFound = allLeafElements.some(
              (el) => el.textContent === expectedInitial
            );
            expect(avatarFound).toBe(true);

            unmount();
          }
        ),
        { numRuns: 100 }
      );

      // Test empty kasirName → avatar shows "A"
      useSettingsSpy.mockReturnValue(makeMockSettings({ kasirName: '' }));

      const { container, unmount } = render(
        React.createElement(Sidebar, {
          activeTab: 'input',
          onTabChange: vi.fn(),
          onHelpOpen: vi.fn(),
        })
      );

      const allLeafElements = Array.from(container.querySelectorAll('*')).filter(
        (el) => el.children.length === 0
      );
      const avatarFound = allLeafElements.some((el) => el.textContent === 'A');
      expect(avatarFound).toBe(true);
      unmount();
    }
  );

  // ─── Property 5: Theme Class Diterapkan ke <html> ────────────────────────────
  it(
    'Property 5: Theme Class Diterapkan ke <html> — dark ada iff theme === "dark"',
    () => {
      /**
       * Validates: Requirements 4.5, 4.6
       */
      fc.assert(
        fc.property(
          fc.constantFrom('dark', 'light'),
          (theme) => {
            applyThemeToDOM(theme, '#00ffa3');

            if (theme === 'dark') {
              expect(document.documentElement.classList.contains('dark')).toBe(true);
            } else {
              expect(document.documentElement.classList.contains('dark')).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ─── Property 6: Accent Color CSS Variable Diperbarui ────────────────────────
  it(
    'Property 6: Accent Color CSS Variable Diperbarui — --color-primary sesuai accentColor',
    () => {
      /**
       * Validates: Requirements 5.3, 5.4
       */
      fc.assert(
        fc.property(
          fc.constantFrom('#00ffa3', '#58a6ff', '#bc8cff', '#f0b429'),
          (accentColor) => {
            applyThemeToDOM('dark', accentColor);

            const actual = document.documentElement.style.getPropertyValue('--color-primary');
            expect(actual).toBe(accentColor);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ─── Property 7: Rollback Saat Batal ─────────────────────────────────────────
  it(
    'Property 7: Rollback Saat Batal — settings kembali ke nilai awal setelah rollback',
    async () => {
      /**
       * Validates: Requirements 6.3
       *
       * Strategy: restore the real useSettings implementation so that renderHook
       * with SettingsProvider wrapper uses the real context state.
       */
      // Restore real implementation for this test
      useSettingsSpy.mockRestore();

      const settingsArbitrary = fc.record({
        kasirName: fc.string(),
        tokoName: fc.string(),
        theme: fc.constantFrom('dark', 'light'),
        accentColor: fc.constantFrom('#00ffa3', '#58a6ff', '#bc8cff', '#f0b429'),
      });

      await fc.assert(
        fc.asyncProperty(
          settingsArbitrary,
          settingsArbitrary,
          async (initialSettings, changedSettings) => {
            // Set initial settings in localStorage
            localStorage.setItem('cleartask_settings', JSON.stringify(initialSettings));

            const wrapper = ({ children }) =>
              React.createElement(SettingsProvider, null, children);

            const { result, unmount } = renderHook(
              () => useSettings(),
              { wrapper }
            );

            // Take snapshot (simulating modal open)
            act(() => {
              result.current.openSettingsSnapshot();
            });

            // Apply changes (simulating user editing)
            act(() => {
              result.current.updateSettings(changedSettings);
            });

            // Rollback (simulating user clicking Batal)
            act(() => {
              result.current.rollbackSettings();
            });

            // Settings should be back to initial values
            expect(result.current.settings.kasirName).toBe(initialSettings.kasirName);
            expect(result.current.settings.tokoName).toBe(initialSettings.tokoName);
            expect(result.current.settings.theme).toBe(initialSettings.theme);
            expect(result.current.settings.accentColor).toBe(initialSettings.accentColor);

            unmount();
            clearLocalStorage();
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ─── Property 8: Export Excel Menyertakan Nama Toko ──────────────────────────
  it(
    'Property 8: Export Excel Menyertakan Nama Toko — tokoName muncul di baris pertama',
    async () => {
      /**
       * Validates: Requirements 2.5, 8.2
       */
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (tokoName) => {
            mockExcelState.rows = [];
            mockExcelState.addRowCalls = [];

            await exportToExcel([], { tokoName, kasirName: '' });

            // First row should contain tokoName
            expect(mockExcelState.addRowCalls.length).toBeGreaterThan(0);
            expect(mockExcelState.addRowCalls[0][0]).toBe(tokoName);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ─── Property 9: Export Excel Menyertakan Nama Kasir ─────────────────────────
  it(
    'Property 9: Export Excel Menyertakan Nama Kasir — "Kasir: [kasirName]" muncul di baris header',
    async () => {
      /**
       * Validates: Requirements 8.3
       */
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (kasirName) => {
            mockExcelState.rows = [];
            mockExcelState.addRowCalls = [];

            await exportToExcel([], { tokoName: '', kasirName });

            // First row (no tokoName) should be "Kasir: [kasirName]"
            expect(mockExcelState.addRowCalls.length).toBeGreaterThan(0);
            expect(mockExcelState.addRowCalls[0][0]).toBe(`Kasir: ${kasirName}`);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
