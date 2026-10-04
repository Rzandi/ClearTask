/* ═══════════════════════════════════════════════════════════
   useConfirm — ClearTask (W3-01)
   Promise-based confirm dialog hook.
   Replaces all window.confirm() calls with a styled modal.
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback, useRef } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  children?: React.ReactNode;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
}

/**
 * Hook that provides a promise-based `confirm()` function and a
 * `<ConfirmDialogPortal />` component that must be rendered once
 * in the component tree.
 *
 * Usage:
 * ```tsx
 * const { confirm, ConfirmDialogPortal } = useConfirm();
 *
 * async function handleDelete() {
 *   const ok = await confirm({ message: 'Yakin hapus?' });
 *   if (ok) { ... }
 * }
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Hapus</button>
 *     <ConfirmDialogPortal />
 *   </>
 * );
 * ```
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        ...options,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const ConfirmDialogPortal = useCallback(
    () => (
      <ConfirmDialog
        isOpen={state.isOpen}
        title={state.title || 'Konfirmasi'}
        message={state.message}
        confirmLabel={state.confirmLabel || 'Ya'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      >
        {state.children}
      </ConfirmDialog>
    ),
    [
      state.isOpen,
      state.title,
      state.message,
      state.confirmLabel,
      state.children,
      handleConfirm,
      handleCancel,
    ]
  );

  return { confirm, ConfirmDialogPortal };
}
