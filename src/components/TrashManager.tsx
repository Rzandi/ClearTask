/* ═══════════════════════════════════════════════════════════
   TrashManager.tsx — ClearTask Soft Delete Trash Manager
   W0-04: View soft-deleted items, restore, or permanently
   purge with confirmation. Never auto-purges without user confirmation.
   Protects inventory items referenced in transactions from permanent purge.
   W0-14: Uses deletedAt index instead of full table scan.
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback, useMemo, memo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import ConfirmDialog from './ConfirmDialog';

const PURGE_DAYS = 30;

interface TrashManagerProps {
  onRestore?: () => void;
}

export default memo(function TrashManager({ onRestore }: TrashManagerProps) {
  const [feedback, setFeedback] = useState('');
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // W0-14: Query using deletedAt index to avoid full table scan
  const deletedTransactions =
    useLiveQuery(async () => {
      const records = await db.transactions.where('deletedAt').above('').toArray();
      return records.sort(
        (a: any, b: any) =>
          new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
      );
    }) || [];

  const deletedInventory =
    useLiveQuery(async () => {
      const records = await db.inventory.where('deletedAt').above('').toArray();
      return records.sort(
        (a: any, b: any) =>
          new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
      );
    }) || [];

  // Cutoff timestamp for > 30 days
  const cutoffISO = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PURGE_DAYS);
    return cutoff.toISOString();
  }, []);

  const expiredTransactions = useMemo(
    () => deletedTransactions.filter((tx: any) => tx.deletedAt && tx.deletedAt < cutoffISO),
    [deletedTransactions, cutoffISO]
  );

  const expiredInventory = useMemo(
    () => deletedInventory.filter((item: any) => item.deletedAt && item.deletedAt < cutoffISO),
    [deletedInventory, cutoffISO]
  );

  const expiredCount = expiredTransactions.length + expiredInventory.length;
  const totalDeleted = deletedTransactions.length + deletedInventory.length;

  /**
   * Helper: check if an inventory item is referenced by any transaction (active or archived)
   */
  const isItemReferencedInTransactions = useCallback(async (invItem: any): Promise<boolean> => {
    const itemName = (invItem.namaBarang || '').trim().toLowerCase();
    const itemId = String(invItem.id);

    const foundInActive = await db.transactions
      .filter((tx: any) => {
        if (!tx.items || !Array.isArray(tx.items)) return false;
        return tx.items.some(
          (it: any) =>
            (it.inventoryId && String(it.inventoryId) === itemId) ||
            (it.namaBarang && it.namaBarang.trim().toLowerCase() === itemName)
        );
      })
      .first();

    if (foundInActive) return true;

    if (db.archive_transactions) {
      const foundInArchive = await db.archive_transactions
        .filter((tx: any) => {
          if (!tx.items || !Array.isArray(tx.items)) return false;
          return tx.items.some(
            (it: any) =>
              (it.inventoryId && String(it.inventoryId) === itemId) ||
              (it.namaBarang && it.namaBarang.trim().toLowerCase() === itemName)
          );
        })
        .first();
      if (foundInArchive) return true;
    }

    return false;
  }, []);

  // Restore transaction
  const handleRestoreTx = useCallback(
    async (id: number) => {
      const record = await db.transactions.get(id);
      if (!record) return;
      delete record.deletedAt;
      record.updatedAt = new Date().toISOString();
      await db.transactions.put(record);
      setFeedback('✅ Transaksi berhasil dipulihkan!');
      setTimeout(() => setFeedback(''), 3000);
      onRestore?.();
    },
    [onRestore]
  );

  // Restore inventory item
  const handleRestoreInv = useCallback(async (id: string) => {
    const record = await db.inventory.get(id as any);
    if (!record) return;
    delete record.deletedAt;
    record.updatedAt = new Date().toISOString();
    await db.inventory.put(record);
    setFeedback('✅ Barang berhasil dipulihkan!');
    setTimeout(() => setFeedback(''), 3000);
  }, []);

  // Close confirm dialog
  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Permanent delete single transaction with confirmation
  const promptPermanentDeleteTx = useCallback((id: number, txId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Hapus Transaksi Permanen',
      message: `Hapus permanen transaksi "${txId || id}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus Permanen',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        await db.transactions.delete(id);
        setFeedback('🗑️ Transaksi dihapus permanen.');
        setTimeout(() => setFeedback(''), 3000);
      },
    });
  }, []);

  // Permanent delete single inventory item with reference check
  const promptPermanentDeleteInv = useCallback(
    async (item: any) => {
      const isReferenced = await isItemReferencedInTransactions(item);
      if (isReferenced) {
        setFeedback(`⚠️ Barang "${item.namaBarang}" tidak dapat dihapus permanen karena masih dirujuk oleh riwayat transaksi.`);
        setTimeout(() => setFeedback(''), 5000);
        return;
      }

      setConfirmState({
        isOpen: true,
        title: 'Hapus Barang Permanen',
        message: `Hapus permanen barang "${item.namaBarang}"? Tindakan ini tidak dapat dibatalkan.`,
        confirmLabel: 'Hapus Permanen',
        onConfirm: async () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          await db.inventory.delete(item.id as any);
          setFeedback('🗑️ Barang dihapus permanen.');
          setTimeout(() => setFeedback(''), 3000);
        },
      });
    },
    [isItemReferencedInTransactions]
  );

  // Purge expired items (> 30 days) with reference guard
  const handlePurgeExpiredConfirmed = useCallback(async () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));

    const txIds = expiredTransactions.map((tx: any) => tx.id);
    if (txIds.length > 0) {
      await db.transactions.bulkDelete(txIds);
    }

    const deletableInvIds: string[] = [];
    let skippedCount = 0;

    for (const item of expiredInventory) {
      const isRef = await isItemReferencedInTransactions(item);
      if (isRef) {
        skippedCount++;
      } else {
        deletableInvIds.push(item.id);
      }
    }

    if (deletableInvIds.length > 0) {
      await db.inventory.bulkDelete(deletableInvIds as any);
    }

    const purgedTotal = txIds.length + deletableInvIds.length;
    let msg = `🗑️ ${purgedTotal} item lama (>30 hari) telah dihapus permanen.`;
    if (skippedCount > 0) {
      msg += ` (${skippedCount} barang dipertahankan karena masih dirujuk transaksi)`;
    }
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 5000);
  }, [expiredTransactions, expiredInventory, isItemReferencedInTransactions]);

  const promptPurgeExpired = useCallback(() => {
    setConfirmState({
      isOpen: true,
      title: 'Bersihkan Item Lama (> 30 Hari)',
      message: `Hapus permanen ${expiredCount} item yang telah berada di tong sampah lebih dari 30 hari? Barang yang masih memiliki riwayat transaksi akan otomatis dipertahankan.`,
      confirmLabel: 'Bersihkan Sekarang',
      onConfirm: handlePurgeExpiredConfirmed,
    });
  }, [expiredCount, handlePurgeExpiredConfirmed]);

  // Empty all trash with confirmation and reference guard
  const handleEmptyTrashConfirmed = useCallback(async () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));

    const txIds = deletedTransactions.map((tx: any) => tx.id);
    if (txIds.length > 0) {
      await db.transactions.bulkDelete(txIds);
    }

    const deletableInvIds: string[] = [];
    let skippedCount = 0;

    for (const item of deletedInventory) {
      const isRef = await isItemReferencedInTransactions(item);
      if (isRef) {
        skippedCount++;
      } else {
        deletableInvIds.push(item.id);
      }
    }

    if (deletableInvIds.length > 0) {
      await db.inventory.bulkDelete(deletableInvIds as any);
    }

    const purgedTotal = txIds.length + deletableInvIds.length;
    let msg = `🗑️ ${purgedTotal} item dihapus permanen.`;
    if (skippedCount > 0) {
      msg += ` (${skippedCount} barang dipertahankan karena masih dirujuk riwayat transaksi)`;
    }
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 5000);
  }, [deletedTransactions, deletedInventory, isItemReferencedInTransactions]);

  const promptEmptyTrash = useCallback(() => {
    setConfirmState({
      isOpen: true,
      title: 'Kosongkan Semua Tong Sampah',
      message: `Hapus permanen semua ${totalDeleted} item di tong sampah? Barang yang masih memiliki riwayat transaksi akan otomatis dipertahankan.`,
      confirmLabel: 'Kosongkan Semua',
      onConfirm: handleEmptyTrashConfirmed,
    });
  }, [totalDeleted, handleEmptyTrashConfirmed]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getDaysAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hari ini';
    if (days === 1) return 'Kemarin';
    return `${days} hari lalu`;
  };

  return (
    <div className="animate-slide-up space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          🗑️ Tong Sampah
          {totalDeleted > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
              {totalDeleted} item
            </span>
          )}
        </h2>
        {totalDeleted > 0 && (
          <Button
            variant="outline"
            className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
            onClick={promptEmptyTrash}
          >
            Kosongkan Semua
          </Button>
        )}
      </div>

      <p className="text-xs text-text-muted">
        Item yang dihapus akan tersimpan di sini. Item lama tidak dihapus otomatis demi keamanan data Anda.
      </p>

      {/* W0-04: Banner for items older than 30 days */}
      {expiredCount > 0 && (
        <div
          data-testid="trash-expired-banner"
          className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚠️</span>
            <p className="text-xs text-amber-200">
              Terdapat <span className="font-bold text-amber-400">{expiredCount} item</span> yang telah berada di tong sampah lebih dari 30 hari.
            </p>
          </div>
          <Button
            variant="outline"
            className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20 whitespace-nowrap self-end sm:self-auto"
            onClick={promptPurgeExpired}
          >
            Bersihkan Sekarang
          </Button>
        </div>
      )}

      {feedback && (
        <div className="text-xs text-center py-2 px-3 rounded-lg font-medium bg-primary/10 text-primary animate-fade-in">
          {feedback}
        </div>
      )}

      {totalDeleted === 0 ? (
        <div className="py-16">
          <EmptyState
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            }
            title="Tong Sampah Kosong"
            description="Tidak ada item yang dihapus saat ini."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Deleted Transactions */}
          {deletedTransactions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Transaksi ({deletedTransactions.length})
              </h3>
              {deletedTransactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="p-3 bg-bg-surface rounded-xl border border-border-default flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {tx.transactionId || `TRX-${tx.id}`}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {tx.items?.length || 0} item • Rp {(tx.total || 0).toLocaleString('id-ID')} • {tx.metode || 'Tunai'}
                    </p>
                    <p className="text-[10px] text-red-400/70 mt-0.5">
                      Dihapus: {formatDate(tx.deletedAt)} ({getDaysAgo(tx.deletedAt)})
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRestoreTx(tx.id)}
                      className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all cursor-pointer"
                    >
                      Pulihkan
                    </button>
                    <button
                      type="button"
                      onClick={() => promptPermanentDeleteTx(tx.id, tx.transactionId)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                      title="Hapus Permanen"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deleted Inventory */}
          {deletedInventory.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Barang Inventaris ({deletedInventory.length})
              </h3>
              {deletedInventory.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 bg-bg-surface rounded-xl border border-border-default flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {item.namaBarang || 'Barang'}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {item.kategori} • Stok: {item.quantity || 0} • Rp {(item.harga || 0).toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] text-red-400/70 mt-0.5">
                      Dihapus: {formatDate(item.deletedAt)} ({getDaysAgo(item.deletedAt)})
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRestoreInv(item.id)}
                      className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all cursor-pointer"
                    >
                      Pulihkan
                    </button>
                    <button
                      type="button"
                      onClick={() => promptPermanentDeleteInv(item)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                      title="Hapus Permanen"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ConfirmDialog for all permanent deletions */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel || 'Hapus'}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
});
