import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ManualItemForm from '../components/pos/ManualItemForm';

describe('ManualItemForm — Inline Syntax Integration (Bug #14 / Refactor-01)', () => {
  const dummyInventory = [
    {
      id: 'inv-1',
      namaBarang: 'Kopi Hitam',
      kategori: 'Minuman',
      subKategori: 'Kopi',
      harga: 8000,
      hargaModal: 4000,
      quantity: 10,
    },
  ];

  it('renders quick syntax preview when user types inline syntax', async () => {
    render(
      <ManualItemForm
        inventory={dummyInventory}
        allCategories={['Minuman', 'Makanan']}
        subCategoriesFor={() => []}
        tanggal="2026-10-12"
        setTanggal={vi.fn()}
        onAddToCart={vi.fn()}
        confirm={vi.fn().mockResolvedValue(true)}
      />
    );

    const input = screen.getByPlaceholderText('Nama Item...');
    fireEvent.change(input, { target: { value: 'Susu 2x @15000' } });

    await waitFor(() => {
      expect(screen.getByText(/Quick Syntax:/i)).toBeInTheDocument();
      expect(screen.getByText('Susu')).toBeInTheDocument();
    });
  });

  it('submits parsed name, qty, and price to onAddToCart from inline syntax', async () => {
    const handleAddToCart = vi.fn();
    render(
      <ManualItemForm
        inventory={dummyInventory}
        allCategories={['Minuman', 'Makanan']}
        subCategoriesFor={() => []}
        tanggal="2026-10-12"
        setTanggal={vi.fn()}
        onAddToCart={handleAddToCart}
        confirm={vi.fn().mockResolvedValue(true)}
      />
    );

    const input = screen.getByPlaceholderText('Nama Item...');
    fireEvent.change(input, { target: { value: 'Susu 2x @15000' } });

    const submitBtn = screen.getByRole('button', { name: /Tambah ke Keranjang/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          namaBarang: 'Susu',
          qty: 2,
          hargaSatuan: 15000,
        })
      );
    });
  });

  it('auto-resolves price from catalog when syntax specifies qty only ("Kopi Hitam 3x")', async () => {
    const handleAddToCart = vi.fn();
    render(
      <ManualItemForm
        inventory={dummyInventory}
        allCategories={['Minuman', 'Makanan']}
        subCategoriesFor={() => []}
        tanggal="2026-10-12"
        setTanggal={vi.fn()}
        onAddToCart={handleAddToCart}
        confirm={vi.fn().mockResolvedValue(true)}
      />
    );

    const input = screen.getByPlaceholderText('Nama Item...');
    fireEvent.change(input, { target: { value: 'Kopi Hitam 3x' } });

    const submitBtn = screen.getByRole('button', { name: /Tambah ke Keranjang/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          namaBarang: 'Kopi Hitam',
          qty: 3,
          hargaSatuan: 8000,
        })
      );
    });
  });
});
