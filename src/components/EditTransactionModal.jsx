/* ═══════════════════════════════════════════════════════════
   EditTransactionModal — ClearTask
   Modal form untuk mengedit transaksi yang sudah tersimpan.
   Reuses 2-column layout dari InputPenjualan.jsx.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useCategories } from '../hooks/useCategories';

const METODE_OPTIONS = ['Tunai', 'QRIS', 'Kartu Debit', 'Transfer'];

/* ─── Helpers ─────────────────────────────────────────────── */

function buildInitialForm(transaction) {
  if (!transaction) {
    return {
      tanggal: '',
      kategori: '',
      namaBarang: '',
      qty: '',
      hargaSatuan: '',
      metode: 'Tunai',
      catatan: '',
      kasir: '',
    };
  }
  return {
    tanggal: transaction.tanggal ?? '',
    kategori: transaction.kategori ?? '',
    namaBarang: transaction.namaBarang ?? '',
    qty: transaction.qty !== undefined ? String(transaction.qty) : '',
    hargaSatuan: transaction.hargaSatuan !== undefined ? String(transaction.hargaSatuan) : '',
    metode: transaction.metode ?? 'Tunai',
    catatan: transaction.catatan ?? '',
    kasir: transaction.kasir ?? '',
  };
}

function validate(form) {
  const errors = {};

  if (!form.namaBarang.trim()) {
    errors.namaBarang = 'Nama barang wajib diisi';
  }

  const qty = parseInt(form.qty, 10);
  if (isNaN(qty) || qty < 1) {
    errors.qty = 'Qty minimal 1';
  }

  const harga = parseInt(form.hargaSatuan, 10);
  if (isNaN(harga) || harga < 0) {
    errors.hargaSatuan = 'Harga tidak boleh negatif';
  }

  return errors;
}

/* ─── Komponen Utama ──────────────────────────────────────── */

export default function EditTransactionModal({ transaction, isOpen, onClose, onSave }) {
  const [form, setForm] = useState(() => buildInitialForm(transaction));
  const [errors, setErrors] = useState({});

  const { allCategories } = useCategories();

  // 4.2 — Pre-fill form dari prop transaction saat modal dibuka
  useEffect(() => {
    if (isOpen && transaction) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(buildInitialForm(transaction));

      setErrors({});
    }
  }, [isOpen, transaction]);

  // 4.9 — Body scroll lock saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 4.8 — Tutup via tombol Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 4.10 — Return null ketika isOpen false
  if (!isOpen) return null;

  // 4.5 — Kalkulasi total reaktif
  const qty = parseInt(form.qty, 10) || 0;
  const harga = parseInt(form.hargaSatuan, 10) || 0;
  const total = qty > 0 && harga > 0 ? qty * harga : 0;

  const hasErrors = Object.keys(errors).length > 0;

  // ── Handlers ──

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear the specific field's error as the user types (bug #7 fix)
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  // 4.8 — Klik overlay menutup modal tanpa menyimpan
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  // 4.6 + 4.7 — Validasi saat submit
  function handleSubmit(e) {
    e.preventDefault();

    const newErrors = validate(form);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    // Panggil onSave dengan id dan data form yang sudah divalidasi
    onSave(transaction.id, {
      tanggal: form.tanggal,
      kategori: form.kategori,
      namaBarang: form.namaBarang.trim(),
      qty: parseInt(form.qty, 10),
      hargaSatuan: parseInt(form.hargaSatuan, 10),
      total,
      metode: form.metode,
      catatan: form.catatan,
      kasir: form.kasir,
    });
  }

  // ── Render ──

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleOverlayClick}
      data-testid="edit-transaction-modal"
    >
      {/* Overlay — single click handler via parent's handleOverlayClick (bug #16 fix) */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative glass-card w-full max-w-2xl mx-4 p-6 lg:p-8 max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Edit Transaksi</h2>
            {/* 4.4 — transactionId sebagai teks read-only */}
            <p className="text-sm text-text-muted mt-0.5">
              ID:{' '}
              <span className="font-mono text-text-secondary" data-testid="transaction-id-display">
                {transaction?.transactionId}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal edit"
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

        {/* Form */}
        <form onSubmit={handleSubmit} id="form-edit-transaksi">
          {/* 4.3 — Layout 2-kolom seperti InputPenjualan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
            {/* ── Kolom Kiri ── */}
            <div className="space-y-5">
              {/* Tanggal */}
              <FieldGroup label="Tanggal" htmlFor="edit-tanggal">
                <input
                  type="date"
                  id="edit-tanggal"
                  name="tanggal"
                  value={form.tanggal}
                  onChange={handleChange}
                  className="form-input"
                />
              </FieldGroup>

              {/* Kategori */}
              <FieldGroup label="Kategori Barang" htmlFor="edit-kategori">
                <select
                  id="edit-kategori"
                  name="kategori"
                  value={form.kategori}
                  onChange={handleChange}
                  className="form-input appearance-none"
                >
                  {allCategories.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </FieldGroup>

              {/* Nama Barang */}
              <FieldGroup label="Nama Barang" htmlFor="edit-namaBarang">
                <input
                  type="text"
                  id="edit-namaBarang"
                  name="namaBarang"
                  value={form.namaBarang}
                  onChange={handleChange}
                  placeholder="Masukkan nama barang"
                  className={`form-input${errors.namaBarang ? ' border-red-500/60' : ''}`}
                />
                {/* 4.6 — Pesan error inline */}
                {errors.namaBarang && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.namaBarang}
                  </p>
                )}
              </FieldGroup>

              {/* Qty */}
              <FieldGroup label="Qty" htmlFor="edit-qty">
                <input
                  type="number"
                  id="edit-qty"
                  name="qty"
                  value={form.qty}
                  onChange={handleChange}
                  placeholder="0"
                  min="1"
                  className={`form-input${errors.qty ? ' border-red-500/60' : ''}`}
                />
                {/* 4.6 — Pesan error inline */}
                {errors.qty && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.qty}
                  </p>
                )}
              </FieldGroup>
            </div>

            {/* ── Kolom Kanan ── */}
            <div className="space-y-5">
              {/* Harga Satuan */}
              <FieldGroup label="Harga Satuan" htmlFor="edit-hargaSatuan">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    id="edit-hargaSatuan"
                    name="hargaSatuan"
                    value={form.hargaSatuan}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className={`form-input form-input-prefixed${errors.hargaSatuan ? ' border-red-500/60' : ''}`}
                  />
                </div>
                {/* 4.6 — Pesan error inline */}
                {errors.hargaSatuan && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.hargaSatuan}
                  </p>
                )}
              </FieldGroup>

              {/* 4.5 — Total (read-only, kalkulasi reaktif) */}
              <FieldGroup label="Total (Auto-calculated)" htmlFor="edit-total">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    id="edit-total"
                    value={total > 0 ? total.toLocaleString('id-ID') : '0'}
                    readOnly
                    data-testid="total-display"
                    className="form-input form-input-prefixed bg-bg-elevated/50 text-text-secondary cursor-not-allowed"
                  />
                </div>
              </FieldGroup>

              {/* Metode Pembayaran */}
              <FieldGroup label="Metode Pembayaran" htmlFor="edit-metode">
                <select
                  id="edit-metode"
                  name="metode"
                  value={form.metode}
                  onChange={handleChange}
                  className="form-input appearance-none"
                >
                  {METODE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </FieldGroup>

              {/* Catatan */}
              <FieldGroup label="Catatan Tambahan" htmlFor="edit-catatan">
                <textarea
                  id="edit-catatan"
                  name="catatan"
                  value={form.catatan}
                  onChange={handleChange}
                  placeholder="Opsional"
                  rows={3}
                  className="form-input resize-none"
                />
              </FieldGroup>
            </div>
          </div>

          {/* Kasir — full width di bawah grid */}
          <div className="mt-5">
            <FieldGroup label="Kasir" htmlFor="edit-kasir">
              <input
                type="text"
                id="edit-kasir"
                name="kasir"
                value={form.kasir}
                onChange={handleChange}
                placeholder="Nama kasir"
                className="form-input"
              />
            </FieldGroup>
          </div>

          {/* 4.7 — Tombol Batal dan Simpan */}
          <div className="flex gap-3 mt-8 justify-end">
            {/* 4.8 — Tombol Batal menutup tanpa menyimpan */}
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium rounded-xl border border-border-default text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
            >
              Batal
            </button>

            {/* 4.7 — Tombol Simpan disabled jika ada error validasi */}
            <button
              type="submit"
              disabled={hasErrors}
              className="px-8 py-2.5 bg-primary text-text-inverse font-bold text-sm rounded-xl hover:bg-primary-hover active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.2)] hover:shadow-[0_0_30px_rgba(0,255,163,0.35)] cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Shared Field Group ──────────────────────────────────── */
function FieldGroup({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
