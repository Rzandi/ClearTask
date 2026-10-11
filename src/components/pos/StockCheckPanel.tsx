/* ═══════════════════════════════════════════════════════════
   StockCheckPanel — ClearTask (W3-12 Component Decomposition)
   Real-time stock checking, selling & cost price lookup
   ═══════════════════════════════════════════════════════════ */

import React, { useState, memo } from 'react';
import type { InventoryItem } from '../../types/index';

export interface StockCheckPanelProps {
  inventory: InventoryItem[];
  allCategories: string[];
  onAddToCart: (item: any) => void;
  onEditManual: (item: InventoryItem) => void;
}

export default memo(function StockCheckPanel({
  inventory,
  onAddToCart,
  onEditManual,
}: StockCheckPanelProps) {
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [localFeedback, setLocalFeedback] = useState('');

  const filteredInventory = inventory.filter((item) =>
    (item.namaBarang || '').toLowerCase().includes(stockSearchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-5 overflow-hidden">
      <div className="relative mb-3 shrink-0">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
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
          placeholder="Cari stok barang..."
          value={stockSearchQuery}
          onChange={(e) => setStockSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
        />
      </div>
      {localFeedback && (
        <div className="text-xs text-green-400 bg-green-400/10 py-1.5 px-3 rounded-lg mb-2 text-center font-medium animate-fade-in shrink-0">
          {localFeedback}
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-16 lg:pb-0">
        {filteredInventory.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-bg-surface rounded-xl border border-border-default flex flex-col gap-1.5"
          >
            <div className="flex justify-between items-start">
              <span
                className="text-sm font-semibold text-text-primary truncate max-w-[200px]"
                title={item.namaBarang}
              >
                {item.namaBarang}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (item.quantity || 0) <= 5
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                Stok: {item.quantity || 0}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-text-muted border-t border-border-subtle pt-2">
              <span>Jual: Rp {item.harga?.toLocaleString('id-ID')}</span>
              <span>
                Modal:{' '}
                {(item.hargaModal || 0) > 0 ? (
                  `Rp ${(item.hargaModal || 0).toLocaleString('id-ID')}`
                ) : (
                  <span className="text-warning font-semibold" title="Harga modal belum diisi">
                    - ⚠️
                  </span>
                )}
              </span>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  onEditManual(item);
                  setLocalFeedback(`Dimasukkan ke Input Manual: ${item.namaBarang}`);
                  setTimeout(() => setLocalFeedback(''), 3000);
                }}
                className="flex-1 py-1.5 px-2 text-[11px] font-medium rounded-lg border border-border-default text-text-secondary hover:text-primary hover:border-primary transition-colors cursor-pointer"
              >
                + Edit Manual
              </button>
              <button
                type="button"
                disabled={(item.quantity || 0) <= 0}
                onClick={() => {
                  onAddToCart({
                    namaBarang: item.namaBarang,
                    kategori: item.kategori,
                    subKategori: item.subKategori || '',
                    hargaSatuan: item.harga || 0,
                    hargaModal: item.hargaModal || 0,
                    qty: 1,
                  });
                  setLocalFeedback(`Ditambahkan: 1x ${item.namaBarang}`);
                  setTimeout(() => setLocalFeedback(''), 3000);
                }}
                className="flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                + Keranjang
              </button>
            </div>
          </div>
        ))}
        {filteredInventory.length === 0 && (
          <div className="text-center py-8 text-sm text-text-muted">
            Barang tidak ditemukan di inventaris
          </div>
        )}
      </div>
    </div>
  );
});
