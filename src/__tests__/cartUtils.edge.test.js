/* ═══════════════════════════════════════════════════════════
   cartUtils.edge.test.js — ClearTask
   Phase 6: Edge-Case & Boundary Tests untuk cartUtils.
   Pilar A: Data Mutation (Fuzzing dengan fast-check)
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

// ── Floating Point Safety ─────────────────────────────────

describe('Edge: Floating Point Safety', () => {
  it('hitungTotalItem tidak menghasilkan floating point error', () => {
    // 0.1 × 3 = 0.30000000000000004 tanpa Math.round
    const result = hitungTotalItem(3, 0.1);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('hitungPajak selalu menghasilkan integer (Math.ceil)', () => {
    // 11% dari 9999 = 1099.89 → harus dibulatkan ke 1100
    const pajak = hitungPajak(9999, 11);
    expect(Number.isInteger(pajak)).toBe(true);
    expect(pajak).toBe(1100);
  });

  it('terapkanDiskon selalu menghasilkan integer (Math.floor)', () => {
    // 10% dari 9999 = 8999.1 → harus dibulatkan ke 8999
    const result = terapkanDiskon(9999, 10);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(8999);
  });
});

// ── Boundary Values ───────────────────────────────────────

describe('Edge: Boundary Values', () => {
  it('hitungTotalItem dengan harga Rp0 menghasilkan 0', () => {
    expect(hitungTotalItem(100, 0)).toBe(0);
  });

  it('hitungTotalItem dengan qty sangat besar tidak overflow', () => {
    // Number.MAX_SAFE_INTEGER = 9007199254740991
    const result = hitungTotalItem(1000000, 1000000);
    expect(result).toBe(1_000_000_000_000);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('terapkanDiskon dengan diskon tepat 100% menghasilkan 0', () => {
    expect(terapkanDiskon(999999, 100)).toBe(0);
  });

  it('hitungPajak dengan pajak tepat 100% = harga asli', () => {
    expect(hitungPajak(50000, 100)).toBe(50000);
  });

  it('validasiItem dengan nama hanya spasi dianggap kosong', () => {
    const result = validasiItem({ namaBarang: '   ', qty: 1, hargaSatuan: 1000 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Nama barang tidak boleh kosong.');
  });

  it('validasiItem dengan nama emoji panjang tetap valid', () => {
    const emojiName = '🍔🍟🌮🌯🥙🧆🥚🍳🥘🍲🥣🥗🍿🧂🥫🍱🍘🍙🍚🍛';
    const result = validasiItem({ namaBarang: emojiName, qty: 1, hargaSatuan: 5000 });
    expect(result.valid).toBe(true);
  });
});

// ── PBT: Aggressive Fuzzing ───────────────────────────────

describe('PBT Edge: hitungTotalItem dengan nilai ekstrem', () => {
  it('selalu menghasilkan integer non-negatif untuk input valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (qty, harga) => {
          const result = hitungTotalItem(qty, harga);
          expect(Number.isInteger(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('terapkanDiskon: hasil selalu dalam range [0, harga]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 100 }),
        (harga, diskon) => {
          const result = terapkanDiskon(harga, diskon);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(harga);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('hitungGrandTotal: grandTotal selalu >= 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (harga, diskon, pajak) => {
          const { grandTotal } = hitungGrandTotal(harga, diskon, pajak);
          expect(grandTotal).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(grandTotal)).toBe(true);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ── PBT: validasiItem dengan string acak ─────────────────

describe('PBT Edge: validasiItem tidak pernah crash', () => {
  it('validasiItem tidak throw untuk sembarang input', () => {
    fc.assert(
      fc.property(
        fc.anything(), // nama bisa apa saja
        fc.anything(), // qty bisa apa saja
        fc.anything(), // harga bisa apa saja
        (nama, qty, harga) => {
          expect(() => validasiItem({ namaBarang: nama, qty, hargaSatuan: harga })).not.toThrow();
        }
      ),
      { numRuns: 300 }
    );
  });

  it('validasiItem selalu mengembalikan { valid, errors } dengan tipe yang benar', () => {
    fc.assert(
      fc.property(
        fc.record({
          namaBarang: fc.oneof(
            fc.string(),
            fc.integer(),
            fc.constant(null),
            fc.constant(undefined)
          ),
          qty: fc.oneof(fc.integer(), fc.float(), fc.string(), fc.constant(null)),
          hargaSatuan: fc.oneof(fc.integer(), fc.float(), fc.string(), fc.constant(null)),
        }),
        (item) => {
          const result = validasiItem(item);
          expect(typeof result.valid).toBe('boolean');
          expect(Array.isArray(result.errors)).toBe(true);
        }
      ),
      { numRuns: 300 }
    );
  });
});
