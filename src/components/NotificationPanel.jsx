/* ═══════════════════════════════════════════════════════════
   NotificationPanel — ClearTask
   Dropdown panel untuk menampilkan 5 transaksi terbaru
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useRef } from 'react';

function getRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  return `${days} hari lalu`;
}

export default function NotificationPanel({ isOpen, onClose, transactions }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Sort by createdAt descending and take 5 most recent
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div
      ref={panelRef}
      data-testid="notification-panel"
      className="absolute top-full right-0 mt-2 w-80 glass-card shadow-elevated animate-slide-down z-50 max-h-[480px] overflow-y-auto"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Notifikasi Transaksi</h3>
          <span className="text-xs text-text-muted">
            {recentTransactions.length} transaksi
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="py-2">
        {recentTransactions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <svg
              className="mx-auto mb-3 text-text-muted"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="text-sm text-text-muted">Belum ada transaksi</p>
          </div>
        ) : (
          recentTransactions.map((tx) => (
            <div
              key={tx.transactionId}
              className="px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-border-subtle last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {tx.namaBarang}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {getRelativeTime(tx.createdAt)}
                  </p>
                </div>
                <div className="text-sm font-semibold text-primary whitespace-nowrap">
                  Rp {tx.total.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
