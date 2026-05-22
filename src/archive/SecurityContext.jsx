import { createContext, useContext, useState } from 'react';
import { deriveKey, generateSalt } from '../utils/crypto';
import { useSettings } from './SettingsContext';
import db from '../services/db';

const SecurityContext = createContext();

export function SecurityProvider({ children }) {
  const { settings, saveSettings } = useSettings();
  const [cryptoKey, setCryptoKey] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Salt PBKDF2 untuk derivasi kunci enkripsi.
   *
   * ⚠️ CATATAN KEAMANAN: Salt adalah nilai PUBLIC by design (RFC 2898).
   * Salt BUKAN rahasia — fungsinya hanya untuk mencegah serangan rainbow table.
   * Yang rahasia adalah PIN kasir itu sendiri, yang TIDAK pernah disimpan.
   * Kunci enkripsi (cryptoKey) hanya hidup di RAM selama sesi aktif.
   */
  const isPinSet = Boolean(settings?.securitySalt);

  const setupPin = async (pin) => {
    try {
      const newSalt = generateSalt();
      const key = await deriveKey(pin, newSalt);
      await saveSettings({ ...settings, securitySalt: newSalt });
      setCryptoKey(key);
      setIsUnlocked(true);
      setError(null);
    } catch (err) {
      setError('Gagal setup PIN: ' + err.message);
    }
  };

  const login = async (pin) => {
    try {
      if (!settings?.securitySalt) throw new Error('PIN belum diatur');
      const key = await deriveKey(pin, settings.securitySalt);
      setCryptoKey(key);
      setIsUnlocked(true);
      setError(null);
    } catch (err) {
      setError('PIN salah');
      throw err; // Lempar error agar komponen UI bisa menangkapnya
    }
  };

  const logout = () => {
    setCryptoKey(null);
    setIsUnlocked(false);
  };

  /**
   * Reset semua data IndexedDB dan hapus PIN.
   * Digunakan saat kasir lupa PIN — satu-satunya cara membuka kunci.
   * @returns {Promise<void>}
   */
  const resetAllData = async () => {
    try {
      // Hapus semua tabel IndexedDB
      await db.transaction(
        'rw',
        [db.transactions, db.sessions, db.inventory, db.categories, db.settings, db.meta],
        async () => {
          await Promise.all([
            db.transactions.clear(),
            db.sessions.clear(),
            db.inventory.clear(),
            db.categories.clear(),
            db.settings.clear(),
            db.meta.clear(),
          ]);
        }
      );
      // Hapus flag migrasi localStorage agar migration bisa jalan ulang jika perlu
      try {
        localStorage.removeItem('cleartask_migrated_to_idb');
      } catch {
        /* ignore */
      }
      // Reset state security
      setCryptoKey(null);
      setIsUnlocked(false);
      setError(null);
    } catch (err) {
      setError('Gagal reset data: ' + err.message);
      throw err;
    }
  };

  // ── TESTING ONLY: Bypass PIN ─────────────────────────────
  // Hanya tersedia di development build (import.meta.env.DEV).
  // Di production build, fungsi ini tidak di-expose ke context
  // sehingga tidak bisa dieksploitasi via XSS atau ekstensi browser.
  const injectKeyForTesting = (key) => {
    setCryptoKey(key);
    setIsUnlocked(true);
  };

  return (
    <SecurityContext.Provider
      value={{
        isUnlocked,
        isPinSet,
        cryptoKey,
        error,
        setupPin,
        login,
        logout,
        resetAllData,
        // injectKeyForTesting hanya tersedia di DEV — tidak bocor ke production
        ...(import.meta.env.DEV ? { injectKeyForTesting } : {}),
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSecurity() {
  return useContext(SecurityContext);
}
