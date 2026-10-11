/* ═══════════════════════════════════════════════════════════
   W4-01 — qtyUtils Tests
   
   Tests untuk qty desimal support (timbangan, buah, sayur).
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import {
  formatQty,
  isValidQty,
  parseQty,
  roundQty,
  needsDecimalQty,
  getQtyStep,
  formatQtyWithUnit,
} from '../utils/qtyUtils';

describe('W4-01: Qty Desimal Utils', () => {
  describe('formatQty', () => {
    it('formats integer qty without decimals', () => {
      expect(formatQty(5)).toBe('5');
      expect(formatQty(100)).toBe('100');
      expect(formatQty(1)).toBe('1');
    });

    it('formats decimal qty with comma separator', () => {
      expect(formatQty(0.5)).toBe('0,5');
      expect(formatQty(1.25)).toBe('1,25');
      expect(formatQty(0.57)).toBe('0,57');
    });

    it('removes trailing zeros', () => {
      expect(formatQty(1.5)).toBe('1,5');
      expect(formatQty(2.0)).toBe('2');
      expect(formatQty(0.10)).toBe('0,1');
    });

    it('respects maxDecimals parameter', () => {
      expect(formatQty(1.23456, 2)).toBe('1,23');
      expect(formatQty(0.5555, 1)).toBe('0,6');
      expect(formatQty(3.14159, 3)).toBe('3,142');
    });

    it('handles zero and edge cases', () => {
      expect(formatQty(0)).toBe('0');
      expect(formatQty(null)).toBe('0');
      expect(formatQty(undefined)).toBe('0');
      expect(formatQty('')).toBe('0');
    });

    it('parses string input correctly', () => {
      expect(formatQty('5')).toBe('5');
      expect(formatQty('0,5')).toBe('0,5');
      expect(formatQty('1,25')).toBe('1,25');
    });
  });

  describe('isValidQty', () => {
    it('returns true for positive numbers', () => {
      expect(isValidQty(1)).toBe(true);
      expect(isValidQty(0.5)).toBe(true);
      expect(isValidQty(100)).toBe(true);
      expect(isValidQty(0.001)).toBe(true);
    });

    it('returns false for zero or negative', () => {
      expect(isValidQty(0)).toBe(false);
      expect(isValidQty(-1)).toBe(false);
      expect(isValidQty(-0.5)).toBe(false);
    });

    it('returns false for invalid values', () => {
      expect(isValidQty(null)).toBe(false);
      expect(isValidQty(undefined)).toBe(false);
      expect(isValidQty(NaN)).toBe(false);
      expect(isValidQty(Infinity)).toBe(false);
      expect(isValidQty('')).toBe(false);
      expect(isValidQty('abc')).toBe(false);
    });

    it('validates string input correctly', () => {
      expect(isValidQty('5')).toBe(true);
      expect(isValidQty('0,5')).toBe(true);
      expect(isValidQty('0')).toBe(false);
      expect(isValidQty('-1')).toBe(false);
    });
  });

  describe('parseQty', () => {
    it('parses Indonesian decimal format', () => {
      expect(parseQty('0,5')).toBe(0.5);
      expect(parseQty('1,25')).toBe(1.25);
      expect(parseQty('3,5')).toBe(3.5);
    });

    it('parses integer strings', () => {
      expect(parseQty('5')).toBe(5);
      expect(parseQty('100')).toBe(100);
      expect(parseQty('1')).toBe(1);
    });

    it('parses numbers with thousand separators', () => {
      expect(parseQty('12.500')).toBe(12500);
      expect(parseQty('1.250.000,5')).toBe(1250000.5);
    });

    it('passes through number type', () => {
      expect(parseQty(5)).toBe(5);
      expect(parseQty(0.5)).toBe(0.5);
      expect(parseQty(100)).toBe(100);
    });

    it('returns NaN for invalid input', () => {
      expect(parseQty(null)).toBeNaN();
      expect(parseQty(undefined)).toBeNaN();
      expect(parseQty('')).toBeNaN();
      expect(parseQty('abc')).toBeNaN();
    });
  });

  describe('roundQty', () => {
    it('rounds to specified precision', () => {
      expect(roundQty(1.23456, 2)).toBe(1.23);
      expect(roundQty(0.5555, 1)).toBe(0.6);
      expect(roundQty(3.14159, 3)).toBe(3.142);
    });

    it('defaults to 3 decimal places', () => {
      expect(roundQty(1.23456)).toBe(1.235);
      expect(roundQty(0.5555)).toBe(0.556);
    });

    it('handles integers without change', () => {
      expect(roundQty(5, 2)).toBe(5);
      expect(roundQty(100, 3)).toBe(100);
    });

    it('returns 0 for invalid input', () => {
      expect(roundQty(NaN)).toBe(0);
      expect(roundQty(Infinity)).toBe(0);
      expect(roundQty(-Infinity)).toBe(0);
    });
  });

  describe('needsDecimalQty', () => {
    it('returns true for weight units', () => {
      expect(needsDecimalQty('kg')).toBe(true);
      expect(needsDecimalQty('Kg')).toBe(true);
      expect(needsDecimalQty('KG')).toBe(true);
      expect(needsDecimalQty('gram')).toBe(true);
      expect(needsDecimalQty('gr')).toBe(true);
    });

    it('returns true for volume units', () => {
      expect(needsDecimalQty('liter')).toBe(true);
      expect(needsDecimalQty('ml')).toBe(true);
      expect(needsDecimalQty('Liter')).toBe(true);
    });

    it('returns true for length units', () => {
      expect(needsDecimalQty('meter')).toBe(true);
      expect(needsDecimalQty('m')).toBe(true);
      expect(needsDecimalQty('Meter')).toBe(true);
    });

    it('returns false for piece units', () => {
      expect(needsDecimalQty('Pcs')).toBe(false);
      expect(needsDecimalQty('pcs')).toBe(false);
      expect(needsDecimalQty('box')).toBe(false);
      expect(needsDecimalQty('pack')).toBe(false);
      expect(needsDecimalQty('unit')).toBe(false);
    });

    it('returns false for null or undefined', () => {
      expect(needsDecimalQty(null)).toBe(false);
      expect(needsDecimalQty(undefined)).toBe(false);
      expect(needsDecimalQty('')).toBe(false);
    });
  });

  describe('getQtyStep', () => {
    it('returns 0.001 for decimal units', () => {
      expect(getQtyStep('kg')).toBe(0.001);
      expect(getQtyStep('liter')).toBe(0.001);
      expect(getQtyStep('meter')).toBe(0.001);
    });

    it('returns 1 for piece units', () => {
      expect(getQtyStep('Pcs')).toBe(1);
      expect(getQtyStep('box')).toBe(1);
      expect(getQtyStep('pack')).toBe(1);
    });

    it('returns 1 for null or undefined', () => {
      expect(getQtyStep(null)).toBe(1);
      expect(getQtyStep(undefined)).toBe(1);
      expect(getQtyStep('')).toBe(1);
    });
  });

  describe('formatQtyWithUnit', () => {
    it('formats qty with unit', () => {
      expect(formatQtyWithUnit(5, 'Pcs')).toBe('5 Pcs');
      expect(formatQtyWithUnit(0.5, 'kg')).toBe('0,5 kg');
      expect(formatQtyWithUnit(1.25, 'liter')).toBe('1,25 liter');
    });

    it('handles integer qty', () => {
      expect(formatQtyWithUnit(10, 'box')).toBe('10 box');
      expect(formatQtyWithUnit(100, 'unit')).toBe('100 unit');
    });

    it('works without unit', () => {
      expect(formatQtyWithUnit(5)).toBe('5');
      expect(formatQtyWithUnit(0.5, null)).toBe('0,5');
      expect(formatQtyWithUnit(1.25, '')).toBe('1,25');
    });

    it('handles invalid qty gracefully', () => {
      expect(formatQtyWithUnit(null, 'Pcs')).toBe('0 Pcs');
      expect(formatQtyWithUnit(undefined, 'kg')).toBe('0 kg');
      expect(formatQtyWithUnit('', 'liter')).toBe('0 liter');
    });
  });
});
