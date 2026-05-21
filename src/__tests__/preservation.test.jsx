/**
 * Preservation Property Tests — ClearTask
 *
 * TUJUAN: Verifikasi bahwa semua fix yang sudah diterapkan tidak merusak
 * perilaku yang seharusnya tidak berubah.
 *
 * Property yang ditest: "Field Input Lain & Fungsionalitas Inti Tidak Terpengaruh"
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InputPenjualan from '../components/InputPenjualan';
import SettingsModal from '../components/SettingsModal';
import HelpModal from '../components/HelpModal';
import NotificationPanel from '../components/NotificationPanel';
import Sidebar from '../components/layout/Sidebar';
import { SettingsProvider } from '../contexts/SettingsContext';

// Helper: bungkus komponen dengan SettingsProvider
function withSettings(ui) {
  return <SettingsProvider>{ui}</SettingsProvider>;
}

// ─── 1. CSS Preservation — Field tanpa prefix tidak berubah ───────────────────

describe('1. CSS Preservation — Field tanpa prefix tidak memiliki form-input-prefixed', () => {
  /**
   * Validates: Requirements 3.1, 3.2
   * Field yang tidak memiliki prefix "Rp" tidak boleh mendapat class form-input-prefixed.
   */

  it('1a: #field-namaBarang TIDAK memiliki class form-input-prefixed', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));
    const el = document.getElementById('field-namaBarang');
    expect(el).not.toBeNull();
    expect(el.className).not.toContain('form-input-prefixed');
  });

  it('1b: #field-qty TIDAK memiliki class form-input-prefixed', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));
    const el = document.getElementById('field-qty');
    expect(el).not.toBeNull();
    expect(el.className).not.toContain('form-input-prefixed');
  });

  it('1c: #field-tanggal TIDAK memiliki class form-input-prefixed', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));
    const el = document.getElementById('field-tanggal');
    expect(el).not.toBeNull();
    expect(el.className).not.toContain('form-input-prefixed');
  });

  it('1d: #field-catatan TIDAK memiliki class form-input-prefixed', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));
    const el = document.getElementById('field-catatan');
    expect(el).not.toBeNull();
    expect(el.className).not.toContain('form-input-prefixed');
  });

  it('1e: #field-kategori (select) TIDAK memiliki class form-input-prefixed', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));
    const el = document.getElementById('field-kategori');
    expect(el).not.toBeNull();
    expect(el.className).not.toContain('form-input-prefixed');
  });

  it('1f: #field-metode (select) TIDAK memiliki class form-input-prefixed', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));
    const el = document.getElementById('field-metode');
    expect(el).not.toBeNull();
    expect(el.className).not.toContain('form-input-prefixed');
  });
});

// ─── 2. CSS Fix — Field berprefix sudah diperbaiki ────────────────────────────

describe('2. CSS Fix — Field berprefix memiliki form-input-prefixed dan tidak lagi pl-10', () => {
  /**
   * Validates: Requirements 2.1, 2.2, 2.3
   * Fix sudah diterapkan: form-input-prefixed ada, pl-10 sudah dihapus.
   */

  it('2a: #field-hargaSatuan MEMILIKI class form-input-prefixed (fix sudah diterapkan)', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));
    const el = document.getElementById('field-hargaSatuan');
    expect(el).not.toBeNull();
    expect(el.className).toContain('form-input-prefixed');
  });

  it('2b: #field-total MEMILIKI class form-input-prefixed (fix sudah diterapkan)', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));
    const el = document.getElementById('field-total');
    expect(el).not.toBeNull();
    expect(el.className).toContain('form-input-prefixed');
  });

  it('2c: #field-hargaSatuan TIDAK lagi memiliki class pl-10', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));
    const el = document.getElementById('field-hargaSatuan');
    expect(el).not.toBeNull();
    expect(el.className).not.toContain('pl-10');
  });

  it('2d: #field-total TIDAK lagi memiliki class pl-10', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));
    const el = document.getElementById('field-total');
    expect(el).not.toBeNull();
    expect(el.className).not.toContain('pl-10');
  });
});

// ─── 3. Kalkulasi Total tetap akurat ─────────────────────────────────────────

describe('3. Kalkulasi Total tetap akurat', () => {
  /**
   * Validates: Requirements 3.3
   * Kalkulasi qty × hargaSatuan harus tetap benar setelah fix.
   */

  it('3a: qty=5, hargaSatuan=20000 → total menampilkan "100.000"', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));

    const qtyInput = document.getElementById('field-qty');
    const hargaInput = document.getElementById('field-hargaSatuan');
    const totalInput = document.getElementById('field-total');

    fireEvent.change(qtyInput, { target: { name: 'qty', value: '5' } });
    fireEvent.change(hargaInput, { target: { name: 'hargaSatuan', value: '20000' } });

    expect(totalInput.value).toBe('100.000');
  });

  it('3b: qty=0 → total menampilkan "0"', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));

    const qtyInput = document.getElementById('field-qty');
    const totalInput = document.getElementById('field-total');

    fireEvent.change(qtyInput, { target: { name: 'qty', value: '0' } });

    expect(totalInput.value).toBe('0');
  });

  it('3c: qty=3, hargaSatuan=15000 → total menampilkan "45.000"', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));

    const qtyInput = document.getElementById('field-qty');
    const hargaInput = document.getElementById('field-hargaSatuan');
    const totalInput = document.getElementById('field-total');

    fireEvent.change(qtyInput, { target: { name: 'qty', value: '3' } });
    fireEvent.change(hargaInput, { target: { name: 'hargaSatuan', value: '15000' } });

    expect(totalInput.value).toBe('45.000');
  });
});

// ─── 4. Validasi form tidak berubah ──────────────────────────────────────────

describe('4. Validasi form tidak berubah', () => {
  /**
   * Validates: Requirements 3.4
   * Logika validasi tombol Simpan harus tetap sama setelah fix.
   */

  it('4a: Tombol Simpan disabled ketika namaBarang kosong', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));

    const qtyInput = document.getElementById('field-qty');
    const hargaInput = document.getElementById('field-hargaSatuan');
    const btnSimpan = document.getElementById('btn-simpan');

    // Isi qty dan harga tapi biarkan namaBarang kosong
    fireEvent.change(qtyInput, { target: { name: 'qty', value: '5' } });
    fireEvent.change(hargaInput, { target: { name: 'hargaSatuan', value: '10000' } });

    expect(btnSimpan).toBeDisabled();
  });

  it('4b: Tombol Simpan disabled ketika qty=0', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));

    const namaInput = document.getElementById('field-namaBarang');
    const qtyInput = document.getElementById('field-qty');
    const hargaInput = document.getElementById('field-hargaSatuan');
    const btnSimpan = document.getElementById('btn-simpan');

    fireEvent.change(namaInput, { target: { name: 'namaBarang', value: 'Produk A' } });
    fireEvent.change(qtyInput, { target: { name: 'qty', value: '0' } });
    fireEvent.change(hargaInput, { target: { name: 'hargaSatuan', value: '10000' } });

    expect(btnSimpan).toBeDisabled();
  });

  it('4c: Tombol Simpan disabled ketika qty kosong', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));

    const namaInput = document.getElementById('field-namaBarang');
    const hargaInput = document.getElementById('field-hargaSatuan');
    const btnSimpan = document.getElementById('btn-simpan');

    fireEvent.change(namaInput, { target: { name: 'namaBarang', value: 'Produk A' } });
    fireEvent.change(hargaInput, { target: { name: 'hargaSatuan', value: '10000' } });
    // qty dibiarkan kosong (nilai awal '')

    expect(btnSimpan).toBeDisabled();
  });

  it('4d: Tombol Simpan disabled ketika hargaSatuan=0', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));

    const namaInput = document.getElementById('field-namaBarang');
    const qtyInput = document.getElementById('field-qty');
    const hargaInput = document.getElementById('field-hargaSatuan');
    const btnSimpan = document.getElementById('btn-simpan');

    fireEvent.change(namaInput, { target: { name: 'namaBarang', value: 'Produk A' } });
    fireEvent.change(qtyInput, { target: { name: 'qty', value: '5' } });
    fireEvent.change(hargaInput, { target: { name: 'hargaSatuan', value: '0' } });

    expect(btnSimpan).toBeDisabled();
  });

  it('4e: Tombol Simpan disabled ketika hargaSatuan kosong', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));

    const namaInput = document.getElementById('field-namaBarang');
    const qtyInput = document.getElementById('field-qty');
    const btnSimpan = document.getElementById('btn-simpan');

    fireEvent.change(namaInput, { target: { name: 'namaBarang', value: 'Produk A' } });
    fireEvent.change(qtyInput, { target: { name: 'qty', value: '5' } });
    // hargaSatuan dibiarkan kosong

    expect(btnSimpan).toBeDisabled();
  });

  it('4f: Tombol Simpan enabled ketika semua field valid (namaBarang ada, qty>0, harga>0)', () => {
    render(withSettings(<InputPenjualan onSubmit={vi.fn()} />));

    const namaInput = document.getElementById('field-namaBarang');
    const qtyInput = document.getElementById('field-qty');
    const hargaInput = document.getElementById('field-hargaSatuan');
    const btnSimpan = document.getElementById('btn-simpan');

    fireEvent.change(namaInput, { target: { name: 'namaBarang', value: 'Produk A' } });
    fireEvent.change(qtyInput, { target: { name: 'qty', value: '5' } });
    fireEvent.change(hargaInput, { target: { name: 'hargaSatuan', value: '10000' } });

    expect(btnSimpan).not.toBeDisabled();
  });
});

// ─── 5. Modal/Panel tidak ter-render saat tertutup ────────────────────────────

describe('5. Modal/Panel tidak ter-render saat tertutup (isOpen=false)', () => {
  /**
   * Validates: Requirements 3.7
   * Ketika isOpen=false, komponen harus return null dan tidak ada di DOM.
   */

  it('5a: SettingsModal dengan isOpen={false} → return null, tidak ada di DOM', () => {
    render(withSettings(<SettingsModal isOpen={false} onClose={vi.fn()} />));
    const modal = document.querySelector('[data-testid="settings-modal"]');
    expect(modal).toBeNull();
  });

  it('5b: HelpModal dengan isOpen={false} → return null, tidak ada di DOM', () => {
    render(<HelpModal isOpen={false} onClose={vi.fn()} />);
    const modal = document.querySelector('[data-testid="help-modal"]');
    expect(modal).toBeNull();
  });

  it('5c: NotificationPanel dengan isOpen={false} → return null, tidak ada di DOM', () => {
    render(<NotificationPanel isOpen={false} onClose={vi.fn()} transactions={[]} />);
    const panel = document.querySelector('[data-testid="notification-panel"]');
    expect(panel).toBeNull();
  });
});

// ─── 6. Modal/Panel ter-render saat dibuka (fix terkonfirmasi) ────────────────

describe('6. Modal/Panel ter-render saat dibuka (isOpen=true)', () => {
  /**
   * Validates: Requirements 2.4, 2.5, 2.6
   * Fix terkonfirmasi: komponen ter-render dengan data-testid yang benar.
   */

  it('6a: SettingsModal dengan isOpen={true} → data-testid="settings-modal" ada di DOM', () => {
    render(withSettings(<SettingsModal isOpen={true} onClose={vi.fn()} />));
    const modal = document.querySelector('[data-testid="settings-modal"]');
    expect(modal).not.toBeNull();
  });

  it('6b: HelpModal dengan isOpen={true} → data-testid="help-modal" ada di DOM', () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    const modal = document.querySelector('[data-testid="help-modal"]');
    expect(modal).not.toBeNull();
  });

  it('6c: NotificationPanel dengan isOpen={true} dan transactions=[] → data-testid="notification-panel" ada di DOM', () => {
    render(<NotificationPanel isOpen={true} onClose={vi.fn()} transactions={[]} />);
    const panel = document.querySelector('[data-testid="notification-panel"]');
    expect(panel).not.toBeNull();
  });
});

// ─── 7. NotificationPanel — selalu max 5 item ─────────────────────────────────

describe('7. NotificationPanel — selalu max 5 item', () => {
  /**
   * Validates: Requirements 3.5
   * NotificationPanel hanya menampilkan maksimal 5 transaksi terbaru.
   */

  function makeDummyTransactions(count) {
    return Array.from({ length: count }, (_, i) => ({
      transactionId: `TRX-${String(i + 1).padStart(5, '0')}`,
      namaBarang: `Barang ${i + 1}`,
      total: (i + 1) * 10000,
      createdAt: new Date(Date.now() - i * 60000).toISOString(), // setiap 1 menit lebih lama
    }));
  }

  it('7a: Array 10 transaksi → panel hanya menampilkan 5 item', () => {
    const transactions = makeDummyTransactions(10);
    render(<NotificationPanel isOpen={true} onClose={vi.fn()} transactions={transactions} />);

    // Setiap item transaksi memiliki nama barang yang ditampilkan
    // Kita cek jumlah item yang ter-render di dalam panel
    const panel = document.querySelector('[data-testid="notification-panel"]');
    expect(panel).not.toBeNull();

    // Cari semua item transaksi — setiap item memiliki nama barang
    // Panel menampilkan item dalam div dengan class yang mengandung hover:bg-white
    const items = panel.querySelectorAll('.border-b.border-border-subtle');
    expect(items.length).toBe(5);
  });

  it('7b: Array 3 transaksi → panel menampilkan 3 item', () => {
    const transactions = makeDummyTransactions(3);
    render(<NotificationPanel isOpen={true} onClose={vi.fn()} transactions={transactions} />);

    const panel = document.querySelector('[data-testid="notification-panel"]');
    expect(panel).not.toBeNull();

    const items = panel.querySelectorAll('.border-b.border-border-subtle');
    expect(items.length).toBe(3);
  });

  it('7c: Array 0 transaksi → pesan "Belum ada transaksi" muncul', () => {
    render(<NotificationPanel isOpen={true} onClose={vi.fn()} transactions={[]} />);

    expect(screen.getByText('Belum ada transaksi')).not.toBeNull();
  });
});

// ─── 8. SettingsModal — localStorage persistence ──────────────────────────────

describe('8. SettingsModal — localStorage persistence', () => {
  /**
   * Validates: Requirements 2.4, 3.6
   * SettingsModal harus menyimpan dan memuat nama kasir dari localStorage.
   */

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('8a: Isi nama kasir "Budi", klik Simpan → localStorage berisi kasirName="Budi"', () => {
    const onClose = vi.fn();
    render(withSettings(<SettingsModal isOpen={true} onClose={onClose} />));

    const input = document.getElementById('kasir-name-input');
    expect(input).not.toBeNull();

    // Isi nama kasir
    fireEvent.change(input, { target: { value: 'Budi' } });

    // Klik tombol Simpan
    const btnSimpan = screen.getByText('Simpan');
    fireEvent.click(btnSimpan);

    // Assert localStorage berisi JSON dengan kasirName="Budi"
    const saved = localStorage.getItem('cleartask_settings');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved);
    expect(parsed.kasirName).toBe('Budi');

    // onClose dipanggil setelah simpan
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('8b: Render ulang SettingsModal setelah simpan → input menampilkan "Budi" (loaded dari localStorage)', () => {
    // Pre-populate localStorage
    localStorage.setItem('cleartask_settings', JSON.stringify({
      kasirName: 'Budi',
      tokoName: '',
      theme: 'dark',
      accentColor: '#00ffa3',
    }));

    render(withSettings(<SettingsModal isOpen={true} onClose={vi.fn()} />));

    const input = document.getElementById('kasir-name-input');
    expect(input).not.toBeNull();
    expect(input.value).toBe('Budi');
  });
});



// ─── 10. HelpModal — konten seksi ada ─────────────────────────────────────────

describe('10. HelpModal — konten seksi ada', () => {
  /**
   * Validates: Requirements 2.6
   * HelpModal harus menampilkan seksi panduan yang diperbarui.
   */

  it('10a: Render HelpModal dengan isOpen=true → teks "Transaksi & Kategori" ada', () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Transaksi & Kategori')).not.toBeNull();
  });

  it('10b: Render HelpModal dengan isOpen=true → teks "Export Laporan" ada', () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Export Laporan')).not.toBeNull();
  });

  it('10c: Render HelpModal dengan isOpen=true → teks "Cara Install PWA (Offline)" ada', () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Cara Install PWA (Offline)')).not.toBeNull();
  });

  it('10d: Render HelpModal dengan isOpen=true → teks "Manajemen Sesi / Shift" ada', () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Manajemen Sesi / Shift')).not.toBeNull();
  });

  it('10e: Render HelpModal dengan isOpen=true → teks "Backup & Migrasi Database" ada', () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Backup & Migrasi Database')).not.toBeNull();
  });

  it('10f: Render HelpModal dengan isOpen=true → teks "Master Barang (Inventaris)" ada', () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Master Barang (Inventaris)')).not.toBeNull();
  });
});
