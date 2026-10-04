/* ═══════════════════════════════════════════════════════════
   EditExpenseModal.test.jsx — ClearTask (Roadmap 3.B & 4.A)
   Unit tests for Expense Editing & Currency Masking
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditExpenseModal from '../components/EditExpenseModal';
import { maskRupiah, unmaskRupiah } from '../utils/parseIDNumber';

describe('EditExpenseModal & Currency Masking', () => {
  describe('maskRupiah and unmaskRupiah helpers', () => {
    it('formats plain numbers or digit strings into Rupiah format', () => {
      expect(maskRupiah(15000)).toBe('Rp 15.000');
      expect(maskRupiah('2500000')).toBe('Rp 2.500.000');
      expect(maskRupiah('')).toBe('');
      expect(maskRupiah(0)).toBe('Rp 0');
    });

    it('unmasks formatted currency strings into numbers', () => {
      expect(unmaskRupiah('Rp 15.000')).toBe(15000);
      expect(unmaskRupiah('Rp 2.500.000')).toBe(2500000);
      expect(unmaskRupiah('15000')).toBe(15000);
      expect(unmaskRupiah('')).toBe(0);
    });
  });

  describe('EditExpenseModal component', () => {
    const mockExpense = {
      id: 'exp-123',
      tanggal: '2026-10-04',
      kategori: 'Operasional',
      namaKeluaran: 'Beli Gas Elpiji',
      jumlah: 22000,
      catatan: 'Untuk kompor dapur',
    };

    const mockSave = vi.fn();
    const mockClose = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('does not render when isOpen is false', () => {
      render(
        <EditExpenseModal
          isOpen={false}
          expense={mockExpense}
          onClose={mockClose}
          onSave={mockSave}
        />
      );
      expect(screen.queryByText('Edit Catatan Pengeluaran')).toBeNull();
    });

    it('renders with pre-populated values when open', () => {
      render(
        <EditExpenseModal
          isOpen={true}
          expense={mockExpense}
          onClose={mockClose}
          onSave={mockSave}
        />
      );

      expect(screen.getByText('Edit Catatan Pengeluaran')).not.toBeNull();
      expect(screen.getByDisplayValue('Beli Gas Elpiji')).not.toBeNull();
      expect(screen.getByDisplayValue('Rp 22.000')).not.toBeNull();
      expect(screen.getByDisplayValue('Untuk kompor dapur')).not.toBeNull();
    });

    it('updates masked nominal when typing numbers', () => {
      render(
        <EditExpenseModal
          isOpen={true}
          expense={mockExpense}
          onClose={mockClose}
          onSave={mockSave}
        />
      );

      const jumlahInput = screen.getByDisplayValue('Rp 22.000');
      fireEvent.change(jumlahInput, { target: { value: '35000' } });

      expect(screen.getByDisplayValue('Rp 35.000')).not.toBeNull();
    });

    it('submits updated data to onSave handler', async () => {
      render(
        <EditExpenseModal
          isOpen={true}
          expense={mockExpense}
          onClose={mockClose}
          onSave={mockSave}
        />
      );

      const namaInput = screen.getByDisplayValue('Beli Gas Elpiji');
      fireEvent.change(namaInput, { target: { value: 'Beli Gas 12kg' } });

      const jumlahInput = screen.getByDisplayValue('Rp 22.000');
      fireEvent.change(jumlahInput, { target: { value: '220000' } });

      const submitBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith('exp-123', {
          tanggal: '2026-10-04',
          kategori: 'Operasional',
          namaKeluaran: 'Beli Gas 12kg',
          jumlah: 220000,
          catatan: 'Untuk kompor dapur',
        });
        expect(mockClose).toHaveBeenCalled();
      });
    });
  });
});
