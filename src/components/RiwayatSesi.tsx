/* ═══════════════════════════════════════════════════════════
   RiwayatSesi — ClearTask
   Panel riwayat semua sesi kerja yang pernah dibuat
   Feature: session-management
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatDate, formatTime } from '../utils/formatters';
import ClosingReportModal from './ClosingReportModal';
import db from '../services/db';

/**
 * RiwayatSesi displays a list of all sessions (active + closed)
 * @param {Object} props
 * @param {Array} props.allSessions - All sessions from SessionStore
 * @param {Function} props.getSessionTransactions - (sessionId) => Transaction[]
 */
export interface RiwayatSesiProps {
  allSessions?: any[];
  getSessionTransactions: (sessionId: string) => Promise<any[]>;
}

export default function RiwayatSesi({ allSessions = [], getSessionTransactions }: RiwayatSesiProps) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // 19.1 Sort sessions newest first
  const sortedSessions = useMemo(() => {
    return [...allSessions].sort((a, b) => {
      return new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime();
    });
  }, [allSessions]);

  const [txCountMap, setTxCountMap] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadCounts() {
      const map: Record<string, number> = {};
      await Promise.all(
        allSessions.map(async (session) => {
          map[session.id] = await db.transactions.where('sessionId').equals(session.id).count();
        })
      );
      setTxCountMap(map);
    }
    if (allSessions.length > 0) {
      loadCounts();
    }
  }, [allSessions]);

  // 19.4 Handle click on a closed session — open ClosingReportModal
  async function handleSessionClick(session: any) {
    if (session.status !== 'ditutup') return;
    const txs = await getSessionTransactions(session.id);
    setSelectedSession(session);
    setSelectedTransactions(txs);
    setShowModal(true);
  }

  // Pagination Logic
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedSessions.length / ITEMS_PER_PAGE));
  const safeCurrentPage = totalPages > 0 && currentPage > totalPages ? totalPages : currentPage;
  
  const startIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const visibleSessions = sortedSessions.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  function getVisiblePages(current: number, total: number) {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, 5];
    if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
    return [current - 2, current - 1, current, current + 1, current + 2];
  }

  function handleModalClose() {
    setShowModal(false);
    setSelectedSession(null);
    setSelectedTransactions([]);
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-1">Riwayat Sesi</h2>
        <p className="text-sm text-text-muted">Daftar semua sesi kerja yang pernah dibuat.</p>
      </div>

      {/* 19.3 Empty state */}
      {sortedSessions.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-muted"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">Belum ada sesi yang dibuat</p>
          <p className="text-xs text-text-muted">
            Buka sesi baru dari sidebar untuk mulai mencatat transaksi.
          </p>
        </div>
      ) : (
        /* 19.2 Session list */
        <div className="space-y-3">
          {visibleSessions.map((session) => {
            const isClosed = session.status === 'ditutup';
            const txCount = txCountMap[session.id] || 0;
            const displayName = session.nama || 'Sesi Tanpa Nama';

            return (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className={`glass-card p-5 transition-all duration-200 ${
                  isClosed
                    ? 'cursor-pointer hover:border-primary/40 hover:bg-bg-elevated/60'
                    : 'cursor-default'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: session info */}
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Status indicator */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        isClosed ? 'bg-bg-elevated' : 'bg-primary/15'
                      }`}
                    >
                      {isClosed ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#6e7681"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#00ffa3"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      )}
                    </div>

                    {/* Session details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-text-primary truncate">
                          {displayName}
                        </h3>
                        {/* Status badge */}
                        <span
                          className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isClosed
                              ? 'bg-bg-elevated text-text-muted'
                              : 'bg-primary/15 text-primary'
                          }`}
                        >
                          {isClosed ? 'Ditutup' : 'Aktif'}
                        </span>
                      </div>

                      {/* 19.2 Open/close times */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                        <span>
                          Buka: {formatDate(session.waktuMulai)}, {formatTime(session.waktuMulai)}
                        </span>
                        <span>
                          Tutup:{' '}
                          {isClosed && session.waktuTutup
                            ? `${formatDate(session.waktuTutup)}, ${formatTime(session.waktuTutup)}`
                            : 'Masih Aktif'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: transaction count + chevron */}
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-text-primary">{txCount}</p>
                      <p className="text-[10px] text-text-muted">transaksi</p>
                    </div>
                    {isClosed && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6e7681"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {sortedSessions.length > 0 && (
        <div className="flex items-center justify-between px-1 mt-2">
          <p className="text-xs text-text-muted">
            Menampilkan {Math.min(startIdx + 1, sortedSessions.length)}-
            {Math.min(startIdx + ITEMS_PER_PAGE, sortedSessions.length)} dari {sortedSessions.length} sesi
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ‹
            </button>
            {getVisiblePages(safeCurrentPage, totalPages).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  safeCurrentPage === page
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* 19.4 ClosingReportModal for selected session — portalled to body */}
      {createPortal(
        <ClosingReportModal
          isOpen={showModal}
          session={selectedSession}
          transactions={selectedTransactions}
          onClose={handleModalClose}
        />,
        document.body
      )}
    </div>
  );
}
