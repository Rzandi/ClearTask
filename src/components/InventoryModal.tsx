/* ═══════════════════════════════════════════════════════════
   InventoryModal — ClearTask
   Modal form untuk menambah & mengedit barang inventaris
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { formatRupiah } from '../utils/formatters';

const SATUAN_OPTIONS = [
  'Pcs',
  'Kg',
  'Box',
  'Pack',
  'Lusin',
  'Liter',
  'Meter',
  'Lembar',
  'Unit',
  'Set',
];

export interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editItem?: any;
}

export default function InventoryModal({ isOpen, onClose, onSave, editItem = null }: InventoryModalProps) {
  const { allCategories, subCategoriesFor } = useCategories();

  const [form, setForm] = useState({
    namaBarang: '',
    kategori: '',
    subKategori: '',
    harga: '',
    hargaModal: '',
    satuan: 'Pcs',
    quantity: '',
  });

  // When modal opens or editItem changes, fill form
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevEditItem, setPrevEditItem] = useState(editItem);

  if (isOpen !== prevIsOpen || editItem !== prevEditItem) {
    setPrevIsOpen(isOpen);
    setPrevEditItem(editItem);
    if (isOpen) {
      if (editItem) {
        setForm({
          namaBarang: editItem.namaBarang || '',
          kategori: editItem.kategori || '',
          subKategori: editItem.subKategori || '',
          harga: editItem.harga?.toString() || '',
          hargaModal: editItem.hargaModal?.toString() || '',
          satuan: editItem.satuan || 'Pcs',
          quantity: editItem.quantity?.toString() || '',
        });
      } else {
        setForm({
          namaBarang: '',
          kategori: '',
          subKategori: '',
          harga: '',
          hargaModal: '',
          satuan: 'Pcs',
          quantity: '',
        });
      }
    }
  }

  if (!isOpen) return null;

  const harga = parseInt(form.harga, 10) || 0;
  const hargaModal = parseInt(form.hargaModal, 10) || 0;
  const quantity = parseInt(form.quantity, 10) || 0;

  const isValid =
    form.namaBarang.trim().length > 0 &&
    form.kategori.trim().length > 0 &&
    harga >= 0 &&
    hargaModal >= 0 &&
    quantity >= 0 &&
    form.satuan.trim().length > 0;

  function handleChange(e: any) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: any) {
    e.preventDefault();
    if (!isValid) return;

    onSave({
      namaBarang: form.namaBarang.trim(),
      kategori: form.kategori.trim(),
      subKategori: form.subKategori.trim(),
      harga,
      hargaModal,
      satuan: form.satuan.trim(),
      quantity,
    });

    onClose();
  }

  function handleBackdropClick(e: any) {
    if (e.target === e.currentTarget) onClose();
  }

  const subCategories = subCategoriesFor(form.kategori);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="glass-card w-full max-w-lg animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-default shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00ffa3"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              {editItem ? 'Edit Barang' : 'Tambah Barang Baru'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4">
          {/* Nama Barang */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Nama Barang *
            </label>
            <input
              type="text"
              name="namaBarang"
              value={form.namaBarang}
              onChange={handleChange}
              placeholder="Contoh: Nasi Goreng Spesial"
              maxLength={100}
              className="w-full px-4 py-2.5 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
            />
          </div>

          {/* Kategori & Sub Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Kategori *
              </label>
              <select
                name="kategori"
                value={form.kategori}
                onChange={handleChange}
                className="w-full px-4 py-2.5 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
              >
                <option value="">Pilih Kategori</option>
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Sub Kategori
              </label>
              <select
                name="subKategori"
                value={form.subKategori}
                onChange={handleChange}
                className="w-full px-4 py-2.5 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
              >
                <option value="">— Tidak ada —</option>
                {subCategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Harga Modal & Harga Jual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Harga Modal *
              </label>
              <input
                type="number"
                name="hargaModal"
                value={form.hargaModal}
                onChange={handleChange}
                min="0"
                placeholder="0"
                className="w-full px-4 py-2.5 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Harga Jual (Satuan) *
              </label>
              <input
                type="number"
                name="harga"
                value={form.harga}
                onChange={handleChange}
                min="0"
                placeholder="0"
                className="w-full px-4 py-2.5 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
              />
            </div>
          </div>

          {/* Satuan & Stok */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Satuan *
              </label>
              <select
                name="satuan"
                value={form.satuan}
                onChange={handleChange}
                className="w-full px-4 py-2.5 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
              >
                {SATUAN_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Stok
              </label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                min="0"
                placeholder="0"
                className="w-full px-4 py-2.5 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
              />
            </div>
          </div>

          {/* Preview */}
          {harga > 0 && (
            <div className="bg-bg-elevated rounded-xl p-3 border border-border-subtle">
              <p className="text-xs text-text-muted mb-1">Harga Satuan</p>
              <p className="text-lg font-bold text-primary">
                {formatRupiah(harga)}
                <span className="text-xs text-text-muted font-normal"> / {form.satuan}</span>
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-sm font-medium rounded-xl border border-border-default text-text-secondary hover:bg-white/[0.04] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editItem ? 'Simpan Perubahan' : 'Tambah Barang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
