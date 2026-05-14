/* ═══════════════════════════════════════════════════════════
   SettingsContext.test.jsx — Unit tests untuk SettingsContext
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  SettingsProvider,
  useSettings,
  defaultSettings,
  VALID_ACCENT_COLORS,
} from './SettingsContext';

// ─── Wrapper helper ───────────────────────────────────────────────────────────

function wrapper({ children }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  // Reset class pada documentElement
  document.documentElement.className = '';
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettingsContext', () => {
  it('1. Render dengan localStorage kosong → state default', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.settings.kasirName).toBe('Admin');
    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.accentColor).toBe('#00ffa3');
    expect(result.current.settings.tokoName).toBe('');
  });

  it('2. Render dengan localStorage valid → state sesuai data tersimpan', () => {
    const saved = {
      kasirName: 'Budi',
      tokoName: 'Toko Maju',
      theme: 'light',
      accentColor: '#58a6ff',
    };
    localStorage.setItem('cleartask_settings', JSON.stringify(saved));

    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.settings.kasirName).toBe('Budi');
    expect(result.current.settings.tokoName).toBe('Toko Maju');
    expect(result.current.settings.theme).toBe('light');
    expect(result.current.settings.accentColor).toBe('#58a6ff');
  });

  it('3. Render dengan localStorage corrupt (bukan JSON valid) → state default', () => {
    localStorage.setItem('cleartask_settings', 'ini bukan json {{{');

    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.settings).toEqual(defaultSettings);
  });

  it('4. accentColor tidak valid di localStorage → fallback ke #00ffa3', () => {
    const invalid = {
      kasirName: 'Siti',
      tokoName: '',
      theme: 'dark',
      accentColor: '#ff0000', // tidak ada di VALID_ACCENT_COLORS
    };
    localStorage.setItem('cleartask_settings', JSON.stringify(invalid));

    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.settings.accentColor).toBe('#00ffa3');
  });

  it('5. saveSettings menyimpan ke localStorage dan update state', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    const newSettings = {
      kasirName: 'Rina',
      tokoName: 'Warung Rina',
      theme: 'light',
      accentColor: '#bc8cff',
    };

    act(() => {
      result.current.saveSettings(newSettings);
    });

    expect(result.current.settings).toEqual(newSettings);

    const stored = JSON.parse(localStorage.getItem('cleartask_settings'));
    expect(stored).toEqual(newSettings);
  });

  it('6. rollbackSettings tanpa snapshot sebelumnya → no-op (state tidak berubah)', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    const stateBefore = { ...result.current.settings };

    act(() => {
      result.current.rollbackSettings();
    });

    expect(result.current.settings).toEqual(stateBefore);
  });

  it('7. updateSettings({ theme: "dark" }) → class dark ada di document.documentElement', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    act(() => {
      result.current.updateSettings({ theme: 'dark' });
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('8. updateSettings({ theme: "light" }) → class dark tidak ada di document.documentElement', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    act(() => {
      result.current.updateSettings({ theme: 'light' });
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
