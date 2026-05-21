/* ═══════════════════════════════════════════════════════════
   Storage Service — ClearTask
   Centralized localStorage wrapper with JSON auto-parse/stringify,
   error propagation, and QuotaExceededError handling.
   ═══════════════════════════════════════════════════════════ */

/**
 * Read and parse a value from localStorage.
 * @param {string} key
 * @returns {*} Parsed value, or null if key doesn't exist or parse fails
 */
export function getItem(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Stringify and write a value to localStorage.
 * Throws on QuotaExceededError — callers MUST handle this.
 * @param {string} key
 * @param {*} value
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('local-storage-update'));
  } catch (e) {
    // Propagate QuotaExceededError — do NOT swallow
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      throw new Error(`Storage penuh! Tidak bisa menyimpan data "${key}". Silakan bersihkan data yang tidak diperlukan.`);
    }
    throw e;
  }
}

/**
 * Remove a key from localStorage.
 * @param {string} key
 */
export function removeItem(key) {
  localStorage.removeItem(key);
  window.dispatchEvent(new Event('local-storage-update'));
}

/**
 * Clear all localStorage data.
 */
export function clear() {
  localStorage.clear();
  window.dispatchEvent(new Event('local-storage-update'));
}

const storageService = { getItem, setItem, removeItem, clear };
export default storageService;
