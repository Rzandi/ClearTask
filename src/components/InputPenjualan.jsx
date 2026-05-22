/* ═══════════════════════════════════════════════════════════
   InputPenjualan — ClearTask (Shopping Cart Version)
   Supports adding items via Catalog or Manual Input.
   Handles Order total, Payment received, and Change calculation.
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { getTodayISO } from '../utils/formatters';
import { useCategories } from '../hooks/useCategories';
import { useInventory } from '../hooks/useInventory';
import { useSettings } from '../contexts/SettingsContext';
import FieldGroup from './ui/FieldGroup';
import Button from './ui/Button';
import Input from './ui/Input';
import StrukModal from './StrukModal';

const METODE_OPTIONS = ['Tunai', 'QRIS', 'Kartu Debit', 'Transfer'];
const DEFAULT_KATEGORI = 'Elektronik';

const parseNumeric = (val) => {
  if (!val) return 0;
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : Math.floor(num);
};

export default function InputPenjualan({ onSubmit, activeSession = null }) {
  const { settings } = useSettings();
  const kasirName = settings?.kasirName || 'Admin';

  const { inventory } = useInventory();
  const { allCategories, subCategoriesFor } = useCategories();

  // Cart State
  const [cart, setCart] = useState([]);

  // Payment State
  const [metode, setMetode] = useState('Tunai');
  const [uangDiterima, setUangDiterima] = useState('');
  const [catatan, setCatatan] = useState('');
  const [tanggal, setTanggal] = useState(getTodayISO());

  // UI State
  const [activeTab, setActiveTab] = useState('katalog'); // 'katalog' | 'manual'
  const [formError, setFormError] = useState('');

  // Modal Struk
  const [showStruk, setShowStruk] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // Manual Form State
  const [form, setForm] = useState({
    kategori: DEFAULT_KATEGORI,
    subKategori: '',
    namaBarang: '',
    qty: '1',
    hargaSatuan: '',
  });

  const subTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const received = parseNumeric(uangDiterima);
  const kembalian = received > subTotal ? received - subTotal : 0;

  // Add to cart
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.namaBarang.toLowerCase() === item.namaBarang.toLowerCase()
      );
      if (existing) {
        return prev.map((i) =>
          i.namaBarang.toLowerCase() === item.namaBarang.toLowerCase()
            ? { ...i, qty: i.qty + item.qty, total: (i.qty + item.qty) * i.hargaSatuan }
            : i
        );
      }
      return [
        ...prev,
        { ...item, id: Date.now() + Math.random(), total: item.qty * item.hargaSatuan },
      ];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateCartQty = (id, newQty) => {
    if (newQty < 1) return;
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: newQty, total: newQty * i.hargaSatuan } : i))
    );
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const q = parseNumeric(form.qty);
    const h = parseNumeric(form.hargaSatuan);
    if (!form.namaBarang.trim()) return setFormError('Nama barang wajib diisi');
    if (q <= 0) return setFormError('Qty harus > 0');
    if (h <= 0) return setFormError('Harga harus > 0');

    addToCart({
      namaBarang: form.namaBarang.trim(),
      kategori: form.kategori,
      subKategori: form.subKategori,
      hargaSatuan: h,
      qty: q,
    });

    setForm({ ...form, namaBarang: '', qty: '1', hargaSatuan: '' });
    setFormError('');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return setFormError('Keranjang kosong');
    if (metode === 'Tunai' && received < subTotal) {
      return setFormError('Uang diterima kurang dari total');
    }

    const orderData = {
      tanggal,
      items: cart,
      total: subTotal,
      metode,
      uangDiterima: metode === 'Tunai' ? received : subTotal,
      kembalian: metode === 'Tunai' ? kembalian : 0,
      catatan,
      kasir: kasirName,
      sessionId: activeSession?.id ?? null,
    };

    // Panggil onSubmit untuk menyimpan ke DB
    await onSubmit(orderData);

    setLastOrder(orderData);
    setShowStruk(true);

    // Reset
    setCart([]);
    setUangDiterima('');
    setCatatan('');
  };

  return (
    <div className="animate-slide-up flex flex-col lg:flex-row gap-6 h-auto">
      {/* KIRI: Katalog / Input Manual */}
      <div className="flex-1 glass-card flex flex-col min-h-[500px]">
        <div className="flex border-b border-border-default">
          <button
            type="button"
            className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'katalog' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary'}`}
            onClick={() => setActiveTab('katalog')}
          >
            Katalog Barang
          </button>
          <button
            type="button"
            className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'manual' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary'}`}
            onClick={() => setActiveTab('manual')}
          >
            Input Manual
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'katalog' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {inventory.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    addToCart({
                      namaBarang: item.namaBarang,
                      kategori: item.kategori,
                      subKategori: item.subKategori || '',
                      hargaSatuan: item.harga,
                      qty: 1,
                    })
                  }
                  className="p-4 bg-bg-surface border border-border-default rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left flex flex-col gap-1 cursor-pointer"
                >
                  <span className="text-sm font-medium text-text-primary line-clamp-2">
                    {item.namaBarang}
                  </span>
                  <span className="text-xs text-text-muted">{item.kategori}</span>
                  <span className="text-sm font-semibold text-primary mt-2">
                    Rp {item.harga.toLocaleString('id-ID')}
                  </span>
                </button>
              ))}
              {inventory.length === 0 && (
                <div className="col-span-full py-10 text-center text-text-muted text-sm flex flex-col items-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="mb-3"
                  >
                    <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
                    <path d="M18 2l4 4-4 4" />
                    <path d="M22 6h-8" />
                  </svg>
                  Belum ada barang di Master Inventaris.
                  <br />
                  Tambahkan di menu Master Barang.
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <FieldGroup label="Tanggal Transaksi">
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Nama Barang">
                <Input
                  type="text"
                  value={form.namaBarang}
                  onChange={(e) => setForm({ ...form, namaBarang: e.target.value })}
                  placeholder="Nama Item..."
                />
              </FieldGroup>
              <div className="flex gap-4">
                <div className="flex-1">
                  <FieldGroup label="Harga Satuan">
                    <Input
                      type="number"
                      value={form.hargaSatuan}
                      onChange={(e) => setForm({ ...form, hargaSatuan: e.target.value })}
                      placeholder="0"
                    />
                  </FieldGroup>
                </div>
                <div className="w-24">
                  <FieldGroup label="Qty">
                    <Input
                      type="number"
                      value={form.qty}
                      onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    />
                  </FieldGroup>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <FieldGroup>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Kategori
                    </label>
                    <select
                      aria-label="Kategori"
                      value={form.kategori}
                      onChange={(e) => setForm({ ...form, kategori: e.target.value })}
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
                  <FieldGroup>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Sub-Kategori
                    </label>
                    <select
                      aria-label="Sub-Kategori"
                      value={form.subKategori}
                      onChange={(e) => setForm({ ...form, subKategori: e.target.value })}
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
              <Button type="submit" variant="secondary" className="w-full py-3 mt-4">
                Tambah ke Keranjang
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* KANAN: Keranjang & Pembayaran */}
      <div className="w-full lg:w-[420px] glass-card flex flex-col min-h-[500px]">
        <div className="p-5 border-b border-border-default flex justify-between items-center bg-bg-surface/30">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Keranjang
          </h2>
          <span className="text-sm font-semibold px-2 py-1 bg-primary/10 text-primary rounded-lg">
            {cart.length} Item
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center bg-bg-surface p-3 rounded-xl border border-border-default shadow-sm"
            >
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm font-medium text-text-primary truncate">{item.namaBarang}</p>
                <p className="text-xs text-text-muted mt-1">
                  Rp {item.hargaSatuan.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-bg-input px-1 py-1 rounded-lg border border-border-subtle">
                <button
                  onClick={() => updateCartQty(item.id, item.qty - 1)}
                  className="w-7 h-7 flex items-center justify-center bg-bg-elevated rounded hover:bg-white/10 cursor-pointer text-text-secondary transition-colors"
                >
                  -
                </button>
                <span className="text-sm font-semibold w-5 text-center">{item.qty}</span>
                <button
                  onClick={() => updateCartQty(item.id, item.qty + 1)}
                  className="w-7 h-7 flex items-center justify-center bg-bg-elevated rounded hover:bg-white/10 cursor-pointer text-text-secondary transition-colors"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="ml-3 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-white hover:bg-red-500/80 transition-colors cursor-pointer"
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
            <div className="h-full flex flex-col items-center justify-center text-text-muted">
              <p className="text-sm">Pilih barang dari Katalog.</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border-default bg-bg-surface/50 space-y-4 rounded-b-2xl">
          <div className="flex justify-between items-end mb-2 pb-3 border-b border-border-subtle">
            <span className="text-sm font-semibold text-text-muted">Sub Total</span>
            <span className="text-xl font-black text-primary">
              Rp {subTotal.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="space-y-3">
            <FieldGroup label="Metode Pembayaran" className="mb-0">
              <select
                aria-label="Metode Pembayaran"
                value={metode}
                onChange={(e) => setMetode(e.target.value)}
                className="form-input w-full text-sm"
              >
                {METODE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </FieldGroup>

            {metode === 'Tunai' && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <FieldGroup label="Uang Diterima">
                    <Input
                      type="number"
                      value={uangDiterima}
                      onChange={(e) => setUangDiterima(e.target.value)}
                      placeholder="0"
                    />
                  </FieldGroup>
                </div>
                <div className="flex-1">
                  <FieldGroup label="Kembalian">
                    <div
                      className={`p-[11px] rounded-xl text-sm font-semibold border flex items-center ${kembalian > 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-bg-elevated border-border-default text-text-secondary'}`}
                    >
                      Rp {kembalian.toLocaleString('id-ID')}
                    </div>
                  </FieldGroup>
                </div>
              </div>
            )}

            <FieldGroup label="Catatan (Opsional)">
              <Input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Misal: Bawa pulang"
              />
            </FieldGroup>
          </div>

          {formError && (
            <p className="text-xs text-red-400 font-medium text-center bg-red-400/10 py-2 rounded-lg">
              {formError}
            </p>
          )}

          <Button
            onClick={handleCheckout}
            variant="primary"
            className="w-full py-4 text-base shadow-glow mt-2"
            disabled={cart.length === 0}
          >
            Bayar & Cetak Struk
          </Button>
        </div>
      </div>

      {showStruk && <StrukModal order={lastOrder} onClose={() => setShowStruk(false)} />}
    </div>
  );
}
