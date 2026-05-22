/* ═══════════════════════════════════════════════════════════
   useInventory — ClearTask
   Hook untuk mengelola data Master Barang (Inventaris) di Dexie (IndexedDB)
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';

export function useInventory() {
  const rawInventory = useLiveQuery(() => db.inventory.toArray());
  const inventory = rawInventory || []; // default ke array kosong saat loading

  const addInventoryItem = useCallback(async (itemData) => {
    const newItem = {
      ...itemData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Schema uses '&id' (unique, manually provided — NOT auto-increment).
    // We generate a UUID here and pass it explicitly as the primary key.
    newItem.id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

    await db.inventory.add(newItem);
    return newItem;
  }, []);

  const updateInventoryItem = useCallback(async (id, itemData) => {
    const changes = {
      ...itemData,
      updatedAt: new Date().toISOString(),
    };
    await db.inventory.update(id, changes);
  }, []);

  const deleteInventoryItem = useCallback(async (id) => {
    await db.inventory.delete(id);
  }, []);

  return {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
}
