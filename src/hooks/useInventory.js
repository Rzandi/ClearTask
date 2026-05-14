/* ═══════════════════════════════════════════════════════════
   useInventory — ClearTask
   Hook untuk mengelola data Master Barang (Inventaris) di localStorage
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cleartask_inventory';

function loadInventory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load inventory from localStorage:', error);
    return [];
  }
}

function saveInventory(inventory) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  } catch (error) {
    console.error('Failed to save inventory to localStorage:', error);
    throw new Error('Gagal menyimpan data inventaris ke penyimpanan lokal.');
  }
}

export function useInventory() {
  const [inventory, setInventory] = useState(loadInventory);

  // Sync state if localStorage changes from another tab
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        setInventory(loadInventory());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addInventoryItem = useCallback((itemData) => {
    setInventory((prev) => {
      const newItem = {
        ...itemData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
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
