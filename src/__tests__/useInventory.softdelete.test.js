/* ═══════════════════════════════════════════════════════════
   useInventory.softdelete.test.js — ClearTask
   Sprint 6 S6.2: Verifikasi fix S1.1 — soft delete di useInventory.
   - deleteInventoryItem harus set deletedAt (bukan hard delete)
   - Query harus exclude item yang sudah di-soft delete
   - TrashManager scenario: item soft-deleted bisa di-restore
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInventory } from '../hooks/useInventory';
import db from '../services/db';
import 'fake-indexeddb/auto';

beforeEach(async () => {
  await db.inventory.clear();
});

// ─── Helper ───────────────────────────────────────────────

async function setupHook() {
  const { result } = renderHook(() => useInventory());
  // Tunggu LiveQuery settle
  await waitFor(() => expect(result.current.inventory).toBeDefined(), { timeout: 3000 });
  return result;
}

function makeItem(overrides = {}) {
  return {
    namaBarang: 'Barang Test',
    kategori: 'Lainnya',
    harga: 5000,
    quantity: 10,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// 1. deleteInventoryItem → soft delete (bukan hard delete)
// ═══════════════════════════════════════════════════════════

describe('deleteInventoryItem — soft delete', () => {
  it('item yang dihapus masih ada di DB dengan deletedAt terisi', async () => {
    const result = await setupHook();

    let savedItem;
    await act(async () => {
      savedItem = await result.current.addInventoryItem(makeItem());
    });
    expect(savedItem.id).toBeDefined();

    await act(async () => {
      await result.current.deleteInventoryItem(savedItem.id);
    });

    // Cek langsung di DB — item harus masih ada tapi punya deletedAt
    const rawItem = await db.inventory.get(savedItem.id);
    expect(rawItem).toBeDefined();
    expect(rawItem.deletedAt).toBeTruthy();
    expect(typeof rawItem.deletedAt).toBe('string');
    // deletedAt harus ISO string yang valid
    expect(() => new Date(rawItem.deletedAt).toISOString()).not.toThrow();
  });

  it('item yang dihapus memiliki updatedAt yang diperbarui', async () => {
    const result = await setupHook();

    let savedItem;
    await act(async () => {
      savedItem = await result.current.addInventoryItem(makeItem());
    });
    const originalUpdatedAt = savedItem.updatedAt;

    // Sedikit delay agar timestamp berbeda
    await new Promise((r) => setTimeout(r, 10));

    await act(async () => {
      await result.current.deleteInventoryItem(savedItem.id);
    });

    const rawItem = await db.inventory.get(savedItem.id);
    // updatedAt harus >= original
    expect(new Date(rawItem.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(originalUpdatedAt).getTime()
    );
  });
});

// ═══════════════════════════════════════════════════════════
// 2. inventory query — exclude soft-deleted items
// ═══════════════════════════════════════════════════════════

describe('useInventory query — filter soft-deleted', () => {
  it('item soft-deleted tidak muncul di inventory list', async () => {
    const result = await setupHook();

    let item1, item2;
    await act(async () => {
      item1 = await result.current.addInventoryItem(makeItem({ namaBarang: 'Item A' }));
      item2 = await result.current.addInventoryItem(makeItem({ namaBarang: 'Item B' }));
    });

    await waitFor(() => expect(result.current.inventory).toHaveLength(2));

    // Hapus item1
    await act(async () => {
      await result.current.deleteInventoryItem(item1.id);
    });

    // Hanya item2 yang tersisa
    await waitFor(() => {
      expect(result.current.inventory).toHaveLength(1);
      expect(result.current.inventory[0].namaBarang).toBe('Item B');
    });
  });

  it('item yang tidak di-delete tetap tampil setelah item lain dihapus', async () => {
    const result = await setupHook();

    const names = ['Alpha', 'Beta', 'Gamma'];
    const saved = [];

    await act(async () => {
      for (const name of names) {
        const item = await result.current.addInventoryItem(makeItem({ namaBarang: name }));
        saved.push(item);
      }
    });

    await waitFor(() => expect(result.current.inventory).toHaveLength(3));

    // Hapus Alpha dan Gamma
    await act(async () => {
      await result.current.deleteInventoryItem(saved[0].id); // Alpha
      await result.current.deleteInventoryItem(saved[2].id); // Gamma
    });

    await waitFor(() => {
      const names = result.current.inventory.map((i) => i.namaBarang);
      expect(names).toEqual(['Beta']);
    });
  });

  it('item yang di-restore (hapus deletedAt) muncul kembali di list', async () => {
    const result = await setupHook();

    let savedItem;
    await act(async () => {
      savedItem = await result.current.addInventoryItem(makeItem({ namaBarang: 'Restore Me' }));
    });

    // Soft delete
    await act(async () => {
      await result.current.deleteInventoryItem(savedItem.id);
    });

    await waitFor(() => expect(result.current.inventory).toHaveLength(0));

    // Restore manual (simulasi TrashManager restore) — hapus deletedAt
    await act(async () => {
      await db.inventory.update(savedItem.id, { deletedAt: undefined });
    });

    await waitFor(() => {
      expect(result.current.inventory).toHaveLength(1);
      expect(result.current.inventory[0].namaBarang).toBe('Restore Me');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 3. addInventoryItem — baru TIDAK punya deletedAt
// ═══════════════════════════════════════════════════════════

describe('addInventoryItem — tidak boleh punya deletedAt', () => {
  it('item baru tidak memiliki field deletedAt', async () => {
    const result = await setupHook();

    let savedItem;
    await act(async () => {
      savedItem = await result.current.addInventoryItem(makeItem());
    });

    expect(savedItem.deletedAt).toBeUndefined();

    // Konfirmasi dari DB juga
    const fromDb = await db.inventory.get(savedItem.id);
    expect(fromDb.deletedAt).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// 4. Multiple soft deletes — idempoten
// ═══════════════════════════════════════════════════════════

describe('deleteInventoryItem — idempoten', () => {
  it('hapus dua kali tidak throw dan item tetap ter-soft-delete', async () => {
    const result = await setupHook();

    let savedItem;
    await act(async () => {
      savedItem = await result.current.addInventoryItem(makeItem());
    });

    // Hapus pertama
    await act(async () => {
      await result.current.deleteInventoryItem(savedItem.id);
    });

    // Hapus kedua — tidak boleh throw
    await expect(
      act(async () => {
        await result.current.deleteInventoryItem(savedItem.id);
      })
    ).resolves.not.toThrow();

    // Masih ter-soft-delete
    const rawItem = await db.inventory.get(savedItem.id);
    expect(rawItem.deletedAt).toBeTruthy();
  });
});
