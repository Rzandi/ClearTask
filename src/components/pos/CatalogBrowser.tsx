/* ═══════════════════════════════════════════════════════════
   CatalogBrowser — ClearTask (W3-12 Component Decomposition)
   Catalog search, category filtering, sorting & product cards
   ═══════════════════════════════════════════════════════════ */

import React, { useState, useMemo, memo } from 'react';
import HighlightText from '../ui/HighlightText';
import EmptyState from '../ui/EmptyState';
import type { InventoryItem } from '../../types/index';

interface CatalogItemProps {
  id: string;
  namaBarang: string;
  kategori: string;
  subKategori?: string;
  harga: number;
  hargaModal?: number | undefined;
  quantity: number;
  searchQuery?: string;
  onAddToCart: (item: any) => void;
  onUpdateStock: (id: string, data: any) => void;
}

export const CatalogItemCard = memo(function CatalogItemCard({
  id,
  namaBarang,
  kategori,
  subKategori,
  harga,
  hargaModal,
  quantity,
  searchQuery = '',
  onAddToCart,
  onUpdateStock,
}: CatalogItemProps) {
  const stock = quantity || 0;
  const isOutOfStock = stock <= 0;

  return (
    <div
      className={`p-3 sm:p-4 bg-bg-surface border rounded-xl flex flex-col gap-1 transition-all relative ${
        isOutOfStock
          ? 'opacity-60 border-border-default'
          : 'border-border-default hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]'
      }`}
    >
      <button
        type="button"
        disabled={isOutOfStock}
        onClick={() =>
          onAddToCart({
            namaBarang,
            kategori,
            subKategori: subKategori || '',
            hargaSatuan: harga,
            hargaModal: hargaModal || 0,
            qty: 1,
          })
        }
        className={`text-left flex flex-col gap-1 w-full focus:outline-none transition-transform ${
          isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.96]'
        }`}
      >
        <span className="text-sm font-medium text-text-primary line-clamp-2">
          <HighlightText text={namaBarang} query={searchQuery} />
        </span>
        <span className="text-xs text-text-muted">{kategori}</span>
        <span className="text-sm font-semibold text-primary mt-2">
          Rp {harga?.toLocaleString('id-ID') || 0}
        </span>
      </button>

      {/* Stock Adjuster */}
      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="text-[10px] sm:text-[11px] font-medium text-text-muted">Stok:</span>
        <div className="flex items-center gap-1 bg-bg-input rounded-md px-1 py-1 border border-border-subtle">
          <button
            type="button"
            onClick={() => onUpdateStock(id, { quantity: Math.max(0, stock - 1) })}
            className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-text-secondary hover:bg-bg-elevated hover:text-primary rounded transition-colors"
          >
            -
          </button>
          <span
            className={`text-[11px] sm:text-xs font-bold w-5 sm:w-6 text-center ${isOutOfStock ? 'text-accent-red' : 'text-text-primary'}`}
          >
            {stock}
          </span>
          <button
            type="button"
            onClick={() => onUpdateStock(id, { quantity: stock + 1 })}
            className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-text-secondary hover:bg-bg-elevated hover:text-primary rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
});

export interface CatalogBrowserProps {
  inventory: InventoryItem[];
  allCategories: string[];
  subCategoriesFor: (category: string) => string[];
  onAddToCart: (item: any) => void;
  onUpdateStock: (id: string, data: any) => void;
}

export default memo(function CatalogBrowser({
  inventory,
  allCategories,
  subCategoriesFor,
  onAddToCart,
  onUpdateStock,
}: CatalogBrowserProps) {
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSubCategory, setCatalogSubCategory] = useState('all');
  const [catalogSort, setCatalogSort] = useState('az');

  const filteredCatalog = useMemo(() => {
    return inventory
      .filter((item) => {
        const matchSearch = (item.namaBarang || '')
          .toLowerCase()
          .includes(catalogSearch.toLowerCase());
        const matchCat = catalogCategory === 'all' || item.kategori === catalogCategory;
        const matchSub = catalogSubCategory === 'all' || item.subKategori === catalogSubCategory;
        return matchSearch && matchCat && matchSub;
      })
      .sort((a, b) => {
        if (catalogSort === 'az') return (a.namaBarang || '').localeCompare(b.namaBarang || '');
        if (catalogSort === 'za') return (b.namaBarang || '').localeCompare(a.namaBarang || '');
        if (catalogSort === 'price_asc') return (a.harga || 0) - (b.harga || 0);
        if (catalogSort === 'price_desc') return (b.harga || 0) - (a.harga || 0);
        return 0;
      });
  }, [inventory, catalogSearch, catalogCategory, catalogSubCategory, catalogSort]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-2 mb-4">
        {/* Search */}
        <div className="relative">
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
            placeholder="Cari katalog..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
          />
        </div>

        {/* Filter + Sort */}
        <div className="flex items-center gap-2">
          <select
            value={catalogCategory}
            onChange={(e) => {
              setCatalogCategory(e.target.value);
              setCatalogSubCategory('all');
            }}
            className="flex-1 min-w-0 px-2 sm:px-3 py-2 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              const sorts = ['az', 'za', 'price_asc', 'price_desc'];
              const next = sorts[(sorts.indexOf(catalogSort) + 1) % sorts.length];
              setCatalogSort(next as string);
            }}
            className="w-[50px] h-[38px] shrink-0 flex items-center justify-center bg-bg-input border border-border-default rounded-xl text-xs font-bold text-text-secondary hover:text-primary transition-all cursor-pointer"
            title="Ubah Urutan"
          >
            {catalogSort === 'az' && 'A-Z'}
            {catalogSort === 'za' && 'Z-A'}
            {catalogSort === 'price_asc' && 'Rp ↑'}
            {catalogSort === 'price_desc' && 'Rp ↓'}
          </button>
        </div>

        {catalogCategory !== 'all' && subCategoriesFor(catalogCategory).length > 0 && (
          <select
            value={catalogSubCategory}
            onChange={(e) => setCatalogSubCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none cursor-pointer"
          >
            <option value="all">Semua Sub-Kategori</option>
            {subCategoriesFor(catalogCategory).map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {filteredCatalog.map((item) => (
          <CatalogItemCard
            key={item.id}
            id={item.id ?? ''}
            namaBarang={item.namaBarang}
            kategori={item.kategori}
            subKategori={item.subKategori ?? ''}
            harga={item.harga}
            hargaModal={item.hargaModal}
            quantity={item.quantity}
            searchQuery={catalogSearch}
            onAddToCart={onAddToCart}
            onUpdateStock={onUpdateStock}
          />
        ))}
        {filteredCatalog.length === 0 && (
          <div className="col-span-full py-10">
            <EmptyState
              icon={
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
                  <path d="M18 2l4 4-4 4" />
                  <path d="M22 6h-8" />
                </svg>
              }
              title={inventory.length === 0 ? 'Belum ada barang' : 'Tidak ditemukan'}
              description={
                inventory.length === 0
                  ? 'Tambahkan di menu Master Barang.'
                  : 'Coba ubah kata kunci atau filter pencarian.'
              }
            />
          </div>
        )}
      </div>
    </div>
  );
});
