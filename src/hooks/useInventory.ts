/* FIX BUG-13: hook tetap bisa dipakai tanpa provider; logic dari inventoryService */
import { useCallback, useContext } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSettings } from '../contexts/SettingsContext';
import { InventoryContext } from '../contexts/InventoryContext';
import db from '../services/db';
import { addItem, updateItem, deleteItem } from '../services/inventoryService';
import type { InventoryItem } from '../types/index';

export type { InventoryItem };

export function useInventory() {
  const context = useContext(InventoryContext);
  const { settings } = useSettings();
  const currentUser = settings?.kasirName || 'Admin';

  const rawInventory = useLiveQuery(async () => {
    if (context) return [];
    return (await db.inventory.filter((item) => !item.deletedAt).toArray()) as InventoryItem[];
  }, [Boolean(context)]);

  const addInventoryItem = useCallback(
    (itemData: any, options: { skipDuplicate?: boolean } = {}) =>
      addItem(itemData, currentUser, options),
    [currentUser]
  );
  const updateInventoryItem = useCallback(
    (id: string, itemData: any, reason?: string) => updateItem(id, itemData, currentUser, reason),
    [currentUser]
  );
  const deleteInventoryItem = useCallback(
    (id: string) => deleteItem(id, currentUser),
    [currentUser]
  );

  if (context) return context;
  return {
    inventory: (rawInventory || []) as InventoryItem[],
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
}
