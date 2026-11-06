/* VERIFIKASI FIX: assert perilaku YANG BENAR setelah fix diterapkan. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import db from '../services/db';
import { InventoryProvider, useInventoryContext } from '../contexts/InventoryContext';
import { transactionService } from '../services/transactionService';
import {
  createCustomer,
  createCreditLedger,
  deleteCustomer,
  getDebtSummary,
} from '../services/customerService';
import { calculateMerge, applyMerge } from '../services/databaseManager';
import { checkStockDrift } from '../utils/stockDriftCheck';
import { parseQty } from '../utils/qtyUtils';

const TABLES = [
  db.transactions,
  db.inventory,
  db.stock_movements,
  db.customers,
  db.credit_ledger,
  db.credit_payments,
  db.price_history,
  db.audit_log,
  db.meta,
  db.sessions,
  db.archive_transactions,
  db.expenses,
  db.categories,
  db.settings,
];
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(InventoryProvider, null, children);
const now = () => new Date().toISOString();
async function seed(id: string, nama: string, quantity: number, extra: any = {}) {
  await db.inventory.add({
    id,
    namaBarang: nama,
    kategori: 'Sembako',
    harga: 1000,
    hargaModal: 800,
    satuan: 'Pcs',
    quantity,
    createdAt: now(),
    updatedAt: now(),
    ...extra,
  });
}
beforeEach(async () => {
  for (const t of TABLES) await t.clear();
});

describe('FIX BUG-01', () => {
  it('edit harga mencatat price_history', async () => {
    await seed('p1', 'Gula', 5);
    const { result } = renderHook(() => useInventoryContext(), { wrapper });
    await act(async () => {
      await result.current.updateInventoryItem('p1', { harga: 12000 });
    });
    expect(await db.price_history.count()).toBe(1);
  });
});

describe('FIX BUG-02', () => {
  it('ubah stok manual menulis movement dan tidak memunculkan drift', async () => {
    await seed('p2', 'Beras', 10);
    await db.stock_movements.add({
      id: 'o2',
      inventoryId: 'p2',
      delta: 10,
      reason: 'opening',
      refType: 'manual',
      refId: 'x',
      at: now(),
      by: 'A',
    } as any);
    const { result } = renderHook(() => useInventoryContext(), { wrapper });
    await act(async () => {
      await result.current.updateInventoryItem('p2', { quantity: 3 });
    });
    expect((await db.inventory.get('p2'))!.quantity).toBe(3);
    const m = await db.stock_movements.where('inventoryId').equals('p2').toArray();
    expect(m.length).toBe(2);
    expect(m.reduce((s, x) => s + x.delta, 0)).toBe(3);
    expect((await checkStockDrift()).hasDrift).toBe(false);
  });
});

describe('FIX BUG-03', () => {
  it('barang baru dengan stok awal punya movement opening', async () => {
    const { result } = renderHook(() => useInventoryContext(), { wrapper });
    let created: any;
    await act(async () => {
      created = await result.current.addInventoryItem({
        namaBarang: 'Minyak',
        kategori: 'Sembako',
        harga: 15000,
        quantity: 7,
      } as any);
    });
    const m = await db.stock_movements.where('inventoryId').equals(created.id).toArray();
    expect(m.length).toBe(1);
    expect(m[0].delta).toBe(7);
    expect(m[0].reason).toBe('opening');
  });
});

describe('FIX BUG-04', () => {
  it('edit dengan qty negatif ditolak dan stok tidak berubah', async () => {
    await seed('g1', 'Gula', 10);
    const tx = await transactionService.createTransaction(
      {
        items: [{ namaBarang: 'Gula', inventoryId: 'g1', qty: 2, hargaSatuan: 1000, total: 2000 }],
        total: 2000,
        uangDiterima: 2000,
        kembalian: 0,
      } as any,
      'Admin'
    );
    await expect(
      transactionService.updateTransaction(
        tx.id!,
        {
          items: [
            { namaBarang: 'Gula', inventoryId: 'g1', qty: -5, hargaSatuan: 1000, total: -5000 },
          ],
        } as any,
        'Admin'
      )
    ).rejects.toThrow(/harus lebih dari 0/);
    expect((await db.inventory.get('g1'))!.quantity).toBe(8);
  });
});

describe('FIX BUG-05', () => {
  it('barang terhapus dengan riwayat tidak memicu hasDrift', async () => {
    await seed('a2', 'Teh', 3);
    await db.stock_movements.add({
      id: 'ma2',
      inventoryId: 'a2',
      delta: 3,
      reason: 'opening',
      refType: 'manual',
      refId: 'x',
      at: now(),
      by: 'A',
    } as any);
    await seed('d1', 'Kopi Lama', 0, { deletedAt: now() });
    await db.stock_movements.add({
      id: 'md1',
      inventoryId: 'd1',
      delta: -2,
      reason: 'sale',
      refType: 'transaction',
      refId: 'TRX-1',
      at: now(),
      by: 'A',
    } as any);
    const r = await checkStockDrift();
    expect(r.hasDrift).toBe(false);
    expect(r.orphanMovements.length).toBe(0);
  });
});

describe('FIX BUG-06', () => {
  it('0.1 + 0.2 vs 0.3 tidak dianggap drift', async () => {
    await seed('f1', 'Gula Curah', 0.3, { satuan: 'kg' });
    await db.stock_movements.bulkAdd([
      {
        id: 'mf1',
        inventoryId: 'f1',
        delta: 0.1,
        reason: 'opening',
        refType: 'manual',
        refId: 'x',
        at: now(),
        by: 'A',
      },
      {
        id: 'mf2',
        inventoryId: 'f1',
        delta: 0.2,
        reason: 'manual',
        refType: 'manual',
        refId: 'y',
        at: now(),
        by: 'A',
      },
    ] as any);
    expect((await checkStockDrift()).driftItems.length).toBe(0);
  });
});

describe('FIX BUG-07', () => {
  it('edit tanpa perubahan qty tidak menulis movement edit', async () => {
    await seed('g1', 'Gula', 10);
    const tx = await transactionService.createTransaction(
      {
        items: [{ namaBarang: 'Gula', inventoryId: 'g1', qty: 2, hargaSatuan: 1000, total: 2000 }],
        total: 2000,
        uangDiterima: 2000,
        kembalian: 0,
      } as any,
      'Admin'
    );
    await transactionService.updateTransaction(
      tx.id!,
      {
        items: [{ namaBarang: 'Gula', qty: 2, hargaSatuan: 1000, total: 2000 }],
      } as any,
      'Admin'
    );
    expect((await db.inventory.get('g1'))!.quantity).toBe(8);
    expect(await db.stock_movements.where('reason').equals('edit').count()).toBe(0);
  });
});

describe('FIX BUG-08', () => {
  it('total yang tidak cocok dengan item ditolak', async () => {
    await seed('g1', 'Gula', 10);
    await expect(
      transactionService.createTransaction(
        {
          items: [
            { namaBarang: 'Gula', inventoryId: 'g1', qty: 1, hargaSatuan: 1000, total: 1000 },
          ],
          total: 999999,
          uangDiterima: 999999,
          kembalian: 0,
        } as any,
        'Admin'
      )
    ).rejects.toThrow(/tidak sesuai/);
    expect(await db.transactions.count()).toBe(0);
  });
});

describe('FIX BUG-15', () => {
  it('pelanggan dengan hutang tidak bisa dihapus, dan ringkasan mengabaikan pelanggan terhapus', async () => {
    const a = await createCustomer({ nama: 'Andi' });
    const b = await createCustomer({ nama: 'Budi' });
    await createCreditLedger({ customerId: a.id, transactionId: 't-a', jumlahKredit: 5000 });
    await createCreditLedger({ customerId: b.id, transactionId: 't-b', jumlahKredit: 3000 });
    await expect(deleteCustomer(a.id, 'Admin')).rejects.toThrow(/hutang/);
    // Pelanggan yang sudah dihapus (data lama) tidak lagi ikut ringkasan
    await db.customers.update(a.id, { deletedAt: now() });
    const s = await getDebtSummary();
    expect(s.totalOutstanding).toBe(3000);
    expect(s.customersWithDebt).toBe(1);
  });
});

describe('FIX BUG-16', () => {
  it('movement dari backup ikut pindah ke nomor transaksi yang baru', async () => {
    await db.transactions.add({
      transactionId: 'TRX-00001',
      tanggal: '2026-01-01',
      total: 1000,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      items: [],
      kasir: 'Admin',
      syncStatus: 'local',
    } as any);
    const importData: any = {
      version: '2.0',
      exportedAt: now(),
      schemaVersion: 15,
      transactions: [
        {
          transactionId: 'TRX-00001',
          tanggal: '2026-01-02',
          total: 2000,
          createdAt: '2026-01-02T10:00:00.000Z',
          updatedAt: '2026-01-02T10:00:00.000Z',
          items: [],
          kasir: 'Admin',
          syncStatus: 'local',
        },
      ],
      sessions: [],
      categories: { categories: [], subCategories: {} },
      inventory: [],
      expenses: [],
      archive_transactions: [],
      stock_movements: [
        {
          id: 'mimp1',
          inventoryId: 'none',
          delta: -1,
          reason: 'sale',
          refType: 'transaction',
          refId: 'TRX-00001',
          at: now(),
          by: 'A',
        },
      ],
      audit_log: [],
      customers: [],
      credit_ledger: [],
      credit_payments: [],
      price_history: [],
    };
    await applyMerge(await calculateMerge(importData));
    const imported = (await db.transactions.toArray()).find((t) => t.total === 2000)!;
    expect(imported.transactionId).not.toBe('TRX-00001');
    expect(await db.stock_movements.where('refId').equals(imported.transactionId).count()).toBe(1);
    expect(await db.stock_movements.where('refId').equals('TRX-00001').count()).toBe(0);
  });
});

describe('FIX BUG-26', () => {
  it('barang impor dengan nama sama digabung ke barang lokal, tanpa movement yatim', async () => {
    await seed('L1', 'Gula', 5);
    // barang lokal yang realistis punya ledger opening-nya
    await db.stock_movements.add({
      id: 'oL1',
      inventoryId: 'L1',
      delta: 5,
      reason: 'opening',
      refType: 'manual',
      refId: 'x',
      at: now(),
      by: 'A',
    } as any);
    const importData: any = {
      version: '2.0',
      exportedAt: now(),
      schemaVersion: 15,
      transactions: [],
      sessions: [],
      categories: { categories: [], subCategories: {} },
      inventory: [
        {
          id: 'L2',
          namaBarang: 'Gula',
          kategori: 'Sembako',
          harga: 1000,
          hargaModal: 800,
          satuan: 'Pcs',
          quantity: 10,
          createdAt: now(),
          updatedAt: now(),
        },
      ],
      expenses: [],
      archive_transactions: [],
      stock_movements: [
        {
          id: 'mL2',
          inventoryId: 'L2',
          delta: 10,
          reason: 'opening',
          refType: 'manual',
          refId: 'x',
          at: now(),
          by: 'S',
        },
      ],
      audit_log: [],
      customers: [],
      credit_ledger: [],
      credit_payments: [],
      price_history: [],
    };
    await applyMerge(await calculateMerge(importData));
    expect(await db.inventory.count()).toBe(1);
    expect((await db.inventory.get('L1'))!.quantity).toBe(15);
    expect((await checkStockDrift()).orphanMovements.length).toBe(0);
    expect((await checkStockDrift()).hasDrift).toBe(false);
  });
});

describe('FIX BUG-27', () => {
  it('qty desimal dengan titik atau koma (3 digit) terbaca benar', () => {
    expect(parseQty('0.500')).toBe(0.5);
    expect(parseQty('0,500')).toBe(0.5);
    // Trade-off yang didokumentasikan: "1.250" tetap dibaca ribuan (sesuai spek)
    expect(parseQty('1.250')).toBe(1250);
    expect(parseQty('12.500')).toBe(12500);
    expect(parseQty('2')).toBe(2);
  });
});

describe('FIX BUG-32', () => {
  it('void transaksi kredit membatalkan hutang', async () => {
    await seed('g1', 'Gula', 10);
    const cust = await createCustomer({ nama: 'Citra' });
    const tx = await transactionService.createTransaction(
      {
        items: [{ namaBarang: 'Gula', inventoryId: 'g1', qty: 2, hargaSatuan: 1000, total: 2000 }],
        total: 2000,
        uangDiterima: 0,
        kembalian: 0,
        metode: 'Kredit',
        customerId: cust.id,
      } as any,
      'Admin'
    );
    await createCreditLedger({
      customerId: cust.id,
      transactionId: tx.id as any,
      jumlahKredit: 2000,
    });
    await transactionService.voidTransaction(tx.id!, 'Undo checkout kasir', 'Admin');
    const s = await getDebtSummary();
    expect(s.totalOutstanding).toBe(0);
    expect(s.unpaidLedgers).toBe(0);
  });
});

describe('FIX BUG-33', () => {
  it('checkout kredit: gagal buat ledger = seluruh transaksi di-rollback', async () => {
    await seed('g1', 'Gula', 10);
    const cust = await createCustomer({ nama: 'Dedi' });
    const spy = vi.spyOn(db.credit_ledger, 'add').mockRejectedValueOnce(new Error('DB error'));
    await expect(
      transactionService.createTransaction(
        {
          items: [
            { namaBarang: 'Gula', inventoryId: 'g1', qty: 3, hargaSatuan: 1000, total: 3000 },
          ],
          total: 3000,
          uangDiterima: 0,
          kembalian: 0,
          metode: 'Kredit',
          customerId: cust.id,
          creditLedger: { customerId: cust.id, catatan: 'uji' },
        } as any,
        'Admin'
      )
    ).rejects.toThrow('DB error');
    spy.mockRestore();
    expect(await db.transactions.count()).toBe(0);
    expect((await db.inventory.get('g1'))!.quantity).toBe(10);
    expect(await db.credit_ledger.count()).toBe(0);
  });
  it('checkout kredit normal: transaksi dan ledger dibuat bersama', async () => {
    await seed('g1', 'Gula', 10);
    const cust = await createCustomer({ nama: 'Eka' });
    await transactionService.createTransaction(
      {
        items: [{ namaBarang: 'Gula', inventoryId: 'g1', qty: 3, hargaSatuan: 1000, total: 3000 }],
        total: 3000,
        uangDiterima: 0,
        kembalian: 0,
        metode: 'Kredit',
        customerId: cust.id,
        creditLedger: { customerId: cust.id, catatan: 'uji' },
      } as any,
      'Admin'
    );
    expect(await db.transactions.count()).toBe(1);
    expect(await db.credit_ledger.count()).toBe(1);
    expect((await db.customers.get(cust.id))!.totalHutang).toBe(3000);
  });
});
