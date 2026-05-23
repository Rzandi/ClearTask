/* ═══════════════════════════════════════════════════════════
   crypto.js — ClearTask
   Modul Kriptografi Client-Side dengan Web Crypto API
   Menggunakan PBKDF2 untuk derive key dan AES-GCM untuk enkripsi
   ═══════════════════════════════════════════════════════════ */

/**
 * Menghasilkan salt acak 16-byte (direpresentasikan sebagai string hex)
 * @returns {string} Hex string (32 karakter)
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Mengonversi hex string menjadi Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g);
  if (!match) throw new Error('Format kunci enkripsi tidak valid');
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

/**
 * Konversi Uint8Array ke string Base64 yang aman untuk IndexedDB
 */
function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binString);
}

/**
 * Konversi string Base64 ke Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
}

/**
 * Menurunkan kunci (CryptoKey) dari PIN dan Salt menggunakan PBKDF2
 * @param {string} pin PIN kasir
 * @param {string} saltHex Salt dari Settings
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(pin: string, saltHex: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex) as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // false = kunci tidak bisa di-ekstrak (secure di RAM)
    ['encrypt', 'decrypt']
  );
}

/**
 * Mengenkripsi string JSON menjadi format Base64 (IV + Ciphertext)
 * @param {string} dataStr Teks yang akan dienkripsi
 * @param {CryptoKey} key Kunci AES-GCM
 * @returns {Promise<string>} Format Base64 yang menyimpan IV dan Cipher
 */
export async function encryptData(dataStr: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV untuk AES-GCM

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    enc.encode(dataStr)
  );

  // Gabungkan IV dan Ciphertext menjadi satu buffer
  const ciphertextBytes = new Uint8Array(ciphertext);
  const combined = new Uint8Array(iv.length + ciphertextBytes.length);
  combined.set(iv);
  combined.set(ciphertextBytes, iv.length);

  return bytesToBase64(combined);
}

/**
 * Mendekripsi format Base64 kembali menjadi string JSON
 * @param {string} base64Str Data Base64 (berisi IV dan Ciphertext)
 * @param {CryptoKey} key Kunci AES-GCM
 * @returns {Promise<string>} Teks asli hasil dekripsi
 */
export async function decryptData(base64Str: string, key: CryptoKey): Promise<string> {
  const combined = base64ToBytes(base64Str);

  // Ekstrak 12 byte pertama sebagai IV
  const iv = combined.slice(0, 12);
  const ciphertextBytes = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertextBytes
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}
