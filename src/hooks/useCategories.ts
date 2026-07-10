/* ═══════════════════════════════════════════════════════════
   useCategories Hook — ClearTask
   Manages dynamic categories and sub-categories with Dexie
   ═══════════════════════════════════════════════════════════ */

import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';

export const KATEGORI_DEFAULT: string[] = [
  'Makanan',
  'Minuman',
  'Pakaian',
  'Bahan Baku',
  'Kesehatan',
  'Lainnya',
];

export const SUBKATEGORI_PRESET: Record<string, string[]> = {
  Makanan: ['Makanan Berat', 'Snack', 'Dessert'],
  Minuman: ['Minuman Panas', 'Minuman Dingin', 'Jus'],
  'Bahan Baku': ['Bahan Baku Utama', 'Bumbu', 'Bahan Pelengkap'],
  'Pakaian': ['Pakaian Atas', 'Pakaian Bawah', 'Aksesoris'],
  'Kesehatan': ['Obat-obatan', 'Peralatan Kesehatan', 'Produk Kesehatan'],
};

/**
 * Hook for managing dynamic categories and sub-categories.
 */
export interface CategoryStore {
  id?: number;
  key?: string;
  categories: string[];
  subCategories: Record<string, string[]>;
}

export function useCategories(): {
  allCategories: string[];
  subCategoriesFor: (kategori: string) => string[];
  customCategories: string[];
  customSubCategoriesFor: (kategori: string) => string[];
  addCategory: (name: string) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (name: string) => Promise<{ success: boolean; error?: string }>;
  addSubCategory: (kategori: string, subName: string) => Promise<{ success: boolean; error?: string }>;
  deleteSubCategory: (kategori: string, subName: string) => Promise<{ success: boolean; error?: string }>;
} {
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
    (kategori: string) => {
      const preset = Object.hasOwn(SUBKATEGORI_PRESET, kategori)
        ? SUBKATEGORI_PRESET[kategori]
        : [];
      const custom = Object.hasOwn(store.subCategories, kategori)
        ? store.subCategories[kategori]
        : [];
      return [...(preset || []), ...(custom || [])];
    },
    [store.subCategories]
  );

  const customCategories = store.categories;

  const customSubCategoriesFor = useCallback(
    (kategori: string) =>
      Object.hasOwn(store.subCategories, kategori) ? store.subCategories[kategori] : [],
    [store.subCategories]
  );

  // ── Mutations ──
  // All mutations read fresh state from DB before writing to prevent
  // stale-closure lost-update bugs on concurrent calls (bug #9 fix).

  const addCategory = useCallback(async (name: string) => {
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

  const deleteCategory = useCallback(async (name: string) => {
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
      categories: currentCategories.filter((c: string) => c !== name),
      subCategories: newSubCategories,
    });
    return { success: true };
  }, []);

  const addSubCategory = useCallback(async (kategori: string, subName: string) => {
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
    const allSubs = [...(presetSubs || []), ...(customSubs || [])];

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

  const deleteSubCategory = useCallback(async (kategori: string, subName: string) => {
    const isPreset =
      Object.hasOwn(SUBKATEGORI_PRESET, kategori) && SUBKATEGORI_PRESET[kategori]?.includes(subName);
    if (isPreset) {
      return { success: false, error: 'Sub-kategori bawaan tidak dapat dihapus.' };
    }

    const current = await db.categories.get({ key: 'main' });
    const currentSubCategories = current?.subCategories || {};
    const currentCustomSubs = currentSubCategories[kategori] || [];

    if (!currentCustomSubs.includes(subName)) {
      return { success: false, error: 'Sub-kategori tidak ditemukan.' };
    }

    const updatedSubs = currentCustomSubs.filter((s: string) => s !== subName);
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
