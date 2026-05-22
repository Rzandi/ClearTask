import { describe, it, expect } from 'vitest';
import { generateSalt, deriveKey, encryptData, decryptData } from '../utils/crypto';

describe('Web Crypto API Utilities', () => {
  it('generateSalt returns a 32-character hex string', () => {
    const salt = generateSalt();
    expect(typeof salt).toBe('string');
    expect(salt.length).toBe(32);
    expect(/^[0-9a-f]{32}$/.test(salt)).toBe(true);
  });

  it('can encrypt and decrypt a string with the same PIN and salt', async () => {
    const pin = '123456';
    const salt = generateSalt();
    const data = JSON.stringify({ namaBarang: 'Kopi Susu', total: 15000 });

    const key = await deriveKey(pin, salt);
    expect(key).toBeDefined();

    const ciphertext = await encryptData(data, key);
    expect(typeof ciphertext).toBe('string');
    expect(ciphertext).not.toBe(data);
    expect(ciphertext.length).toBeGreaterThan(0);

    const decrypted = await decryptData(ciphertext, key);
    expect(decrypted).toBe(data);
  });

  it('fails to decrypt if the PIN is wrong (different key)', async () => {
    const pin = '123456';
    const wrongPin = '654321';
    const salt = generateSalt();
    const data = 'Rahasia Negara';

    const key1 = await deriveKey(pin, salt);
    const key2 = await deriveKey(wrongPin, salt);

    const ciphertext = await encryptData(data, key1);

    await expect(decryptData(ciphertext, key2)).rejects.toThrow();
  });
});
