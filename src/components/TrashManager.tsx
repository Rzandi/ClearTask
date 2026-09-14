/* ═══════════════════════════════════════════════════════════
   TrashManager.tsx — ClearTask Soft Delete Trash Manager
   QOL C: View soft-deleted items, restore, or permanently
   purge. Auto-purges items older than 30 days on mount.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, memo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';

const PURGE_DAYS = 30;

interface TrashManagerProps {
  onRestore?: () => void;
}

export default memo(function TrashManager({ onRestore }: TrashManagerProps) {
  const [feedback, setFeedback] = useState('');

  // Live query: all soft-deleted transactions
  const deletedTransactions =
    useLiveQuery(async () => {
      const all = await db.transactions.toArray();
      return all
        .filter((tx: any) => !!tx.deletedAt)
        .sort(
          (a: any, b: any) =>
            new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
        );
    }) || [];

  // Live query: all soft-deleted inventory items
  const deletedInventory =
    useLiveQuery(async () => {
      const all = await db.inventory.toArray();
      return all
        .filter((item: any) => !!item.deletedAt)
        .sort(
          (a: any, b: any) =>
            new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
        );
    }) || [];

  // Auto-purge items older than 30 days on mount
  useEffect(() => {
    const purge = async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - PURGE_DAYS);
      const cutoffISO = cutoff.toISOString();

      // Purge old transactions
      const allTx = await db.transactions.toArray();
      const oldTxIds = allTx
        .filter((tx: any) => tx.deletedAt && tx.deletedAt < cutoffISO)
        .map((tx: any) => tx.id);
      if (oldTxIds.length > 0) {
        await db.transactions.bulkDelete(oldTxIds);
      }

      // Purge old inventory
      const allInv = await db.inventory.toArray();
      const oldInvIds = allInv
        .filter((item: any) => item.deletedAt && item.deletedAt < cutoffISO)
        .map((item: any) => item.id);
      if (oldInvIds.length > 0) {
        await db.inventory.bulkDelete(oldInvIds);
      }

      const purgedCount = oldTxIds.length + oldInvIds.length;
      if (purgedCount > 0) {
        setFeedback(`🗑️ ${purgedCount} item lama (>30 hari) telah dihapus permanen.`);
        setTimeout(() => setFeedback(''), 5000);
      }
    };
    purge().catch(console.error);
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

  // Permanent delete
  const handlePermanentDeleteTx = useCallback(async (id: number) => {
    await db.transactions.delete(id);
    setFeedback('🗑️ Transaksi dihapus permanen.');
    setTimeout(() => setFeedback(''), 3000);
  }, []);

  const handlePermanentDeleteInv = useCallback(async (id: string) => {
    await db.inventory.delete(id as any);
    setFeedback('🗑️ Barang dihapus permanen.');
    setTimeout(() => setFeedback(''), 3000);
  }, []);

  // Empty all trash
  const handleEmptyTrash = useCallback(async () => {
    const txIds = deletedTransactions.map((tx: any) => tx.id);
    const invIds = deletedInventory.map((item: any) => item.id);
    if (txIds.length > 0) await db.transactions.bulkDelete(txIds);
    if (invIds.length > 0) await db.inventory.bulkDelete(invIds);
    setFeedback(`🗑️ ${txIds.length + invIds.length} item dihapus permanen.`);
    setTimeout(() => setFeedback(''), 3000);
  }, [deletedTransactions, deletedInventory]);

  const totalDeleted = deletedTransactions.length + deletedInventory.length;

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
            onClick={handleEmptyTrash}
          >
            Kosongkan Semua
          </Button>
        )}
      </div>

      <p className="text-xs text-text-muted">
        Item yang dihapus akan tersimpan selama 30 hari sebelum dihapus permanen secara otomatis.
      </p>

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
                      onClick={() => handlePermanentDeleteTx(tx.id)}
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
                      onClick={() => handlePermanentDeleteInv(item.id)}
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
    </div>
  );
});
