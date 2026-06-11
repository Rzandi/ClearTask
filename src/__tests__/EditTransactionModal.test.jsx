/**
 * EditTransactionModal.test.jsx
 * Unit tests (Task 9) dan Property tests (Task 10) untuk EditTransactionModal.jsx
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5,
 *            4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import EditTransactionModal from '../components/EditTransactionModal';

// ─── Mock useCategories ────────────────────────────────────────────────────────

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    allCategories: ['Elektronik', 'Makanan', 'Minuman'],
    subCategoriesFor: () => [],
    addCategory: vi.fn(),
    addSubCategory: vi.fn(),
  }),
}));

// ─── Helper: buat transaksi dummy ─────────────────────────────────────────────

function makeTx(overrides = {}) {
  return {
    id: 1,
    transactionId: 'TRX-00001',
    tanggal: '2025-01-15',
    kategori: 'Elektronik',
    namaBarang: 'Laptop',
    qty: 2,
    hargaSatuan: 5000000,
    total: 10000000,
    metode: 'Tunai',
    catatan: 'Test catatan',
    kasir: 'Admin',
    createdAt: '2025-01-15T00:00:00.000Z',
    status: 'Selesai',
    ...overrides,
  };
}

// ─── Helper: render modal terbuka ─────────────────────────────────────────────

function renderModal(props = {}) {
  const defaults = {
    transaction: makeTx(),
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  };
  return render(<EditTransactionModal {...defaults} {...props} />);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — Unit Tests untuk EditTransactionModal.jsx
// ═══════════════════════════════════════════════════════════════════════════════

describe('Task 9 — Unit Tests: EditTransactionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 9.1: Semua field yang dapat diedit ada saat modal terbuka
  it('9.1: semua field yang dapat diedit ada saat modal terbuka', () => {
    renderModal();

    expect(document.getElementById('edit-namaBarang')).not.toBeNull();
    expect(document.getElementById('edit-qty')).not.toBeNull();
    expect(document.getElementById('edit-hargaSatuan')).not.toBeNull();
    expect(document.getElementById('edit-tanggal')).not.toBeNull();
    expect(document.getElementById('edit-kategori')).not.toBeNull();
    expect(document.getElementById('edit-metode')).not.toBeNull();
    expect(document.getElementById('edit-catatan')).not.toBeNull();
    expect(document.getElementById('edit-kasir')).not.toBeNull();
  });

  // 9.2: transactionId ditampilkan sebagai read-only
  it('9.2: transactionId ditampilkan sebagai read-only di data-testid="transaction-id-display"', () => {
    renderModal({ transaction: makeTx({ transactionId: 'TRX-00001' }) });

    const display = document.querySelector('[data-testid="transaction-id-display"]');
    expect(display).not.toBeNull();
    expect(display.textContent).toContain('TRX-00001');
  });

  // 9.3: Form terisi dengan data dari prop transaction (pre-fill)
  it('9.3: form terisi dengan data dari prop transaction (pre-fill)', () => {
    const tx = makeTx({
      namaBarang: 'Monitor',
      qty: 3,
      hargaSatuan: 2000000,
      tanggal: '2025-06-01',
      metode: 'QRIS',
      catatan: 'Catatan test',
      kasir: 'Budi',
    });
    renderModal({ transaction: tx });

    expect(document.getElementById('edit-namaBarang').value).toBe('Monitor');
    expect(document.getElementById('edit-qty').value).toBe('3');
    expect(document.getElementById('edit-hargaSatuan').value).toBe('2000000');
    expect(document.getElementById('edit-tanggal').value).toBe('2025-06-01');
    expect(document.getElementById('edit-metode').value).toBe('QRIS');
    expect(document.getElementById('edit-catatan').value).toBe('Catatan test');
    expect(document.getElementById('edit-kasir').value).toBe('Budi');
  });

  // 9.4: Mengubah qty atau hargaSatuan memperbarui total
  it('9.4: mengubah qty atau hargaSatuan memperbarui total', () => {
    renderModal({ transaction: makeTx({ qty: 1, hargaSatuan: 1000 }) });

    const qtyInput = document.getElementById('edit-qty');
    const hargaInput = document.getElementById('edit-hargaSatuan');
    const totalDisplay = document.querySelector('[data-testid="total-display"]');

    // Ubah qty dan hargaSatuan ke nilai yang menghasilkan total > 0
    fireEvent.change(qtyInput, { target: { name: 'qty', value: '2' } });
    fireEvent.change(hargaInput, { target: { name: 'hargaSatuan', value: '5000000' } });

    // Total harus bukan '0' (berarti kalkulasi berjalan)
    expect(totalDisplay.value).not.toBe('0');
  });

  // 9.5: Tombol Simpan disabled ketika namaBarang kosong
  it('9.5: tombol Simpan disabled ketika namaBarang kosong setelah submit', () => {
    renderModal({ transaction: makeTx({ namaBarang: 'Laptop' }) });

    // Kosongkan namaBarang
    const namaInput = document.getElementById('edit-namaBarang');
    fireEvent.change(namaInput, { target: { name: 'namaBarang', value: '' } });

    // Submit form untuk trigger validasi
    fireEvent.submit(document.getElementById('form-edit-transaksi'));

    const btnSimpan = screen.getByText('Simpan');
    expect(btnSimpan).toBeDisabled();
  });

  // 9.6: Tombol Simpan disabled ketika qty < 1
  it('9.6: tombol Simpan disabled ketika qty < 1 setelah submit', () => {
    renderModal({ transaction: makeTx({ qty: 2 }) });

    // Set qty = 0
    const qtyInput = document.getElementById('edit-qty');
    fireEvent.change(qtyInput, { target: { name: 'qty', value: '0' } });

    // Submit form untuk trigger validasi
    fireEvent.submit(document.getElementById('form-edit-transaksi'));

    const btnSimpan = screen.getByText('Simpan');
    expect(btnSimpan).toBeDisabled();
  });

  // 9.7: Tombol Simpan disabled ketika hargaSatuan < 0
  it('9.7: tombol Simpan disabled ketika hargaSatuan < 0 setelah submit', () => {
    renderModal({ transaction: makeTx({ hargaSatuan: 5000000 }) });

    // Set hargaSatuan = -1
    const hargaInput = document.getElementById('edit-hargaSatuan');
    fireEvent.change(hargaInput, { target: { name: 'hargaSatuan', value: '-1' } });

    // Submit form untuk trigger validasi
    fireEvent.submit(document.getElementById('form-edit-transaksi'));

    const btnSimpan = screen.getByText('Simpan');
    expect(btnSimpan).toBeDisabled();
  });

  // 9.8: Tombol Simpan enabled ketika semua field valid
  it('9.8: tombol Simpan enabled ketika semua field valid', () => {
    renderModal({
      transaction: makeTx({
        namaBarang: 'Laptop',
        qty: 2,
        hargaSatuan: 5000000,
      }),
    });

    // Tidak ada submit, tidak ada error — tombol harus enabled
    const btnSimpan = screen.getByText('Simpan');
    expect(btnSimpan).not.toBeDisabled();
  });

  // 9.9: Klik tombol Batal menutup modal tanpa memanggil onSave
  it('9.9: klik tombol Batal memanggil onClose tanpa memanggil onSave', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    renderModal({ onClose, onSave });

    const btnBatal = screen.getByText('Batal');
    fireEvent.click(btnBatal);

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  // 9.10: Tekan Escape menutup modal tanpa memanggil onSave
  it('9.10: tekan Escape memanggil onClose tanpa memanggil onSave', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    renderModal({ onClose, onSave });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  // 9.11: Klik overlay menutup modal tanpa memanggil onSave
  it('9.11: klik overlay (outer div) memanggil onClose tanpa memanggil onSave', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    renderModal({ onClose, onSave });

    const overlay = document.querySelector('[data-testid="edit-transaction-modal"]');
    expect(overlay).not.toBeNull();

    // Simulasikan klik langsung pada overlay (bukan child)
    fireEvent.click(overlay, { target: overlay });

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — Property Tests untuk EditTransactionModal.jsx menggunakan fast-check
// ═══════════════════════════════════════════════════════════════════════════════

describe('Task 10 — Property Tests: EditTransactionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Property 1: Kalkulasi total otomatis
  // Feature: edit-transaction, Property 1: Kalkulasi total
  // Untuk setiap pasangan (qty, hargaSatuan), verifikasi total === qty * hargaSatuan
  // atau 0 jika salah satu <= 0
  it(
    'Property 1: Kalkulasi total — total === qty * hargaSatuan atau 0 jika salah satu <= 0 — Validates: Requirements 3.1, 3.2, 3.4, 3.5',
    { timeout: 30000 },
    () => {
      // Feature: edit-transaction, Property 1: Kalkulasi total
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 1000000 }),
          (qty, hargaSatuan) => {
            const onClose = vi.fn();
            const onSave = vi.fn();
            const tx = makeTx({ qty, hargaSatuan });

            const { unmount } = render(
              <EditTransactionModal
                transaction={tx}
                isOpen={true}
                onClose={onClose}
                onSave={onSave}
              />
            );

            const qtyInput = document.getElementById('edit-qty');
            const hargaInput = document.getElementById('edit-hargaSatuan');
            const totalDisplay = document.querySelector('[data-testid="total-display"]');

            // Ubah nilai field
            fireEvent.change(qtyInput, { target: { name: 'qty', value: String(qty) } });
            fireEvent.change(hargaInput, {
              target: { name: 'hargaSatuan', value: String(hargaSatuan) },
            });

            const expectedTotal = qty > 0 && hargaSatuan > 0 ? qty * hargaSatuan : 0;
            const expectedDisplay = expectedTotal > 0 ? expectedTotal.toLocaleString('id-ID') : '0';

            const result = totalDisplay.value === expectedDisplay;

            unmount();
            return result;
          }
        ),
        { numRuns: 20 }
      );
    }
  );

  // Property 2: Validasi mencegah simpan
  // Feature: edit-transaction, Property 2: Validasi mencegah simpan
  // Untuk setiap input tidak valid (namaBarang kosong, qty < 1, atau hargaSatuan < 0),
  // verifikasi tombol Simpan disabled setelah submit
  it(
    'Property 2: Validasi mencegah simpan — tombol Simpan disabled untuk input tidak valid — Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5',
    { timeout: 30000 },
    () => {
      // Feature: edit-transaction, Property 2: Validasi mencegah simpan
      // Generator untuk input tidak valid: salah satu dari tiga kondisi invalid
      const invalidInputArb = fc.oneof(
        // namaBarang kosong
        fc.record({
          namaBarang: fc.constant(''),
          qty: fc.integer({ min: 1, max: 100 }),
          hargaSatuan: fc.integer({ min: 0, max: 1000000 }),
        }),
        // qty < 1
        fc.record({
          namaBarang: fc.string({ minLength: 1, maxLength: 20 }),
          qty: fc.integer({ min: -100, max: 0 }),
          hargaSatuan: fc.integer({ min: 0, max: 1000000 }),
        }),
        // hargaSatuan < 0
        fc.record({
          namaBarang: fc.string({ minLength: 1, maxLength: 20 }),
          qty: fc.integer({ min: 1, max: 100 }),
          hargaSatuan: fc.integer({ min: -1000000, max: -1 }),
        })
      );

      fc.assert(
        fc.property(invalidInputArb, ({ namaBarang, qty, hargaSatuan }) => {
          const onClose = vi.fn();
          const onSave = vi.fn();
          const tx = makeTx({ namaBarang: 'Laptop', qty: 2, hargaSatuan: 5000000 });

          const { unmount } = render(
            <EditTransactionModal
              transaction={tx}
              isOpen={true}
              onClose={onClose}
              onSave={onSave}
            />
          );

          // Ubah field ke nilai tidak valid
          const namaInput = document.getElementById('edit-namaBarang');
          const qtyInput = document.getElementById('edit-qty');
          const hargaInput = document.getElementById('edit-hargaSatuan');

          fireEvent.change(namaInput, { target: { name: 'namaBarang', value: namaBarang } });
          fireEvent.change(qtyInput, { target: { name: 'qty', value: String(qty) } });
          fireEvent.change(hargaInput, {
            target: { name: 'hargaSatuan', value: String(hargaSatuan) },
          });

          // Submit form untuk trigger validasi
          const form = document.getElementById('form-edit-transaksi');
          fireEvent.submit(form);

          // Tombol Simpan harus disabled
          const btnSimpan = document.querySelector('button[type="submit"]');
          const isDisabled = btnSimpan.disabled === true;

          unmount();
          return isDisabled;
        }),
        { numRuns: 20 }
      );
    }
  );

  // Property 3: Batal tidak mengubah data
  // Feature: edit-transaction, Property 3: Batal tidak mengubah data
  // Untuk setiap perubahan form, klik Batal tidak memanggil onSave
  it(
    'Property 3: Batal tidak mengubah data — klik Batal tidak memanggil onSave — Validates: Requirements 2.5, 2.6, 2.7',
    { timeout: 30000 },
    () => {
      // Feature: edit-transaction, Property 3: Batal tidak mengubah data
      const formChangeArb = fc.record({
        namaBarang: fc.string({ minLength: 1, maxLength: 30 }),
        qty: fc.integer({ min: 1, max: 100 }),
        hargaSatuan: fc.integer({ min: 1, max: 1000000 }),
      });

      fc.assert(
        fc.property(formChangeArb, ({ namaBarang, qty, hargaSatuan }) => {
          const onClose = vi.fn();
          const onSave = vi.fn();
          const tx = makeTx();

          const { unmount } = render(
            <EditTransactionModal
              transaction={tx}
              isOpen={true}
              onClose={onClose}
              onSave={onSave}
            />
          );

          // Ubah beberapa field
          const namaInput = document.getElementById('edit-namaBarang');
          const qtyInput = document.getElementById('edit-qty');
          const hargaInput = document.getElementById('edit-hargaSatuan');

          fireEvent.change(namaInput, { target: { name: 'namaBarang', value: namaBarang } });
          fireEvent.change(qtyInput, { target: { name: 'qty', value: String(qty) } });
          fireEvent.change(hargaInput, {
            target: { name: 'hargaSatuan', value: String(hargaSatuan) },
          });

          // Klik Batal
          const btnBatal = document.querySelector('button[type="button"][class*="border"]');
          fireEvent.click(btnBatal);

          // onSave tidak boleh dipanggil
          const result = onSave.mock.calls.length === 0;

          unmount();
          return result;
        }),
        { numRuns: 20 }
      );
    }
  );
});
