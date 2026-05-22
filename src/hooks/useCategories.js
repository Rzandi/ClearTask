/* ═══════════════════════════════════════════════════════════
   useCategories Hook — ClearTask
   Manages dynamic categories and sub-categories with Dexie
   ═══════════════════════════════════════════════════════════ */

import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';

export const KATEGORI_DEFAULT = [
  'Elektronik',
  'Makanan',
  'Minuman',
  'Pakaian',
  'Alat Tulis',
  'Kesehatan',
  'Lainnya',
];

export const SUBKATEGORI_PRESET = {
  Makanan: ['Makanan Berat', 'Snack', 'Dessert'],
  Minuman: ['Minuman Panas', 'Minuman Dingin', 'Jus'],
  Elektronik: ['Gadget', 'Aksesoris', 'Komponen'],
};

/**
 * Hook for managing dynamic categories and sub-categories.
 */
export function useCategories() {
  // useLiveQuery will return undefined while loading
  const rawStore = useLiveQuery(() => db.categories.get({ key: 'main' }));

  const store =
    rawStore === undefined
      ? { categories: [], subCategories: {} } // fallback while loading
      : {
          categories: rawStore?.categories || [],
          subCategories: rawStore?.subCategories || {},
        };

  // ── Derived values ──

  const allCategories = useMemo(() => {
    return [...KATEGORI_DEFAULT, ...store.categories];
  }, [store.categories]);

  const subCategoriesFor = useCallback(
    (kategori) => {
      const preset = Object.hasOwn(SUBKATEGORI_PRESET, kategori)
        ? SUBKATEGORI_PRESET[kategori]
        : [];
      const custom = Object.hasOwn(store.subCategories, kategori)
        ? store.subCategories[kategori]
        : [];
      return [...preset, ...custom];
    },
    [store.subCategories]
  );

  const customCategories = store.categories;

  const customSubCategoriesFor = useCallback(
    (kategori) =>
      Object.hasOwn(store.subCategories, kategori) ? store.subCategories[kategori] : [],
    [store.subCategories]
  );

  // ── Mutations ──
  // All mutations read fresh state from DB before writing to prevent
  // stale-closure lost-update bugs on concurrent calls (bug #9 fix).

  const addCategory = useCallback(async (name) => {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return { success: false, error: 'Nama kategori tidak boleh kosong.' };

    // Read fresh state from DB to avoid stale closure
    const current = await db.categories.get({ key: 'main' });
    const currentCategories = current?.categories || [];

    const exists = [...KATEGORI_DEFAULT, ...currentCategories].some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return { success: false, error: 'Kategori sudah ada.' };

    await db.categories.put({
      key: 'main',
      ...(current || {}),
      id: current?.id || 1,
      categories: [...currentCategories, trimmed],
      subCategories: current?.subCategories || {},
    });
    return { success: true };
  }, []);

  const deleteCategory = useCallback(async (name) => {
    if (KATEGORI_DEFAULT.includes(name)) {
      return { success: false, error: 'Kategori bawaan tidak dapat dihapus.' };
    }

    const current = await db.categories.get({ key: 'main' });
    const currentCategories = current?.categories || [];

    if (!currentCategories.includes(name)) {
      return { success: false, error: 'Kategori tidak ditemukan.' };
    }

    const newSubCategories = { ...(current?.subCategories || {}) };
    if (Object.hasOwn(newSubCategories, name)) {
      delete newSubCategories[name];
    }

    await db.categories.put({
      key: 'main',
      ...(current || {}),
      id: current?.id || 1,
      categories: currentCategories.filter((c) => c !== name),
      subCategories: newSubCategories,
    });
    return { success: true };
  }, []);

  const addSubCategory = useCallback(async (kategori, subName) => {
    if (!kategori) return { success: false, error: 'Pilih kategori utama.' };

    const trimmedSub = (subName ?? '').trim();
    if (!trimmedSub) return { success: false, error: 'Nama sub-kategori tidak boleh kosong.' };

    const current = await db.categories.get({ key: 'main' });
    const currentSubCategories = current?.subCategories || {};

    // Combine preset + custom for duplicate check
    const presetSubs = Object.hasOwn(SUBKATEGORI_PRESET, kategori)
      ? SUBKATEGORI_PRESET[kategori]
      : [];
    const customSubs = currentSubCategories[kategori] || [];
    const allSubs = [...presetSubs, ...customSubs];

    if (allSubs.some((s) => s.toLowerCase() === trimmedSub.toLowerCase())) {
      return { success: false, error: 'Sub-kategori sudah ada di kategori ini.' };
    }

    await db.categories.put({
      key: 'main',
      ...(current || {}),
      id: current?.id || 1,
      categories: current?.categories || [],
      subCategories: {
        ...currentSubCategories,
        [kategori]: [...customSubs, trimmedSub],
      },
    });
    return { success: true };
  }, []);

  const deleteSubCategory = useCallback(async (kategori, subName) => {
    const isPreset =
      Object.hasOwn(SUBKATEGORI_PRESET, kategori) && SUBKATEGORI_PRESET[kategori].includes(subName);
    if (isPreset) {
      return { success: false, error: 'Sub-kategori bawaan tidak dapat dihapus.' };
    }

    const current = await db.categories.get({ key: 'main' });
    const currentSubCategories = current?.subCategories || {};
    const currentCustomSubs = currentSubCategories[kategori] || [];

    if (!currentCustomSubs.includes(subName)) {
      return { success: false, error: 'Sub-kategori tidak ditemukan.' };
    }

    const updatedSubs = currentCustomSubs.filter((s) => s !== subName);
    const newSubCategories = { ...currentSubCategories };
    if (updatedSubs.length === 0) {
      delete newSubCategories[kategori];
    } else {
      newSubCategories[kategori] = updatedSubs;
    }

    await db.categories.put({
      key: 'main',
      ...(current || {}),
      id: current?.id || 1,
      categories: current?.categories || [],
      subCategories: newSubCategories,
    });
    return { success: true };
  }, []);

  return {
    allCategories,
    subCategoriesFor,
    customCategories,
    customSubCategoriesFor,
    addCategory,
    deleteCategory,
    addSubCategory,
    deleteSubCategory,
  };
}
