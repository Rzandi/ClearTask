/**
 * Unit Tests — ConfirmDialog.jsx
 *
 * Validates: Requirements 6.2, 6.3, 6.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '../components/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    message: 'Apakah Anda yakin ingin menghapus transaksi TRX-00001?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 11.1: Pesan konfirmasi ditampilkan dengan benar
  it('11.1: menampilkan pesan konfirmasi dengan benar', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText(defaultProps.message)).toBeTruthy();
  });

  // 11.2: Tombol "Hapus" dan "Batal" ada
  it('11.2: menampilkan tombol "Hapus" dan "Batal"', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeTruthy();
  });

  // 11.3: Klik tombol Hapus memanggil onConfirm
  it('11.3: klik tombol Hapus memanggil onConfirm', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  // 11.4: Klik tombol Batal memanggil onCancel
  it('11.4: klik tombol Batal memanggil onCancel', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  // 11.5: Tekan Escape memanggil onCancel
  it('11.5: tekan Escape memanggil onCancel', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  // 11.6: isOpen=false → komponen return null (data-testid tidak ada di DOM)
  it('11.6: isOpen=false → komponen tidak dirender (return null)', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(document.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });
});
