/* ═══════════════════════════════════════════════════════════
   useInventory — ClearTask
   Hook untuk mengelola data Master Barang (Inventaris) di localStorage
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import * as storageService from '../services/storageService';

function loadInventory() {
  const data = storageService.getItem(STORAGE_KEYS.INVENTORY);
  return Array.isArray(data) ? data : [];
}

function saveInventory(inventory) {
  storageService.setItem(STORAGE_KEYS.INVENTORY, inventory);
}

export function useInventory() {
  const [inventory, setInventory] = useState(loadInventory);

  // Sync state if localStorage changes from another tab
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.key || e.key === STORAGE_KEYS.INVENTORY || e.type === 'local-storage-update') {
        setInventory(loadInventory());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, []);

  const addInventoryItem = useCallback((itemData) => {
    const newItem = {
      ...itemData,
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInventory((prev) => {
      const updated = [newItem, ...prev];
      saveInventory(updated);
      return updated;
    });
  }, []);

  const updateInventoryItem = useCallback((id, updatedFields) => {
    setInventory((prev) => {
      const updated = prev.map((item) =>
        item.id === id
          ? { ...item, ...updatedFields, updatedAt: new Date().toISOString() }
          : item
      );
      saveInventory(updated);
      return updated;
    });
  }, []);

  const deleteInventoryItem = useCallback((id) => {
    setInventory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveInventory(updated);
      return updated;
    });
  }, []);

  return {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
}
