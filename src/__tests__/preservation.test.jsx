import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import InputPenjualan from '../components/InputPenjualan';

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { kasirName: 'Admin' } }),
  SettingsProvider: ({ children }) => <>{children}</>,
}));

const mockInventory = [{ id: 1, namaBarang: 'Kopi Susu', harga: 15000, kategori: 'Minuman' }];

vi.mock('../hooks/useInventory', () => ({
  useInventory: () => ({ inventory: mockInventory }),
}));

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    allCategories: ['Minuman', 'Makanan'],
    subCategoriesFor: () => ['Kopi', 'Non-Kopi'],
  }),
}));

function renderForm(onSubmit = vi.fn()) {
  return render(<InputPenjualan onSubmit={onSubmit} />);
}

describe('InputPenjualan — Shopping Cart Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Menambah barang dari Katalog ke Keranjang', () => {
    renderForm();
    const btnKopi = screen.getByText('Kopi Susu');
    fireEvent.click(btnKopi);

    // Keranjang harus memiliki 1 item
    expect(screen.getByText('1 Item')).not.toBeNull();
    // Sub Total jadi Rp 15.000
    expect(screen.getAllByText('Rp 15.000').length).toBeGreaterThan(0);
  });

  it('2. Menggunakan Input Manual dan masuk ke Keranjang', () => {
    renderForm();
    // Pindah tab
    fireEvent.click(screen.getByText('Input Manual'));

    const namaInput = screen.getByPlaceholderText('Nama Item...');
    const hargaInput = screen.getAllByPlaceholderText('0')[0];
    // Cari tombol Tambah ke Keranjang
    const btnTambah = screen.getByText('Tambah ke Keranjang');

    fireEvent.change(namaInput, { target: { value: 'Roti Bakar' } });
    fireEvent.change(hargaInput, { target: { value: '20000' } });
    fireEvent.click(btnTambah);

    // Cek di keranjang
    expect(screen.getByText('1 Item')).not.toBeNull();
    expect(screen.getByText('Roti Bakar')).not.toBeNull();
    expect(screen.getAllByText('Rp 20.000').length).toBeGreaterThan(0);
  });

  it('3. Checkout gagal jika uang kurang', () => {
    renderForm();
    fireEvent.click(screen.getByText('Kopi Susu')); // masukin keranjang, total 15rb

    // inputUang ada di index 1 (atau 0 kalau tab manual gak aktif, tapi kita ambil test spesifik)
    // Tunggu, kalau manual tab tidak aktif, hanya ada 1 input "0" yaitu uangDiterima!
    // So if tab is not manual, getAllByPlaceholderText('0')[0] is Uang Diterima.
    const inputUangReal = screen.getByPlaceholderText('0'); // Karena tab katalog default aktif, input hargaSatuan gak dirender!
    fireEvent.change(inputUangReal, { target: { value: '10000' } }); // uang 10rb, kurang

    const btnBayar = screen.getByText('Bayar & Cetak Struk');
    fireEvent.click(btnBayar);

    // Pesan error muncul
    expect(screen.getByText('Uang diterima kurang dari total')).not.toBeNull();
  });

  it('4. Checkout sukses', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    renderForm(onSubmit);

    fireEvent.click(screen.getByText('Kopi Susu')); // 15rb
    const inputUangReal = screen.getByPlaceholderText('0');
    fireEvent.change(inputUangReal, { target: { value: '20000' } });

    const btnBayar = screen.getByText('Bayar & Cetak Struk');

    await act(async () => {
      fireEvent.click(btnBayar);
    });

    expect(onSubmit).toHaveBeenCalledOnce();
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.items).toHaveLength(1);
    expect(payload.total).toBe(15000);
    expect(payload.uangDiterima).toBe(20000);
    expect(payload.kembalian).toBe(5000);
  });
});
