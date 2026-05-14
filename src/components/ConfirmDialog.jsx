/* ═══════════════════════════════════════════════════════════
   ConfirmDialog — ClearTask
   Modal konfirmasi kecil untuk aksi destruktif (hapus transaksi)
   ═══════════════════════════════════════════════════════════ */

import { useEffect, memo } from 'react';

const ConfirmDialog = memo(function ConfirmDialog({ isOpen, message, onConfirm, onCancel }) {
  // Keyboard listener: Escape → onCancel
  // Hook must be called before any early return (Rules of Hooks)
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onCancel();
  }

  return (
    /* Backdrop */
    <div
      data-testid="confirm-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Modal card */}
      <div className="glass-card w-full max-w-sm mx-4 animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border-default">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f87171"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-text-primary">Konfirmasi Hapus</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-text-muted leading-relaxed">{message}</p>
        </div>

        {/* Footer — tombol aksi */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-white/[0.06] text-text-muted hover:bg-white/[0.1] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
});

export default ConfirmDialog;
