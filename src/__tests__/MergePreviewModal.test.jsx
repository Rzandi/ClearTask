/* ═══════════════════════════════════════════════════════════
   MergePreviewModal.test.jsx — ClearTask
   Unit tests untuk komponen MergePreviewModal
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MergePreviewModal from '../components/MergePreviewModal';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const defaultMergeResult = {
  newTransactions: 5,
  newSessions: 2,
  newCategories: 3,
  skipped: 1,
  orphanTransactions: 0,
  transactionsToAdd: [],
  sessionsToAdd: [],
  categoriesToAdd: [],
};

const defaultImportData = {
  version: '1.0',
  exportedAt: '2025-07-14T08:30:00.000Z',
  transactions: [],
  sessions: [],
  categories: { categories: [] },
  metadata: { totalTransactions: 0, totalSessions: 0, deviceInfo: '' },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderModal(props = {}) {
  const defaults = {
    isOpen: true,
    mergeResult: defaultMergeResult,
    importData: defaultImportData,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  return render(<MergePreviewModal {...defaults} {...props} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MergePreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Visibility ─────────────────────────────────────────────────────────────

  it('tidak merender konten saat isOpen=false', () => {
    render(
      <MergePreviewModal
        isOpen={false}
        mergeResult={defaultMergeResult}
        importData={defaultImportData}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByTestId('merge-preview-modal')).not.toBeInTheDocument();
  });

  it('merender modal saat isOpen=true', () => {
    renderModal();
    expect(screen.getByTestId('merge-preview-modal')).toBeInTheDocument();
  });

  // ── Header ─────────────────────────────────────────────────────────────────

  it('menampilkan judul "Konfirmasi Merge Database"', () => {
    renderModal();
    expect(screen.getByText('Konfirmasi Merge Database')).toBeInTheDocument();
  });

  // ── Summary section ────────────────────────────────────────────────────────

  it('menampilkan ringkasan MergeResult dengan nilai yang benar', () => {
    renderModal({
      mergeResult: {
        ...defaultMergeResult,
        newTransactions: 7,
        newSessions: 3,
        newCategories: 2,
        skipped: 4,
      },
    });

    expect(screen.getByText('Transaksi baru')).toBeInTheDocument();
    expect(screen.getByText('Sesi baru')).toBeInTheDocument();
    expect(screen.getByText('Kategori baru')).toBeInTheDocument();
    expect(screen.getByText('Item dilewati (duplikat)')).toBeInTheDocument();

    // Check values
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('menampilkan nilai 0 saat mergeResult null', () => {
    renderModal({ mergeResult: null });
    // Should show 0 for all counts
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });

  // ── Orphan warning ─────────────────────────────────────────────────────────

  it('tidak menampilkan peringatan saat orphanTransactions = 0', () => {
    renderModal({ mergeResult: { ...defaultMergeResult, orphanTransactions: 0 } });
    expect(screen.queryByText(/mereferensikan sesi yang tidak ditemukan/i)).not.toBeInTheDocument();
  });

  it('menampilkan peringatan saat orphanTransactions > 0', () => {
    renderModal({ mergeResult: { ...defaultMergeResult, orphanTransactions: 3 } });
    expect(screen.getByText(/3 transaksi mereferensikan sesi yang tidak ditemukan/i)).toBeInTheDocument();
  });

  // ── Buttons ────────────────────────────────────────────────────────────────

  it('menampilkan tombol "Terapkan Merge" dan "Batal"', () => {
    renderModal();
    expect(screen.getByTestId('merge-confirm-btn')).toBeInTheDocument();
    expect(screen.getByTestId('merge-cancel-btn')).toBeInTheDocument();
    expect(screen.getByText('Terapkan Merge')).toBeInTheDocument();
    expect(screen.getByText('Batal')).toBeInTheDocument();
  });

  it('klik tombol "Terapkan Merge" memanggil onConfirm', () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm });

    fireEvent.click(screen.getByTestId('merge-confirm-btn'));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('klik tombol "Batal" memanggil onCancel', () => {
    const onCancel = vi.fn();
    renderModal({ onCancel });

    fireEvent.click(screen.getByTestId('merge-cancel-btn'));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('klik tombol "Batal" tidak memanggil onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderModal({ onConfirm, onCancel });

    fireEvent.click(screen.getByTestId('merge-cancel-btn'));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  // ── Success state ──────────────────────────────────────────────────────────

  it('menampilkan pesan sukses setelah tombol "Terapkan Merge" diklik', () => {
    renderModal({
      mergeResult: {
        ...defaultMergeResult,
        newTransactions: 5,
        newSessions: 2,
        newCategories: 3,
      },
    });

    // Before confirm: no success message
    expect(screen.queryByTestId('merge-success-msg')).not.toBeInTheDocument();

    // Click confirm
    fireEvent.click(screen.getByTestId('merge-confirm-btn'));

    // After confirm: success message appears
    expect(screen.getByTestId('merge-success-msg')).toBeInTheDocument();
    expect(screen.getByText(/Merge berhasil!/i)).toBeInTheDocument();
    expect(screen.getByText(/5 transaksi/i)).toBeInTheDocument();
    expect(screen.getByText(/2 sesi/i)).toBeInTheDocument();
    expect(screen.getByText(/3 kategori ditambahkan/i)).toBeInTheDocument();
  });

  it('menyembunyikan tombol aksi setelah merge berhasil', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('merge-confirm-btn'));

    // Buttons should no longer be visible after success
    expect(screen.queryByTestId('merge-confirm-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('merge-cancel-btn')).not.toBeInTheDocument();
  });

  // ── Overlay click ──────────────────────────────────────────────────────────

  it('klik overlay memanggil onCancel', () => {
    const onCancel = vi.fn();
    renderModal({ onCancel });

    // The overlay is the absolute div inside the modal root
    const overlay = screen.getByTestId('merge-preview-modal').querySelector('.absolute');
    fireEvent.click(overlay);

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
