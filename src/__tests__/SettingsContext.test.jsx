/* ═══════════════════════════════════════════════════════════
   SettingsContext.test.jsx — Unit tests untuk SettingsContext
   (Refactored for Async Dexie)
   ═══════════════════════════════════════════════════════════ */

// Unmock the global SettingsContext mock from test-setup.js
// so we can test the real implementation here.
vi.unmock('../contexts/SettingsContext');

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext';
import db from '../services/db';
import 'fake-indexeddb/auto';

// ─── Wrapper helper ───────────────────────────────────────────────────────────

function wrapper({ children }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await db.settings.clear();
  // Reset class pada documentElement
  document.documentElement.className = '';
});

afterEach(async () => {
  await db.settings.clear();
  document.documentElement.className = '';
});

const renderHookAndReady = async () => {
  const hookResult = renderHook(() => useSettings(), { wrapper });
  await waitFor(
    () => {
      expect(hookResult.result.current.settings).toBeDefined();
    },
    { timeout: 2000 }
  );
  return hookResult;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettingsContext', () => {
  // ── 1. Render dengan db kosong → state default ──
  it('1. Render dengan db kosong → state default', async () => {
    const { result } = await renderHookAndReady();

    expect(result.current.settings.kasirName).toBe('Admin');
    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.accentColor).toBe('#00f0ff');
    expect(result.current.settings.tokoName).toBe('');
    expect(result.current.settings.appName).toBe('ClearTask');
    expect(result.current.settings.appSubtitle).toBe('Pencatatan Penjualan');
  });

  // ── 2. Render dengan db valid → state sesuai data tersimpan ──
  it('2. Render dengan db valid → state sesuai data tersimpan', async () => {
    // Siapkan data dummy di DB
    await db.settings.put({
      key: 'main',
      kasirName: 'Budi',
      tokoName: 'Toko Maju',
      appName: 'Kasir Pintar',
      appSubtitle: 'Super Cepat',
      theme: 'light',
      accentColor: '#ff3366',
    });

    const { result } = await renderHookAndReady();

    expect(result.current.settings.kasirName).toBe('Budi');
    expect(result.current.settings.tokoName).toBe('Toko Maju');
    expect(result.current.settings.appName).toBe('Kasir Pintar');
    expect(result.current.settings.appSubtitle).toBe('Super Cepat');
    expect(result.current.settings.theme).toBe('light');
    expect(result.current.settings.accentColor).toBe('#ff3366');
  });

  // ── 3. theme tidak valid di db → fallback ke dark ──
  it('3. theme tidak valid di db → fallback ke dark', async () => {
    await db.settings.put({ key: 'main', theme: 'invalid-theme' });
    const { result } = await renderHookAndReady();

    expect(result.current.settings.theme).toBe('dark');
  });

  // ── 4. accentColor tidak valid di db → fallback ke #00f0ff ──
  it('4. accentColor tidak valid di db → fallback ke #00f0ff', async () => {
    await db.settings.put({ key: 'main', accentColor: '#123456' });
    const { result } = await renderHookAndReady();

    expect(result.current.settings.accentColor).toBe('#00f0ff');
  });

  it('5. saveSettings menyimpan ke db dan update state', async () => {
    const { result } = await renderHookAndReady();

    const newSettings = {
      kasirName: 'Rina',
      tokoName: 'Warung Rina',
      theme: 'light',
      accentColor: '#bc8cff',
    };

    await act(async () => {
      await result.current.saveSettings(newSettings);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.settings.kasirName).toBe(newSettings.kasirName);
    expect(result.current.settings.theme).toBe(newSettings.theme);

    const stored = await db.settings.get({ key: 'main' });
    expect(stored.kasirName).toBe(newSettings.kasirName);
    expect(stored.theme).toBe(newSettings.theme);
  });

  it('6. rollbackSettings tanpa snapshot sebelumnya → no-op (state tidak berubah)', async () => {
    const { result } = await renderHookAndReady();

    const stateBefore = { ...result.current.settings };

    await act(async () => {
      result.current.rollbackSettings();
    });

    expect(result.current.settings.kasirName).toEqual(stateBefore.kasirName);
  });

  it('7. updateSettings({ theme: "dark" }) → class dark ada di document.documentElement', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      await result.current.updateSettings({ theme: 'dark' });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('8. updateSettings({ theme: "light" }) → class dark tidak ada di document.documentElement', async () => {
    const { result } = await renderHookAndReady();

    await act(async () => {
      await result.current.updateSettings({ theme: 'light' });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
