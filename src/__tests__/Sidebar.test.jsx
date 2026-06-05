/* ═══════════════════════════════════════════════════════════
   Sidebar.test.jsx — Unit tests untuk Sidebar dengan useSettings
   ═══════════════════════════════════════════════════════════ */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../components/layout/Sidebar';

// Mock useSettings dari SettingsContext
vi.mock('../contexts/SettingsContext', () => ({
  useSettings: vi.fn(),
}));

import { useSettings } from '../contexts/SettingsContext';

function renderSidebar(settingsOverride = {}) {
  useSettings.mockReturnValue({
    settings: {
      kasirName: '',
      tokoName: '',
      theme: 'dark',
      accentColor: '#00ffa3',
      ...settingsOverride,
    },
  });

  return render(<Sidebar activeTab="input" onTabChange={() => {}} onHelpOpen={() => {}} />);
}

describe('Sidebar — integrasi useSettings', () => {
  it('menampilkan kasirName jika kasirName non-kosong', () => {
    renderSidebar({ kasirName: 'Budi Santoso' });
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
  });

  it('menampilkan fallback "Admin" jika kasirName kosong', () => {
    renderSidebar({ kasirName: '' });
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('menampilkan tokoName jika tokoName non-kosong', () => {
    renderSidebar({ tokoName: 'Toko Maju Jaya' });
    expect(screen.getByText('Toko Maju Jaya')).toBeInTheDocument();
  });

  it('menampilkan "Pencatatan Penjualan" jika tokoName kosong', () => {
    renderSidebar({ tokoName: '' });
    expect(screen.getByText('Pencatatan Penjualan')).toBeInTheDocument();
  });

  it('menampilkan inisial "B" di avatar jika kasirName = "Budi"', () => {
    renderSidebar({ kasirName: 'Budi' });
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('menampilkan inisial "A" di avatar jika kasirName kosong', () => {
    renderSidebar({ kasirName: '' });
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
