/* ═══════════════════════════════════════════════════════════
   InputPenjualan — ClearTask
   Form input transaksi with 2-column layout (desktop)
   Supports dynamic categories and sub-categories via useCategories
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { getTodayISO } from '../utils/formatters';
import { useCategories } from '../hooks/useCategories';
import { useSettings } from '../contexts/SettingsContext';
import FieldGroup from './ui/FieldGroup';

const METODE_OPTIONS = ['Tunai', 'QRIS', 'Kartu Debit', 'Transfer'];

export default function InputPenjualan({ onSubmit, activeSessionId = null }) {
  const { settings } = useSettings();
  const kasirName = settings?.kasirName || 'Admin';

  const [form, setForm] = useState({
    tanggal: getTodayISO(),
    kategori: 'Elektronik',
    subKategori: '',
    namaBarang: '',
    qty: '',
    hargaSatuan: '',
    metode: 'Tunai',
    catatan: '',
    kasir: kasirName,
  });

  // Sync kasir when kasirName changes (e.g. user updates settings)
  useEffect(() => {
    setForm((prev) => ({ ...prev, kasir: kasirName }));
  }, [kasirName]);

  // ── Inline input state ──
  const [showKategoriInput, setShowKategoriInput] = useState(false);
  const [showSubKategoriInput, setShowSubKategoriInput] = useState(false);
  const [inlineKategoriValue, setInlineKategoriValue] = useState('');
  const [inlineSubKategoriValue, setInlineSubKategoriValue] = useState('');
  const [inlineKategoriError, setInlineKategoriError] = useState('');
  const [inlineSubKategoriError, setInlineSubKategoriError] = useState('');

  const { allCategories, subCategoriesFor, addCategory, addSubCategory } = useCategories();

  const qty = parseInt(form.qty, 10) || 0;
  const harga = parseInt(form.hargaSatuan, 10) || 0;
  const total = qty * harga;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Kategori dropdown handler ──
  const handleKategoriChange = (e) => {
    const value = e.target.value;
    if (value === '__ADD_NEW__') {
      setShowKategoriInput(true);
      setInlineKategoriValue('');
      setInlineKategoriError('');
      // Preserve current form.kategori — do not update it
    } else {
      setForm((prev) => ({ ...prev, kategori: value, subKategori: '' }));
      setShowKategoriInput(false);
      setInlineKategoriError('');
    }
  };

  const handleKategoriConfirm = () => {
    const result = addCategory(inlineKategoriValue);
    if (result.success) {
      setForm((prev) => ({ ...prev, kategori: inlineKategoriValue.trim(), subKategori: '' }));
      setShowKategoriInput(false);
      setInlineKategoriValue('');
      setInlineKategoriError('');
    } else {
      setInlineKategoriError(result.error || 'Gagal menambah kategori');
    }
  };

  const handleKategoriCancel = () => {
    setShowKategoriInput(false);
    setInlineKategoriValue('');
    setInlineKategoriError('');
  };

  // ── Sub-kategori dropdown handler ──
  const handleSubKategoriChange = (e) => {
    const value = e.target.value;
    if (value === '__ADD_NEW__') {
      setShowSubKategoriInput(true);
      setInlineSubKategoriValue('');
      setInlineSubKategoriError('');
    } else {
      setForm((prev) => ({ ...prev, subKategori: value }));
      setShowSubKategoriInput(false);
      setInlineSubKategoriError('');
    }
  };

  const handleSubKategoriConfirm = () => {
    const result = addSubCategory(form.kategori, inlineSubKategoriValue);
    if (result.success) {
      setForm((prev) => ({ ...prev, subKategori: inlineSubKategoriValue.trim() }));
      setShowSubKategoriInput(false);
      setInlineSubKategoriValue('');
      setInlineSubKategoriError('');
    } else {
      setInlineSubKategoriError(result.error || 'Gagal menambah sub-kategori');
    }
  };

  const handleSubKategoriCancel = () => {
    setShowSubKategoriInput(false);
    setInlineSubKategoriValue('');
    setInlineSubKategoriError('');
  };

  // ── Submit ──
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.namaBarang.trim() || qty <= 0 || harga <= 0) return;

    onSubmit({
      ...form,
      qty,
      hargaSatuan: harga,
      total,
      subKategori: form.subKategori,
      sessionId: activeSessionId ?? null,
    });

    setForm({
      tanggal: getTodayISO(),
      kategori: 'Elektronik',
      subKategori: '',
      namaBarang: '',
      qty: '',
      hargaSatuan: '',
      metode: 'Tunai',
      catatan: '',
      kasir: kasirName,
    });
    setShowKategoriInput(false);
    setShowSubKategoriInput(false);
    setInlineKategoriValue('');
    setInlineSubKategoriValue('');
    setInlineKategoriError('');
    setInlineSubKategoriError('');
  };

  const isValid = form.namaBarang.trim() && qty > 0 && harga > 0;

  return (
    <div className="animate-slide-up">
      <div className="glass-card p-6 lg:p-8">
        <h2 className="text-lg font-bold text-text-primary mb-6">Form Input Penjualan</h2>

        <form onSubmit={handleSubmit} id="form-input-penjualan">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
            {/* ── Left Column ── */}
            <div className="space-y-5">
              {/* Tanggal */}
              <FieldGroup label="Tanggal" htmlFor="field-tanggal">
                <input
                  type="date"
                  id="field-tanggal"
                  name="tanggal"
                  value={form.tanggal}
                  onChange={handleChange}
                  className="form-input"
                />
              </FieldGroup>

              {/* Kategori Barang */}
              <FieldGroup label="Kategori Barang" htmlFor="field-kategori">
                <select
                  id="field-kategori"
                  name="kategori"
                  value={showKategoriInput ? '__ADD_NEW__' : form.kategori}
                  onChange={handleKategoriChange}
                  className="form-input appearance-none"
                >
                  {allCategories.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="__ADD_NEW__">+ Tambah Kategori Baru</option>
                </select>
                {showKategoriInput && (
                  <InlineInput
                    value={inlineKategoriValue}
                    onChange={setInlineKategoriValue}
                    onConfirm={handleKategoriConfirm}
                    onCancel={handleKategoriCancel}
                    placeholder="Nama kategori baru..."
                    maxLength={50}
                    error={inlineKategoriError}
                  />
                )}
              </FieldGroup>

              {/* Sub-Kategori — tampil hanya jika kategori dipilih */}
              {form.kategori && (
                <FieldGroup label="Sub-Kategori" htmlFor="field-subKategori">
                  <select
                    id="field-subKategori"
                    name="subKategori"
                    value={showSubKategoriInput ? '__ADD_NEW__' : form.subKategori}
                    onChange={handleSubKategoriChange}
                    className="form-input appearance-none"
                  >
                    <option value="">— Pilih Sub-Kategori (Opsional) —</option>
                    {subCategoriesFor(form.kategori).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    <option value="__ADD_NEW__">+ Tambah Sub-Kategori Baru</option>
                  </select>
                  {showSubKategoriInput && (
                    <InlineInput
                      value={inlineSubKategoriValue}
                      onChange={setInlineSubKategoriValue}
                      onConfirm={handleSubKategoriConfirm}
                      onCancel={handleSubKategoriCancel}
                      placeholder="Nama sub-kategori baru..."
                      maxLength={50}
                      error={inlineSubKategoriError}
                    />
                  )}
                </FieldGroup>
              )}

              {/* Nama Barang */}
              <FieldGroup label="Nama Barang" htmlFor="field-namaBarang">
                <input
                  type="text"
                  id="field-namaBarang"
                  name="namaBarang"
                  value={form.namaBarang}
                  onChange={handleChange}
                  placeholder="Contoh: Kopi Susu Aren"
                  maxLength={100}
                  className="form-input"
                />
              </FieldGroup>

              {/* Qty */}
              <FieldGroup label="Qty" htmlFor="field-qty">
                <input
                  type="number"
                  id="field-qty"
                  name="qty"
                  value={form.qty}
                  onChange={handleChange}
                  placeholder="0"
                  min="1"
                  className="form-input"
                />
              </FieldGroup>
            </div>

            {/* ── Right Column ── */}
            <div className="space-y-5">
              {/* Harga Satuan */}
              <FieldGroup label="Harga Satuan" htmlFor="field-hargaSatuan">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">Rp</span>
                  <input
                    type="number"
                    id="field-hargaSatuan"
                    name="hargaSatuan"
                    value={form.hargaSatuan}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="form-input form-input-prefixed"
                  />
                </div>
              </FieldGroup>

              {/* Total (Auto) */}
              <FieldGroup label="Total (Auto-calculated)" htmlFor="field-total">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">Rp</span>
                  <input
                    type="text"
                    id="field-total"
                    value={total > 0 ? total.toLocaleString('id-ID') : '0'}
                    readOnly
                    className="form-input form-input-prefixed bg-bg-elevated/50 text-text-secondary cursor-not-allowed"
                  />
                </div>
              </FieldGroup>

              {/* Metode Pembayaran */}
              <FieldGroup label="Metode Pembayaran" htmlFor="field-metode">
                <select
                  id="field-metode"
                  name="metode"
                  value={form.metode}
                  onChange={handleChange}
                  className="form-input appearance-none"
                >
                  {METODE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </FieldGroup>

              {/* Catatan Tambahan */}
              <FieldGroup label="Catatan Tambahan" htmlFor="field-catatan">
                <textarea
                  id="field-catatan"
                  name="catatan"
                  value={form.catatan}
                  onChange={handleChange}
                  placeholder="Opsional"
                  rows={3}
                  maxLength={200}
                  className="form-input resize-none"
                />
              </FieldGroup>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-center lg:justify-end">
            <button
              type="submit"
              id="btn-simpan"
              disabled={!isValid}
              className="px-10 py-3 bg-primary text-text-inverse font-bold text-sm rounded-xl hover:bg-primary-hover active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.2)] hover:shadow-[0_0_30px_rgba(0,255,163,0.35)] cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── InlineInput ─────────────────────────────────────────── */
function InlineInput({ value, onChange, onConfirm, onCancel, placeholder, error, maxLength }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="mt-2">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className="form-input flex-1 text-sm"
          autoFocus
        />
        <button
          type="button"
          onClick={onConfirm}
          className="px-3 py-2 bg-primary text-text-inverse text-sm rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
          aria-label="Konfirmasi"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 bg-bg-elevated text-text-secondary text-sm rounded-lg hover:bg-bg-card transition-colors cursor-pointer"
          aria-label="Batal"
        >
          ✕
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
