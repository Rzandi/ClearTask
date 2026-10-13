/* ═══════════════════════════════════════════════════════════
   ManualItemForm — ClearTask (W3-12 Component Decomposition)
   Manual custom item entry form with real-time suggestion dropdown
   ═══════════════════════════════════════════════════════════ */

import React, { useState, useMemo, memo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import FieldGroup from '../ui/FieldGroup';
import Button from '../ui/Button';
import Input from '../ui/Input';
import HighlightText from '../ui/HighlightText';
import { parseIDNumber } from '../../utils/parseIDNumber';
import { parseQty, isValidQty } from '../../utils/qtyUtils';
import { parseInlineCommand, hasInlineSyntax } from '../../utils/inlineSyntaxParser';
import { getAllCustomers } from '../../services/customerService';
import type { InventoryItem } from '../../types/index';

const parseNumeric = (val: any) => {
  if (val === undefined || val === null || val === '') return 0;
  return parseIDNumber(val);
};

export interface ManualItemFormProps {
  inventory: InventoryItem[];
  allCategories: string[];
  subCategoriesFor: (category: string) => string[];
  tanggal: string;
  setTanggal: (val: string) => void;
  onAddToCart: (item: any) => void;
  confirm: (options: any) => Promise<boolean>;
  initialForm?:
    | {
        namaBarang?: string;
        kategori?: string;
        subKategori?: string;
        qty?: string;
        hargaSatuan?: string;
      }
    | undefined;
}

export default memo(function ManualItemForm({
  inventory,
  allCategories,
  subCategoriesFor,
  tanggal,
  setTanggal,
  onAddToCart,
  confirm,
  initialForm,
}: ManualItemFormProps) {
  const [form, setForm] = useState({
    kategori: initialForm?.kategori || allCategories[0] || 'Makanan',
    subKategori: initialForm?.subKategori || '',
    namaBarang: initialForm?.namaBarang || '',
    qty: initialForm?.qty || '1',
    hargaSatuan: initialForm?.hargaSatuan || '',
    metode: 'tunai' as 'tunai' | 'kredit',
    customerId: undefined as string | undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load customers from database (live query untuk real-time update)
  const customers =
    useLiveQuery(async () => {
      const allCustomers = await getAllCustomers();
      return allCustomers.filter((c) => !c.deletedAt); // Only active customers
    }, []) ?? [];

  // Suggestions for auto-complete based on typed name
  const suggestions = useMemo(() => {
    if (!form.namaBarang || form.namaBarang.trim().length < 2) return [];
    return inventory
      .filter((item) =>
        (item.namaBarang || '').toLowerCase().includes(form.namaBarang.toLowerCase())
      )
      .slice(0, 5);
  }, [form.namaBarang, inventory]);

  const matchedInventoryItem = useMemo(() => {
    if (!form.namaBarang.trim()) return null;
    return (
      inventory.find(
        (item) => item.namaBarang?.toLowerCase().trim() === form.namaBarang.trim().toLowerCase()
      ) || null
    );
  }, [form.namaBarang, inventory]);

  // W4-Bug-06: Real-time inline syntax preview (e.g. "Susu 2x @15000")
  const inlineParsed = useMemo(() => {
    if (!form.namaBarang || !hasInlineSyntax(form.namaBarang)) return null;
    return parseInlineCommand(form.namaBarang);
  }, [form.namaBarang]);

  const handleManualChange = (field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'kategori') {
        next.subKategori = '';
      }
      // Reset customer when switching to tunai
      if (field === 'metode' && value === 'tunai') {
        next.customerId = undefined;
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSelectSuggestion = (item: InventoryItem) => {
    setForm((prev) => ({
      ...prev,
      kategori: item.kategori || allCategories[0] || 'Makanan',
      subKategori: item.subKategori || '',
      namaBarang: item.namaBarang || '',
      qty: '1',
      hargaSatuan: item.harga ? item.harga.toString() : '',
    }));
    setShowSuggestions(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};

    let targetNama = form.namaBarang.trim();
    let q = parseQty(form.qty);
    let h = parseNumeric(form.hargaSatuan);

    // Apply inline parsed command if detected
    if (inlineParsed) {
      targetNama = inlineParsed.namaBarang;
      q = inlineParsed.qty;
      if (inlineParsed.hargaSatuan !== null) {
        h = inlineParsed.hargaSatuan;
      }
    }

    if (!targetNama) err.namaBarang = 'Nama barang wajib diisi';

    // Auto-match inventory by target name
    const matchedItem = inventory.find(
      (invItem) => invItem.namaBarang?.toLowerCase().trim() === targetNama.toLowerCase()
    );

    // If price wasn't specified via inline syntax or form, lookup from catalog
    if (h <= 0 && matchedItem?.harga) {
      h = matchedItem.harga;
    }

    // W4-01: Parse qty dengan parseQty (support desimal)
    if (!isValidQty(q)) err.qty = 'Qty harus > 0 (support desimal, misal 0,5)';
    if (h <= 0) err.hargaSatuan = 'Harga harus > 0';

    // W4-02: Validasi kredit wajib pilih customer
    if (form.metode === 'kredit' && !form.customerId) {
      err.customerId = 'Pilih pelanggan untuk transaksi kredit';
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    const resolvedHargaModal = matchedItem ? matchedItem.hargaModal || 0 : 0;

    // W2-09: Validasi harga jual < modal -> konfirmasi peringatan
    if (resolvedHargaModal > 0 && h < resolvedHargaModal) {
      const proceed = await confirm({
        title: 'Harga Jual di Bawah Modal',
        message: `⚠️ Peringatan: Harga jual (Rp ${h.toLocaleString('id-ID')}) lebih rendah dari harga modal (Rp ${resolvedHargaModal.toLocaleString('id-ID')}).\nLanjutkan menambahkan ke keranjang?`,
        confirmLabel: 'Tetap Tambahkan',
      });
      if (!proceed) return;
    }

    onAddToCart({
      namaBarang: targetNama,
      kategori: matchedItem?.kategori || form.kategori,
      subKategori: matchedItem?.subKategori || form.subKategori,
      hargaSatuan: h,
      normalHargaSatuan: h,
      isCustomPrice: true,
      hargaModal: resolvedHargaModal,
      qty: q, // qty sudah dalam bentuk number dengan desimal support
      metode: form.metode, // W4-02: Pass payment method
      customerId: form.customerId, // W4-02: Pass customer ID for credit
    });

    setForm({
      ...form,
      namaBarang: '',
      qty: '1',
      hargaSatuan: '',
      // Keep metode & customerId (user might add multiple items for same customer)
    });
    setErrors({});
  };

  return (
    <form onSubmit={handleManualSubmit} className="space-y-5">
      <FieldGroup label="Tanggal Transaksi">
        <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
      </FieldGroup>
      <FieldGroup label="Nama Barang">
        <div className="relative">
          <Input
            id="manual-nama-barang"
            type="text"
            aria-label="Nama barang"
            aria-autocomplete="list"
            aria-controls="manual-suggestions-list"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-invalid={!!errors.namaBarang}
            value={form.namaBarang}
            onChange={(e) => {
              handleManualChange('namaBarang', e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
            onClick={() => setShowSuggestions(true)}
            placeholder="Nama Item..."
            className={errors.namaBarang ? 'border-red-500' : ''}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              id="manual-suggestions-list"
              role="listbox"
              aria-label="Saran nama barang"
              className="absolute left-0 right-0 mt-1 bg-bg-surface border border-border-default rounded-xl shadow-xl z-[60] max-h-40 overflow-y-auto divide-y divide-border-subtle"
            >
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onMouseDown={() => handleSelectSuggestion(item)}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-white/[0.04] hover:text-primary transition-colors cursor-pointer"
                >
                  <HighlightText text={item.namaBarang} query={form.namaBarang} />{' '}
                  <span className="text-text-muted text-[10px]">
                    ({item.kategori} - Rp {item.harga?.toLocaleString('id-ID')})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.namaBarang && (
          <span role="alert" className="text-xs text-red-400 mt-1 block">
            {errors.namaBarang}
          </span>
        )}
        {inlineParsed && (
          <span
            role="status"
            aria-live="polite"
            className="text-xs text-primary mt-1 block font-mono bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20"
          >
            ⚡ Quick Syntax: <strong>{inlineParsed.namaBarang}</strong> ({inlineParsed.qty}x
            {inlineParsed.hargaSatuan
              ? ` @ Rp ${inlineParsed.hargaSatuan.toLocaleString('id-ID')}`
              : ''}
            )
          </span>
        )}
        {matchedInventoryItem ? (
          <span
            role="status"
            aria-live="polite"
            className="text-xs text-green-400 mt-1 block font-medium"
          >
            ✓ Terdaftar (Stok: {matchedInventoryItem.quantity || 0}, Jual: Rp{' '}
            {matchedInventoryItem.harga?.toLocaleString('id-ID')})
          </span>
        ) : form.namaBarang.trim() && !inlineParsed ? (
          <span
            role="status"
            aria-live="polite"
            className="text-xs text-primary mt-1 block font-medium animate-pulse"
          >
            ✨ Barang Baru Terdeteksi! (Stok: 0, Modal: 0)
          </span>
        ) : null}
      </FieldGroup>
      <div className="flex gap-4">
        <div className="flex-1">
          <FieldGroup label="Harga Satuan">
            <Input
              id="manual-harga-satuan"
              type="number"
              aria-label="Harga satuan"
              aria-invalid={!!errors.hargaSatuan}
              value={form.hargaSatuan}
              onChange={(e) => handleManualChange('hargaSatuan', e.target.value)}
              placeholder="0"
              className={errors.hargaSatuan ? 'border-red-500' : ''}
            />
            {errors.hargaSatuan && (
              <span role="alert" className="text-xs text-red-400 mt-1 block">
                {errors.hargaSatuan}
              </span>
            )}
          </FieldGroup>
        </div>
        <div className="w-32">
          <FieldGroup label="Qty">
            <Input
              id="manual-qty"
              type="text"
              inputMode="decimal"
              aria-label="Jumlah kuantitas"
              aria-invalid={!!errors.qty}
              value={form.qty}
              onChange={(e) => handleManualChange('qty', e.target.value)}
              placeholder="1 atau 0,5"
              className={errors.qty ? 'border-red-500' : ''}
            />
            {errors.qty && (
              <span role="alert" className="text-xs text-red-400 mt-1 block">
                {errors.qty}
              </span>
            )}
            {!errors.qty && (
              <span className="text-[10px] text-text-muted mt-0.5 block">
                Desimal: gunakan koma (,)
              </span>
            )}
          </FieldGroup>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <FieldGroup label="">
            <label className="block text-xs font-semibold text-text-secondary mb-1">Kategori</label>
            <select
              aria-label="Kategori"
              value={form.kategori}
              onChange={(e) => handleManualChange('kategori', e.target.value)}
              className="form-input w-full"
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>
        <div className="flex-1">
          <FieldGroup label="">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Sub-Kategori
            </label>
            <select
              aria-label="Sub-Kategori"
              value={form.subKategori}
              onChange={(e) => handleManualChange('subKategori', e.target.value)}
              className="form-input w-full"
            >
              <option value="">— Opsional —</option>
              {subCategoriesFor(form.kategori).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>
      </div>

      {/* W4-02: Payment Method & Customer Selector */}
      <div className="space-y-4 pt-2 border-t border-border-subtle">
        <FieldGroup label="">
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Metode Pembayaran
          </label>
          <select
            aria-label="Metode Pembayaran"
            value={form.metode}
            onChange={(e) => handleManualChange('metode', e.target.value as 'tunai' | 'kredit')}
            className="form-input w-full"
          >
            <option value="tunai">💵 Tunai</option>
            <option value="kredit">📋 Kredit (Hutang)</option>
          </select>
        </FieldGroup>

        {form.metode === 'kredit' && (
          <FieldGroup label="">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Pelanggan <span className="text-red-400">*</span>
            </label>
            <select
              aria-label="Pelanggan"
              value={form.customerId || ''}
              onChange={(e) => handleManualChange('customerId', e.target.value || undefined)}
              className={`form-input w-full ${errors.customerId ? 'border-red-500' : ''}`}
            >
              <option value="">— Pilih Pelanggan —</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.nama}
                  {customer.totalHutang > 0
                    ? ` (Hutang: Rp ${customer.totalHutang.toLocaleString('id-ID')})`
                    : ' (Lunas)'}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <span className="text-xs text-red-400 mt-1 block">{errors.customerId}</span>
            )}
            {customers.length === 0 && (
              <span className="text-xs text-yellow-400 mt-1 block">
                ⚠️ Belum ada pelanggan. Buka tab Hutang-Piutang untuk menambahkan pelanggan.
              </span>
            )}
          </FieldGroup>
        )}
      </div>

      <Button type="submit" variant="outline" className="w-full py-3 mt-4">
        Tambah ke Keranjang
      </Button>
    </form>
  );
});
