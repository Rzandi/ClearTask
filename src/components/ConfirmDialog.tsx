/* ═══════════════════════════════════════════════════════════
   ConfirmDialog — ClearTask
   Modal konfirmasi kecil untuk aksi destruktif (hapus transaksi)
   Refactored to use <Modal /> base component.
   ═══════════════════════════════════════════════════════════ */

import { memo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  title?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

const ConfirmDialog = memo(function ConfirmDialog({
  isOpen,
  message,
  title,
  confirmLabel,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      title={title || 'Konfirmasi Hapus'}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Batal
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            {confirmLabel || 'Hapus'}
          </Button>
        </div>
      }
    >
      <div data-testid="confirm-dialog">
        <p className="text-sm text-text-muted leading-relaxed">{message}</p>
        {children}
      </div>
    </Modal>
  );
});

export default ConfirmDialog;
