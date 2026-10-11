/* ═══════════════════════════════════════════════════════════
   CartItemList — ClearTask (W3-12 Component Decomposition)
   Shopping cart item list, quick multipliers, wholesale indicators
   W4-01: Support decimal qty display
   ═══════════════════════════════════════════════════════════ */

import React, { memo } from 'react';
import EmptyState from '../ui/EmptyState';
import { formatQty } from '../../utils/qtyUtils';

export interface CartItem {
  id: string;
  namaBarang: string;
  kategori: string;
  subKategori?: string;
  hargaSatuan: number;
  normalHargaSatuan?: number;
  hargaModal?: number;
  qty: number;
  total: number;
  isWholesale?: boolean;
  isCustomPrice?: boolean;
}

export interface CartItemListProps {
  cart: CartItem[];
  subTotal: number;
  onUpdateQty: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
}

export default memo(function CartItemList({
  cart,
  subTotal,
  onUpdateQty,
  onRemoveItem,
}: CartItemListProps) {
  return (
    <div className="flex flex-col shrink-0 border-b border-border-default bg-bg-surface/30">
      {/* Mini Info Header */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-bg-elevated/40 border-b border-border-subtle/60 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
            Daftar Barang
          </span>
          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
            {cart.length} item
          </span>
        </div>
        <span className="text-xs text-text-muted">
          Sub Total:{' '}
          <strong className="text-text-primary font-bold">
            Rp {subTotal.toLocaleString('id-ID')}
          </strong>
        </span>
      </div>

      {/* Scrollable Items Area */}
      <div className="max-h-[28vh] sm:max-h-[32vh] lg:max-h-[280px] overflow-y-auto p-4 space-y-2.5">
        {cart.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-bg-surface p-3 rounded-xl border border-border-default shadow-sm hover:border-primary/20 transition-all"
          >
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-text-primary truncate">{item.namaBarang}</p>
                {item.isWholesale && (
                  <span className="px-1.5 py-0.5 rounded bg-warning/20 text-warning text-[10px] font-bold border border-warning/30">
                    🏷️ Grosir
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Rp {item.hargaSatuan.toLocaleString('id-ID')}
                {item.isWholesale && item.normalHargaSatuan && (
                  <span className="line-through text-text-muted/60 ml-1 text-[11px]">
                    Rp {item.normalHargaSatuan.toLocaleString('id-ID')}
                  </span>
                )}
              </p>
            </div>
            {/* Quick Quantity Multipliers (+1, -1, +5) */}
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1 bg-bg-input px-1 py-1 rounded-lg border border-border-subtle">
                <button
                  type="button"
                  onClick={() => onUpdateQty(item.id, item.qty - 1)}
                  className="w-7 h-7 flex items-center justify-center bg-bg-elevated rounded hover:bg-white/10 cursor-pointer text-text-secondary transition-colors text-xs font-bold"
                  aria-label="Kurangi 1"
                >
                  −1
                </button>
                <span className="text-sm font-semibold w-8 text-center">{formatQty(item.qty)}</span>
                <button
                  type="button"
                  onClick={() => onUpdateQty(item.id, item.qty + 1)}
                  className="w-7 h-7 flex items-center justify-center bg-bg-elevated rounded hover:bg-white/10 cursor-pointer text-text-secondary transition-colors text-xs font-bold"
                  aria-label="Tambah 1"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateQty(item.id, item.qty + 5)}
                  className="w-7 h-7 flex items-center justify-center bg-primary/10 rounded hover:bg-primary/20 cursor-pointer text-primary transition-colors text-[10px] font-bold"
                  title="Tambah 5"
                  aria-label="Tambah 5"
                >
                  +5
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemoveItem(item.id)}
              className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-white hover:bg-red-500/80 transition-colors cursor-pointer shrink-0"
              aria-label="Hapus dari keranjang"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {cart.length === 0 && (
          <div className="py-6">
            <EmptyState
              title="Keranjang Kosong"
              description="Pilih barang dari Katalog untuk ditambahkan ke keranjang."
            />
          </div>
        )}
      </div>
    </div>
  );
});
