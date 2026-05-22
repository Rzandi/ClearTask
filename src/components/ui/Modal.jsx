/* ═══════════════════════════════════════════════════════════
   Modal — ClearTask UI Component
   Reusable modal base with backdrop, animation, portal, and focus trap.
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

// Selectors for all focusable elements inside a container
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Modal component — renders via createPortal into document.body.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string} title - Optional header title
 * @param {React.ReactNode} children - Modal body content
 * @param {React.ReactNode} footer - Optional footer slot
 * @param {'sm'|'md'|'lg'|'xl'|'full'} size
 * @param {string} className - Extra classes on the modal card
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
}) {
  const modalRef = useRef(null);

  // Close on Escape key + Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      // Focus trap: keep Tab/Shift+Tab inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(modalRef.current.querySelectorAll(FOCUSABLE));
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKey);

    // Auto-focus first focusable element when modal opens
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const first = modalRef.current.querySelector(FOCUSABLE);
        first?.focus();
      }
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKey);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-[95vw]',
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'glass-card w-full animate-slide-up flex flex-col max-h-[90vh]',
          sizes[size],
          className
        )}
        ref={modalRef}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-default shrink-0">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
              aria-label="Tutup"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-6 pt-4 border-t border-border-default shrink-0">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
