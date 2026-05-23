/* ═══════════════════════════════════════════════════════════
   Toast — ClearTask Notification Component
   ═══════════════════════════════════════════════════════════ */

import { memo, useEffect, useState } from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning';
  onClose: () => void;
  duration?: number;
}

const Toast = memo(function Toast({ message, type = 'success', onClose, duration = 5000 }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 250);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'bg-primary/15 border-primary/30 text-primary',
    error: 'bg-error/15 border-error/30 text-error',
    warning: 'bg-pending/15 border-pending/30 text-pending',
  };

  const icons = {
    success: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    error: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    warning: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] sm:left-auto sm:right-6 sm:top-6 sm:w-auto">
      <div
        role="alert"
        aria-live={type === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true"
        className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-md shadow-elevated w-full sm:w-auto ${
          colors[type]
        } ${isLeaving ? 'animate-toast-out' : 'animate-toast-in'}`}
      >
        {icons[type]}
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(onClose, 250);
          }}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Tutup notifikasi"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default Toast;
