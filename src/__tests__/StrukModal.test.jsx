import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StrukModal from '../components/StrukModal';
import * as bluetoothHelper from '../utils/bluetoothPrinterHelper';

describe('StrukModal and Bluetooth Printing Integration', () => {
  const sampleOrder = {
    id: 1,
    transactionId: 'TRX-00001',
    tanggal: '2026-06-11',
    kasir: 'Admin',
    metode: 'Tunai',
    total: 35000,
    uangDiterima: 40000,
    kembalian: 5000,
    createdAt: '2026-06-11T12:00:00.000Z',
    items: [
      { namaBarang: 'Kopi Susu', qty: 1, hargaSatuan: 15000, total: 15000 },
      { namaBarang: 'Roti Bakar', qty: 1, hargaSatuan: 20000, total: 20000 },
    ],
  };

  const printSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('print', printSpy);
  });

  it('1. Renders order receipt data and print buttons', () => {
    render(<StrukModal order={sampleOrder} onClose={vi.fn()} />);

    // Verify receipt data
    expect(screen.getByText('ClearTask POS')).not.toBeNull();
    expect(screen.getByText('TRX-00001')).not.toBeNull();
    expect(screen.getByText('Kopi Susu')).not.toBeNull();
    expect(screen.getByText('Roti Bakar')).not.toBeNull();
    expect(screen.getByText('35.000')).not.toBeNull(); // Total total string

    // Verify buttons are rendered
    expect(screen.getByText('Tutup')).not.toBeNull();
    expect(screen.getByText('Standard')).not.toBeNull();
    expect(screen.getByText('Bluetooth')).not.toBeNull();
  });

  it('2. Triggers window.print() when Standard print button is clicked', () => {
    render(<StrukModal order={sampleOrder} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Standard'));
    expect(printSpy).toHaveBeenCalledOnce();
  });

  it('3. Triggers Bluetooth print workflow and displays status on success', async () => {
    const printBluetoothSpy = vi
      .spyOn(bluetoothHelper, 'printBluetoothReceipt')
      .mockImplementation((order, onStatusChange) => {
        onStatusChange('Mencari printer bluetooth...');
        onStatusChange('Menghubungkan ke Printer...');
        onStatusChange('Mengirim data print...');
        onStatusChange('Print sukses!');
        return Promise.resolve(true);
      });

    render(<StrukModal order={sampleOrder} onClose={vi.fn()} />);

    // Click Bluetooth print
    fireEvent.click(screen.getByText('Bluetooth'));

    expect(printBluetoothSpy).toHaveBeenCalledOnce();
    expect(printBluetoothSpy.mock.calls[0][0]).toEqual(sampleOrder);

    // Wait for final success message to display
    await waitFor(() => {
      expect(screen.getByText('Print sukses!')).not.toBeNull();
    });
  });

  it('4. Displays failure message when Bluetooth print fails', async () => {
    vi.spyOn(bluetoothHelper, 'printBluetoothReceipt').mockImplementation(
      (order, onStatusChange) => {
        onStatusChange('Gagal print: GATT Connection Timeout');
        return Promise.resolve(false);
      }
    );

    render(<StrukModal order={sampleOrder} onClose={vi.fn()} />);

    // Click Bluetooth print
    fireEvent.click(screen.getByText('Bluetooth'));

    await waitFor(() => {
      expect(screen.getByText('Gagal print: GATT Connection Timeout')).not.toBeNull();
    });
  });
});
