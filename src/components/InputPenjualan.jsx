/* ═══════════════════════════════════════════════════════════
   InputPenjualan — ClearTask (Shopping Cart Version)
   Supports adding items via Catalog or Manual Input.
   Handles Order total, Payment received, and Change calculation.
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo } from 'react';
import { getTodayISO } from '../utils/formatters';
import { useCategories } from '../hooks/useCategories';
import { useInventory } from '../hooks/useInventory';
import { useSettings } from '../contexts/SettingsContext';
import FieldGroup from './ui/FieldGroup';
import Button from './ui/Button';
import Input from './ui/Input';
import StrukModal from './StrukModal';
import EmptyState from './ui/EmptyState';

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

  const { inventory, updateInventoryItem } = useInventory();
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
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Catalog Filter State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSubCategory, setCatalogSubCategory] = useState('all');
  const [catalogSort, setCatalogSort] = useState('az');

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
  const [errors, setErrors] = useState({});

  const subTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const received = parseNumeric(uangDiterima);
  const kembalian = received > subTotal ? received - subTotal : 0;

  // Filter & Sort Catalog
  const filteredCatalog = useMemo(() => {
    let items = [...inventory];

    if (catalogCategory !== 'all') {
      items = items.filter((i) => i.kategori === catalogCategory);
      if (catalogSubCategory !== 'all') {
        items = items.filter((i) => i.subKategori === catalogSubCategory);
      }
    }

    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      items = items.filter(
        (i) => i.namaBarang?.toLowerCase().includes(q) || i.kategori?.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      if (catalogSort === 'az') return (a.namaBarang || '').localeCompare(b.namaBarang || '');
      if (catalogSort === 'za') return (b.namaBarang || '').localeCompare(a.namaBarang || '');
      if (catalogSort === 'price_asc') return (a.harga || 0) - (b.harga || 0);
      if (catalogSort === 'price_desc') return (b.harga || 0) - (a.harga || 0);
      return 0;
    });

    return items;
  }, [inventory, catalogSearch, catalogCategory, catalogSubCategory, catalogSort]);

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
    setFormError('');
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

  const handleManualChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    let err = { ...errors };
    if (field === 'namaBarang' && !value.trim()) err.namaBarang = 'Nama barang wajib diisi';
    else delete err.namaBarang;

    if (field === 'qty' && parseNumeric(value) <= 0) err.qty = 'Qty harus > 0';
    else delete err.qty;

    if (field === 'hargaSatuan' && parseNumeric(value) <= 0) err.hargaSatuan = 'Harga harus > 0';
    else delete err.hargaSatuan;

    setErrors(err);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const q = parseNumeric(form.qty);
    const h = parseNumeric(form.hargaSatuan);

    let err = {};
    if (!form.namaBarang.trim()) err.namaBarang = 'Nama barang wajib diisi';
    if (q <= 0) err.qty = 'Qty harus > 0';
    if (h <= 0) err.hargaSatuan = 'Harga harus > 0';

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    addToCart({
      namaBarang: form.namaBarang.trim(),
      kategori: form.kategori,
      subKategori: form.subKategori,
      hargaSatuan: h,
      qty: q,
    });

    setForm({ ...form, namaBarang: '', qty: '1', hargaSatuan: '' });
    setErrors({});
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
    setShowMobileCart(false);

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

        <div className="flex-1 overflow-y-auto p-5 pb-24 lg:pb-5">
          {activeTab === 'katalog' ? (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
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

                  <select
                    value={catalogCategory}
                    onChange={(e) => {
                      setCatalogCategory(e.target.value);
                      setCatalogSubCategory('all');
                    }}
                    className="w-[110px] sm:w-[140px] shrink-0 px-2 sm:px-3 py-2 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none cursor-pointer"
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
                      setCatalogSort(next);
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
                {filteredCatalog.map((item) => {
                  const stock = item.quantity || 0;
                  const isOutOfStock = stock <= 0;
                  return (
                    <div
                      key={item.id}
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
                          addToCart({
                            namaBarang: item.namaBarang,
                            kategori: item.kategori,
                            subKategori: item.subKategori || '',
                            hargaSatuan: item.harga,
                            qty: 1,
                          })
                        }
                        className={`text-left flex flex-col gap-1 w-full focus:outline-none transition-transform ${
                          isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.96]'
                        }`}
                      >
                        <span className="text-sm font-medium text-text-primary line-clamp-2">
                          {item.namaBarang}
                        </span>
                        <span className="text-xs text-text-muted">{item.kategori}</span>
                        <span className="text-sm font-semibold text-primary mt-2">
                          Rp {item.harga.toLocaleString('id-ID')}
                        </span>
                      </button>

                      {/* Stock Adjuster */}
                      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
                        <span className="text-[10px] sm:text-[11px] font-medium text-text-muted">
                          Stok:
                        </span>
                        <div className="flex items-center gap-1 bg-bg-input rounded-md px-1 py-1 border border-border-subtle">
                          <button
                            type="button"
                            onClick={() =>
                              updateInventoryItem(item.id, { quantity: Math.max(0, stock - 1) })
                            }
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
                            onClick={() => updateInventoryItem(item.id, { quantity: stock + 1 })}
                            className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-text-secondary hover:bg-bg-elevated hover:text-primary rounded transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <FieldGroup label="Tanggal Transaksi">
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Nama Barang">
                <Input
                  type="text"
                  value={form.namaBarang}
                  onChange={(e) => handleManualChange('namaBarang', e.target.value)}
                  placeholder="Nama Item..."
                  className={errors.namaBarang ? 'border-red-500' : ''}
                />
                {errors.namaBarang && (
                  <span className="text-xs text-red-400 mt-1 block">{errors.namaBarang}</span>
                )}
              </FieldGroup>
              <div className="flex gap-4">
                <div className="flex-1">
                  <FieldGroup label="Harga Satuan">
                    <Input
                      type="number"
                      value={form.hargaSatuan}
                      onChange={(e) => handleManualChange('hargaSatuan', e.target.value)}
                      placeholder="0"
                      className={errors.hargaSatuan ? 'border-red-500' : ''}
                    />
                    {errors.hargaSatuan && (
                      <span className="text-xs text-red-400 mt-1 block">{errors.hargaSatuan}</span>
                    )}
                  </FieldGroup>
                </div>
                <div className="w-24">
                  <FieldGroup label="Qty">
                    <Input
                      type="number"
                      value={form.qty}
                      onChange={(e) => handleManualChange('qty', e.target.value)}
                      className={errors.qty ? 'border-red-500' : ''}
                    />
                    {errors.qty && (
                      <span className="text-xs text-red-400 mt-1 block">{errors.qty}</span>
                    )}
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
                  <FieldGroup>
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
              <Button type="submit" variant="outline" className="w-full py-3 mt-4">
                Tambah ke Keranjang
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Mobile Cart Backdrop */}
      {showMobileCart && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setShowMobileCart(false)}
        />
      )}

      {/* Floating Mobile Cart Button */}
      {!showMobileCart && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-sm animate-slide-up">
          <Button
            variant="primary"
            className="w-full rounded-full px-6 py-4 shadow-glow flex items-center justify-between"
            onClick={() => setShowMobileCart(true)}
          >
            <span className="flex items-center gap-2 font-semibold">
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
              {cart.length} Item
            </span>
            <span className="font-bold">Rp {subTotal.toLocaleString('id-ID')}</span>
          </Button>
        </div>
      )}

      {/* KANAN: Keranjang & Pembayaran */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-bg-surface flex flex-col h-full transform transition-all duration-300 ${showMobileCart ? 'translate-x-0 shadow-2xl opacity-100 visible' : 'translate-x-full opacity-0 invisible'} lg:relative lg:translate-x-0 lg:opacity-100 lg:visible lg:w-[420px] lg:h-auto lg:min-h-[500px] lg:glass-card`}
      >
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold px-2 py-1 bg-primary/10 text-primary rounded-lg">
              {cart.length} Item
            </span>
            <button
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-bg-elevated text-text-secondary cursor-pointer"
              onClick={() => setShowMobileCart(false)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
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
            <div className="h-full">
              <EmptyState
                title="Keranjang Kosong"
                description="Pilih barang dari Katalog untuk ditambahkan ke keranjang."
              />
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
