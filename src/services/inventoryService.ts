/* FIX BUG-13: satu-satunya implementasi logic inventory (dipakai context & hook) */
import db from './db';
import { transactionService } from './transactionService';

const canonicalize = (s?: string): string => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

export async function addItem(
  itemData: any,
  currentUser: string,
  options: { skipDuplicate?: boolean } = {}
) {
  const itemName = (itemData.namaBarang || itemData.nama || '').trim();
  const nameKey = canonicalize(itemName);
  const nowIso = new Date().toISOString();
  const newItem: any = {
    ...itemData,
    namaBarang: itemName || itemData.namaBarang || itemData.nama || '',
    createdAt: nowIso,
    updatedAt: nowIso,
    updatedBy: currentUser,
  };
  if (!newItem.id) newItem.id = newId();

  // FIX BUG-03 & BUG-14: Cek duplikat dan add stok awal dalam transaksi atomic Dexie
  return await db.transaction('rw', [db.inventory, db.stock_movements], async () => {
    if (nameKey) {
      const existing = await db.inventory
        .filter(
          (item: any) => !item.deletedAt && canonicalize(item.namaBarang || item.nama) === nameKey
        )
        .first();
      if (existing) {
        if (options.skipDuplicate) return existing;
        throw new Error(`Barang "${itemName}" sudah ada di inventaris.`);
      }
    }

    await db.inventory.add(newItem);
    const qty = Number(newItem.quantity) || 0;
    if (qty !== 0) {
      await db.stock_movements.add({
        id: newId(),
        inventoryId: newItem.id,
        delta: qty,
        reason: 'opening',
        refType: 'manual',
        refId: 'item-baru',
        at: nowIso,
        by: currentUser,
        note: 'Saldo awal barang baru',
      } as any);
    }
    return newItem;
  });
}

export async function updateItem(id: string, itemData: any, currentUser: string, reason?: string) {
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
    if (existing) throw new Error(`Barang "${itemName.trim()}" sudah ada di inventaris.`);
  }

  const { quantity, ...rest } = itemData;
  const nowIso = new Date().toISOString();

  // FIX BUG-01: price_history dicatat di sini (jalur tunggal)
  await db.transaction('rw', [db.inventory, db.price_history], async () => {
    const oldItem: any = await db.inventory.get(id);
    if (!oldItem) return;
    const hargaJualChanged = rest.harga !== undefined && rest.harga !== oldItem.harga;
    const hargaModalChanged =
      rest.hargaModal !== undefined && rest.hargaModal !== oldItem.hargaModal;
    if (hargaJualChanged || hargaModalChanged) {
      await db.price_history.add({
        id: newId(),
        inventoryId: id,
        changedAt: nowIso,
        oldHargaJual: oldItem.harga ?? null,
        oldHargaModal: oldItem.hargaModal ?? null,
        newHargaJual: rest.harga ?? oldItem.harga ?? null,
        newHargaModal: rest.hargaModal ?? oldItem.hargaModal ?? null,
        changedBy: currentUser,
        reason: reason || undefined,
        changeType: 'manual' as const,
      } as any);
    }
    await db.inventory.update(id, { ...rest, updatedAt: nowIso, updatedBy: currentUser });
  });

  // FIX BUG-02: perubahan quantity selalu lewat ledger
  if (quantity !== undefined && quantity !== null) {
    await transactionService.adjustStock(
      id,
      Number(quantity),
      reason || 'Edit manual',
      currentUser
    );
  }
}

export async function deleteItem(id: string, currentUser: string) {
  await db.inventory.update(id, {
    deletedAt: new Date().toISOString(),
    deletedBy: currentUser,
  } as any);
}
