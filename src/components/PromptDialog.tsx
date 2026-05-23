/* ═══════════════════════════════════════════════════════════
   PromptDialog — ClearTask
   Modal prompt untuk memasukkan teks (pengganti window.prompt)
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, memo } from 'react';

export interface PromptDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (val: string) => void;
  onCancel: () => void;
}

const PromptDialog = memo(function PromptDialog({
  isOpen,
  title,
  message,
  defaultValue = '',
  placeholder = '',
  confirmText = 'OK',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open and reset value
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      // Small timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultValue]);

  // Keyboard listener: Escape → onCancel, Enter → onConfirm
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm(value);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm, value]);

  if (!isOpen) return null;

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onCancel();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-dialog-title"
      aria-describedby="prompt-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-sm bg-bg-elevated border border-border-color rounded-2xl p-6 shadow-xl animate-scale-up"
      >
        {title && (
          <h3 id="prompt-dialog-title" className="text-lg font-bold text-text-primary mb-2">
            {title}
          </h3>
        )}
        
        {message && (
          <p id="prompt-dialog-desc" className="text-sm text-text-secondary mb-4 leading-relaxed">
            {message}
          </p>
        )}

        <div className="mb-6">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 bg-bg-primary/50 border border-border-color rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-bg-primary text-text-secondary hover:text-text-primary hover:bg-border-color focus:outline-none focus:ring-2 focus:ring-border-color transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(value)}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-primary text-bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-elevated transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
});

export default PromptDialog;
