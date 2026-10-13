/* ═══════════════════════════════════════════════════════════
   useInventory — ClearTask
   Hook untuk mengelola data Master Barang (Inventaris) di Dexie (IndexedDB)
   ═══════════════════════════════════════════════════════════ */

import { useCallback, useContext } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSettings } from '../contexts/SettingsContext';
import { InventoryContext } from '../contexts/InventoryContext';
import db from '../services/db';
import type { InventoryItem } from '../types/index';

export type { InventoryItem }; // re-export so existing imports from this file keep working

export function useInventory(): {
  inventory: InventoryItem[];
  addInventoryItem: (
    itemData: any,
    options?: { skipDuplicate?: boolean }
  ) => Promise<InventoryItem>;
  updateInventoryItem: (id: string, itemData: any, reason?: string) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
} {
  const context = useContext(InventoryContext);
  const { settings } = useSettings();
  const currentUser = settings?.kasirName || 'Admin';

  // Filter soft-deleted items — hanya tampilkan yang deletedAt == null/undefined
  const rawInventory = useLiveQuery(async () => {
    if (context) return [];
    const items = await db.inventory.filter((item) => !item.deletedAt).toArray();
    return items as InventoryItem[];
  }, [Boolean(context)]);

  const inventory: InventoryItem[] = (rawInventory || []) as InventoryItem[];

  const canonicalize = (s?: string): string => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const addInventoryItem = useCallback(
    async (itemData: any, options: { skipDuplicate?: boolean } = {}) => {
      const itemName = (itemData.namaBarang || itemData.nama || '').trim();
      const nameKey = canonicalize(itemName);

      if (nameKey) {
        const existing = await db.inventory
          .filter(
            (item: any) => !item.deletedAt && canonicalize(item.namaBarang || item.nama) === nameKey
          )
          .first();

        if (existing) {
          if (options.skipDuplicate) {
            return existing;
          }
          throw new Error(`Barang "${itemName}" sudah ada di inventaris.`);
        }
      }

      const newItem = {
        ...itemData,
        namaBarang: itemName || itemData.namaBarang || itemData.nama || '',
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
    async (id: string, itemData: any, reason?: string) => {
      const itemName = itemData.namaBarang || itemData.nama;
      if (itemName) {
        const nameKey = canonicalize(itemName);
        const existing = await db.inventory
          .filter(
            (item: any) =>
              item.id !== id &&
              !item.deletedAt &&
              canonicalize(item.namaBarang || item.nama) === nameKey
          )
          .first();

        if (existing) {
          throw new Error(`Barang "${itemName.trim()}" sudah ada di inventaris.`);
        }
      }

      // W4-03: Capture price changes in transaction
      await db.transaction('rw', [db.inventory, db.price_history], async () => {
        const oldItem = await db.inventory.get(id);
        if (!oldItem) {
          return;
        }

        // Check if price changed
        const hargaJualChanged = itemData.harga !== undefined && itemData.harga !== oldItem.harga;
        const hargaModalChanged =
          itemData.hargaModal !== undefined && itemData.hargaModal !== oldItem.hargaModal;

        if (hargaJualChanged || hargaModalChanged) {
          // Capture old prices BEFORE update
          const historyEntry = {
            id:
              typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : 'ph-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                    const r = (Math.random() * 16) | 0;
                    const v = c === 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                  }),
            inventoryId: id,
            changedAt: new Date().toISOString(),
            oldHargaJual: oldItem.harga ?? null,
            oldHargaModal: oldItem.hargaModal ?? null,
            newHargaJual: itemData.harga ?? oldItem.harga ?? null,
            newHargaModal: itemData.hargaModal ?? oldItem.hargaModal ?? null,
            changedBy: currentUser,
            reason: reason || undefined,
            changeType: 'manual' as const,
          };

          await db.price_history.add(historyEntry);
        }

        // Update inventory item
        const changes = {
          ...itemData,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser,
        };
        await db.inventory.update(id, changes);
      });
    },
    [currentUser]
  );

  const deleteInventoryItem = useCallback(
    async (id: string) => {
      // Soft delete — set deletedAt timestamp instead of hard delete
      // This allows TrashManager to restore the item later
      await db.inventory.update(id as any, {
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      });
    },
    [currentUser]
  );

  if (context) {
    return context;
  }

  return {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
}
