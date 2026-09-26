import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import InputPenjualan from '../components/InputPenjualan';

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { kasirName: 'Admin', plasticBagEnabled: false } }),
}));

vi.mock('../hooks/useInventory', () => ({
  useInventory: () => ({
    inventory: [
      { id: 1, namaBarang: 'Kopi Susu', harga: 15000, kategori: 'Minuman', quantity: 20 },
      { id: 2, namaBarang: 'Roti Bakar', harga: 12000, kategori: 'Makanan', quantity: 15 },
    ],
    updateInventoryItem: vi.fn(),
  }),
}));

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    allCategories: ['Minuman', 'Makanan'],
    subCategoriesFor: () => [],
  }),
}));

describe('Mobile Cart Layout & Pending Orders Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('persists pending orders to localStorage and restores on initialization', () => {
    // 1. Seed initial pending order in localStorage
    const samplePending = [
      {
        id: 123456789,
        label: 'Kopi Susu',
        cart: [{ id: 1, namaBarang: 'Kopi Susu', hargaSatuan: 15000, qty: 1 }],
        metode: 'Tunai',
        catatan: 'Less sugar',
      },
    ];
    localStorage.setItem('cleartask_pending_orders', JSON.stringify(samplePending));

    // 2. Render component
    render(<InputPenjualan onSubmit={vi.fn()} />);

    // 3. Verify badge shows 1 pending order
    expect(screen.getByText(/Tertunda/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    // 4. Click pending orders button to view list
    fireEvent.click(screen.getByText(/Tertunda/i));
    expect(screen.getByText(/Transaksi Tertunda/i)).toBeInTheDocument();
    expect(screen.getAllByText('Kopi Susu').length).toBeGreaterThan(0);
  });

  it('renders Two-Box layout: Kotak A with items & mini info, Kotak B with checkout button', () => {
    render(<InputPenjualan onSubmit={vi.fn()} />);

    // Add item to cart
    fireEvent.click(screen.getByText('Kopi Susu'));

    // Kotak A: Mini info header exists
    expect(screen.getByText('Daftar Barang')).toBeInTheDocument();
    expect(screen.getByText('1 item')).toBeInTheDocument();

    // Kotak B: Bayar & Cetak Struk exists
    const bayarBtn = screen.getByText('Bayar & Cetak Struk');
    expect(bayarBtn).toBeInTheDocument();
    expect(bayarBtn).not.toBeDisabled();
  });
});
