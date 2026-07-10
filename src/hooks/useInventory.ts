/* ═══════════════════════════════════════════════════════════
   useInventory — ClearTask
   Hook untuk mengelola data Master Barang (Inventaris) di Dexie (IndexedDB)
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSettings } from '../contexts/SettingsContext';
import db from '../services/db';

export interface InventoryItem {
  id?: string;
  namaBarang: string;
  kategori: string;
  subKategori?: string;
  harga: number;
  hargaModal?: number;
  satuan?: string;
  quantity: number;
  [key: string]: any;
}

export function useInventory(): {
  inventory: InventoryItem[];
  addInventoryItem: (itemData: any) => Promise<InventoryItem>;
  updateInventoryItem: (id: string, itemData: any) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
} {
  const { settings } = useSettings();
  const currentUser = settings?.kasirName || 'Admin';

  const rawInventory = useLiveQuery(() => db.inventory.toArray());
  const inventory = rawInventory || []; // default ke array kosong saat loading

  const addInventoryItem = useCallback(async (itemData: any) => {
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
  }, [currentUser]);

  const updateInventoryItem = useCallback(async (id: string, itemData: any) => {
    const changes = {
      ...itemData,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    };
    await db.inventory.update(id, changes);
  }, [currentUser]);

  const deleteInventoryItem = useCallback(async (id: string) => {
    await db.inventory.delete(id as any);
  }, []);

  return {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
}
