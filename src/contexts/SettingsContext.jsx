/* eslint-disable react-refresh/only-export-components */
/* ═══════════════════════════════════════════════════════════
   SettingsContext — ClearTask
   Sumber kebenaran tunggal untuk preferensi pengguna.
   ═══════════════════════════════════════════════════════════ */

import { createContext, useContext, useState, useEffect, useRef } from 'react';

// ─── Konstanta ────────────────────────────────────────────────────────────────

export const defaultSettings = {
  kasirName: 'Admin',
  tokoName: '',
  theme: 'dark',
  accentColor: '#00ffa3',
};

export const VALID_ACCENT_COLORS = ['#00ffa3', '#58a6ff', '#bc8cff', '#f0b429'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Baca dan validasi settings dari localStorage.
 * Kembalikan defaultSettings jika tidak ada, corrupt, atau accentColor tidak valid.
 */
export function loadFromStorage() {
  try {
    const raw = localStorage.getItem('cleartask_settings');
    if (!raw) return { ...defaultSettings };

    const parsed = JSON.parse(raw);

    // Validasi accentColor
    if (!VALID_ACCENT_COLORS.includes(parsed.accentColor)) {
      return { ...defaultSettings };
    }

    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
}

/**
 * Terapkan tema ke DOM:
 * - class `dark` / `light` pada <html>
 * - CSS custom property `--color-primary`
 */
export function applyThemeToDOM(theme, accentColor) {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  root.style.setProperty('--color-primary', accentColor);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SettingsContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => loadFromStorage());
  const snapshotRef = useRef(null);

  // Terapkan tema ke DOM setiap kali theme atau accentColor berubah
  useEffect(() => {
    applyThemeToDOM(settings.theme, settings.accentColor);
  }, [settings.theme, settings.accentColor]);

  /**
   * Update sebagian settings (real-time, tanpa simpan ke localStorage).
   * Digunakan untuk preview tema sebelum Simpan.
   */
  function updateSettings(partial) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  /**
   * Simpan settings ke localStorage dan update state.
   */
  function saveSettings(newSettings) {
    localStorage.setItem('cleartask_settings', JSON.stringify(newSettings));
    setSettings(newSettings);
  }

  /**
   * Simpan snapshot settings saat ini (sebelum modal dibuka).
   * Digunakan untuk rollback jika pengguna menekan Batal.
   */
  function openSettingsSnapshot() {
    snapshotRef.current = { ...settings };
  }

  /**
   * Kembalikan settings ke snapshot sebelum modal dibuka.
   * No-op jika snapshot belum pernah diambil.
   */
  function rollbackSettings() {
    if (snapshotRef.current === null) return;
    const snapshot = snapshotRef.current;
    setSettings(snapshot);
    applyThemeToDOM(snapshot.theme, snapshot.accentColor);
    snapshotRef.current = null;
  }

  const value = {
    settings,
    updateSettings,
    saveSettings,
    openSettingsSnapshot,
    rollbackSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (ctx === null) {
    throw new Error('useSettings harus digunakan di dalam SettingsProvider');
  }
  return ctx;
}
