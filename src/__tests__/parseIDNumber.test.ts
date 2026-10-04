/* ═══════════════════════════════════════════════════════════
   W2-01 — parseIDNumber / formatIDR Tests
   
   Tests for the unified Indonesian number parser.
   Covers Indonesian format, English format, edge cases,
   currency prefix stripping, and the formatIDR formatter.
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import { parseIDNumber, parseIDNumberSafe, formatIDR } from '../utils/parseIDNumber';

describe('W2-01: parseIDNumber', () => {
  describe('Indonesian format (dot=thousands, comma=decimal)', () => {
    it('parses "12.500" as 12500 (thousand separator)', () => {
      expect(parseIDNumber('12.500')).toBe(12500);
    });

    it('parses "1.250.000" as 1250000 (multiple thousand separators)', () => {
      expect(parseIDNumber('1.250.000')).toBe(1250000);
    });

    it('parses "0,57" as 0.57 (decimal comma)', () => {
      expect(parseIDNumber('0,57')).toBe(0.57);
    });

    it('parses "12.500,75" as 12500.75 (mixed)', () => {
      expect(parseIDNumber('12.500,75')).toBe(12500.75);
    });

    it('parses "1.250.000,50" as 1250000.5', () => {
      expect(parseIDNumber('1.250.000,50')).toBe(1250000.5);
    });

    it('parses "3,5" as 3.5 (single decimal digit)', () => {
      expect(parseIDNumber('3,5')).toBe(3.5);
    });
  });

  describe('English format (comma=thousands, dot=decimal)', () => {
    it('parses "12,500.75" as 12500.75', () => {
      expect(parseIDNumber('12,500.75')).toBe(12500.75);
    });

    it('parses "1,250,000" as 1250000 (multiple thousand commas)', () => {
      expect(parseIDNumber('1,250,000')).toBe(1250000);
    });

    it('parses "1,250,000.50" as 1250000.5', () => {
      expect(parseIDNumber('1,250,000.50')).toBe(1250000.5);
    });
  });

  describe('Plain numbers', () => {
    it('parses "12500" as 12500', () => {
      expect(parseIDNumber('12500')).toBe(12500);
    });

    it('parses "0" as 0', () => {
      expect(parseIDNumber('0')).toBe(0);
    });

    it('parses "0.57" as 0.57 (plain decimal)', () => {
      expect(parseIDNumber('0.57')).toBe(0.57);
    });

    it('parses "-5000" as -5000 (negative)', () => {
      expect(parseIDNumber('-5000')).toBe(-5000);
    });

    it('passes through number type directly', () => {
      expect(parseIDNumber(42)).toBe(42);
      expect(parseIDNumber(3.14)).toBe(3.14);
      expect(parseIDNumber(-100)).toBe(-100);
    });
  });

  describe('Currency prefix stripping', () => {
    it('strips "Rp 12.500" → 12500', () => {
      expect(parseIDNumber('Rp 12.500')).toBe(12500);
    });

    it('strips "Rp. 12.500" → 12500', () => {
      expect(parseIDNumber('Rp. 12.500')).toBe(12500);
    });

    it('strips "rp12500" → 12500 (case insensitive, no space)', () => {
      expect(parseIDNumber('rp12500')).toBe(12500);
    });

    it('strips "IDR 1.250.000" → 1250000', () => {
      expect(parseIDNumber('IDR 1.250.000')).toBe(1250000);
    });
  });

  describe('Edge cases and invalid input', () => {
    it('returns NaN for null', () => {
      expect(parseIDNumber(null)).toBeNaN();
    });

    it('returns NaN for undefined', () => {
      expect(parseIDNumber(undefined)).toBeNaN();
    });

    it('returns NaN for empty string', () => {
      expect(parseIDNumber('')).toBeNaN();
    });

    it('returns NaN for whitespace-only string', () => {
      expect(parseIDNumber('   ')).toBeNaN();
    });

    it('returns NaN for non-numeric text', () => {
      expect(parseIDNumber('abc')).toBeNaN();
    });

    it('returns NaN for Infinity', () => {
      expect(parseIDNumber(Infinity)).toBeNaN();
      expect(parseIDNumber(-Infinity)).toBeNaN();
    });

    it('returns NaN for NaN input', () => {
      expect(parseIDNumber(NaN)).toBeNaN();
    });

    it('trims whitespace: "  12.500  " → 12500', () => {
      expect(parseIDNumber('  12.500  ')).toBe(12500);
    });
  });
});

describe('W2-01: parseIDNumberSafe', () => {
  it('returns the parsed number on success', () => {
    expect(parseIDNumberSafe('12.500')).toBe(12500);
  });

  it('returns 0 (default fallback) on failure', () => {
    expect(parseIDNumberSafe(null)).toBe(0);
    expect(parseIDNumberSafe('')).toBe(0);
    expect(parseIDNumberSafe('abc')).toBe(0);
  });

  it('returns custom fallback on failure', () => {
    expect(parseIDNumberSafe(null, -1)).toBe(-1);
    expect(parseIDNumberSafe('', 999)).toBe(999);
  });
});

describe('W2-01: formatIDR', () => {
  it('formats 12500 → "Rp 12.500"', () => {
    expect(formatIDR(12500)).toBe('Rp 12.500');
  });

  it('formats 0 → "Rp 0"', () => {
    expect(formatIDR(0)).toBe('Rp 0');
  });

  it('formats 1250000 → "Rp 1.250.000"', () => {
    expect(formatIDR(1250000)).toBe('Rp 1.250.000');
  });

  it('formats without prefix when prefix=false', () => {
    expect(formatIDR(12500, { prefix: false })).toBe('12.500');
  });

  it('formats with decimals when showDecimal=true', () => {
    expect(formatIDR(12500.75, { showDecimal: true })).toBe('Rp 12.500,75');
  });

  it('rounds decimal to integer by default', () => {
    expect(formatIDR(12500.75)).toBe('Rp 12.501');
  });

  it('handles null/undefined → "Rp 0"', () => {
    expect(formatIDR(null)).toBe('Rp 0');
    expect(formatIDR(undefined)).toBe('Rp 0');
  });

  it('handles NaN → "Rp 0"', () => {
    expect(formatIDR(NaN)).toBe('Rp 0');
    expect(formatIDR('not-a-number')).toBe('Rp 0');
  });

  it('handles string input by parsing first', () => {
    expect(formatIDR('12.500')).toBe('Rp 12.500');
    expect(formatIDR('1.250.000,50', { showDecimal: true })).toBe('Rp 1.250.000,5');
  });

  it('formats negative numbers', () => {
    expect(formatIDR(-5000)).toBe('Rp -5.000');
  });
});
