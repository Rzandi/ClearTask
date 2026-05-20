/* ═══════════════════════════════════════════════════════════
   subkategori.property.test.js — ClearTask
   Feature: dynamic-categories
   Property 10: Sub-kategori tersimpan dan dapat dibaca kembali dari transaksi
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { addTransaction, getTransactions, clearAllTransactions } from '../utils/storage';

describe('Feature: dynamic-categories, Property 10: Sub-kategori round-trip dari transaksi', () => {
  beforeEach(() => {
    clearAllTransactions();
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
  it(
    'Property 10: subKategori round-trip — nilai yang disimpan identik dengan yang dibaca',
    () => {
      fc.assert(
        fc.property(
          fc.string(), // sembarang string termasuk kosong
          (subKategori) => {
            clearAllTransactions();

            // Simpan transaksi dengan subKategori
            const tx = addTransaction({
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
            });

            // Baca kembali dari localStorage
            const transactions = getTransactions();
            const found = transactions.find((t) => t.id === tx.id);

            // subKategori harus identik
            return found !== undefined && found.subKategori === subKategori;
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Property 10b: subKategori string kosong tersimpan sebagai string kosong (bukan undefined/null)',
    () => {
      const tx = addTransaction({
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
      });

      const transactions = getTransactions();
      const found = transactions.find((t) => t.id === tx.id);

      expect(found).toBeDefined();
      expect(found.subKategori).toBe('');
      expect(typeof found.subKategori).toBe('string');
    }
  );
});
