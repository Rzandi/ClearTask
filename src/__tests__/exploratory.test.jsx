/**
 * Exploratory Bug Condition Tests — ClearTask
 *
 * TUJUAN: Konfirmasi bahwa bug benar-benar ada SEBELUM fix diterapkan.
 *
 * CATATAN PENTING:
 * - Test-test ini DIHARAPKAN PASS pada kode yang BELUM difix.
 * - "PASS" di sini berarti kita berhasil mengkonfirmasi kondisi buggy.
 * - Setelah fix diterapkan, test ini akan GAGAL (karena bug sudah diperbaiki).
 *
 * Bug 1 — CSS Padding Override Gagal:
 *   paddingLeft pada #field-hargaSatuan dan #field-total adalah '16px' (bukan 40px).
 *   Ini terjadi karena .form-input (padding: 0.625rem 1rem) menang atas pl-10 (40px)
 *   akibat CSS specificity conflict di Tailwind v4.
 *
 * Bug 2 — Tombol Icon Tanpa Handler:
 *   Klik tombol Settings, Notifikasi, atau Bantuan tidak membuka modal/panel apapun.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InputPenjualan from '../components/InputPenjualan';
import TopBar from '../components/layout/TopBar';
import Sidebar from '../components/layout/Sidebar';
import { SettingsProvider } from '../contexts/SettingsContext';

// Helper: bungkus komponen dengan SettingsProvider
function withSettings(ui) {
  return <SettingsProvider>{ui}</SettingsProvider>;
}

// ─── Bug 1: CSS Padding Override Gagal ────────────────────────────────────────

describe('Bug 1 — CSS Padding Override Gagal (Exploratory)', () => {
  /**
   * Counterexample yang diharapkan:
   *   paddingLeft pada #field-hargaSatuan adalah '16px', bukan '40px'
   *
   * Penjelasan: JSDOM tidak memproses Tailwind CSS, sehingga computed style
   * akan mengembalikan string kosong atau '0px'. Namun kita bisa memverifikasi
   * bahwa class 'pl-10' ada di className (yang seharusnya memberikan 40px)
   * dan class 'form-input' juga ada (yang menyebabkan override ke 16px).
   * Ini membuktikan kondisi bug: kedua class ada, tapi pl-10 tidak menang.
   *
   * Untuk memverifikasi bug secara konkret di JSDOM, kita cek bahwa:
   * 1. Field memiliki class 'form-input' (yang mendefinisikan padding-left: 1rem = 16px)
   * 2. Field memiliki class 'pl-10' (yang seharusnya override ke 40px, tapi gagal)
   * 3. Field TIDAK memiliki class 'form-input-prefixed' (fix belum diterapkan)
   */
  // POST-FIX VERIFICATION: Bug 1a sudah diperbaiki.
  // Class pl-10 telah diganti dengan form-input-prefixed di InputPenjualan.jsx.
  it('Bug 1a: #field-hargaSatuan memiliki class form-input-prefixed dan TIDAK lagi memiliki pl-10 (post-fix verification)', () => {
    const mockSubmit = vi.fn();
    render(withSettings(<InputPenjualan onSubmit={mockSubmit} />));

    const hargaInput = document.getElementById('field-hargaSatuan');
    expect(hargaInput).not.toBeNull();

    // Post-fix: form-input-prefixed ada (fix sudah diterapkan)
    expect(hargaInput.className).toContain('form-input-prefixed');
    // Post-fix: pl-10 sudah dihapus (tidak lagi ada)
    expect(hargaInput.className).not.toContain('pl-10');

    console.log(
      '[Bug 1a Post-Fix] #field-hargaSatuan className:',
      hargaInput.className,
      '— form-input-prefixed ada, pl-10 sudah dihapus. Bug sudah diperbaiki.'
    );
  });

  // POST-FIX VERIFICATION: Bug 1b sudah diperbaiki.
  // Class pl-10 telah diganti dengan form-input-prefixed di InputPenjualan.jsx.
  it('Bug 1b: #field-total memiliki class form-input-prefixed dan TIDAK lagi memiliki pl-10 (post-fix verification)', () => {
    const mockSubmit = vi.fn();
    render(withSettings(<InputPenjualan onSubmit={mockSubmit} />));

    const totalInput = document.getElementById('field-total');
    expect(totalInput).not.toBeNull();

    // Post-fix: form-input-prefixed ada (fix sudah diterapkan)
    expect(totalInput.className).toContain('form-input-prefixed');
    // Post-fix: pl-10 sudah dihapus (tidak lagi ada)
    expect(totalInput.className).not.toContain('pl-10');

    // Counterexample: class pl-10 ada tapi tidak ada override yang benar
    console.log(
      '[Bug 1b Post-Fix] #field-total className:',
      totalInput.className,
      '— form-input-prefixed ada, pl-10 sudah dihapus. Bug sudah diperbaiki.'
    );
  });

  it('Bug 1c: Field lain (non-prefix) tidak memiliki pl-10 — membuktikan hanya field berprefix yang terdampak', () => {
    const mockSubmit = vi.fn();
    render(withSettings(<InputPenjualan onSubmit={mockSubmit} />));

    // Field tanpa prefix tidak memiliki pl-10
    const namaBarangInput = document.getElementById('field-namaBarang');
    const qtyInput = document.getElementById('field-qty');

    expect(namaBarangInput).not.toBeNull();
    expect(qtyInput).not.toBeNull();

    // Field tanpa prefix tidak punya pl-10 (tidak terdampak bug)
    expect(namaBarangInput.className).not.toContain('pl-10');
    expect(qtyInput.className).not.toContain('pl-10');

    console.log(
      '[Bug 1c] Field tanpa prefix tidak memiliki pl-10 — hanya field berprefix yang terdampak bug CSS specificity'
    );
  });
});

// ─── Bug 2: Tombol Icon Tanpa Handler ─────────────────────────────────────────

describe('Bug 2 — Tombol Icon Tanpa Handler (Exploratory)', () => {
  /**
   * Counterexample yang diharapkan:
   *   Setelah klik tombol Settings/Notifikasi/Bantuan, tidak ada modal/panel di DOM.
   *   Ini membuktikan bahwa onClick handler belum ada.
   */

  it('Bug 2a: Klik tombol Settings di TopBar → tidak ada modal Settings di DOM (handler belum ada)', () => {
    const mockSearchChange = vi.fn();
    render(
      <TopBar
        title="ClearTask"
        searchQuery=""
        onSearchChange={mockSearchChange}
      />
    );

    // Cari tombol Settings (tombol pertama dengan SVG gear icon)
    // TopBar memiliki dua tombol icon: Settings dan Notifikasi
    const buttons = screen.getAllByRole('button');
    // Tombol Settings adalah tombol pertama di area kanan (setelah search)
    // Berdasarkan struktur TopBar: tombol pertama = Settings, tombol kedua = Notifikasi
    const settingsButton = buttons.find((btn) => {
      // Settings button memiliki circle cx="12" cy="12" r="3" di SVG-nya
      return btn.innerHTML.includes('cx="12" cy="12" r="3"');
    });

    expect(settingsButton).toBeDefined();

    // Klik tombol Settings
    fireEvent.click(settingsButton);

    // Assert: tidak ada modal Settings di DOM (bug terkonfirmasi — handler tidak ada)
    const settingsModal = document.querySelector('[data-testid="settings-modal"]');
    const settingsModalByRole = screen.queryByRole('dialog');
    const settingsModalByText = screen.queryByText(/pengaturan/i);

    expect(settingsModal).toBeNull();
    expect(settingsModalByRole).toBeNull();
    expect(settingsModalByText).toBeNull();

    console.log(
      '[Bug 2a Counterexample] Klik tombol Settings → tidak ada modal di DOM.',
      'Bug terkonfirmasi: onClick handler belum ada di tombol Settings TopBar.'
    );
  });

  it('Bug 2b: Klik tombol Notifikasi di TopBar → tidak ada panel Notifikasi di DOM (handler belum ada)', () => {
    const mockSearchChange = vi.fn();
    render(
      <TopBar
        title="ClearTask"
        searchQuery=""
        onSearchChange={mockSearchChange}
      />
    );

    // Cari tombol Notifikasi (tombol dengan SVG bell icon)
    const buttons = screen.getAllByRole('button');
    const notifButton = buttons.find((btn) => {
      // Bell icon memiliki path "M18 8A6 6 0 0 0 6 8"
      return btn.innerHTML.includes('M18 8A6 6 0 0 0 6 8');
    });

    expect(notifButton).toBeDefined();

    // Klik tombol Notifikasi
    fireEvent.click(notifButton);

    // Assert: tidak ada panel Notifikasi di DOM (bug terkonfirmasi — handler tidak ada)
    const notifPanel = document.querySelector('[data-testid="notification-panel"]');
    const notifPanelByText = screen.queryByText(/notifikasi/i);
    const notifPanelByText2 = screen.queryByText(/transaksi terbaru/i);

    expect(notifPanel).toBeNull();
    expect(notifPanelByText).toBeNull();
    expect(notifPanelByText2).toBeNull();

    console.log(
      '[Bug 2b Counterexample] Klik tombol Notifikasi → tidak ada panel di DOM.',
      'Bug terkonfirmasi: onClick handler belum ada di tombol Notifikasi TopBar.'
    );
  });

  it('Bug 2c: Klik tombol Bantuan di Sidebar → tidak ada modal Bantuan di DOM (handler belum ada)', () => {
    const mockTabChange = vi.fn();
    render(
      withSettings(
        <Sidebar
          activeTab="input"
          onTabChange={mockTabChange}
        />
      )
    );

    // Cari tombol Bantuan berdasarkan teks
    const helpButton = screen.queryByText('Bantuan');
    expect(helpButton).not.toBeNull();

    // Klik tombol Bantuan (atau parent button-nya)
    const helpButtonEl = helpButton.closest('button') || helpButton;
    fireEvent.click(helpButtonEl);

    // Assert: tidak ada modal Bantuan di DOM (bug terkonfirmasi — handler tidak ada)
    const helpModal = document.querySelector('[data-testid="help-modal"]');
    const helpModalByRole = screen.queryByRole('dialog');
    const helpModalByText = screen.queryByText(/cara input transaksi/i);
    const helpModalByText2 = screen.queryByText(/faq/i);

    expect(helpModal).toBeNull();
    expect(helpModalByRole).toBeNull();
    expect(helpModalByText).toBeNull();
    expect(helpModalByText2).toBeNull();

    console.log(
      '[Bug 2c Counterexample] Klik tombol Bantuan → tidak ada modal di DOM.',
      'Bug terkonfirmasi: onClick handler belum ada di tombol Bantuan Sidebar.'
    );
  });

  it('Bug 2d: Tombol Settings tidak memiliki onClick handler yang terdefinisi', () => {
    const mockSearchChange = vi.fn();
    const { container } = render(
      <TopBar
        title="ClearTask"
        searchQuery=""
        onSearchChange={mockSearchChange}
      />
    );

    // Cari semua button di TopBar
    const buttons = container.querySelectorAll('button');

    // Verifikasi bahwa tidak ada SettingsModal atau NotificationPanel yang ter-render
    // (karena handler belum ada, komponen-komponen ini tidak akan pernah muncul)
    expect(screen.queryByText(/simpan pengaturan/i)).toBeNull();
    expect(screen.queryByText(/nama kasir/i)).toBeNull();

    console.log(
      '[Bug 2d] TopBar memiliki', buttons.length, 'tombol.',
      'Tidak ada SettingsModal atau NotificationPanel yang ter-render — handler belum ada.'
    );
  });
});

// ─── Ringkasan Counterexample ──────────────────────────────────────────────────

describe('Ringkasan Counterexample yang Ditemukan', () => {
  it('Dokumentasi: semua counterexample bug yang terkonfirmasi', () => {
    const counterexamples = [
      {
        bug: 'Bug 1a',
        field: '#field-hargaSatuan',
        kondisi: 'Memiliki class form-input + pl-10 tapi TIDAK form-input-prefixed',
        dampak: 'paddingLeft efektif 16px (dari .form-input), bukan 40px (dari pl-10)',
        rootCause: 'CSS specificity conflict: .form-input menang atas pl-10 di Tailwind v4',
      },
      {
        bug: 'Bug 1b',
        field: '#field-total',
        kondisi: 'Memiliki class form-input + pl-10 tapi TIDAK form-input-prefixed',
        dampak: 'paddingLeft efektif 16px (dari .form-input), bukan 40px (dari pl-10)',
        rootCause: 'CSS specificity conflict: .form-input menang atas pl-10 di Tailwind v4',
      },
      {
        bug: 'Bug 2a',
        komponen: 'TopBar — tombol Settings',
        kondisi: 'Tidak ada onClick handler',
        dampak: 'Klik tombol → tidak ada modal Settings yang muncul',
        rootCause: 'SettingsModal belum dibuat, state showSettings belum ada di App.jsx',
      },
      {
        bug: 'Bug 2b',
        komponen: 'TopBar — tombol Notifikasi',
        kondisi: 'Tidak ada onClick handler',
        dampak: 'Klik tombol → tidak ada panel Notifikasi yang muncul',
        rootCause: 'NotificationPanel belum dibuat, state showNotif belum ada di App.jsx',
      },
      {
        bug: 'Bug 2c',
        komponen: 'Sidebar — tombol Bantuan',
        kondisi: 'Tidak ada onClick handler',
        dampak: 'Klik tombol → tidak ada modal Bantuan yang muncul',
        rootCause: 'HelpModal belum dibuat, state showHelp belum ada di App.jsx',
      },
    ];

    console.log('\n=== RINGKASAN COUNTEREXAMPLE ===');
    counterexamples.forEach((ce) => {
      console.log(`\n[${ce.bug}]`);
      if (ce.field) console.log('  Field:', ce.field);
      if (ce.komponen) console.log('  Komponen:', ce.komponen);
      console.log('  Kondisi:', ce.kondisi);
      console.log('  Dampak:', ce.dampak);
      console.log('  Root Cause:', ce.rootCause);
    });
    console.log('\n================================\n');

    // Test ini selalu PASS — hanya dokumentasi
    expect(counterexamples).toHaveLength(5);
    expect(counterexamples.every((ce) => ce.rootCause)).toBe(true);
  });
});
