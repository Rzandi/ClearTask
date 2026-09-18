/* ═══════════════════════════════════════════════════════════
   useInventory — ClearTask
   Hook untuk mengelola data Master Barang (Inventaris) di Dexie (IndexedDB)
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSettings } from '../contexts/SettingsContext';
import db from '../services/db';
import type { InventoryItem } from '../types/index';

export type { InventoryItem }; // re-export so existing imports from this file keep working

export function useInventory(): {
  inventory: InventoryItem[];
  addInventoryItem: (itemData: any) => Promise<InventoryItem>;
  updateInventoryItem: (id: string, itemData: any) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
} {
  const { settings } = useSettings();
  const currentUser = settings?.kasirName || 'Admin';

  // Filter soft-deleted items — hanya tampilkan yang deletedAt == null/undefined
  const rawInventory = useLiveQuery(async () => {
    const items = await db.inventory.filter((item) => !item.deletedAt).toArray();
    return items as InventoryItem[];
  });
  const inventory: InventoryItem[] = (rawInventory || []) as InventoryItem[];

  const addInventoryItem = useCallback(
    async (itemData: any) => {
      const newItem = {
        ...itemData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      };

      if (!newItem.id) {
        newItem.id =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              });
      }

      await db.inventory.add(newItem);
      return newItem;
    },
    [currentUser]
  );

  const updateInventoryItem = useCallback(
    async (id: string, itemData: any) => {
      const changes = {
        ...itemData,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      };
      await db.inventory.update(id, changes);
    },
    [currentUser]
  );

  const deleteInventoryItem = useCallback(async (id: string) => {
    // Soft delete — set deletedAt timestamp instead of hard delete
    // This allows TrashManager to restore the item later
    await db.inventory.update(id as any, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    });
  }, [currentUser]);

  return {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
}
