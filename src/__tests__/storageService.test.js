/* ═══════════════════════════════════════════════════════════
   Tests: storageService — ClearTask
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getItem, setItem, removeItem, clear } from '../services/storageService';

beforeEach(() => localStorage.clear());

describe('storageService', () => {
  describe('round-trip: setItem → getItem', () => {
    it('stores and retrieves an object', () => {
      const data = { name: 'test', count: 42, nested: { ok: true } };
      setItem('test_key', data);
      expect(getItem('test_key')).toEqual(data);
    });

    it('stores and retrieves an array', () => {
      const arr = [1, 'two', { three: 3 }];
      setItem('arr_key', arr);
      expect(getItem('arr_key')).toEqual(arr);
    });

    it('stores and retrieves primitive values', () => {
      setItem('str_key', 'hello');
      setItem('num_key', 123);
      setItem('bool_key', true);
      setItem('null_key', null);
      expect(getItem('str_key')).toBe('hello');
      expect(getItem('num_key')).toBe(123);
      expect(getItem('bool_key')).toBe(true);
      expect(getItem('null_key')).toBe(null); // JSON null → null
    });
  });

  describe('getItem edge cases', () => {
    it('returns null for non-existent key', () => {
      expect(getItem('nonexistent')).toBe(null);
    });

    it('returns null for corrupted JSON', () => {
      localStorage.setItem('bad_json', '{invalid json}');
      expect(getItem('bad_json')).toBe(null);
    });
  });

  describe('setItem QuotaExceededError', () => {
    it('throws on QuotaExceededError', () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const original = localStorage.setItem;
      const err = new DOMException('quota exceeded', 'QuotaExceededError');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw err; });

      expect(() => setItem('key', 'value')).toThrow(/Storage penuh/);

      Storage.prototype.setItem = original;
      vi.restoreAllMocks();
    });
  });

  describe('removeItem', () => {
    it('removes a key', () => {
      setItem('to_remove', 'value');
      expect(getItem('to_remove')).toBe('value');
      removeItem('to_remove');
      expect(getItem('to_remove')).toBe(null);
    });
  });

  describe('clear', () => {
    it('clears all keys', () => {
      setItem('a', 1);
      setItem('b', 2);
      clear();
      expect(getItem('a')).toBe(null);
      expect(getItem('b')).toBe(null);
    });
  });
});
