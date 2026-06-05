/* eslint-disable react-refresh/only-export-components */
/* ═══════════════════════════════════════════════════════════
   SettingsContext — ClearTask
   Sumber kebenaran tunggal untuk preferensi pengguna (Dexie LiveQuery).
   ═══════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';

import {
  defaultSettings,
  VALID_ACCENT_COLORS,
  applyThemeToDOM,
  type AppSettings,
} from '../config/settingsConfig';

export interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  saveSettings: (newSettings: AppSettings) => Promise<void>;
  openSettingsSnapshot: () => void;
  rollbackSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const rawSettings = useLiveQuery(() =>
    db.settings.get({ key: 'main' }).then((res) => res || null)
  );
  const snapshotRef = useRef<AppSettings | null>(null);

  const settings =
    rawSettings === undefined
      ? undefined // Means still loading
      : {
          ...defaultSettings,
          ...(rawSettings || {}),
          theme: ['dark', 'light'].includes(rawSettings?.theme)
            ? rawSettings.theme
            : defaultSettings.theme,
          accentColor: VALID_ACCENT_COLORS.includes(rawSettings?.accentColor)
            ? rawSettings.accentColor
            : defaultSettings.accentColor,
        };

  const theme = settings?.theme;
  const accentColor = settings?.accentColor;

  useEffect(() => {
    if (theme && accentColor) {
      applyThemeToDOM(theme, accentColor);
    }
  }, [theme, accentColor]);

  async function updateSettings(partial: Partial<AppSettings>) {
    if (!settings) return;
    const newSettings = { ...settings, ...partial };
    await db.settings.put({ key: 'main', ...newSettings });
  }

  async function saveSettings(newSettings: AppSettings) {
    try {
      await db.settings.put({ key: 'main', ...newSettings });
    } catch (e) {
      console.error('[Settings] Gagal menyimpan pengaturan:', e);
      throw e;
    }
  }

  function openSettingsSnapshot() {
    if (settings) {
      snapshotRef.current = { ...settings };
    }
  }

  async function rollbackSettings() {
    if (!snapshotRef.current) return;
    const snapshot = snapshotRef.current;
    await db.settings.put({ key: 'main', ...snapshot });
    snapshotRef.current = null;
  }

  if (settings === undefined) {
    return <div style={{ display: 'flex', height: '100vh', background: '#0a0a0f' }} />;
  }

  const value = {
    settings,
    updateSettings,
    saveSettings,
    openSettingsSnapshot,
    rollbackSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (ctx === null) {
    throw new Error('useSettings harus digunakan di dalam SettingsProvider');
  }
  return ctx;
}
