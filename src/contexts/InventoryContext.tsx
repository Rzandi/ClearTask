/* eslint-disable react-refresh/only-export-components */
/* ═══════════════════════════════════════════════════════════
   InventoryContext — ClearTask (W3-11)
   Shared single useLiveQuery subscription for inventory table.
   ═══════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import { useSettings } from './SettingsContext';
import type { InventoryItem, InventoryItemInput } from '../types/index';

export interface InventoryContextValue {
  inventory: InventoryItem[];
  addInventoryItem: (
    itemData: InventoryItemInput,
    options?: { skipDuplicate?: boolean }
  ) => Promise<InventoryItem>;
  updateInventoryItem: (id: string, itemData: InventoryItemInput) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
}

export const InventoryContext = createContext<InventoryContextValue | null>(null);

const canonicalize = (s?: string): string => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const currentUser = settings?.kasirName || 'Admin';

  const rawInventory = useLiveQuery(async () => {
    const items = await db.inventory.filter((item) => !item.deletedAt).toArray();
    return items as InventoryItem[];
  });
  const inventory: InventoryItem[] = (rawInventory || []) as InventoryItem[];

  const addInventoryItem = useCallback(
    async (itemData: InventoryItemInput, options: { skipDuplicate?: boolean } = {}) => {
      const itemName = (itemData.namaBarang || itemData.nama || '').trim();
      const nameKey = canonicalize(itemName);

      if (nameKey) {
        const existing = await db.inventory
          .filter(
            (item: InventoryItem) =>
              !item.deletedAt && canonicalize(item.namaBarang || item.nama) === nameKey
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
    async (id: string, itemData: InventoryItemInput) => {
      const itemName = itemData.namaBarang || itemData.nama;
      if (itemName) {
        const nameKey = canonicalize(itemName);
        const existing = await db.inventory
          .filter(
            (item: InventoryItem) =>
              item.id !== id &&
              !item.deletedAt &&
              canonicalize(item.namaBarang || item.nama) === nameKey
          )
          .first();

        if (existing) {
          throw new Error(`Barang "${itemName.trim()}" sudah ada di inventaris.`);
        }
      }

      const changes = {
        ...itemData,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      };

      await db.inventory.update(id, changes);
    },
    [currentUser]
  );

  const deleteInventoryItem = useCallback(
    async (id: string) => {
      // Soft-delete: isi deletedAt dan deletedBy
      await db.inventory.update(id, {
        deletedAt: new Date().toISOString(),
        deletedBy: currentUser,
      });
    },
    [currentUser]
  );

  const value: InventoryContextValue = {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventoryContext(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error('useInventoryContext must be used within an InventoryProvider');
  }
  return ctx;
}
