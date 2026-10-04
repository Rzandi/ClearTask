import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactionData } from '../hooks/useTransactionData';
import db from '../services/db';
import 'fake-indexeddb/auto';

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { kasirName: 'KasirTest' } }),
}));

describe('useTransactionData Hook & Database Triggers', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.inventory.clear();
    await db.meta.clear();
  });

  afterEach(async () => {
    await db.transactions.clear();
    await db.inventory.clear();
    await db.meta.clear();
  });

  const renderHookHelper = () => {
    return renderHook(() => useTransactionData(null, '', 'newest'));
  };

  it('1. Throws error if orderData items is empty', async () => {
    const { result } = renderHookHelper();
    await expect(result.current.addTransaction({ items: [], total: 0 })).rejects.toThrow(
      'Keranjang belanja kosong'
    );
  });

  it('2. Throws error if total is negative', async () => {
    const { result } = renderHookHelper();
    await expect(
      result.current.addTransaction({ items: [{ namaBarang: 'A' }], total: -100 })
    ).rejects.toThrow('Total transaksi tidak valid');
  });

  it('3. Deducts stock of existing inventory item', async () => {
    // Seed inventory item
    await db.inventory.add({
      id: 'item-1',
      namaBarang: 'Kopi Susu',
      kategori: 'Minuman',
      harga: 15000,
      hargaModal: 8000,
      quantity: 10,
    });

    const { result } = renderHookHelper();

    let tx;
    await act(async () => {
      tx = await result.current.addTransaction({
        items: [{ namaBarang: 'Kopi Susu', qty: 3, hargaSatuan: 15000, total: 45000 }],
        total: 45000,
        metode: 'Tunai',
        uangDiterima: 50000,
        kembalian: 5000,
      });
    });

    // Check transaction properties
    expect(tx.transactionId).toBe('TRX-KASI-00001');
    expect(tx.kasir).toBe('KasirTest');

    // Check inventory stock reduction
    const invItems = await db.inventory.toArray();
    const invItem = invItems.find((i) => i.namaBarang === 'Kopi Susu');
    expect(invItem).toBeDefined();
    expect(invItem.quantity).toBe(7); // 10 - 3 = 7
  });

  it('4. Allows negative stock for accurate tracking (no silent clamp)', async () => {
    await db.inventory.add({
      id: 'item-2',
      namaBarang: 'Roti Bakar',
      kategori: 'Makanan',
      harga: 20000,
      hargaModal: 12000,
      quantity: 2,
    });

    const { result } = renderHookHelper();

    let tx;
    await act(async () => {
      tx = await result.current.addTransaction({
        items: [{ namaBarang: 'Roti Bakar', qty: 5, hargaSatuan: 20000, total: 100000 }],
        total: 100000,
        metode: 'Tunai',
        uangDiterima: 100000,
        kembalian: 0,
      });
    });

    // P0-FIX: Stock should be -3 (2 - 5), not clamped to 0
    const invItems = await db.inventory.toArray();
    const invItem = invItems.find((i) => i.namaBarang === 'Roti Bakar');
    expect(invItem.quantity).toBe(-3);

    // Should have stock warning attached
    expect(tx.stockWarnings).toBeDefined();
    expect(tx.stockWarnings.length).toBe(1);
    expect(tx.stockWarnings[0]).toContain('Roti Bakar');
    expect(tx.stockWarnings[0]).toContain('tidak cukup');
  });

  it('5. Auto-detects and registers a new product with stock = 0, modal = 0, and selling price from POS', async () => {
    const { result } = renderHookHelper();

    await act(async () => {
      await result.current.addTransaction({
        items: [
          {
            namaBarang: 'Es Teh Manis',
            qty: 2,
            hargaSatuan: 5000,
            total: 10000,
            kategori: 'Minuman',
            subKategori: 'Teh',
          },
        ],
        total: 10000,
        metode: 'Tunai',
        uangDiterima: 10000,
        kembalian: 0,
      });
    });

    const invItems = await db.inventory.toArray();
    const newProduct = invItems.find((i) => i.namaBarang === 'Es Teh Manis');
    expect(newProduct).toBeDefined();
    expect(newProduct.namaBarang).toBe('Es Teh Manis');
    expect(newProduct.quantity).toBe(0); // Default stock = 0
    expect(newProduct.hargaModal).toBe(0); // Default modal = 0
    expect(newProduct.harga).toBe(5000); // Selling price from POS
    expect(newProduct.kategori).toBe('Minuman');
    expect(newProduct.subKategori).toBe('Teh');
  });

  it('6. No stockWarnings when stock is sufficient', async () => {
    await db.inventory.add({
      id: 'item-3',
      namaBarang: 'Air Mineral',
      kategori: 'Minuman',
      harga: 5000,
      hargaModal: 2000,
      quantity: 100,
    });

    const { result } = renderHookHelper();

    let tx;
    await act(async () => {
      tx = await result.current.addTransaction({
        items: [{ namaBarang: 'Air Mineral', qty: 5, hargaSatuan: 5000, total: 25000 }],
        total: 25000,
        metode: 'Tunai',
        uangDiterima: 50000,
        kembalian: 25000,
      });
    });

    // Stock sufficient — no warnings
    expect(tx.stockWarnings).toBeUndefined();

    const invItems = await db.inventory.toArray();
    const invItem = invItems.find((i) => i.namaBarang === 'Air Mineral');
    expect(invItem.quantity).toBe(95); // 100 - 5 = 95
  });

  it('7. Multiple items of same product deduct correctly (Map accumulates)', async () => {
    await db.inventory.add({
      id: 'item-4',
      namaBarang: 'Nasi Goreng',
      kategori: 'Makanan',
      harga: 15000,
      hargaModal: 8000,
      quantity: 10,
    });

    const { result } = renderHookHelper();

    await act(async () => {
      await result.current.addTransaction({
        items: [
          { namaBarang: 'Nasi Goreng', qty: 3, hargaSatuan: 15000, total: 45000 },
          { namaBarang: 'Nasi Goreng', qty: 4, hargaSatuan: 15000, total: 60000 },
        ],
        total: 105000,
        metode: 'Tunai',
        uangDiterima: 110000,
        kembalian: 5000,
      });
    });

    // Should deduct both: 10 - 3 - 4 = 3
    const invItems = await db.inventory.toArray();
    const invItem = invItems.find((i) => i.namaBarang === 'Nasi Goreng');
    expect(invItem.quantity).toBe(3);
  });

  // ── W0-03: Strict item validations ──
  it('8. W0-03: Throws error if any item has qty <= 0 (no silent fallback to 1)', async () => {
    const { result } = renderHookHelper();

    // qty = 0
    await expect(
      result.current.addTransaction({
        items: [{ namaBarang: 'Teh Hangat', qty: 0, hargaSatuan: 5000 }],
        total: 0,
      })
    ).rejects.toThrow('Kuantitas barang "Teh Hangat" harus lebih dari 0');

    // qty = -2
    await expect(
      result.current.addTransaction({
        items: [{ namaBarang: 'Kopi', qty: -2, hargaSatuan: 10000 }],
        total: 10000,
      })
    ).rejects.toThrow('Kuantitas barang "Kopi" harus lebih dari 0');
  });

  it('9. W0-03: Throws error if any item has negative hargaSatuan', async () => {
    const { result } = renderHookHelper();

    await expect(
      result.current.addTransaction({
        items: [{ namaBarang: 'Kopi Susu', qty: 1, hargaSatuan: -5000 }],
        total: 5000,
      })
    ).rejects.toThrow('Harga satuan barang "Kopi Susu" tidak boleh negatif');
  });

  it('10. W0-03: Validates that stock is deducted by exact qty, never converted from 0 to 1', async () => {
    await db.inventory.add({
      id: 'item-w0',
      namaBarang: 'Donat Cokelat',
      quantity: 5,
    });

    const { result } = renderHookHelper();

    // Attempting qty = 0 must fail and stock must remain untouched
    await expect(
      result.current.addTransaction({
        items: [{ namaBarang: 'Donat Cokelat', qty: 0, hargaSatuan: 5000 }],
        total: 0,
      })
    ).rejects.toThrow();

    const invItem = await db.inventory.get('item-w0');
    expect(invItem.quantity).toBe(5); // Not deducted!
  });
});
