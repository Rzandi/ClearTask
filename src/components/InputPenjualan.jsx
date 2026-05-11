/* ═══════════════════════════════════════════════════════════
   InputPenjualan — ClearTask
   Form input transaksi with 2-column layout (desktop)
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { getTodayISO } from '../utils/formatters';

const KATEGORI_OPTIONS = [
  'Elektronik',
  'Makanan',
  'Minuman',
  'Pakaian',
  'Alat Tulis',
  'Kesehatan',
  'Lainnya',
];

const METODE_OPTIONS = ['Tunai', 'QRIS', 'Kartu Debit', 'Transfer'];

const initialForm = {
  tanggal: getTodayISO(),
  kategori: 'Elektronik',
  namaBarang: '',
  qty: '',
  hargaSatuan: '',
  metode: 'Tunai',
  catatan: '',
  kasir: 'Admin',
};

export default function InputPenjualan({ onSubmit }) {
  const [form, setForm] = useState(initialForm);

  const qty = parseInt(form.qty, 10) || 0;
  const harga = parseInt(form.hargaSatuan, 10) || 0;
  const total = qty * harga;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.namaBarang.trim() || qty <= 0 || harga <= 0) return;

    onSubmit({
      ...form,
      qty,
      hargaSatuan: harga,
      total,
    });

    setForm({ ...initialForm, tanggal: getTodayISO() });
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
                  value={form.kategori}
                  onChange={handleChange}
                  className="form-input appearance-none"
                >
                  {KATEGORI_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </FieldGroup>

              {/* Nama Barang */}
              <FieldGroup label="Nama Barang" htmlFor="field-namaBarang">
                <input
                  type="text"
                  id="field-namaBarang"
                  name="namaBarang"
                  value={form.namaBarang}
                  onChange={handleChange}
                  placeholder="Masukkan nama barang"
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">Rp</span>
                  <input
                    type="number"
                    id="field-hargaSatuan"
                    name="hargaSatuan"
                    value={form.hargaSatuan}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="form-input pl-10"
                  />
                </div>
              </FieldGroup>

              {/* Total (Auto) */}
              <FieldGroup label="Total (Auto-calculated)" htmlFor="field-total">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">Rp</span>
                  <input
                    type="text"
                    id="field-total"
                    value={total > 0 ? total.toLocaleString('id-ID') : '0'}
                    readOnly
                    className="form-input pl-10 bg-bg-elevated/50 text-text-secondary cursor-not-allowed"
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
