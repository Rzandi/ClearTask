/* ═══════════════════════════════════════════════════════════
   NotificationPanel — ClearTask (W3-03)
   Dropdown panel menampilkan notifikasi stok menipis berdasarkan
   minStock per barang dan riwayat 5 transaksi terbaru.
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useInventory } from '../hooks/useInventory';
import db from '../services/db';
import { exportDatabase } from '../services/databaseManager';

function getRelativeTime(isoString: string, nowMs: number) {
  const diff = nowMs - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  return `${days} hari lalu`;
}

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: any[];
}

export default function NotificationPanel({
  isOpen,
  onClose,
  transactions,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'stock' | 'transactions'>('stock');

  // W3-03: Baca inventaris dan periksa minStock per barang
  const { inventory } = useInventory();

  const lowStockItems = useMemo(() => {
    if (!inventory) return [];
    return inventory
      .filter((item) => {
        const threshold =
          item.minStock !== undefined && item.minStock !== null ? Number(item.minStock) : 5;
        return (Number(item.quantity) || 0) <= threshold;
      })
      .sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0));
  }, [inventory]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Sort by createdAt descending and take 5 most recent
  const recentTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [transactions]);

  // W3-05: Cek reminder backup berkala
  const [backupInfo, setBackupInfo] = useState<{ daysSince: number | null; needBackup: boolean }>({
    daysSince: null,
    needBackup: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    db.meta
      .get({ key: 'lastBackupAt' })
      .then(async (record) => {
        const txCount = await db.transactions.count();
        if (txCount === 0) return;

        if (!record?.value) {
          setBackupInfo({ daysSince: null, needBackup: true });
          return;
        }
        const last = new Date(record.value);
        const diffDays = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
        setBackupInfo({ daysSince: diffDays, needBackup: diffDays >= 7 });
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      data-testid="notification-panel"
      className="fixed left-4 right-4 top-20 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 sm:w-96 glass-card shadow-elevated animate-slide-down z-50 max-h-[500px] flex flex-col border border-border-default overflow-hidden rounded-2xl"
    >
      {/* Header with Tabs */}
      <div className="px-4 pt-3 pb-2 border-b border-border-default bg-bg-surface/80 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-bold text-text-primary tracking-tight">Pusat Notifikasi</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-xs p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-xl bg-bg-elevated p-1 gap-1 border border-border-subtle">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-accent-red/20 text-accent-red shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Stok Menipis</span>
            {lowStockItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-accent-red text-white">
                {lowStockItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-primary/20 text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Transaksi</span>
            <span className="text-[10px] text-text-muted">({recentTransactions.length})</span>
          </button>
        </div>

        {/* W3-05: Backup reminder banner */}
        {backupInfo.needBackup && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <span className="text-amber-400 text-sm mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-300">
                {backupInfo.daysSince === null
                  ? 'Belum pernah membuat backup database'
                  : `Sudah ${backupInfo.daysSince} hari belum backup data`}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Simpan salinan cadangan di luar perangkat (Google Drive / Flashdisk) agar data aman.
              </p>
              <button
                onClick={async () => {
                  try {
                    await exportDatabase();
                    setBackupInfo({ daysSince: 0, needBackup: false });
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="mt-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Unduh Backup Sekarang
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="py-2 overflow-y-auto flex-1">
        {activeTab === 'stock' ? (
          lowStockItems.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                ✓
              </div>
              <p className="text-sm font-medium text-text-primary">Semua Stok Aman</p>
              <p className="text-xs text-text-muted mt-1">
                Tidak ada barang dengan stok di bawah batas minimum (minStock).
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {lowStockItems.map((item) => {
                const minThreshold =
                  item.minStock !== undefined && item.minStock !== null ? Number(item.minStock) : 5;
                const isZero = (Number(item.quantity) || 0) <= 0;

                return (
                  <div
                    key={item.id || item.namaBarang}
                    className="px-4 py-2.5 hover:bg-white/[0.03] transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {item.namaBarang}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-text-muted bg-white/5 px-1.5 py-0.5 rounded">
                          {item.kategori || 'Umum'}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          Batas min: {minThreshold} {item.satuan || 'Pcs'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold ${
                          isZero
                            ? 'bg-accent-red/20 text-accent-red border border-accent-red/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {isZero ? 'Habis (0)' : `Sisa ${item.quantity || 0}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : recentTransactions.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <svg
              className="mx-auto mb-3 text-text-muted"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="text-sm text-text-muted">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {recentTransactions.map((tx, idx) => (
              <div
                key={tx.id || tx.transactionId || `tx-${idx}`}
                className="px-4 py-2.5 hover:bg-white/[0.03] transition-colors flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {tx.items && tx.items.length > 0
                      ? tx.items.length === 1
                        ? tx.items[0].namaBarang
                        : `${tx.items[0].namaBarang} (+${tx.items.length - 1} item lain)`
                      : tx.namaBarang || 'Item Tidak Diketahui'}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {getRelativeTime(tx.createdAt, nowMs)}
                  </p>
                </div>
                <div className="text-xs font-semibold text-primary whitespace-nowrap">
                  Rp {(tx.total || 0).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
