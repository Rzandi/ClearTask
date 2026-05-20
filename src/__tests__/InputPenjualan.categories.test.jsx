/* ═══════════════════════════════════════════════════════════
   InputPenjualan.categories.test.jsx — ClearTask
   Unit tests + Property-based tests for dynamic category
   integration in InputPenjualan component.
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import InputPenjualan from '../components/InputPenjualan';

// ── Mock useCategories ──────────────────────────────────────
// Prevents dependency on localStorage in these tests.

const mockAddCategory = vi.fn();
const mockAddSubCategory = vi.fn();

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    allCategories: [
      'Elektronik', 'Makanan', 'Minuman', 'Pakaian',
      'Alat Tulis', 'Kesehatan', 'Lainnya',
    ],
    subCategoriesFor: (kategori) => {
      const preset = {
        Makanan: ['Makanan Berat', 'Snack', 'Dessert'],
        Minuman: ['Minuman Panas', 'Minuman Dingin', 'Jus'],
        Elektronik: ['Gadget', 'Aksesoris', 'Komponen'],
      };
      return preset[kategori] ?? [];
    },
    addCategory: mockAddCategory,
    addSubCategory: mockAddSubCategory,
    customCategories: [],
    customSubCategoriesFor: () => [],
    deleteCategory: vi.fn(),
    deleteSubCategory: vi.fn(),
  }),
}));

// ── Helpers ─────────────────────────────────────────────────

function renderForm(onSubmit = vi.fn()) {
  return render(<InputPenjualan onSubmit={onSubmit} />);
}

// ══════════════════════════════════════════════════════════════
// UNIT TESTS
// ══════════════════════════════════════════════════════════════

describe('InputPenjualan — Kategori Dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Memilih __ADD_NEW__ di DropdownKategori → InlineInput muncul
  it('1. Memilih __ADD_NEW__ di DropdownKategori → InlineInput muncul', () => {
    renderForm();

    const select = document.getElementById('field-kategori');
    expect(select).not.toBeNull();

    // Pilih opsi __ADD_NEW__
    fireEvent.change(select, { target: { value: '__ADD_NEW__' } });

    // InlineInput harus muncul
    const inlineInput = screen.getByPlaceholderText('Nama kategori baru...');
    expect(inlineInput).not.toBeNull();
  });

  // Test 2: Menekan Escape pada InlineInput → input tersembunyi, tidak ada perubahan state
  it('2. Menekan Escape pada InlineInput → input tersembunyi, tidak ada perubahan state', () => {
    renderForm();

    const select = document.getElementById('field-kategori');

    // Buka InlineInput
    fireEvent.change(select, { target: { value: '__ADD_NEW__' } });

    const inlineInput = screen.getByPlaceholderText('Nama kategori baru...');
    expect(inlineInput).not.toBeNull();

    // Ketik sesuatu
    fireEvent.change(inlineInput, { target: { value: 'Kategori Baru' } });

    // Tekan Escape
    fireEvent.keyDown(inlineInput, { key: 'Escape' });

    // InlineInput harus tersembunyi
    expect(screen.queryByPlaceholderText('Nama kategori baru...')).toBeNull();

    // addCategory tidak boleh dipanggil
    expect(mockAddCategory).not.toHaveBeenCalled();
  });

  // Test 3: Submit form tanpa memilih sub-kategori → subKategori bernilai ""
  it('3. Submit form tanpa memilih sub-kategori → subKategori bernilai ""', () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    // Isi field wajib
    fireEvent.change(document.getElementById('field-namaBarang'), {
      target: { value: 'Laptop' },
    });
    fireEvent.change(document.getElementById('field-qty'), {
      target: { value: '2' },
    });
    fireEvent.change(document.getElementById('field-hargaSatuan'), {
      target: { value: '5000000' },
    });

    // Submit tanpa memilih sub-kategori
    fireEvent.click(document.getElementById('btn-simpan'));

    expect(onSubmit).toHaveBeenCalledOnce();
    const submittedData = onSubmit.mock.calls[0][0];
    expect(submittedData).toHaveProperty('subKategori');
    expect(submittedData.subKategori).toBe('');
  });

  // Additional: Tombol batal (✕) pada InlineInput menyembunyikan input
  it('4. Klik tombol batal (✕) pada InlineInput → input tersembunyi', () => {
    renderForm();

    const select = document.getElementById('field-kategori');
    fireEvent.change(select, { target: { value: '__ADD_NEW__' } });

    expect(screen.getByPlaceholderText('Nama kategori baru...')).not.toBeNull();

    // Klik tombol batal
    const cancelBtn = screen.getByLabelText('Batal');
    fireEvent.click(cancelBtn);

    expect(screen.queryByPlaceholderText('Nama kategori baru...')).toBeNull();
    expect(mockAddCategory).not.toHaveBeenCalled();
  });

  // Additional: Konfirmasi InlineInput kategori memanggil addCategory
  it('5. Konfirmasi InlineInput kategori → addCategory dipanggil', () => {
    mockAddCategory.mockReturnValue({ success: true });
    renderForm();

    const select = document.getElementById('field-kategori');
    fireEvent.change(select, { target: { value: '__ADD_NEW__' } });

    const inlineInput = screen.getByPlaceholderText('Nama kategori baru...');
    fireEvent.change(inlineInput, { target: { value: 'Otomotif' } });

    // Tekan Enter
    fireEvent.keyDown(inlineInput, { key: 'Enter' });

    expect(mockAddCategory).toHaveBeenCalledWith('Otomotif');
  });

  // Additional: Error duplikat ditampilkan
  it('6. addCategory gagal (duplikat) → pesan error ditampilkan', () => {
    mockAddCategory.mockReturnValue({ success: false, error: 'Kategori sudah ada' });
    renderForm();

    const select = document.getElementById('field-kategori');
    fireEvent.change(select, { target: { value: '__ADD_NEW__' } });

    const inlineInput = screen.getByPlaceholderText('Nama kategori baru...');
    fireEvent.change(inlineInput, { target: { value: 'Elektronik' } });
    fireEvent.keyDown(inlineInput, { key: 'Enter' });

    expect(screen.getByText('Kategori sudah ada')).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// PROPERTY-BASED TEST
// ══════════════════════════════════════════════════════════════

describe('InputPenjualan — Property-based tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: addCategory and addSubCategory succeed
    mockAddCategory.mockReturnValue({ success: true });
    mockAddSubCategory.mockReturnValue({ success: true });
  });

  /**
   * Property 9: Field `subKategori` selalu ada di setiap transaksi yang dikirim
   *
   * Untuk semua state form yang valid (namaBarang tidak kosong, qty > 0, harga > 0),
   * objek transaksi yang dikirim ke onSubmit harus selalu memiliki field `subKategori`
   * bertipe string (bukan undefined atau null).
   *
   * Validates: Requirements 5.1, 5.2, 5.3
   */
  it(
    'Feature: dynamic-categories, Property 9: field subKategori selalu ada di setiap transaksi yang dikirim',
    () => {
      fc.assert(
        fc.property(
          fc.record({
            namaBarang: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
            qty: fc.integer({ min: 1, max: 9999 }),
            harga: fc.integer({ min: 1, max: 99999999 }),
          }),
          ({ namaBarang, qty, harga }) => {
            const onSubmit = vi.fn();
            const { unmount } = render(<InputPenjualan onSubmit={onSubmit} />);

            // Fill required fields
            fireEvent.change(document.getElementById('field-namaBarang'), {
              target: { value: namaBarang },
            });
            fireEvent.change(document.getElementById('field-qty'), {
              target: { value: String(qty) },
            });
            fireEvent.change(document.getElementById('field-hargaSatuan'), {
              target: { value: String(harga) },
            });

            // Submit
            fireEvent.click(document.getElementById('btn-simpan'));

            // Assert: onSubmit was called and subKategori is a string
            if (onSubmit.mock.calls.length === 0) {
              unmount();
              return false;
            }

            const submitted = onSubmit.mock.calls[0][0];
            const hasSubKategori = Object.prototype.hasOwnProperty.call(submitted, 'subKategori');
            const isString = typeof submitted.subKategori === 'string';

            unmount();
            return hasSubKategori && isString;
          }
        ),
        { numRuns: 100 }
      );
    },
    30000 // 30s timeout for property-based test with 100 renders
  );
});
