/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import { addItem, updateItem, deleteItem } from '../services/inventoryService';
import { useSettings } from './SettingsContext';
import type { InventoryItem, InventoryItemInput } from '../types/index';

export interface InventoryContextValue {
  inventory: InventoryItem[];
  addInventoryItem: (
    itemData: InventoryItemInput,
    options?: { skipDuplicate?: boolean }
  ) => Promise<InventoryItem>;
  updateInventoryItem: (id: string, itemData: InventoryItemInput, reason?: string) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
}

export const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const currentUser = settings?.kasirName || 'Admin';

  const rawInventory = useLiveQuery(async () => {
    return (await db.inventory.filter((item) => !item.deletedAt).toArray()) as InventoryItem[];
  });
  const inventory: InventoryItem[] = (rawInventory || []) as InventoryItem[];

  const addInventoryItem = useCallback(
    (itemData: InventoryItemInput, options: { skipDuplicate?: boolean } = {}) =>
      addItem(itemData, currentUser, options) as Promise<InventoryItem>,
    [currentUser]
  );
  const updateInventoryItem = useCallback(
    (id: string, itemData: InventoryItemInput, reason?: string) =>
      updateItem(id, itemData, currentUser, reason),
    [currentUser]
  );
  const deleteInventoryItem = useCallback(
    (id: string) => deleteItem(id, currentUser),
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
  if (!ctx) throw new Error('useInventoryContext must be used within an InventoryProvider');
  return ctx;
}
