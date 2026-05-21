/* ═══════════════════════════════════════════════════════════
   useCategories Tests — ClearTask
   Unit tests + Property-based tests for the useCategories hook
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import {
  useCategories,
  KATEGORI_DEFAULT,
  SUBKATEGORI_PRESET,
  loadStore,
  saveStore,
} from '../hooks/useCategories';
import { STORAGE_KEYS } from '../constants/storageKeys';

// ── localStorage mock helpers ──

function clearStorage() {
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
}

function setStorage(value) {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, value);
}

// ══════════════════════════════════════════════════════════════
// UNIT TESTS
// ══════════════════════════════════════════════════════════════

describe('loadStore()', () => {
  beforeEach(clearStorage);

  it('1. returns default when localStorage is empty', () => {
    const result = loadStore();
    expect(result).toEqual({ categories: [], subCategories: {} });
  });

  it('2. returns default when JSON is invalid', () => {
    setStorage('not-valid-json{{{');
    const result = loadStore();
    expect(result).toEqual({ categories: [], subCategories: {} });
  });

  it('2b. returns default when parsed value has no categories array', () => {
    setStorage(JSON.stringify({ foo: 'bar' }));
    const result = loadStore();
    expect(result).toEqual({ categories: [], subCategories: {} });
  });

  it('2c. returns default when categories is not an array', () => {
    setStorage(JSON.stringify({ categories: 'not-array', subCategories: {} }));
    const result = loadStore();
    expect(result).toEqual({ categories: [], subCategories: {} });
  });
});

describe('useCategories hook — unit tests', () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it('3. addCategory("Baru") succeeds and appears in allCategories', () => {
    const { result } = renderHook(() => useCategories());

    let addResult;
    act(() => {
      addResult = result.current.addCategory('Baru');
    });

    expect(addResult).toEqual({ success: true });
    expect(result.current.allCategories).toContain('Baru');
  });

  it('4. addCategory("Elektronik") (duplicate default) returns error', () => {
    const { result } = renderHook(() => useCategories());

    let addResult;
    act(() => {
      addResult = result.current.addCategory('Elektronik');
    });

    expect(addResult).toEqual({ success: false, error: 'Kategori sudah ada' });
  });

  it('5. addCategory("  ") (whitespace only) returns { success: false }', () => {
    const { result } = renderHook(() => useCategories());

    let addResult;
    act(() => {
      addResult = result.current.addCategory('  ');
    });

    expect(addResult.success).toBe(false);
  });

  it('6. deleteCategory("Baru") removes it from allCategories', () => {
    const { result } = renderHook(() => useCategories());

    act(() => {
      result.current.addCategory('Baru');
    });
    expect(result.current.allCategories).toContain('Baru');

    act(() => {
      result.current.deleteCategory('Baru');
    });
    expect(result.current.allCategories).not.toContain('Baru');
  });

  it('7. deleteCategory cascades to sub-categories', () => {
    const { result } = renderHook(() => useCategories());

    act(() => {
      result.current.addCategory('Otomotif');
    });
    act(() => {
      result.current.addSubCategory('Otomotif', 'Spare Part');
    });
    expect(result.current.subCategoriesFor('Otomotif')).toContain('Spare Part');

    act(() => {
      result.current.deleteCategory('Otomotif');
    });

    expect(result.current.allCategories).not.toContain('Otomotif');
    expect(result.current.subCategoriesFor('Otomotif')).not.toContain('Spare Part');
  });

  it('8. addSubCategory("Makanan", "Baru") succeeds', () => {
    const { result } = renderHook(() => useCategories());

    let addResult;
    act(() => {
      addResult = result.current.addSubCategory('Makanan', 'Baru');
    });

    expect(addResult).toEqual({ success: true });
    expect(result.current.subCategoriesFor('Makanan')).toContain('Baru');
  });

  it('9. addSubCategory("Makanan", "Snack") (duplicate preset) returns error', () => {
    const { result } = renderHook(() => useCategories());

    let addResult;
    act(() => {
      addResult = result.current.addSubCategory('Makanan', 'Snack');
    });

    expect(addResult).toEqual({ success: false, error: 'Sub-kategori sudah ada' });
  });

  it('10. deleteSubCategory("Makanan", "Baru") removes it from subCategoriesFor', () => {
    const { result } = renderHook(() => useCategories());

    act(() => {
      result.current.addSubCategory('Makanan', 'Baru');
    });
    expect(result.current.subCategoriesFor('Makanan')).toContain('Baru');

    act(() => {
      result.current.deleteSubCategory('Makanan', 'Baru');
    });
    expect(result.current.subCategoriesFor('Makanan')).not.toContain('Baru');
  });
});

// ══════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS
// ══════════════════════════════════════════════════════════════

// Arbitrary for valid category names (non-empty, non-whitespace-only)
const validName = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

// Arbitrary for whitespace-only strings
const whitespaceOnly = fc.stringMatching(/^[ \t\n\r]+$/);

describe('Property-based tests — useCategories', () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it(
    'Feature: dynamic-categories, Property 1: allCategories always starts with KATEGORI_DEFAULT',
    () => {
      // Validates: Requirements 1.4
      fc.assert(
        fc.property(
          fc.array(validName, { maxLength: 5 }),
          (customCats) => {
            clearStorage();
            // Seed localStorage with custom categories (deduplicated against defaults)
            const uniqueCustom = customCats.filter(
              (c) => !KATEGORI_DEFAULT.some((d) => d.toLowerCase() === c.toLowerCase())
            );
            const deduped = [...new Set(uniqueCustom.map((c) => c.toLowerCase()))].map(
              (lower) => uniqueCustom.find((c) => c.toLowerCase() === lower)
            );
            saveStore({ categories: deduped, subCategories: {} });

            const { result } = renderHook(() => useCategories());
            const all = result.current.allCategories;

            // allCategories must start with KATEGORI_DEFAULT in order
            for (let i = 0; i < KATEGORI_DEFAULT.length; i++) {
              if (all[i] !== KATEGORI_DEFAULT[i]) return false;
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Feature: dynamic-categories, Property 2: invalid data falls back to default',
    () => {
      // Validates: Requirements 1.3
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string().filter((s) => {
              try { JSON.parse(s); return false; } catch { return true; }
            }),
            fc.constant(''),
            fc.constant('null'),
            fc.constant('[]'),
            fc.constant('{"categories":"not-array"}'),
            fc.constant('{"foo":1}'),
          ),
          (invalidData) => {
            clearStorage();
            if (invalidData !== '') {
              setStorage(invalidData);
            }

            const store = loadStore();
            return (
              Array.isArray(store.categories) &&
              store.categories.length === 0 &&
              typeof store.subCategories === 'object'
            );
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Feature: dynamic-categories, Property 3: round-trip storage',
    () => {
      // Validates: Requirements 1.5
      fc.assert(
        fc.property(
          fc.array(validName, { maxLength: 5 }),
          (names) => {
            clearStorage();
            const { result } = renderHook(() => useCategories());

            // Add unique names that don't conflict with defaults
            const toAdd = names
              .filter((n) => !KATEGORI_DEFAULT.some((d) => d.toLowerCase() === n.trim().toLowerCase()))
              .slice(0, 3);

            const added = [];
            for (const name of toAdd) {
              let res;
              act(() => { res = result.current.addCategory(name); });
              if (res?.success) added.push(name.trim());
            }

            // Re-render a fresh hook to read from localStorage
            const { result: result2 } = renderHook(() => useCategories());
            for (const name of added) {
              if (!result2.current.allCategories.includes(name)) return false;
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Feature: dynamic-categories, Property 4: subCategoriesFor combines preset + custom',
    () => {
      // Validates: Requirements 1.6
      fc.assert(
        fc.property(
          fc.constantFrom('Makanan', 'Minuman', 'Elektronik'),
          fc.array(validName, { minLength: 1, maxLength: 3 }),
          (kategori, customSubs) => {
            clearStorage();
            const { result } = renderHook(() => useCategories());

            const preset = SUBKATEGORI_PRESET[kategori] ?? [];
            const toAdd = customSubs.filter(
              (s) => !preset.some((p) => p.toLowerCase() === s.trim().toLowerCase())
            );

            const added = [];
            for (const sub of toAdd) {
              let res;
              act(() => { res = result.current.addSubCategory(kategori, sub); });
              if (res?.success) added.push(sub.trim());
            }

            const subs = result.current.subCategoriesFor(kategori);

            // All preset items must be present
            for (const p of preset) {
              if (!subs.includes(p)) return false;
            }
            // All successfully added custom items must be present
            for (const a of added) {
              if (!subs.includes(a)) return false;
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Feature: dynamic-categories, Property 5: no-duplicate kategori (case-insensitive)',
    () => {
      // Validates: Requirements 2.7
      fc.assert(
        fc.property(
          fc.constantFrom(...KATEGORI_DEFAULT),
          fc.constantFrom(
            (s) => s,
            (s) => s.toUpperCase(),
            (s) => s.toLowerCase(),
            (s) => s[0].toUpperCase() + s.slice(1).toLowerCase(),
          ),
          (existing, transform) => {
            clearStorage();
            const { result } = renderHook(() => useCategories());
            const variant = transform(existing);

            let res;
            act(() => { res = result.current.addCategory(variant); });

            return (
              res.success === false &&
              res.error === 'Kategori sudah ada'
            );
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Feature: dynamic-categories, Property 6: no-duplicate sub-kategori (case-insensitive)',
    () => {
      // Validates: Requirements 4.6
      fc.assert(
        fc.property(
          fc.constantFrom('Makanan', 'Minuman', 'Elektronik'),
          fc.nat({ max: 2 }), // index into preset array
          fc.constantFrom(
            (s) => s,
            (s) => s.toUpperCase(),
            (s) => s.toLowerCase(),
          ),
          (kategori, idx, transform) => {
            clearStorage();
            const preset = SUBKATEGORI_PRESET[kategori] ?? [];
            if (preset.length === 0) return true;
            const existing = preset[idx % preset.length];
            const variant = transform(existing);

            const { result } = renderHook(() => useCategories());
            let res;
            act(() => { res = result.current.addSubCategory(kategori, variant); });

            return (
              res.success === false &&
              res.error === 'Sub-kategori sudah ada'
            );
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Feature: dynamic-categories, Property 7: whitespace-only input always rejected',
    () => {
      // Validates: Requirements 2.8, 4.7
      fc.assert(
        fc.property(
          whitespaceOnly,
          fc.constantFrom('Makanan', 'Elektronik', 'Lainnya'),
          (ws, kategori) => {
            clearStorage();
            const { result } = renderHook(() => useCategories());

            let catResult, subResult;
            act(() => {
              catResult = result.current.addCategory(ws);
              subResult = result.current.addSubCategory(kategori, ws);
            });

            return catResult.success === false && subResult.success === false;
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Feature: dynamic-categories, Property 8: cascade delete removes category and its sub-categories',
    () => {
      // Validates: Requirements 6.4
      fc.assert(
        fc.property(
          validName.filter(
            (n) => !KATEGORI_DEFAULT.some((d) => d.toLowerCase() === n.trim().toLowerCase())
          ),
          fc.array(validName, { minLength: 1, maxLength: 3 }),
          (catName, subNames) => {
            clearStorage();
            const { result } = renderHook(() => useCategories());

            const trimmedCat = catName.trim();
            act(() => { result.current.addCategory(trimmedCat); });

            const addedSubs = [];
            for (const sub of subNames) {
              let res;
              act(() => { res = result.current.addSubCategory(trimmedCat, sub); });
              if (res?.success) addedSubs.push(sub.trim());
            }

            act(() => { result.current.deleteCategory(trimmedCat); });

            const stillInAll = result.current.allCategories.includes(trimmedCat);
            const subsAfter = result.current.subCategoriesFor(trimmedCat);
            const anySubRemains = addedSubs.some((s) => subsAfter.includes(s));

            return !stillInAll && !anySubRemains;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
