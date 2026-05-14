/* ═══════════════════════════════════════════════════════════
   useCategories Hook — ClearTask
   Manages dynamic categories and sub-categories with localStorage persistence
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback } from 'react';

export const STORAGE_KEY = 'cleartask_categories';

export const KATEGORI_DEFAULT = [
  'Elektronik', 'Makanan', 'Minuman', 'Pakaian',
  'Alat Tulis', 'Kesehatan', 'Lainnya',
];

export const SUBKATEGORI_PRESET = {
  Makanan:    ['Makanan Berat', 'Snack', 'Dessert'],
  Minuman:    ['Minuman Panas', 'Minuman Dingin', 'Jus'],
  Elektronik: ['Gadget', 'Aksesoris', 'Komponen'],
};

/**
 * Load category store from localStorage.
 * Falls back to empty default if missing, corrupt, or invalid.
 * @returns {{ categories: string[], subCategories: Record<string, string[]> }}
 */
export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { categories: [], subCategories: {} };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.categories)) {
      return { categories: [], subCategories: {} };
    }
    return {
      categories: parsed.categories,
      subCategories: parsed.subCategories ?? {},
    };
  } catch {
    return { categories: [], subCategories: {} };
  }
}

/**
 * Save category store to localStorage.
 * Logs errors to console without throwing.
 * @param {{ categories: string[], subCategories: Record<string, string[]> }} store
 */
export function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('[useCategories] Failed to save store:', err);
  }
}

/**
 * Hook for managing dynamic categories and sub-categories.
 */
export function useCategories() {
  const [store, setStore] = useState(() => loadStore());

  // ── Derived values ──

  const allCategories = [...KATEGORI_DEFAULT, ...store.categories];

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
      Object.hasOwn(store.subCategories, kategori)
        ? store.subCategories[kategori]
        : [],
    [store.subCategories]
  );

  // ── Mutations ──

  const addCategory = useCallback(
    (name) => {
      const trimmed = (name ?? '').trim();
      if (!trimmed) return { success: false };

      const current = [...KATEGORI_DEFAULT, ...store.categories];
      const isDuplicate = current.some(
        (cat) => cat.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) {
        return { success: false, error: 'Kategori sudah ada' };
      }

      const newStore = {
        ...store,
        categories: [...store.categories, trimmed],
      };
      setStore(newStore);
      saveStore(newStore);
      return { success: true };
    },
    [store]
  );

  const addSubCategory = useCallback(
    (kategori, name) => {
      const trimmed = (name ?? '').trim();
      if (!trimmed) return { success: false };

      const preset = Object.hasOwn(SUBKATEGORI_PRESET, kategori)
        ? SUBKATEGORI_PRESET[kategori]
        : [];
      const custom = Object.hasOwn(store.subCategories, kategori)
        ? store.subCategories[kategori]
        : [];
      const existing = [...preset, ...custom];
      const isDuplicate = existing.some(
        (sub) => sub.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) {
        return { success: false, error: 'Sub-kategori sudah ada' };
      }

      const newStore = {
        ...store,
        subCategories: {
          ...store.subCategories,
          [kategori]: [...custom, trimmed],
        },
      };
      setStore(newStore);
      saveStore(newStore);
      return { success: true };
    },
    [store]
  );

  const deleteCategory = useCallback(
    (name) => {
      const newSubCategories = { ...store.subCategories };
      delete newSubCategories[name];

      const newStore = {
        categories: store.categories.filter((cat) => cat !== name),
        subCategories: newSubCategories,
      };
      setStore(newStore);
      saveStore(newStore);
    },
    [store]
  );

  const deleteSubCategory = useCallback(
    (kategori, name) => {
      const existing = Object.hasOwn(store.subCategories, kategori)
        ? store.subCategories[kategori]
        : [];
      const newStore = {
        ...store,
        subCategories: {
          ...store.subCategories,
          [kategori]: existing.filter((sub) => sub !== name),
        },
      };
      setStore(newStore);
      saveStore(newStore);
    },
    [store]
  );

  return {
    allCategories,
    subCategoriesFor,
    customCategories,
    customSubCategoriesFor,
    addCategory,
    addSubCategory,
    deleteCategory,
    deleteSubCategory,
  };
}
