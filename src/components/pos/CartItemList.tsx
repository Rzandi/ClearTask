/* ═══════════════════════════════════════════════════════════
   CartItemList — ClearTask (W3-12 Component Decomposition)
   Shopping cart item list, quick multipliers, wholesale indicators
   W4-01: Support decimal qty display
   W4-04: Inline per-item discount (% or Rp)
   ═══════════════════════════════════════════════════════════ */

import React, { memo, useState } from 'react';
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
  // W4-04: Discount fields
  diskonPersen?: number;
  diskonNominal?: number;
  totalSebelumDiskon?: number;
  totalDiskon?: number;
}

export interface CartItemListProps {
  cart: CartItem[];
  subTotal: number;
  onUpdateQty: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateDiskon: (id: string, tipe: 'persen' | 'nominal', nilai: number) => void;
}

/** Small inline discount editor for a cart item */
function ItemDiscountInput({
  item,
  onUpdateDiskon,
}: {
  item: CartItem;
  onUpdateDiskon: (id: string, tipe: 'persen' | 'nominal', nilai: number) => void;
}) {
  const hasDiskon = (item.diskonPersen || 0) > 0 || (item.diskonNominal || 0) > 0;
  const [open, setOpen] = useState(hasDiskon);
  const [tipe, setTipe] = useState<'persen' | 'nominal'>(
    (item.diskonNominal || 0) > 0 ? 'nominal' : 'persen'
  );
  const [inputVal, setInputVal] = useState(() => {
    if ((item.diskonNominal || 0) > 0) return String(item.diskonNominal);
    if ((item.diskonPersen || 0) > 0) return String(item.diskonPersen);
    return '';
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
        title="Tambah diskon"
        aria-label={`Tambah diskon untuk ${item.namaBarang}`}
      >
        %
      </button>
    );
  }

  const handleApply = (newTipe: 'persen' | 'nominal', val: string) => {
    const num = Math.max(0, Number(val) || 0);
    onUpdateDiskon(item.id, newTipe, num);
  };

  const handleClear = () => {
    setInputVal('');
    onUpdateDiskon(item.id, 'persen', 0);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      <select
        value={tipe}
        onChange={(e) => {
          const newTipe = e.target.value as 'persen' | 'nominal';
          setTipe(newTipe);
          handleApply(newTipe, inputVal);
        }}
        className="text-[10px] bg-bg-elevated text-text-secondary border border-border-subtle rounded px-1 py-0.5 cursor-pointer"
        aria-label={`Tipe diskon untuk ${item.namaBarang}`}
      >
        <option value="persen">%</option>
        <option value="nominal">Rp</option>
      </select>
      <input
        type="number"
        min="0"
        max={tipe === 'persen' ? 100 : undefined}
        value={inputVal}
        onChange={(e) => {
          setInputVal(e.target.value);
          handleApply(tipe, e.target.value);
        }}
        placeholder={tipe === 'persen' ? '0' : '0'}
        className="w-14 text-[11px] bg-bg-input text-text-primary border border-border-subtle rounded px-1.5 py-0.5 text-center focus:border-amber-400 focus:outline-none transition-colors"
        aria-label={`Nilai diskon untuk ${item.namaBarang}`}
      />
      <button
        type="button"
        onClick={handleClear}
        className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer px-0.5"
        title="Hapus diskon"
        aria-label={`Hapus diskon untuk ${item.namaBarang}`}
      >
        ✕
      </button>
    </div>
  );
}

export default memo(function CartItemList({
  cart,
  subTotal,
  onUpdateQty,
  onRemoveItem,
  onUpdateDiskon,
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
        {cart.map((item) => {
          const hasDiskon = (item.totalDiskon || 0) > 0;
          return (
            <div
              key={item.id}
              className={`flex justify-between items-start bg-bg-surface p-3 rounded-xl border shadow-sm hover:border-primary/20 transition-all ${hasDiskon ? 'border-amber-500/30' : 'border-border-default'}`}
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {item.namaBarang}
                  </p>
                  {item.isWholesale && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning/15 text-warning text-[10px] font-bold border border-warning/30">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        aria-hidden="true"
                      >
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      Grosir
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-text-muted tabular-nums">
                    Rp {item.hargaSatuan.toLocaleString('id-ID')}
                    {item.isWholesale && item.normalHargaSatuan && (
                      <span className="line-through text-text-muted/60 ml-1 text-[11px] tabular-nums">
                        Rp {item.normalHargaSatuan.toLocaleString('id-ID')}
                      </span>
                    )}
                  </p>
                  {hasDiskon && (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded tabular-nums">
                      {(item.diskonPersen || 0) > 0
                        ? `-${item.diskonPersen}%`
                        : `-Rp ${(item.diskonNominal || 0).toLocaleString('id-ID')}`}
                    </span>
                  )}
                </div>
                {/* W4-04: Show discounted total */}
                {hasDiskon && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-text-muted line-through tabular-nums">
                      Rp {(item.totalSebelumDiskon || item.total).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] font-bold text-amber-400 tabular-nums">
                      → Rp {item.total.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[9px] text-green-400 tabular-nums">
                      (hemat Rp {(item.totalDiskon || 0).toLocaleString('id-ID')})
                    </span>
                  </div>
                )}
                {/* W4-04: Inline discount input */}
                <ItemDiscountInput item={item} onUpdateDiskon={onUpdateDiskon} />
              </div>
              {/* Quick Quantity Multipliers (+1, -1, +5) */}
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 bg-bg-input px-1 py-1 rounded-xl border border-border-default shadow-sm">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, item.qty - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-bg-elevated rounded-lg hover:bg-white/10 active:scale-[0.92] cursor-pointer text-text-primary transition-all text-xs font-bold"
                    aria-label={`Kurangi 1 ${item.namaBarang}`}
                  >
                    −1
                  </button>
                  <span className="text-sm font-semibold w-8 text-center tabular-nums">
                    {formatQty(item.qty)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, item.qty + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-bg-elevated rounded-lg hover:bg-white/10 active:scale-[0.92] cursor-pointer text-text-primary transition-all text-xs font-bold"
                    aria-label={`Tambah 1 ${item.namaBarang}`}
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, item.qty + 5)}
                    className="w-8 h-8 flex items-center justify-center bg-primary/15 rounded-lg hover:bg-primary/25 active:scale-[0.92] cursor-pointer text-primary transition-all text-[11px] font-bold"
                    title="Tambah 5"
                    aria-label={`Tambah 5 ${item.namaBarang}`}
                  >
                    +5
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-white hover:bg-red-500/80 active:scale-[0.92] transition-all cursor-pointer shrink-0"
                aria-label={`Hapus ${item.namaBarang} dari keranjang`}
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
          );
        })}
        {cart.length === 0 && (
          <div className="py-4 text-center">
            <p className="text-xs font-semibold text-text-secondary">Keranjang Kosong</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Pilih barang dari Katalog untuk ditambahkan
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
