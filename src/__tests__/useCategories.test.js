/* ═══════════════════════════════════════════════════════════
   useCategories Tests — ClearTask
   Unit tests + Property-based tests for the useCategories hook
   (Refactored for Async Dexie)
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCategories, KATEGORI_DEFAULT } from '../hooks/useCategories';
import db from '../services/db';
import 'fake-indexeddb/auto';

describe('useCategories hook (Async Dexie)', () => {
  beforeEach(async () => {
    await db.categories.clear();
  });

  // Since Dexie is async and useLiveQuery takes a moment, we wait for truthy data
  const renderHookAndReady = async () => {
    let hookResult;
    await act(async () => {
      hookResult = renderHook(() => useCategories());
    });
    // Give dexie time to resolve the initial query
    await new Promise((resolve) => setTimeout(resolve, 50));
    return hookResult;
  };

  it('1. returns default categories initially', async () => {
    const { result } = await renderHookAndReady();
    expect(result.current.allCategories).toEqual(KATEGORI_DEFAULT);
    expect(result.current.customCategories).toEqual([]);
  });

  it('2. adds a new category successfully', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      const res = await result.current.addCategory('Olahraga');
      expect(res.success).toBe(true);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.allCategories).toContain('Olahraga');
    expect(result.current.customCategories).toContain('Olahraga');
  });

  it('3. rejects duplicate category', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      const res1 = await result.current.addCategory('Elektronik'); // Bawaan
      expect(res1.success).toBe(false);

      await result.current.addCategory('Olahraga');
    });

    await new Promise((resolve) => setTimeout(resolve, 50)); // let dexie update

    await act(async () => {
      const res2 = await result.current.addCategory('olahraga'); // Custom duplicate
      expect(res2.success).toBe(false);
    });
  });

  it('4. deletes a custom category', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      await result.current.addCategory('Olahraga');
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await act(async () => {
      const res = await result.current.deleteCategory('Olahraga');
      expect(res.success).toBe(true);
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.allCategories).not.toContain('Olahraga');
  });

  it('5. rejects deleting a preset category', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      const res = await result.current.deleteCategory('Elektronik');
      expect(res.success).toBe(false);
    });
  });

  it('6. adds a new subcategory', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      const res = await result.current.addSubCategory('Elektronik', 'Kabel');
      expect(res.success).toBe(true);
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.subCategoriesFor('Elektronik')).toContain('Kabel');
  });

  it('7. deletes a custom subcategory', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      await result.current.addSubCategory('Elektronik', 'Kabel');
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await act(async () => {
      const res = await result.current.deleteSubCategory('Elektronik', 'Kabel');
      expect(res.success).toBe(true);
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.subCategoriesFor('Elektronik')).not.toContain('Kabel');
  });

  it('8. rejects deleting a preset subcategory', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      const res = await result.current.deleteSubCategory('Elektronik', 'Gadget');
      expect(res.success).toBe(false);
    });
  });
});
