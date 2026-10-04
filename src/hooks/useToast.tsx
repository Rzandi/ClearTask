/* ═══════════════════════════════════════════════════════════
   useToast — ClearTask (W3-02)
   Context-based toast notification hook.
   Replaces all alert() calls with non-blocking toast messages.
   ═══════════════════════════════════════════════════════════ */

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast from '../components/Toast';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastMessage['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'success', duration?: number) => {
      const id = ++counterRef.current;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Render toast stack */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 sm:right-6 sm:top-6 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast
              message={t.message}
              type={t.type}
              duration={t.duration}
              onClose={() => removeToast(t.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback: if used outside provider, use alert (shouldn't happen in prod)
    return {
      showToast: (message: string) => {
        // eslint-disable-next-line no-alert
        alert(message);
      },
    };
  }
  return ctx;
}
