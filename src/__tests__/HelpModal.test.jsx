/* ═══════════════════════════════════════════════════════════
   HelpModal.test.jsx — ClearTask
   Unit tests untuk komponen HelpModal (Panduan & Shortcut Tab)
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HelpModal from '../components/HelpModal';

describe('HelpModal Component', () => {
  it('tidak merender apapun saat isOpen = false', () => {
    const onClose = vi.fn();
    const { container } = render(<HelpModal isOpen={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('merender panduan penggunaan secara default saat isOpen = true', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Bantuan & Panduan')).toBeInTheDocument();
    expect(screen.getByText('📖 Panduan & FAQ')).toBeInTheDocument();
    expect(screen.getByText('Fitur Cepat Kasir (Retail QOL)')).toBeInTheDocument();
  });

  it('berpindah ke tab Shortcut Keys saat tab shortcut diklik', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);

    const shortcutTabButton = screen.getByRole('tab', { name: /shortcut keys/i });
    fireEvent.click(shortcutTabButton);

    expect(screen.getByText('⚡ Akselerasi Kasir dengan Keyboard')).toBeInTheDocument();
    expect(screen.getByText('Navigasi Langsung ke POS Kasir')).toBeInTheDocument();
    expect(screen.getByText('F2')).toBeInTheDocument();
  });

  it('memanggil onClose saat tombol Tutup diklik', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Tutup' });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledOnce();
  });
});
