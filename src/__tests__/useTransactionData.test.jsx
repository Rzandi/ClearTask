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
    expect(tx.transactionId).toBe('TRX-00001');
    expect(tx.kasir).toBe('KasirTest');

    // Check inventory stock reduction
    const invItems = await db.inventory.toArray();
    const invItem = invItems.find((i) => i.namaBarang === 'Kopi Susu');
    expect(invItem).toBeDefined();
    expect(invItem.quantity).toBe(7); // 10 - 3 = 7
  });

  it('4. Clamps stock reduction to 0 (no negative stock)', async () => {
    await db.inventory.add({
      id: 'item-2',
      namaBarang: 'Roti Bakar',
      kategori: 'Makanan',
      harga: 20000,
      hargaModal: 12000,
      quantity: 2,
    });

    const { result } = renderHookHelper();

    await act(async () => {
      await result.current.addTransaction({
        items: [{ namaBarang: 'Roti Bakar', qty: 5, hargaSatuan: 20000, total: 100000 }],
        total: 100000,
        metode: 'Tunai',
        uangDiterima: 100000,
        kembalian: 0,
      });
    });

    const invItems = await db.inventory.toArray();
    const invItem = invItems.find((i) => i.namaBarang === 'Roti Bakar');
    expect(invItem.quantity).toBe(0); // Clamped to 0
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
});
