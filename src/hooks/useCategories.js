/* ═══════════════════════════════════════════════════════════
   useCategories Hook — ClearTask
   Manages dynamic categories and sub-categories with localStorage persistence
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import * as storageService from '../services/storageService';


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
    const parsed = storageService.getItem(STORAGE_KEYS.CATEGORIES);
    if (!parsed || !Array.isArray(parsed?.categories)) {
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
  storageService.setItem(STORAGE_KEYS.CATEGORIES, store);
}

/**
 * Hook for managing dynamic categories and sub-categories.
 */
export function useCategories() {
  const [store, setStore] = useState(() => loadStore());

  useEffect(() => {
    const refresh = () => setStore(loadStore());
    window.addEventListener('storage', refresh);
    window.addEventListener('local-storage-update', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('local-storage-update', refresh);
    };
  }, []);

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

      const currentStore = loadStore();
      const current = [...KATEGORI_DEFAULT, ...currentStore.categories];
      const isDuplicate = current.some(
        (cat) => cat.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) {
        return { success: false, error: 'Kategori sudah ada' };
      }

      const newStore = {
        ...currentStore,
        categories: [...currentStore.categories, trimmed],
      };
      setStore(newStore);
      saveStore(newStore);
      return { success: true };
    },
    []
  );

  const addSubCategory = useCallback(
    (kategori, name) => {
      const trimmed = (name ?? '').trim();
      if (!trimmed) return { success: false };

      const currentStore = loadStore();
      const preset = Object.hasOwn(SUBKATEGORI_PRESET, kategori)
        ? SUBKATEGORI_PRESET[kategori]
        : [];
      const custom = Object.hasOwn(currentStore.subCategories, kategori)
        ? currentStore.subCategories[kategori]
        : [];
      const existing = [...preset, ...custom];
      const isDuplicate = existing.some(
        (sub) => sub.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) {
        return { success: false, error: 'Sub-kategori sudah ada' };
      }

      const newStore = {
        ...currentStore,
        subCategories: {
          ...currentStore.subCategories,
          [kategori]: [...custom, trimmed],
        },
      };
      setStore(newStore);
      saveStore(newStore);
      return { success: true };
    },
    []
  );

  const deleteCategory = useCallback(
    (name) => {
      setStore((prev) => {
        const newSubCategories = { ...prev.subCategories };
        delete newSubCategories[name];

        const newStore = {
          categories: prev.categories.filter((cat) => cat !== name),
          subCategories: newSubCategories,
        };
        saveStore(newStore);
        return newStore;
      });
    },
    []
  );

  const deleteSubCategory = useCallback(
    (kategori, name) => {
      setStore((prev) => {
        const existing = Object.hasOwn(prev.subCategories, kategori)
          ? prev.subCategories[kategori]
          : [];
        const newStore = {
          ...prev,
          subCategories: {
            ...prev.subCategories,
            [kategori]: existing.filter((sub) => sub !== name),
          },
        };
        saveStore(newStore);
        return newStore;
      });
    },
    []
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
