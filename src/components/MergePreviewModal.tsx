/* ═══════════════════════════════════════════════════════════
   MergePreviewModal — ClearTask
   Modal konfirmasi yang menampilkan ringkasan MergeResult
   sebelum pengguna menyetujui penerapan merge.
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';

export interface MergePreviewModalProps {
  isOpen: boolean;
  mergeResult: any;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function MergePreviewModal({ isOpen, mergeResult, onConfirm, onCancel }: MergePreviewModalProps) {
  const [merged, setMerged] = useState(false);

  // Return null when modal is closed
  if (!isOpen) return null;

  const hasOrphans = mergeResult && mergeResult.orphanTransactions > 0;

  async function handleConfirm() {
    onConfirm();
    setMerged(true);
  }

  function handleCancel() {
    setMerged(false);
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="merge-preview-modal"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />

      {/* Modal card */}
      <div className="relative glass-card w-full max-w-md mx-4 p-6 animate-slide-up">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-text-primary">Konfirmasi Merge Database</h2>
          <p className="text-sm text-text-muted mt-1">
            Tinjau ringkasan data yang akan digabungkan sebelum melanjutkan.
          </p>
        </div>

        {/* Success state */}
        {merged ? (
          <div
            className="rounded-xl bg-primary/10 border border-primary/30 p-4 text-center"
            data-testid="merge-success-msg"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              {/* Checkmark icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="font-semibold text-primary">Merge berhasil!</span>
            </div>
            <p className="text-sm text-text-secondary">
              {mergeResult?.newTransactions ?? 0} transaksi,{' '}
              {mergeResult?.newSessions ?? 0} sesi,{' '}
              {mergeResult?.newCategories ?? 0} kategori ditambahkan.
            </p>
          </div>
        ) : (
          <>
            {/* Summary section */}
            <div className="space-y-3 mb-5">
              <SummaryRow
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                }
                label="Transaksi baru"
                value={mergeResult?.newTransactions ?? 0}
              />
              <SummaryRow
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                }
                label="Sesi baru"
                value={mergeResult?.newSessions ?? 0}
              />
              <SummaryRow
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                }
                label="Kategori baru"
                value={mergeResult?.newCategories ?? 0}
              />
              <SummaryRow
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                }
                label="Item dilewati (duplikat)"
                value={mergeResult?.skipped ?? 0}
                muted
              />
            </div>

            {/* Orphan transactions warning */}
            {hasOrphans && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 mb-5">
                <div className="flex items-start gap-3">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-amber-400 mt-0.5 shrink-0"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-400">Peringatan</p>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      {mergeResult.orphanTransactions} transaksi mereferensikan sesi yang tidak ditemukan.
                      Transaksi tersebut akan tetap disimpan dengan sessionId aslinya.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                data-testid="merge-cancel-btn"
                className="px-6 py-2.5 text-sm font-medium rounded-xl border border-border-default text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                data-testid="merge-confirm-btn"
                className="px-8 py-2.5 bg-primary text-text-inverse font-bold text-sm rounded-xl hover:bg-primary-hover active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.2)] hover:shadow-[0_0_30px_rgba(0,255,163,0.35)] cursor-pointer"
              >
                Terapkan Merge
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Summary Row ─────────────────────────────────────────── */
interface SummaryRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  muted?: boolean;
}
function SummaryRow({ icon, label, value, muted = false }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-border-default">
      <div className={`flex items-center gap-2.5 ${muted ? 'text-text-muted' : 'text-text-secondary'}`}>
        <span className={muted ? 'text-text-muted' : 'text-primary'}>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-sm font-semibold tabular-nums ${muted ? 'text-text-muted' : 'text-text-primary'}`}>
        {value}
      </span>
    </div>
  );
}
