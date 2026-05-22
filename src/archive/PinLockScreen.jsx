/* ═══════════════════════════════════════════════════════════
   PinLockScreen — ClearTask
   Full-screen PIN entry / first-time setup screen.
   Handles:
   - First-time PIN creation (isPinSet = false)
   - Subsequent logins (isPinSet = true)
   - "Lupa PIN / Reset Data" with confirmation dialog
   - Brute-force lockout: 5 attempts → exponential backoff
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { useSecurity } from './SecurityContext';

// Lockout durations per attempt count (seconds)
const LOCKOUT_SECONDS = [0, 0, 0, 0, 0, 30, 60, 120, 300, 300];

export default function PinLockScreen() {
  const { isPinSet, login, setupPin, resetAllData, error: securityError } = useSecurity();

  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  // ── Brute-force protection ───────────────────────────────
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Countdown timer saat terkunci
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
        setLocalError('');
      } else {
        setLockCountdown(remaining);
        setLocalError(`Terlalu banyak percobaan. Coba lagi dalam ${remaining} detik.`);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && lockCountdown > 0;

  // ── "Lupa PIN" confirmation state ───────────────────────
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const title = isPinSet ? 'MASUKKAN PIN' : 'BUAT PIN BARU';
  const subtitle = isPinSet
    ? 'Aplikasi terkunci. Masukkan PIN 4–6 digit kasir Anda.'
    : 'Amankan data aplikasi Anda dengan PIN numerik (4–6 digit).';

  // ── Numpad handlers ──────────────────────────────────────

  const handleNumpadClick = useCallback(
    (num) => {
      if (isLocked) return;
      if (pin.length < 6) {
        setPin((prev) => prev + num);
        setLocalError('');
      }
    },
    [isLocked, pin.length]
  );

  const handleBackspace = useCallback(() => {
    if (isLocked) return;
    setPin((prev) => prev.slice(0, -1));
    setLocalError('');
  }, [isLocked]);

  // ── Submit ───────────────────────────────────────────────

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isLocked) return;
    if (pin.length < 4) {
      setLocalError('PIN harus minimal 4 digit.');
      return;
    }

    setIsSubmitting(true);
    setLocalError('');
    try {
      if (isPinSet) {
        await login(pin);
        // Reset attempt counter on success
        setFailedAttempts(0);
        setLockedUntil(null);
      } else {
        await setupPin(pin);
      }
    } catch {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setPin('');

      // Apply lockout after 5 failed attempts
      if (newAttempts >= 5) {
        const lockSecs = LOCKOUT_SECONDS[Math.min(newAttempts, LOCKOUT_SECONDS.length - 1)];
        const until = Date.now() + lockSecs * 1000;
        setLockedUntil(until);
        setLockCountdown(lockSecs);
        setLocalError(`Terlalu banyak percobaan. Coba lagi dalam ${lockSecs} detik.`);
      } else {
        const remaining = 5 - newAttempts;
        setLocalError(`PIN salah. ${remaining} percobaan tersisa sebelum dikunci.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reset / Lupa PIN ─────────────────────────────────────

  const handleResetConfirm = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      setFailedAttempts(0);
      setLockedUntil(null);
    } catch {
      setLocalError('Gagal mereset data. Coba lagi.');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)] p-4">
      {/* Neon glow background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[var(--color-primary)] opacity-[0.04] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="glass-card p-8 animate-slide-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--color-primary-subtle)] flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {isPinSet ? (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </>
                ) : (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </>
                )}
              </svg>
            </div>
            <h1
              className="text-2xl font-extrabold tracking-widest text-[var(--color-text-primary)] mb-2"
              data-testid="lock-title"
            >
              {title}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">{subtitle}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col items-center"
            aria-label="Form masukkan PIN"
          >
            {/* PIN dots display */}
            <div
              className="flex gap-3 mb-8 justify-center"
              role="status"
              aria-label={`${pin.length} dari 6 digit PIN sudah dimasukkan`}
              aria-live="polite"
            >
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    i < pin.length
                      ? 'bg-[var(--color-primary)] scale-125 shadow-[0_0_8px_rgba(0,255,163,0.7)]'
                      : 'bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)]'
                  }`}
                />
              ))}
            </div>

            {/* Numpad */}
            <div
              className="grid grid-cols-3 gap-3 mb-6 w-full max-w-[240px]"
              role="group"
              aria-label="Papan angka PIN"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumpadClick(num.toString())}
                  disabled={isLocked}
                  aria-label={`Digit ${num}`}
                  className="w-16 h-16 mx-auto rounded-full text-xl font-semibold bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-all active:scale-90 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {num}
                </button>
              ))}

              {/* Empty slot */}
              <div aria-hidden="true" />

              {/* 0 */}
              <button
                type="button"
                onClick={() => handleNumpadClick('0')}
                disabled={isLocked}
                aria-label="Digit 0"
                className="w-16 h-16 mx-auto rounded-full text-xl font-semibold bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-all active:scale-90 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={isLocked}
                aria-label="Hapus digit terakhir"
                className="w-16 h-16 mx-auto rounded-full text-xl font-semibold bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border-default)] hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                  />
                </svg>
              </button>
            </div>

            {/* Error / lockout message */}
            {(localError || securityError) && (
              <div
                role="alert"
                aria-live="assertive"
                className="text-red-400 text-sm mb-4 font-medium px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-center w-full"
              >
                {localError || securityError}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={pin.length < 4 || isSubmitting || isLocked}
              className="w-full py-3.5 rounded-xl font-bold tracking-widest text-sm text-[var(--color-text-inverse)] bg-[var(--color-primary)] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(0,255,163,0.2)]"
            >
              {isLocked
                ? `DIKUNCI (${lockCountdown}s)`
                : isSubmitting
                  ? 'MEMPROSES...'
                  : isPinSet
                    ? 'BUKA KUNCI'
                    : 'SIMPAN PIN'}
            </button>
          </form>

          {/* Lupa PIN — hanya tampil jika PIN sudah pernah diset */}
          {isPinSet && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-[var(--color-text-muted)] hover:text-red-400 transition-colors underline underline-offset-2"
              >
                Lupa PIN? Reset semua data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Reset Confirmation Dialog ── */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowResetConfirm(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <div className="glass-card w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f85149"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2
                id="reset-dialog-title"
                className="text-base font-semibold text-[var(--color-text-primary)]"
              >
                Reset Semua Data?
              </h2>
            </div>

            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-6">
              Tindakan ini akan{' '}
              <span className="text-red-400 font-semibold">menghapus permanen</span> semua
              transaksi, sesi, inventaris, dan pengaturan. Data yang sudah dihapus{' '}
              <span className="font-semibold">tidak bisa dipulihkan</span>.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)] border border-[var(--color-border-default)] transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={isResetting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-50"
              >
                {isResetting ? 'Menghapus...' : 'Ya, Hapus Semua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
