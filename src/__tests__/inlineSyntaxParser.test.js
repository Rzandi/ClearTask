/* ═══════════════════════════════════════════════════════════
   inlineSyntaxParser.test.js — Unit Tests
   Tests for parseInlineCommand, hasInlineSyntax, getCashBreakdown
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import { parseInlineCommand, hasInlineSyntax, getCashBreakdown } from '../utils/inlineSyntaxParser';

// ─── parseInlineCommand ─────────────────────────────────────

describe('parseInlineCommand', () => {
  it('should return null for empty/whitespace input', () => {
    expect(parseInlineCommand('')).toBeNull();
    expect(parseInlineCommand('   ')).toBeNull();
    expect(parseInlineCommand(null)).toBeNull();
    expect(parseInlineCommand(undefined)).toBeNull();
  });

  it('should parse simple product name (no qty, no price)', () => {
    const r = parseInlineCommand('Air Mineral');
    expect(r).toEqual({ namaBarang: 'Air Mineral', qty: 1, hargaSatuan: null });
  });

  it('should parse "Susu 2x @15000" (trailing qty + price)', () => {
    const r = parseInlineCommand('Susu 2x @15000');
    expect(r).toEqual({ namaBarang: 'Susu', qty: 2, hargaSatuan: 15000 });
  });

  it('should parse "Kopi 3x" (trailing qty, no price)', () => {
    const r = parseInlineCommand('Kopi 3x');
    expect(r).toEqual({ namaBarang: 'Kopi', qty: 3, hargaSatuan: null });
  });

  it('should parse "Roti @5000" (price only, qty defaults to 1)', () => {
    const r = parseInlineCommand('Roti @5000');
    expect(r).toEqual({ namaBarang: 'Roti', qty: 1, hargaSatuan: 5000 });
  });

  it('should parse "2x Susu @10000" (leading qty)', () => {
    const r = parseInlineCommand('2x Susu @10000');
    expect(r).toEqual({ namaBarang: 'Susu', qty: 2, hargaSatuan: 10000 });
  });

  it('should parse "Susu Coklat 2x" (multi-word name)', () => {
    const r = parseInlineCommand('Susu Coklat 2x');
    expect(r).toEqual({ namaBarang: 'Susu Coklat', qty: 2, hargaSatuan: null });
  });

  it('should handle case-insensitive X: "Teh 5X @3000"', () => {
    const r = parseInlineCommand('Teh 5X @3000');
    expect(r).toEqual({ namaBarang: 'Teh', qty: 5, hargaSatuan: 3000 });
  });

  it('should handle "x3" suffix: "Gula x3"', () => {
    const r = parseInlineCommand('Gula x3');
    expect(r).toEqual({ namaBarang: 'Gula', qty: 3, hargaSatuan: null });
  });

  it('should handle price with dots: "@15.000"', () => {
    const r = parseInlineCommand('Mie @15.000');
    expect(r).toEqual({ namaBarang: 'Mie', qty: 1, hargaSatuan: 15000 });
  });

  it('should handle price with space after @: "@ 5000"', () => {
    const r = parseInlineCommand('Roti @ 5000');
    expect(r).toEqual({ namaBarang: 'Roti', qty: 1, hargaSatuan: 5000 });
  });

  it('should handle product name with numbers: "Indomie 3x @3500"', () => {
    const r = parseInlineCommand('Indomie 3x @3500');
    expect(r).toEqual({ namaBarang: 'Indomie', qty: 3, hargaSatuan: 3500 });
  });

  it('should ignore qty 0 and fallback to 1', () => {
    const r = parseInlineCommand('Susu 0x @5000');
    // 0x is not > 0, so qty stays at 1
    expect(r.qty).toBe(1);
  });

  it('should handle leading whitespace', () => {
    const r = parseInlineCommand('   Susu 2x @10000   ');
    expect(r).toEqual({ namaBarang: 'Susu', qty: 2, hargaSatuan: 10000 });
  });

  it('should handle complex multi-word with price: "Es Teh Manis 2x @5000"', () => {
    const r = parseInlineCommand('Es Teh Manis 2x @5000');
    expect(r).toEqual({ namaBarang: 'Es Teh Manis', qty: 2, hargaSatuan: 5000 });
  });
});

// ─── hasInlineSyntax ────────────────────────────────────────

describe('hasInlineSyntax', () => {
  it('returns false for plain text without syntax', () => {
    expect(hasInlineSyntax('Air Mineral')).toBe(false);
    expect(hasInlineSyntax('')).toBe(false);
    expect(hasInlineSyntax(null)).toBe(false);
  });

  it('returns true when @ price is present', () => {
    expect(hasInlineSyntax('Roti @5000')).toBe(true);
  });

  it('returns true when qty multiplier is present', () => {
    expect(hasInlineSyntax('Susu 2x')).toBe(true);
    expect(hasInlineSyntax('3x Kopi')).toBe(true);
    expect(hasInlineSyntax('Gula x3')).toBe(true);
  });
});

// ─── getCashBreakdown ───────────────────────────────────────

describe('getCashBreakdown', () => {
  it('should return empty array for 0', () => {
    expect(getCashBreakdown(0)).toEqual([]);
  });

  it('should breakdown 37000 correctly', () => {
    const result = getCashBreakdown(37000);
    expect(result).toEqual([
      { value: 20000, count: 1, label: '20rb' },
      { value: 10000, count: 1, label: '10rb' },
      { value: 5000, count: 1, label: '5rb' },
      { value: 2000, count: 1, label: '2rb' },
    ]);
  });

  it('should breakdown 100000 correctly', () => {
    const result = getCashBreakdown(100000);
    expect(result).toEqual([{ value: 100000, count: 1, label: '100rb' }]);
  });

  it('should breakdown 155500 correctly', () => {
    const result = getCashBreakdown(155500);
    expect(result).toEqual([
      { value: 100000, count: 1, label: '100rb' },
      { value: 50000, count: 1, label: '50rb' },
      { value: 5000, count: 1, label: '5rb' },
      { value: 500, count: 1, label: '500' },
    ]);
  });

  it('should handle negative amount (treat as absolute)', () => {
    const result = getCashBreakdown(-5000);
    expect(result).toEqual([{ value: 5000, count: 1, label: '5rb' }]);
  });

  it('should handle large breakdowns: 278300', () => {
    const result = getCashBreakdown(278300);
    // 2x100rb + 1x50rb + 1x20rb + 1x5rb + 1x2rb + 1x1rb + 1x200 + 1x100
    const total = result.reduce((sum, d) => sum + d.value * d.count, 0);
    expect(total).toBe(278300);
  });

  it('should give correct counts for exact multiples', () => {
    const result = getCashBreakdown(60000);
    expect(result).toEqual([
      { value: 50000, count: 1, label: '50rb' },
      { value: 10000, count: 1, label: '10rb' },
    ]);
  });
});
