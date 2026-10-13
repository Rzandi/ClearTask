/* ═══════════════════════════════════════════════════════════
   SettingsModal.test.jsx — ClearTask
   Unit tests untuk komponen SettingsModal
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModal from '../components/SettingsModal';

// ─── Mock useSettings ─────────────────────────────────────────────────────────

const mockUpdateSettings = vi.fn();
const mockSaveSettings = vi.fn();
const mockOpenSettingsSnapshot = vi.fn();
const mockRollbackSettings = vi.fn();

const defaultMockSettings = {
  kasirName: 'Admin',
  tokoName: '',
  appName: 'ClearTask',
  appSubtitle: 'Pencatatan Penjualan',
  theme: 'dark',
  accentColor: '#00f0ff',
  tokoAlamat: '',
  tokoTelepon: '',
  strukFooter: '',
  qrisImageUrl: '',
  qrisNsm: '',
  plasticBagEnabled: false,
  plasticBagPrice: 500,
};

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: defaultMockSettings,
    updateSettings: mockUpdateSettings,
    saveSettings: mockSaveSettings,
    openSettingsSnapshot: mockOpenSettingsSnapshot,
    rollbackSettings: mockRollbackSettings,
  }),
}));

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    customCategories: [],
    customSubCategoriesFor: () => [],
    deleteCategory: vi.fn(),
    deleteSubCategory: vi.fn(),
  }),
  KATEGORI_DEFAULT: [
    'Elektronik',
    'Makanan',
    'Minuman',
    'Pakaian',
    'Alat Tulis',
    'Kesehatan',
    'Lainnya',
  ],
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderModal(props = {}) {
  return render(<SettingsModal isOpen={true} onClose={vi.fn()} {...props} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: Render semua field ─────────────────────────────────────────────
  it('menampilkan field Nama Kasir, Nama Toko/Usaha, toggle tema, dan 4 swatch accent color', () => {
    renderModal();

    // Field Nama Kasir
    expect(screen.getByLabelText('Nama Kasir')).toBeInTheDocument();

    // Field Nama Toko/Usaha
    expect(screen.getByLabelText('Nama Toko/Usaha')).toBeInTheDocument();

    // Toggle tema: tombol Dark dan Light
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument();

    // Field Nama Aplikasi & Slogan
    expect(screen.getByLabelText('Nama Aplikasi')).toBeInTheDocument();
    expect(screen.getByLabelText('Slogan / Deskripsi Pendek')).toBeInTheDocument();

    // Swatch accent color presets
    expect(screen.getByRole('button', { name: 'Cobalt Pro (Default)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emerald Merchant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Amber Warm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iris Modern' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cyber Cyan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monochrome' })).toBeInTheDocument();
  });

  // ── Test 2: Klik Simpan ────────────────────────────────────────────────────
  it('klik tombol Simpan memanggil saveSettings dengan nilai yang benar', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    // Ubah nilai kasir name
    const kasirInput = screen.getByLabelText('Nama Kasir');
    fireEvent.change(kasirInput, { target: { value: 'Budi' } });

    // Ubah nilai toko name
    const tokoInput = screen.getByLabelText('Nama Toko/Usaha');
    fireEvent.change(tokoInput, { target: { value: 'Toko Maju' } });

    // Klik Simpan
    fireEvent.click(screen.getByRole('button', { name: /simpan/i }));

    expect(mockSaveSettings).toHaveBeenCalledOnce();
    expect(mockSaveSettings).toHaveBeenCalledWith({
      ...defaultMockSettings,
      kasirName: 'Budi',
      tokoName: 'Toko Maju',
      appName: 'ClearTask',
      appSubtitle: 'Pencatatan Penjualan',
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ── Test 3: Klik Batal ─────────────────────────────────────────────────────
  it('klik tombol Batal memanggil rollbackSettings', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: /batal/i }));

    expect(mockRollbackSettings).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockSaveSettings).not.toHaveBeenCalled();
  });

  // ── Test 4: Klik tombol X ─────────────────────────────────────────────────
  it('klik tombol X memanggil rollbackSettings', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    // Tombol close ada di Modal.jsx base component dengan aria-label="Tutup"
    fireEvent.click(screen.getByRole('button', { name: /^tutup$/i }));

    expect(mockRollbackSettings).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockSaveSettings).not.toHaveBeenCalled();
  });

  // ── Test 5: Klik swatch accent color ──────────────────────────────────────
  it('klik swatch accent color memanggil updateSettings secara real-time', () => {
    renderModal();

    // Klik preset Emerald Merchant
    fireEvent.click(screen.getByRole('button', { name: 'Emerald Merchant' }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ accentColor: '#10b981' });

    // Klik preset Amber Warm
    fireEvent.click(screen.getByRole('button', { name: 'Amber Warm' }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ accentColor: '#f59e0b' });

    // Klik preset Iris Modern
    fireEvent.click(screen.getByRole('button', { name: 'Iris Modern' }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ accentColor: '#8b5cf6' });

    // Klik preset Cyber Cyan
    fireEvent.click(screen.getByRole('button', { name: 'Cyber Cyan' }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ accentColor: '#06b6d4' });

    // Klik preset Cobalt Pro
    fireEvent.click(screen.getByRole('button', { name: 'Cobalt Pro (Default)' }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ accentColor: '#2563eb' });

    // saveSettings tidak dipanggil (hanya real-time update)
    expect(mockSaveSettings).not.toHaveBeenCalled();
  });

  // ── Test 6: Klik toggle tema ───────────────────────────────────────────────
  it('klik toggle tema memanggil updateSettings secara real-time', () => {
    renderModal();

    // Klik Light
    fireEvent.click(screen.getByRole('button', { name: /light/i }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ theme: 'light' });

    // Klik Dark
    fireEvent.click(screen.getByRole('button', { name: /dark/i }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ theme: 'dark' });

    // saveSettings tidak dipanggil (hanya real-time update)
    expect(mockSaveSettings).not.toHaveBeenCalled();
  });

  // ── Test tambahan: tidak render saat isOpen=false ──────────────────────────
  it('tidak merender konten saat isOpen=false', () => {
    render(<SettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
  });

  // ── Test tambahan: openSettingsSnapshot dipanggil saat modal dibuka ────────
  it('memanggil openSettingsSnapshot saat modal dibuka', () => {
    renderModal();
    expect(mockOpenSettingsSnapshot).toHaveBeenCalledOnce();
  });
});
