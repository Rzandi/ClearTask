/* ═══════════════════════════════════════════════════════════
   ConfirmDialog — ClearTask
   Modal konfirmasi kecil untuk aksi destruktif (hapus transaksi)
   Refactored to use <Modal /> base component.
   ═══════════════════════════════════════════════════════════ */

import { memo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

const ConfirmDialog = memo(function ConfirmDialog({ isOpen, message, onConfirm, onCancel }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      title="Konfirmasi Hapus"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Batal
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            Hapus
          </Button>
        </div>
      }
    >
      <div data-testid="confirm-dialog">
        <p className="text-sm text-text-muted leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
});

export default ConfirmDialog;
