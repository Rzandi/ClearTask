/* ═══════════════════════════════════════════════════════════
   InventoryManager — ClearTask
   Tabel Master Barang (Inventaris) dengan CRUD
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useInventory } from '../hooks/useInventory';
import { formatRupiah } from '../utils/formatters';
import InventoryModal from './InventoryModal';
import ConfirmDialog from './ConfirmDialog';
import db from '../services/db';

const LOW_STOCK_THRESHOLD = 5;

export default function InventoryManager() {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('all');

  const isFilterActive = filterKategori !== 'all' || searchQuery.trim().length > 0;

  // Unique categories from inventory
  const categories = useMemo(() => {
    const cats = new Set(inventory.map((item) => item.kategori).filter(Boolean));
    return [...cats].sort();
  }, [inventory]);

  // Filtered & sorted
  const filteredInventory = useMemo(() => {
    let items = [...inventory];
    if (filterKategori !== 'all') {
      items = items.filter((item) => item.kategori === filterKategori);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.namaBarang?.toLowerCase().includes(q) ||
          item.kategori?.toLowerCase().includes(q) ||
          item.subKategori?.toLowerCase().includes(q)
      );
    }
    return items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [inventory, filterKategori, searchQuery]);

  // ── Pagination ───────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterKategori, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / ITEMS_PER_PAGE));
  const safeCurrentPage = totalPages > 0 && currentPage > totalPages ? totalPages : currentPage;
  
  const startIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const visibleInventory = filteredInventory.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  function getVisiblePages(current: number, total: number) {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, 5];
    if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
    return [current - 2, current - 1, current, current + 1, current + 2];
  }

  // Total value
  const totalValue = useMemo(() => {
    return filteredInventory.reduce(
      (sum, item) => sum + (item.harga || 0) * (item.quantity || 0),
      0
    );
  }, [filteredInventory]);

  function handleAdd() {
    setEditItem(null);
    setShowModal(true);
  }

  function handleEdit(item: any) {
    setEditItem(item);
    setShowModal(true);
  }

  function handleSave(data: any) {
    try {
      if (editItem) {
        updateInventoryItem(editItem.id, data);
      } else {
        addInventoryItem(data);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan barang');
    }
  }

  function handleDeleteConfirm() {
    if (deleteTarget) {
      try {
        deleteInventoryItem(deleteTarget.id);
        setDeleteTarget(null);
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus barang');
      }
    }
  }

  async function handleSyncFromHistory() {
    // Ambil daftar transaksi dari database langsung (On-Demand)
    // Supaya tidak membebani RAM selama app jalan
    const totalTx = await db.transactions.count();
    if (totalTx === 0) {
      alert('Tidak ada data transaksi untuk disinkronisasi.');
      return;
    }

    const allTransactions = await db.transactions.orderBy('createdAt').reverse().toArray();

    const itemsMap = new Map();
    const uniqueItems = [];

    // Karena sudah di-reverse oleh Dexie, kita iterate dari awal ke akhir
    for (const tx of allTransactions) {
      if (!tx.items || !Array.isArray(tx.items)) continue;

      for (const item of tx.items) {
        if (!item.namaBarang) continue;

        const key = item.namaBarang.toLowerCase().trim();
        if (!itemsMap.has(key)) {
          itemsMap.set(key, true);

          // Cek apakah barang sudah ada di inventaris
          const alreadyExists = inventory.some(
            (invItem) => invItem.namaBarang?.toLowerCase().trim() === key
          );

          if (!alreadyExists) {
            uniqueItems.push({
              id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              namaBarang: item.namaBarang.trim(),
              kategori: item.kategori || '',
              subKategori: item.subKategori || '',
              harga: item.hargaSatuan || 0,
              quantity: 0,
              satuan: 'Pcs',
              createdAt: tx.createdAt,
            });
          }
        }
      }
    }

    if (uniqueItems.length === 0) {
      alert('Semua barang unik dari riwayat transaksi sudah ada di Master Barang.');
      return;
    }

    const confirmSync = window.confirm(
      `Ditemukan ${uniqueItems.length} barang baru dari riwayat transaksi.\nTambahkan ke Master Barang dengan stok 0?`
    );

    if (confirmSync) {
      uniqueItems.forEach((item) => {
        addInventoryItem(item);
      });
      alert(`${uniqueItems.length} barang berhasil disinkronisasi.`);
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-1">Master Barang</h2>
          <p className="text-sm text-text-muted">Kelola daftar barang inventaris Anda.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncFromHistory}
            title="Tarik barang unik dari riwayat transaksi"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-bg-surface border border-border-default text-text-secondary hover:text-primary hover:border-primary/50 transition-colors shrink-0"
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
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
            <span className="hidden sm:inline">Sinkronisasi Riwayat</span>
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover transition-colors shrink-0"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Tambah Barang</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted mb-1">
            Total Jenis {isFilterActive && <span className="text-primary italic">(Terfilter)</span>}
          </p>
          <p className="text-2xl font-bold text-text-primary">{filteredInventory.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted mb-1">
            Total Stok {isFilterActive && <span className="text-primary italic">(Terfilter)</span>}
          </p>
          <p className="text-2xl font-bold text-text-primary">
            {filteredInventory.reduce((sum, item) => sum + (item.quantity || 0), 0)}
          </p>
        </div>
        <div className="glass-card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-text-muted mb-1">
            Nilai Inventaris{' '}
            {isFilterActive && <span className="text-primary italic">(Terfilter)</span>}
          </p>
          <p className="text-xl font-bold text-primary">{formatRupiah(totalValue)}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cari barang..."
            aria-label="Cari produk"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
          />
        </div>
        <select
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          aria-label="Filter berdasarkan kategori"
          className="px-4 py-2.5 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
        >
          <option value="all">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table / Cards */}
      {filteredInventory.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-muted"
            >
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">Belum ada barang</p>
          <p className="text-xs text-text-muted">
            Klik "Tambah Barang" untuk mulai mendaftarkan barang inventaris.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Nama Barang
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Harga
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Stok
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Satuan
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {visibleInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{item.namaBarang}</p>
                        {item.subKategori && (
                          <p className="text-[11px] text-text-muted">{item.subKategori}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text-primary">
                        {formatRupiah(item.harga)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold ${item.quantity <= LOW_STOCK_THRESHOLD ? 'text-accent-red' : 'text-text-primary'}`}
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-text-muted">{item.satuan}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            aria-label="Edit"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            aria-label="Hapus"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {visibleInventory.map((item) => (
              <div key={item.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {item.namaBarang}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                        {item.kategori}
                      </span>
                      {item.subKategori && (
                        <span className="text-[10px] text-text-muted">{item.subKategori}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(item)}
                      aria-label="Edit"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      aria-label="Hapus"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-text-muted">Harga</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {formatRupiah(item.harga)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-text-muted">Stok</p>
                    <p
                      className={`text-sm font-bold ${item.quantity <= 5 ? 'text-accent-red' : 'text-text-primary'}`}
                    >
                      {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted">Satuan</p>
                    <p className="text-sm text-text-secondary">{item.satuan}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination UI */}
          {filteredInventory.length > 0 && (
            <div className="flex items-center justify-between px-1 mt-4">
              <p className="text-xs text-text-muted hidden sm:block">
                Menampilkan {Math.min(startIdx + 1, filteredInventory.length)}-
                {Math.min(startIdx + ITEMS_PER_PAGE, filteredInventory.length)} dari {filteredInventory.length} barang
              </p>
              <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  ‹
                </button>
                {getVisiblePages(safeCurrentPage, totalPages).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      safeCurrentPage === page
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals — portalled to body */}
      {createPortal(
        <>
          <InventoryModal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setEditItem(null);
            }}
            onSave={handleSave}
            editItem={editItem}
          />

          <ConfirmDialog
            isOpen={!!deleteTarget}
            title="Hapus Barang"
            message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.namaBarang}"? Tindakan ini tidak bisa dibatalkan.`}
            confirmLabel="Hapus"
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        </>,
        document.body
      )}
    </div>
  );
}
