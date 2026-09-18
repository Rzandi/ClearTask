/* ═══════════════════════════════════════════════════════════
   errorMessages.test.js — ClearTask
   Sprint 6 S6.3: Unit test untuk getDexieErrorMessage utility.
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import { getDexieErrorMessage } from '../utils/errorMessages';

// ═══════════════════════════════════════════════════════════
// Known Dexie Error Types
// ═══════════════════════════════════════════════════════════

describe('getDexieErrorMessage — known error types', () => {
  it('QuotaExceededError by name → pesan penyimpanan penuh', () => {
    const err = Object.assign(new Error('storage full'), { name: 'QuotaExceededError' });
    const msg = getDexieErrorMessage(err);
    expect(msg).toMatch(/Penyimpanan Penuh/i);
    expect(msg).toMatch(/backup/i);
  });

  it('Error dengan message QuotaExceededError → pesan penyimpanan penuh', () => {
    const err = new Error('QuotaExceededError: no space left');
    const msg = getDexieErrorMessage(err);
    expect(msg).toMatch(/Penyimpanan Penuh/i);
  });

  it('Error dengan inner.name QuotaExceededError → pesan penyimpanan penuh', () => {
    const err = Object.assign(new Error('wrapped'), {
      name: 'DexieError',
      inner: { name: 'QuotaExceededError' },
    });
    const msg = getDexieErrorMessage(err);
    expect(msg).toMatch(/Penyimpanan Penuh/i);
  });

  it('ConstraintError → pesan data duplikat', () => {
    const err = Object.assign(new Error('constraint'), { name: 'ConstraintError' });
    const msg = getDexieErrorMessage(err);
    expect(msg).toMatch(/duplikat/i);
  });

  it('AbortError → pesan operasi dibatalkan', () => {
    const err = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const msg = getDexieErrorMessage(err);
    expect(msg).toMatch(/dibatalkan/i);
  });

  it('InvalidStateError → pesan upgrade database', () => {
    const err = Object.assign(new Error('invalid state'), { name: 'InvalidStateError' });
    const msg = getDexieErrorMessage(err);
    expect(msg).toMatch(/upgrade/i);
  });

  it('VersionError → pesan versi tidak kompatibel', () => {
    const err = Object.assign(new Error('version mismatch'), { name: 'VersionError' });
    const msg = getDexieErrorMessage(err);
    expect(msg).toMatch(/kompatibel/i);
  });

  it('NotSupportedError → pesan browser tidak mendukung', () => {
    const err = Object.assign(new Error('not supported'), { name: 'NotSupportedError' });
    const msg = getDexieErrorMessage(err);
    expect(msg).toMatch(/browser/i);
  });

  it('UnknownError → pesan browser tidak mendukung', () => {
    const err = Object.assign(new Error('unknown'), { name: 'UnknownError' });
    const msg = getDexieErrorMessage(err);
    expect(msg).toMatch(/browser/i);
  });
});

// ═══════════════════════════════════════════════════════════
// Fallback untuk error tidak dikenal
// ═══════════════════════════════════════════════════════════

describe('getDexieErrorMessage — fallback behavior', () => {
  it('Error biasa tanpa name khusus → return err.message', () => {
    const err = new Error('custom error message');
    const msg = getDexieErrorMessage(err);
    expect(msg).toBe('custom error message');
  });

  it('Error dengan message kosong → return fallback string', () => {
    const err = Object.assign(new Error(''), { name: 'SomeOtherError' });
    const msg = getDexieErrorMessage(err);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('non-Error (string) → return fallback string', () => {
    const msg = getDexieErrorMessage('plain string error');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('non-Error (number) → return fallback string', () => {
    const msg = getDexieErrorMessage(42);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('null → return fallback string', () => {
    const msg = getDexieErrorMessage(null);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('undefined → return fallback string', () => {
    const msg = getDexieErrorMessage(undefined);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════
// Return type selalu string
// ═══════════════════════════════════════════════════════════

describe('getDexieErrorMessage — selalu return string', () => {
  const cases = [
    new Error('test'),
    Object.assign(new Error(''), { name: 'QuotaExceededError' }),
    Object.assign(new Error(''), { name: 'ConstraintError' }),
    Object.assign(new Error(''), { name: 'AbortError' }),
    null,
    undefined,
    0,
    {},
    [],
  ];

  cases.forEach((input, idx) => {
    it(`case ${idx}: return type adalah string`, () => {
      const result = getDexieErrorMessage(input);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
