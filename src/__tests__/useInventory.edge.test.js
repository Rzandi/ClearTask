/* ═══════════════════════════════════════════════════════════
   useInventory.edge.test.js — ClearTask
   Phase 6: Edge-Case Tests untuk useInventory hook.
   Pilar A: Unicode/Emoji names, extreme values
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { useInventory } from '../hooks/useInventory';
import db from '../services/db';
import 'fake-indexeddb/auto';

beforeEach(async () => {
  await db.inventory.clear();
});

const renderHookAndReady = async () => {
  let hookResult;
  await act(async () => {
    hookResult = renderHook(() => useInventory());
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  return hookResult;
};

// ── Unicode & Emoji ───────────────────────────────────────

describe('useInventory — Unicode & Emoji Edge Cases', () => {
  it('menyimpan nama barang dengan emoji panjang tanpa error', async () => {
    const { result } = await renderHookAndReady();

    const emojiName = '🍔🍟🌮🌯🥙🧆🥚🍳🥘🍲🥣🥗🍿🧂🥫🍱🍘🍙🍚🍛';
    let savedItem;
    await act(async () => {
      savedItem = await result.current.addInventoryItem({
        nama: emojiName,
        harga: 5000,
        kategori: 'Makanan',
      });
    });

    expect(savedItem.nama).toBe(emojiName);

    await waitFor(() => {
      expect(result.current.inventory.some((i) => i.nama === emojiName)).toBe(true);
    });
  });

  it('menyimpan nama dengan karakter Zalgo/Unicode ekstrem', async () => {
    const { result } = await renderHookAndReady();

    const zalgoName = 'Z̷a̷l̷g̷o̷ ̷T̷e̷x̷t̷';
    await act(async () => {
      await result.current.addInventoryItem({ nama: zalgoName, harga: 1000, kategori: 'Lainnya' });
    });

    await waitFor(() => {
      expect(result.current.inventory.some((i) => i.nama === zalgoName)).toBe(true);
    });
  });

  it('menyimpan nama dengan karakter Arab/RTL', async () => {
    const { result } = await renderHookAndReady();

    const arabicName = 'قهوة سوداء';
    await act(async () => {
      await result.current.addInventoryItem({
        nama: arabicName,
        harga: 15000,
        kategori: 'Minuman',
      });
    });

    await waitFor(() => {
      expect(result.current.inventory.some((i) => i.nama === arabicName)).toBe(true);
    });
  });
});

// ── Extreme Numeric Values ────────────────────────────────

describe('useInventory — Extreme Numeric Values', () => {
  it('menyimpan harga Rp0 tanpa error', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      await result.current.addInventoryItem({ nama: 'Gratis', harga: 0, kategori: 'Lainnya' });
    });

    await waitFor(() => {
      expect(result.current.inventory.some((i) => i.harga === 0)).toBe(true);
    });
  });

  it('menyimpan harga sangat besar (Rp999.999.999) tanpa error', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      await result.current.addInventoryItem({
        nama: 'Barang Mewah',
        harga: 999_999_999,
        kategori: 'Elektronik',
      });
    });

    await waitFor(() => {
      expect(result.current.inventory.some((i) => i.harga === 999_999_999)).toBe(true);
    });
  });
});

// ── CRUD Idempotency ──────────────────────────────────────

describe('useInventory — CRUD Idempotency', () => {
  it('delete item yang tidak ada tidak throw error', async () => {
    const { result } = await renderHookAndReady();

    await expect(
      act(async () => {
        await result.current.deleteInventoryItem('non-existent-id-xyz');
      })
    ).resolves.not.toThrow();
  });

  it('update item yang tidak ada tidak throw error', async () => {
    const { result } = await renderHookAndReady();

    await expect(
      act(async () => {
        await result.current.updateInventoryItem('non-existent-id-xyz', { nama: 'Updated' });
      })
    ).resolves.not.toThrow();
  });
});

// ── PBT: Bulk Add ─────────────────────────────────────────

describe('PBT: useInventory bulk add tidak crash', () => {
  it('menambah banyak item dengan nama acak tidak crash', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            nama: fc.string({ minLength: 1, maxLength: 50 }),
            harga: fc.integer({ min: 0, max: 10_000_000 }),
            kategori: fc.constantFrom('Makanan', 'Minuman', 'Elektronik', 'Lainnya'),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (items) => {
          await db.inventory.clear();
          const { result } = await renderHookAndReady();

          await act(async () => {
            for (const item of items) {
              await result.current.addInventoryItem(item);
            }
          });

          await waitFor(() => {
            expect(result.current.inventory.length).toBe(items.length);
          });
        }
      ),
      { numRuns: 5 } // Reduced karena setiap run ada renderHook
    );
  });
});
