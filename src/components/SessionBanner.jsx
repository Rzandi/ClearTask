/* ═══════════════════════════════════════════════════════════
   SessionBanner — ClearTask Active Session Display
   ═══════════════════════════════════════════════════════════ */

import { formatDate, formatTime } from '../utils/formatters';

/**
 * SessionBanner displays the active session status above main content
 * @param {Object} props
 * @param {Object|null} props.session - Active session object or null
 * @param {Function} props.onClose - Callback when "Tutup Session" is clicked
 */
export default function SessionBanner({ session, onClose, onOpen }) {
  // 9.1 Render banner khusus mobile untuk buka sesi jika tidak ada sesi
  if (!session || session.status !== 'aktif') {
    return (
      <div className="lg:hidden w-full bg-accent-red/10 border border-accent-red/20 rounded-xl px-4 py-3 mb-6 backdrop-blur-sm">
        <div className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Warning Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-red/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-red">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            {/* Warning Info */}
            <div className="flex flex-col">
              <h3 className="text-xs font-semibold text-accent-red">Belum ada sesi</h3>
              <p className="text-[10px] text-text-secondary">Buka untuk mencatat</p>
            </div>
          </div>

          <button
            onClick={onOpen}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-bg-base bg-accent-red hover:bg-red-500 rounded-lg transition-colors duration-200"
          >
            Buka Sesi
          </button>
        </div>
      </div>
    );
  }

  // 9.2 Tampilkan nama sesi atau "Sesi Tanpa Nama" jika session.nama kosong
  const displayName = session.nama || 'Sesi Tanpa Nama';

  // 9.3 Tampilkan waktu mulai dalam format "Dibuka: 14 Jul 2025, 08:30"
  const formattedDate = formatDate(session.waktuMulai);
  const formattedTime = formatTime(session.waktuMulai);
  const startTimeDisplay = `Dibuka: ${formattedDate}, ${formattedTime}`;

  return (
    <div className="w-full bg-primary/10 border border-primary/30 rounded-xl px-6 py-4 mb-6 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Session Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          {/* Session Info */}
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-primary">
              {displayName}
            </h3>
            <p className="text-sm text-text-secondary">
              {startTimeDisplay}
            </p>
          </div>
        </div>

        {/* 9.4 Tampilkan tombol "Tutup Session" yang memanggil prop onClose */}
        <button
          onClick={onClose}
          className="flex-shrink-0 px-4 py-2 text-sm font-medium text-text-primary bg-bg-elevated hover:bg-bg-card border border-border-default rounded-lg transition-colors duration-200 hover:border-primary/50"
        >
          Tutup Session
        </button>
      </div>
    </div>
  );
}
