/* ═══════════════════════════════════════════════════════════
   W4-01 — cartUtils Decimal Qty Tests
   
   Tests untuk memastikan cartUtils support qty desimal.
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import { hitungTotalItem, validasiItem } from '../utils/cartUtils';

describe('W4-01: Cart Utils with Decimal Qty', () => {
  describe('hitungTotalItem with decimal qty', () => {
    it('calculates total with decimal qty correctly', () => {
      // 0.5 kg × Rp 20.000 = Rp 10.000
      expect(hitungTotalItem(0.5, 20000)).toBe(10000);
      
      // 1.25 kg × Rp 15.000 = Rp 18.750
      expect(hitungTotalItem(1.25, 15000)).toBe(18750);
      
      // 0.75 liter × Rp 8.000 = Rp 6.000
      expect(hitungTotalItem(0.75, 8000)).toBe(6000);
    });

    it('rounds to nearest rupiah for decimal results', () => {
      // 0.333 kg × Rp 30.000 = Rp 9.990 (tidak bulat)
      expect(hitungTotalItem(0.333, 30000)).toBe(9990);
      
      // 0.667 kg × Rp 10.000 = Rp 6.670
      expect(hitungTotalItem(0.667, 10000)).toBe(6670);
      
      // 1.555 kg × Rp 5.000 = Rp 7.775
      expect(hitungTotalItem(1.555, 5000)).toBe(7775);
    });

    it('handles very small decimal qty', () => {
      // 0.001 kg × Rp 1.000.000 = Rp 1.000
      expect(hitungTotalItem(0.001, 1000000)).toBe(1000);
      
      // 0.01 kg × Rp 50.000 = Rp 500
      expect(hitungTotalItem(0.01, 50000)).toBe(500);
      
      // 0.1 kg × Rp 10.000 = Rp 1.000
      expect(hitungTotalItem(0.1, 10000)).toBe(1000);
    });

    it('still works with integer qty', () => {
      // Backward compatibility
      expect(hitungTotalItem(5, 10000)).toBe(50000);
      expect(hitungTotalItem(10, 5000)).toBe(50000);
      expect(hitungTotalItem(1, 25000)).toBe(25000);
    });

    it('returns 0 for invalid qty', () => {
      expect(hitungTotalItem(0, 10000)).toBe(0);
      expect(hitungTotalItem(-1, 10000)).toBe(0);
      expect(hitungTotalItem(NaN, 10000)).toBe(0);
      expect(hitungTotalItem(Infinity, 10000)).toBe(0);
    });

    it('returns 0 for invalid hargaSatuan', () => {
      expect(hitungTotalItem(5, -100)).toBe(0);
      expect(hitungTotalItem(5, NaN)).toBe(0);
      expect(hitungTotalItem(5, Infinity)).toBe(0);
    });
  });

  describe('validasiItem with decimal qty', () => {
    it('validates decimal qty as valid', () => {
      const item = {
        namaBarang: 'Apel Fuji',
        qty: 0.5,
        hargaSatuan: 20000,
      };
      
      const result = validasiItem(item);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates very small decimal qty', () => {
      const item = {
        namaBarang: 'Saffron',
        qty: 0.001,
        hargaSatuan: 1000000,
      };
      
      const result = validasiItem(item);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates larger decimal qty', () => {
      const item = {
        namaBarang: 'Beras',
        qty: 25.5,
        hargaSatuan: 12000,
      };
      
      const result = validasiItem(item);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects zero qty', () => {
      const item = {
        namaBarang: 'Test Item',
        qty: 0,
        hargaSatuan: 10000,
      };
      
      const result = validasiItem(item);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Qty harus lebih dari 0.');
    });

    it('rejects negative decimal qty', () => {
      const item = {
        namaBarang: 'Test Item',
        qty: -0.5,
        hargaSatuan: 10000,
      };
      
      const result = validasiItem(item);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Qty harus lebih dari 0.');
    });

    it('still validates integer qty correctly', () => {
      const item = {
        namaBarang: 'Test Item',
        qty: 5,
        hargaSatuan: 10000,
      };
      
      const result = validasiItem(item);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('handles buah timbangan (fruit weighing)', () => {
      // Apel 0.75 kg @ Rp 25.000/kg = Rp 18.750
      const total = hitungTotalItem(0.75, 25000);
      expect(total).toBe(18750);
      
      const item = {
        namaBarang: 'Apel Fuji',
        qty: 0.75,
        hargaSatuan: 25000,
      };
      expect(validasiItem(item).valid).toBe(true);
    });

    it('handles frozen food (frozen goods)', () => {
      // Daging Sapi 1.25 kg @ Rp 120.000/kg = Rp 150.000
      const total = hitungTotalItem(1.25, 120000);
      expect(total).toBe(150000);
      
      const item = {
        namaBarang: 'Daging Sapi Premium',
        qty: 1.25,
        hargaSatuan: 120000,
      };
      expect(validasiItem(item).valid).toBe(true);
    });

    it('handles sayuran (vegetables)', () => {
      // Bayam 0.5 kg @ Rp 8.000/kg = Rp 4.000
      const total = hitungTotalItem(0.5, 8000);
      expect(total).toBe(4000);
      
      const item = {
        namaBarang: 'Bayam Hijau',
        qty: 0.5,
        hargaSatuan: 8000,
      };
      expect(validasiItem(item).valid).toBe(true);
    });

    it('handles precision edge case', () => {
      // 0.333 kg @ Rp 30.000/kg = Rp 9.990 (bukan Rp 10.000)
      const total = hitungTotalItem(0.333, 30000);
      expect(total).toBe(9990);
    });
  });
});
