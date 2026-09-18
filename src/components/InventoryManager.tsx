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
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const lowStockCount = useMemo(() => {
    return inventory.filter((item) => (item.quantity || 0) <= (item.minStock || LOW_STOCK_THRESHOLD)).length;
  }, [inventory]);

  const isFilterActive = filterKategori !== 'all' || searchQuery.trim().length > 0 || onlyLowStock;

  // Unique categories from inventory
  const categories = useMemo(() => {
    const cats = new Set(inventory.map((item) => item.kategori).filter(Boolean));
    return [...cats].sort();
  }, [inventory]);

  // Filtered & sorted
  const filteredInventory = useMemo(() => {
    let items = [...inventory];
    if (onlyLowStock) {
      items = items.filter((item) => (item.quantity || 0) <= (item.minStock || LOW_STOCK_THRESHOLD));
    }
    if (filterKategori !== 'all') {
      items = items.filter((item) => item.kategori === filterKategori);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.namaBarang?.toLowerCase().includes(q) ||
          item.kategori?.toLowerCase().includes(q) ||
          item.subKategori?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q)
      );
    }
    return items.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [inventory, filterKategori, searchQuery, onlyLowStock]);

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

  function handleQuickAdjustStock(item: any, delta: number) {
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    updateInventoryItem(item.id, { quantity: newQty });
  }

  function handleExportCSV() {
    if (inventory.length === 0) {
      alert('Tidak ada data inventaris untuk diekspor.');
      return;
    }
    const headers = ['SKU', 'Nama Barang', 'Kategori', 'Sub Kategori', 'Harga Modal', 'Harga Jual', 'Stok', 'Stok Minim', 'Satuan'];
    const rows = inventory.map((i) => [
      `"${i.sku || i.barcode || ''}"`,
      `"${(i.namaBarang || '').replace(/"/g, '""')}"`,
      `"${(i.kategori || '').replace(/"/g, '""')}"`,
      `"${(i.subKategori || '').replace(/"/g, '""')}"`,
      i.hargaModal || 0,
      i.harga || 0,
      i.quantity || 0,
      i.minStock || 5,
      `"${i.satuan || 'Pcs'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventaris_cleartask_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadTemplateCSV() {
    const headers = ['SKU', 'Nama Barang', 'Kategori', 'Sub Kategori', 'Harga Modal', 'Harga Jual', 'Stok', 'Stok Minim', 'Satuan'];
    const sample = ['SKU-10001', 'Kopi Hitam', 'Minuman', 'Kopi', 5000, 10000, 50, 5, 'Pcs'];
    const csvContent = [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_inventaris_cleartask.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportCSV(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          alert('File CSV kosong atau tidak memiliki baris data.');
          return;
        }

        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 3 && cols[1]) {
            const sku = cols[0] || `SKU-${Date.now().toString().slice(-6)}${i}`;
            const namaBarang = cols[1] || '';
            const kategori = cols[2] || 'Umum';
            const subKategori = cols[3] || '';
            const hargaModal = parseInt(cols[4] || '0', 10) || 0;
            const harga = parseInt(cols[5] || '0', 10) || 0;
            const quantity = parseInt(cols[6] || '0', 10) || 0;
            const minStock = parseInt(cols[7] || '5', 10) || 5;
            const satuan = cols[8] || 'Pcs';

            addInventoryItem({
              sku,
              namaBarang,
              kategori,
              subKategori,
              hargaModal,
              harga,
              quantity,
              minStock,
              satuan,
            });
            count++;
          }
        }
        alert(`Berhasil mengimpor ${count} barang inventaris.`);
      } catch (err: any) {
        alert('Gagal mengimpor file CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleUnpackDus(item: any) {
    const packStock = item.packStock || 0;
    const packRatio = item.packRatio || 24;
    const packUnit = item.packUnit || 'Dus';

    if (packStock <= 0) {
      alert(`Stok ${packUnit} kosong (0). Tidak dapat melakukan unpack.`);
      return;
    }

    const confirmUnpack = window.confirm(
      `Konfirmasi Unpack 1 ${packUnit} ${item.namaBarang}?\n` +
        `• Stok ${packUnit} berkurang 1 (${packStock} -> ${packStock - 1})\n` +
        `• Stok Pcs bertambah +${packRatio} (${item.quantity || 0} -> ${(item.quantity || 0) + packRatio})`
    );

    if (confirmUnpack) {
      updateInventoryItem(item.id, {
        quantity: (item.quantity || 0) + packRatio,
        packStock: packStock - 1,
      });
    }
  }

  function handleExportRestockSupplier() {
    const lowStockItems = inventory.filter(
      (item) => (item.quantity || 0) <= (item.minStock || LOW_STOCK_THRESHOLD)
    );

    if (lowStockItems.length === 0) {
      alert('Semua stok barang dalam kondisi aman. Tidak ada item restock.');
      return;
    }

    const textLines = [
      `*📋 DAFTAR BELANJA RESTOCK SUPPLIER - CLEARTASK*`,
      `Tanggal: ${new Date().toLocaleDateString('id-ID')}`,
      `Total Item Menipis: ${lowStockItems.length} barang`,
      `----------------------------------`,
      ...lowStockItems.map(
        (i, idx) =>
          `${idx + 1}. *${i.namaBarang}* (Sisa: ${i.quantity || 0} ${i.satuan || 'Pcs'}${
            i.packStock ? ` | Stok ${i.packUnit || 'Dus'}: ${i.packStock}` : ''
          })`
      ),
      `----------------------------------`,
      `Mohon diproses untuk pengiriman ulang. Terima kasih!`
    ];

    const message = encodeURIComponent(textLines.join('\n'));
    const waUrl = `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
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
          {/* CSV Import/Export */}
          <input
            type="file"
            id="csv-import-input"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <button
            onClick={() => document.getElementById('csv-import-input')?.click()}
            title="Impor barang dari file CSV"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-bg-surface border border-border-default text-text-secondary hover:text-primary hover:border-primary/50 transition-colors"
          >
            📥 Import CSV
          </button>
          <button
            onClick={handleExportCSV}
            title="Ekspor seluruh barang ke CSV"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-bg-surface border border-border-default text-text-secondary hover:text-primary hover:border-primary/50 transition-colors"
          >
            📤 Export CSV
          </button>
          <button
            onClick={handleDownloadTemplateCSV}
            title="Unduh contoh template CSV"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-bg-surface border border-border-default text-text-muted hover:text-text-primary transition-colors text-[11px]"
          >
            📄 Template
          </button>
          <button
            onClick={handleExportRestockSupplier}
            title="Kirim daftar restock barang menipis ke Supplier via WA"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-warning/15 border border-warning/30 text-warning hover:bg-warning/25 transition-colors"
          >
            📋 Restock Supplier
          </button>
          <button
            onClick={handleSyncFromHistory}
            title="Tarik barang unik dari riwayat transaksi"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-bg-surface border border-border-default text-text-secondary hover:text-primary hover:border-primary/50 transition-colors shrink-0"
          >
            <svg
              width="14"
              height="14"
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
            <span className="hidden sm:inline">Sinkronisasi</span>
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover transition-colors shrink-0"
          >
            <svg
              width="14"
              height="14"
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
            <span>Tambah Barang</span>
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
            placeholder="Cari barang / SKU..."
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
        <button
          onClick={() => setOnlyLowStock((prev) => !prev)}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-colors shrink-0 ${
            onlyLowStock
              ? 'bg-accent-red/20 border-accent-red text-accent-red'
              : 'bg-bg-input border-border-default text-text-secondary hover:border-accent-red/50'
          }`}
        >
          <span>⚠️ Stok Menipis</span>
          {lowStockCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-accent-red text-white">
              {lowStockCount}
            </span>
          )}
        </button>
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
                      Harga Modal
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Harga Jual
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-primary">{item.namaBarang}</p>
                          {(item.sku || item.barcode) && (
                            <span className="px-1.5 py-0.5 rounded bg-bg-elevated border border-border-subtle text-[10px] font-mono text-text-muted">
                              {item.sku || item.barcode}
                            </span>
                          )}
                        </div>
                        {item.subKategori && (
                          <p className="text-[11px] text-text-muted">{item.subKategori}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text-secondary">
                        {formatRupiah(item.hargaModal || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-primary">{formatRupiah(item.harga)}</div>
                        {(item.wholesaleMinQty ?? 0) > 0 && (item.wholesalePrice ?? 0) > 0 && (
                          <div className="text-[10px] text-text-muted">
                            <span className="text-warning font-semibold">Grosir:</span> ≥{item.wholesaleMinQty} {item.satuan} ({formatRupiah(item.wholesalePrice ?? 0)})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold ${item.quantity <= (item.minStock || LOW_STOCK_THRESHOLD) ? 'text-accent-red' : 'text-text-primary'}`}
                            >
                              {item.quantity}
                            </span>
                            {item.quantity <= (item.minStock || LOW_STOCK_THRESHOLD) && (
                              <span className="px-1.5 py-0.2 rounded bg-accent-red/20 text-accent-red text-[10px] font-bold">
                                ⚠️ Minim
                              </span>
                            )}
                          </div>
                          {/* Multi-UOM Dus Stock & Unpack Action */}
                          {((item.packStock ?? 0) > 0 || item.packUnit) && (
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-text-muted font-medium">
                                Stok {item.packUnit || 'Dus'}: <strong className="text-text-primary">{item.packStock || 0}</strong>
                              </span>
                              {(item.packStock ?? 0) > 0 && (
                                <button
                                  onClick={() => handleUnpackDus(item)}
                                  title={`Unpack 1 ${item.packUnit || 'Dus'} (+${item.packRatio || 24} ${item.satuan || 'Pcs'})`}
                                  className="px-1.5 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/30 border border-primary/40 font-bold transition-colors"
                                >
                                  ⚡ Unpack
                                </button>
                              )}
                            </div>
                          )}
                          {/* Quick Inline Restock Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleQuickAdjustStock(item, -1)}
                              title="Kurangi 1"
                              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-bg-elevated text-text-muted hover:text-accent-red hover:bg-accent-red/10 border border-border-default"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleQuickAdjustStock(item, 1)}
                              title="Tambah 1"
                              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-bg-elevated text-text-muted hover:text-primary hover:bg-primary/10 border border-border-default"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => handleQuickAdjustStock(item, 5)}
                              title="Tambah 5"
                              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-bg-elevated text-primary hover:bg-primary/20 border border-primary/30"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => handleQuickAdjustStock(item, 10)}
                              title="Tambah 10"
                              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-bg-elevated text-primary hover:bg-primary/20 border border-primary/30"
                            >
                              +10
                            </button>
                          </div>
                        </div>
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
                <div className="grid grid-cols-2 gap-3 mb-2 border-b border-border-subtle pb-2">
                  <div>
                    <p className="text-[10px] text-text-muted">Harga Modal</p>
                    <p className="text-sm font-semibold text-text-secondary">
                      {formatRupiah(item.hargaModal || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted">Harga Jual</p>
                    <p className="text-sm font-bold text-primary">{formatRupiah(item.harga)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <div>
                    <p className="text-[10px] text-text-muted">Stok</p>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-sm font-bold ${item.quantity <= (item.minStock || LOW_STOCK_THRESHOLD) ? 'text-accent-red' : 'text-text-primary'}`}
                      >
                        {item.quantity} {item.satuan}
                      </span>
                      {item.quantity <= (item.minStock || LOW_STOCK_THRESHOLD) && (
                        <span className="px-1.5 py-0.2 rounded bg-accent-red/20 text-accent-red text-[10px] font-bold">
                          ⚠️ Minim
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Quick Inline Restock */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuickAdjustStock(item, -1)}
                      className="px-2 py-1 text-xs font-bold rounded bg-bg-elevated text-text-muted hover:text-accent-red border border-border-default"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => handleQuickAdjustStock(item, 1)}
                      className="px-2 py-1 text-xs font-bold rounded bg-bg-elevated text-primary border border-border-default"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleQuickAdjustStock(item, 5)}
                      className="px-2 py-1 text-xs font-bold rounded bg-primary/20 text-primary border border-primary/30"
                    >
                      +5
                    </button>
                    <button
                      onClick={() => handleQuickAdjustStock(item, 10)}
                      className="px-2 py-1 text-xs font-bold rounded bg-primary/20 text-primary border border-primary/30"
                    >
                      +10
                    </button>
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
                {Math.min(startIdx + ITEMS_PER_PAGE, filteredInventory.length)} dari{' '}
                {filteredInventory.length} barang
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
