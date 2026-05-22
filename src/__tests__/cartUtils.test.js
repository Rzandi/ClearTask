/* ═══════════════════════════════════════════════════════════
   cartUtils.test.js — ClearTask
   TDD: Unit + Property-Based Tests untuk kalkulasi keranjang.
   Ditulis SEBELUM implementasi (Red → Green → Refactor).
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  hitungTotalItem,
  terapkanDiskon,
  hitungPajak,
  hitungGrandTotal,
  validasiItem,
} from '../utils/cartUtils';

// ── hitungTotalItem ───────────────────────────────────────

describe('hitungTotalItem', () => {
  it('menghitung qty × hargaSatuan dengan benar', () => {
    expect(hitungTotalItem(2, 15000)).toBe(30000);
    expect(hitungTotalItem(1, 3500)).toBe(3500);
    expect(hitungTotalItem(10, 100)).toBe(1000);
  });

  it('mengembalikan 0 jika qty <= 0', () => {
    expect(hitungTotalItem(0, 15000)).toBe(0);
    expect(hitungTotalItem(-1, 15000)).toBe(0);
  });

  it('mengembalikan 0 jika harga negatif', () => {
    expect(hitungTotalItem(2, -100)).toBe(0);
  });

  it('mengembalikan 0 jika input bukan angka', () => {
    expect(hitungTotalItem(NaN, 1000)).toBe(0);
    expect(hitungTotalItem(2, undefined)).toBe(0);
  });

  // PBT: total selalu >= 0 dan = qty * harga untuk input valid
  it('PBT: total selalu non-negatif', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 1000000 }),
        (qty, harga) => {
          expect(hitungTotalItem(qty, harga)).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('PBT: total = qty × harga untuk input valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999 }),
        fc.integer({ min: 1, max: 999999 }),
        (qty, harga) => {
          expect(hitungTotalItem(qty, harga)).toBe(qty * harga);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── terapkanDiskon ────────────────────────────────────────

describe('terapkanDiskon', () => {
  it('diskon 10% dari Rp10.000 = Rp9.000', () => {
    expect(terapkanDiskon(10000, 10)).toBe(9000);
  });

  it('diskon 0% tidak mengubah harga', () => {
    expect(terapkanDiskon(50000, 0)).toBe(50000);
  });

  it('diskon 100% menghasilkan Rp0', () => {
    expect(terapkanDiskon(50000, 100)).toBe(0);
  });

  it('diskon > 100% dikembalikan sebagai harga asli (guard)', () => {
    expect(terapkanDiskon(10000, 150)).toBe(10000);
  });

  it('harga negatif mengembalikan 0', () => {
    expect(terapkanDiskon(-5000, 10)).toBe(0);
  });

  // PBT: harga setelah diskon selalu <= harga asli
  it('PBT: harga setelah diskon selalu <= harga asli', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 0, max: 100 }),
        (harga, diskon) => {
          expect(terapkanDiskon(harga, diskon)).toBeLessThanOrEqual(harga);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── hitungPajak ───────────────────────────────────────────

describe('hitungPajak', () => {
  it('PPN 11% dari Rp100.000 = Rp11.000', () => {
    expect(hitungPajak(100000, 11)).toBe(11000);
  });

  it('pajak 0% = Rp0', () => {
    expect(hitungPajak(100000, 0)).toBe(0);
  });

  it('harga 0 menghasilkan pajak 0', () => {
    expect(hitungPajak(0, 11)).toBe(0);
  });

  it('pajak default adalah 11%', () => {
    expect(hitungPajak(100000)).toBe(11000);
  });

  // PBT: pajak selalu >= 0
  it('PBT: pajak selalu non-negatif', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 0, max: 100 }),
        (harga, pajak) => {
          expect(hitungPajak(harga, pajak)).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── hitungGrandTotal ──────────────────────────────────────

describe('hitungGrandTotal', () => {
  it('tanpa diskon dan pajak: grandTotal = harga asli', () => {
    const result = hitungGrandTotal(100000, 0, 0);
    expect(result.grandTotal).toBe(100000);
    expect(result.pajak).toBe(0);
    expect(result.hargaSetelahDiskon).toBe(100000);
  });

  it('diskon 10% + PPN 11% dari Rp100.000', () => {
    // Rp100.000 - 10% = Rp90.000 → PPN 11% = Rp9.900 → total Rp99.900
    const result = hitungGrandTotal(100000, 10, 11);
    expect(result.hargaSetelahDiskon).toBe(90000);
    expect(result.pajak).toBe(9900);
    expect(result.grandTotal).toBe(99900);
  });

  // PBT: grandTotal selalu >= hargaSetelahDiskon
  it('PBT: grandTotal selalu >= hargaSetelahDiskon', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (harga, diskon, pajak) => {
          const result = hitungGrandTotal(harga, diskon, pajak);
          expect(result.grandTotal).toBeGreaterThanOrEqual(result.hargaSetelahDiskon);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── validasiItem ──────────────────────────────────────────

describe('validasiItem', () => {
  it('item valid lolos validasi', () => {
    const result = validasiItem({ namaBarang: 'Kopi', qty: 2, hargaSatuan: 15000 });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('nama kosong menghasilkan error', () => {
    const result = validasiItem({ namaBarang: '', qty: 1, hargaSatuan: 1000 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Nama barang tidak boleh kosong.');
  });

  it('qty 0 menghasilkan error', () => {
    const result = validasiItem({ namaBarang: 'Teh', qty: 0, hargaSatuan: 5000 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Qty harus lebih dari 0.');
  });

  it('harga 0 menghasilkan error', () => {
    const result = validasiItem({ namaBarang: 'Teh', qty: 1, hargaSatuan: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Harga satuan harus lebih dari 0.');
  });

  it('semua field invalid menghasilkan 3 errors', () => {
    const result = validasiItem({ namaBarang: '  ', qty: -1, hargaSatuan: -100 });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });

  it('null/undefined item tidak crash', () => {
    expect(() => validasiItem(null)).not.toThrow();
    expect(() => validasiItem(undefined)).not.toThrow();
    expect(validasiItem(null).valid).toBe(false);
  });
});
