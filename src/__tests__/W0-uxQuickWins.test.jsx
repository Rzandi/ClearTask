import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';
import StrukModal from '../components/StrukModal';
import { SHORTCUTS, SHORTCUT_LIST_FOR_UI } from '../constants/shortcuts';
import * as SettingsModule from '../contexts/SettingsContext';

describe('W0 UX Quick Wins Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = '';
  });

  describe('W0-05: F-key hijacking input focus (#14)', () => {
    it('1. F1 opens Help/Hotkey modal immediately without confirmation even when inside an input', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.querySelector('input')).not.toBeNull();
      });
      const input = document.querySelector('input');
      input?.focus();

      fireEvent.keyDown(input, { key: 'F1' });

      await waitFor(() => {
        expect(screen.getByText('Global Keyboard Shortcuts')).toBeInTheDocument();
      });
    });

    it('2. F-keys (F2, F3, F4) inside input show ConfirmDialog instead of instant navigation', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.querySelector('input')).not.toBeNull();
      });
      const input = document.querySelector('input');
      input?.focus();

      // Press F3 inside input
      fireEvent.keyDown(input, { key: 'F3' });

      // ConfirmDialog should appear with warning
      await waitFor(() => {
        expect(screen.getByText('Konfirmasi Navigasi')).toBeInTheDocument();
        expect(
          screen.getByText(/Anda sedang mengetik\. Yakin ingin Pindah ke Database \(F3\)\?/i)
        ).toBeInTheDocument();
      });

      // Click "Lanjutkan"
      const continueBtn = screen.getByRole('button', { name: 'Lanjutkan' });
      fireEvent.click(continueBtn);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Konfirmasi Navigasi')).not.toBeInTheDocument();
      });
    });

    it('3. F-keys when focus is NOT inside an input execute immediately without confirmation', async () => {
      render(<App />);

      // Focus on body
      document.body.focus();

      fireEvent.keyDown(window, { key: 'F3' });

      // No confirmation dialog shown
      expect(screen.queryByText('Konfirmasi Navigasi')).not.toBeInTheDocument();
    });
  });

  describe('W0-06: Ctrl+Enter checkout and Ctrl+K removal (#18)', () => {
    it('1. Command palette (Ctrl+K) is removed from UI shortcut cheat sheet', () => {
      const keysInUI = SHORTCUT_LIST_FOR_UI.map((s) => s.key);
      expect(keysInUI).not.toContain('k');
      expect(SHORTCUT_LIST_FOR_UI.some((s) => s.label.includes('Command Palette'))).toBe(false);
    });

    it('2. Ctrl + Enter definition exists in SHORTCUTS', () => {
      expect(SHORTCUTS.CHECKOUT).toBeDefined();
      expect(SHORTCUTS.CHECKOUT.display).toContain('Ctrl + Enter');
    });
  });

  describe('W0-07: Dummy address/phone on receipt (#11)', () => {
    const sampleOrder = {
      id: 1,
      transactionId: 'TRX-12345',
      tanggal: '2026-10-04',
      kasir: 'Admin',
      metode: 'Tunai',
      total: 25000,
      uangDiterima: 30000,
      kembalian: 5000,
      createdAt: '2026-10-04T10:00:00.000Z',
      items: [{ namaBarang: 'Teh Manis', qty: 1, hargaSatuan: 25000, total: 25000 }],
    };

    it('1. Shows placeholder hint in preview and excludes dummy info when address/phone empty', () => {
      render(<StrukModal order={sampleOrder} onClose={vi.fn()} />);

      // Should show hint for missing address & phone
      expect(screen.getByText(/Alamat belum diatur - isi di Pengaturan/i)).toBeInTheDocument();
      expect(
        screen.getByText(/No\. Telepon belum diatur - isi di Pengaturan/i)
      ).toBeInTheDocument();

      // Must not display old dummy address
      expect(screen.queryByText('Jl. Contoh Alamat No. 123')).not.toBeInTheDocument();
      expect(screen.queryByText('0812-3456-7890')).not.toBeInTheDocument();
    });
  });

  describe('W0-08: Outdoor mode persistence across reload (#19)', () => {
    it('1. Alt+O triggers updateSettings with toggled outdoorMode', async () => {
      const mockUpdateSettings = vi.fn();
      vi.spyOn(SettingsModule, 'useSettings').mockReturnValue({
        settings: {
          kasirName: 'Admin',
          tokoName: 'Toko Test',
          theme: 'dark',
          accentColor: '#00ffa3',
          outdoorMode: false,
        },
        updateSettings: mockUpdateSettings,
        saveSettings: vi.fn(),
        openSettingsSnapshot: vi.fn(),
        rollbackSettings: vi.fn(),
      });

      render(<App />);

      fireEvent.keyDown(window, { key: 'o', altKey: true });

      expect(mockUpdateSettings).toHaveBeenCalledWith({ outdoorMode: true });
    });
  });
});
