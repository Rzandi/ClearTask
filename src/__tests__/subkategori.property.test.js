/* ═══════════════════════════════════════════════════════════
   subkategori.property.test.js — ClearTask
   Feature: dynamic-categories
   Property 10: Sub-kategori tersimpan dan dapat dibaca kembali dari transaksi
   (Refactored for Dexie)
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import db from '../services/db';
import 'fake-indexeddb/auto';

describe('Feature: dynamic-categories, Property 10: Sub-kategori round-trip dari transaksi', () => {
  beforeEach(async () => {
    await db.transactions.clear();
  });

  /**
   * Property 10: Sub-kategori tersimpan dan dapat dibaca kembali dari transaksi
   *
   * Untuk semua nilai subKategori (termasuk string kosong), transaksi yang disimpan
   * ke cleartask_transactions harus dapat dibaca kembali dengan nilai subKategori
   * yang identik.
   *
   * Validates: Requirements 5.5
   */
  it('Property 10: subKategori round-trip — nilai yang disimpan identik dengan yang dibaca', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(), // sembarang string termasuk kosong
        async (subKategori) => {
          await db.transactions.clear();

          // Simpan transaksi dengan subKategori
          const tx = {
            transactionId: `TX-${Date.now()}`,
            tanggal: '2025-01-01',
            kategori: 'Makanan',
            subKategori,
            namaBarang: 'Test Item',
            qty: 1,
            hargaSatuan: 10000,
            total: 10000,
            metode: 'Tunai',
            catatan: '',
            kasir: 'Admin',
            createdAt: new Date().toISOString(),
          };
          const id = await db.transactions.add(tx);

          // Baca kembali dari database
          const found = await db.transactions.get(id);

          // subKategori harus identik
          return found !== undefined && found.subKategori === subKategori;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10b: subKategori string kosong tersimpan sebagai string kosong (bukan undefined/null)', async () => {
    const tx = {
      transactionId: `TX-${Date.now()}`,
      tanggal: '2025-01-01',
      kategori: 'Elektronik',
      subKategori: '',
      namaBarang: 'Laptop',
      qty: 1,
      hargaSatuan: 5000000,
      total: 5000000,
      metode: 'Transfer',
      catatan: '',
      kasir: 'Admin',
      createdAt: new Date().toISOString(),
    };

    const id = await db.transactions.add(tx);

    const found = await db.transactions.get(id);

    expect(found).toBeDefined();
    expect(found.subKategori).toBe('');
    expect(typeof found.subKategori).toBe('string');
  });
});
