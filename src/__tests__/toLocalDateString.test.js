/* ═══════════════════════════════════════════════════════════
   Tests: toLocalDateString — ClearTask
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import { toLocalDateString } from '../utils/formatters';
import fc from 'fast-check';

describe('toLocalDateString', () => {
  it('returns YYYY-MM-DD based on local timezone', () => {
    // 2024-01-15 01:00 WIB (UTC+7) = 2024-01-14 18:00 UTC
    // toISOString would give 2024-01-14, but local should give 2024-01-15
    const d = new Date(2024, 0, 15, 1, 0, 0); // local: Jan 15
    expect(toLocalDateString(d)).toBe('2024-01-15');
  });

  it('pads month and day with leading zeros', () => {
    const d = new Date(2024, 2, 5); // March 5
    expect(toLocalDateString(d)).toBe('2024-03-05');
  });

  it('throws TypeError for non-Date input', () => {
    expect(() => toLocalDateString('2024-01-15')).toThrow(TypeError);
    expect(() => toLocalDateString(null)).toThrow(TypeError);
    expect(() => toLocalDateString(123)).toThrow(TypeError);
  });

  it('throws TypeError for invalid Date', () => {
    expect(() => toLocalDateString(new Date('invalid'))).toThrow(TypeError);
  });

  it('property: matches YYYY-MM-DD from getFullYear/getMonth/getDate for any valid date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
        (date) => {
          if (isNaN(date.getTime())) return true;
          const result = toLocalDateString(date);
          // Verify format is YYYY-MM-DD
          const match = result.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (!match) return false;
          // Verify components match the date's local values
          return (
            Number(match[1]) === date.getFullYear() &&
            Number(match[2]) === date.getMonth() + 1 &&
            Number(match[3]) === date.getDate()
          );
        }
      ),
      { numRuns: 200 }
    );
  });
});
