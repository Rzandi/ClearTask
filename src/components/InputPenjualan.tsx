/* ═══════════════════════════════════════════════════════════
   InputPenjualan — ClearTask (Shopping Cart Version)
   Supports adding items via Catalog or Manual Input.
   Handles Order total, Payment received, and Change calculation.
   v3.5 QOL: Quick Cash, Cash Breakdown, Pending Order,
             Audio/Haptic, Quick Qty Multipliers
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { getTodayISO } from '../utils/formatters';
import { useCategories } from '../hooks/useCategories';
import { useInventory } from '../hooks/useInventory';
import { useSettings } from '../contexts/SettingsContext';
import FieldGroup from './ui/FieldGroup';
import Button from './ui/Button';
import Input from './ui/Input';
import StrukModal from './StrukModal';
import EmptyState from './ui/EmptyState';
import { feedbackItemAdded, feedbackCheckout, playErrorSound } from '../utils/audioFeedback';
import { getCashBreakdown } from '../utils/inlineSyntaxParser';
import type { CashDenomination } from '../utils/inlineSyntaxParser';
import { initMultiTabSync, broadcastTabMessage } from '../utils/resiliencyGuards';

const METODE_OPTIONS = ['Tunai', 'QRIS', 'Kartu Debit', 'Transfer'];

const parseNumeric = (val: any) => {
  if (!val) return 0;
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : Math.floor(num);
};

export interface InputPenjualanProps {
  onSubmit: (data: any) => Promise<any>;
  activeSession?: any;
}

export default memo(function InputPenjualan({
  onSubmit,
  activeSession = null,
}: InputPenjualanProps) {
  const { settings } = useSettings();
  const kasirName = settings?.kasirName || 'Admin';

  const { inventory, updateInventoryItem } = useInventory();
  const { allCategories, subCategoriesFor } = useCategories();

  // Cart State
  const [cart, setCart] = useState<any[]>([]);

  // Pending Orders (QOL 1.2)
  const [pendingOrders, setPendingOrders] = useState<{ id: number; label: string; cart: any[]; metode: string; catatan: string }[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Payment State
  const [metode, setMetode] = useState('Tunai');
  const [uangDiterima, setUangDiterima] = useState('');
  const [catatan, setCatatan] = useState('');
  const [tanggal, setTanggal] = useState(getTodayISO());
  const [showQrisModal, setShowQrisModal] = useState(false);

  // Item 22 & 24: Auto-Draft Cart Persistence & Multi-Tab BroadcastChannel Sync
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('cleartask_draft_cart');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch {}
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem('cleartask_draft_cart', JSON.stringify(cart));
      } else {
        localStorage.removeItem('cleartask_draft_cart');
      }
    } catch {}
  }, [cart]);

  // Listen to multi-tab sync (Item 24)
  useEffect(() => {
    const cleanup = initMultiTabSync((msg) => {
      if (msg.type === 'CART_UPDATED' && Array.isArray(msg.payload)) {
        setCart(msg.payload);
      }
    });
    return cleanup;
  }, []);

  // UI State
  const [activeTab, setActiveTab] = useState('katalog'); // 'katalog' | 'manual'
  const [formError, setFormError] = useState('');
  const [showMobileCart, setShowMobileCart] = useState(false);
  // Manual Form State — kategori diinisialisasi dari allCategories[0] via useEffect
  // untuk memastikan nilai default selalu sinkron dengan daftar kategori yang sebenarnya
  const [form, setForm] = useState({
    kategori: '',
    subKategori: '',
    namaBarang: '',
    qty: '1',
    hargaSatuan: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Autocomplete and Right Pane Stock States
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [rightPaneTab, setRightPaneTab] = useState('cart'); // 'cart' | 'stock'
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [localFeedback, setLocalFeedback] = useState('');

  // Sync form.kategori ke allCategories[0] saat daftar kategori pertama kali tersedia.
  // Ini fix bug: form state awal '' tidak sinkron dengan option pertama di <select>,
  // yang menyebabkan sub-kategori tidak muncul sampai user manually ganti kategori.
  useEffect(() => {
    if (allCategories.length > 0 && form.kategori === '') {
      setForm((prev) => ({ ...prev, kategori: allCategories[0] || 'Makanan' }));
    }
  }, [allCategories]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = useMemo(() => {
    const q = form.namaBarang.trim().toLowerCase();
    if (!q) return [];
    return inventory.filter((item) => item.namaBarang?.toLowerCase().includes(q)).slice(0, 5);
  }, [inventory, form.namaBarang]);

  const handleSelectSuggestion = useCallback((item: any) => {
    setForm({
      kategori: item.kategori || allCategories[0] || 'Makanan',
      subKategori: item.subKategori || '',
      namaBarang: item.namaBarang || '',
      qty: '1',
      hargaSatuan: item.harga?.toString() || '',
    });
    setShowSuggestions(false);
  }, []);

  const matchedInventoryItem = useMemo(() => {
    const name = form.namaBarang.trim().toLowerCase();
    if (!name) return null;
    return inventory.find((item) => (item.namaBarang || '').toLowerCase().trim() === name);
  }, [inventory, form.namaBarang]);

  // Catalog Filter State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSubCategory, setCatalogSubCategory] = useState('all');
  const [catalogSort, setCatalogSort] = useState('az');

  // Modal Struk
  const [showStruk, setShowStruk] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  // ── Plastik bag state (QOL: optional plastic bag charge) ──
  const [plasticBagEnabled, setPlasticBagEnabled] = useState(false);
  const plasticBagPrice = Math.round(Number(settings?.plasticBagPrice) || 500);
  const plasticBagCharge = (settings?.plasticBagEnabled !== false) && plasticBagEnabled
    ? plasticBagPrice : 0;

  const subTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subTotal + plasticBagCharge;
  const received = parseNumeric(uangDiterima);
  const kembalian = received > grandTotal ? received - grandTotal : 0;

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

  // Helper for Wholesale Pricing & HPP calculation
  const resolveItemPricing = useCallback((item: any, qty: number) => {
    const invItem = inventory.find(
      (inv) => inv.namaBarang?.toLowerCase().trim() === item.namaBarang?.toLowerCase().trim()
    ) || item;

    const basePrice = item.normalHargaSatuan || invItem.harga || item.hargaSatuan || 0;
    const wholesaleMin = invItem.wholesaleMinQty || 0;
    const wholesaleP = invItem.wholesalePrice || 0;

    const isWholesale = wholesaleMin > 0 && wholesaleP > 0 && qty >= wholesaleMin;
    const effectivePrice = isWholesale ? wholesaleP : basePrice;
    const hargaModal = invItem.hargaModal ?? item.hargaModal ?? 0;

    return {
      normalHargaSatuan: basePrice,
      hargaSatuan: effectivePrice,
      hargaModal,
      isWholesale,
      total: qty * effectivePrice,
      invItem,
    };
  }, [inventory]);

  // Add to cart (with Wholesale Auto-Apply, Dus Unpack Prompt, audio/haptic feedback)
  const addToCart = useCallback((item: any) => {
    const invItem = inventory.find(
      (inv) => inv.namaBarang?.toLowerCase().trim() === item.namaBarang?.toLowerCase().trim()
    );

    // Check for Dus Unpack Prompt if Pcs stock is empty but Dus stock exists
    if (invItem && (invItem.quantity || 0) < (item.qty || 1) && (invItem.packStock || 0) > 0) {
      const confirmUnpack = window.confirm(
        `⚠️ Stok ${invItem.namaBarang} eceran tinggal ${invItem.quantity || 0} ${invItem.satuan || 'Pcs'}.\n` +
          `Tersedia ${invItem.packStock} ${invItem.packUnit || 'Dus'} di gudang.\n\n` +
          `Unpack 1 ${invItem.packUnit || 'Dus'} (+${invItem.packRatio || 24} Pcs) sekarang?`
      );
      if (confirmUnpack && invItem.id !== undefined && (invItem.packStock || 0) > 0) {
        updateInventoryItem(String(invItem.id), {
          quantity: (invItem.quantity || 0) + (invItem.packRatio || 24),
          packStock: (invItem.packStock || 1) - 1,
        });
      }
    }

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.namaBarang.toLowerCase() === item.namaBarang.toLowerCase()
      );

      const targetQty = existing ? existing.qty + item.qty : item.qty;
      const pricing = resolveItemPricing(item, targetQty);

      if (existing) {
        return prev.map((i) =>
          i.namaBarang.toLowerCase() === item.namaBarang.toLowerCase()
            ? {
                ...i,
                qty: targetQty,
                normalHargaSatuan: pricing.normalHargaSatuan,
                hargaSatuan: pricing.hargaSatuan,
                hargaModal: pricing.hargaModal,
                isWholesale: pricing.isWholesale,
                total: pricing.total,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          ...item,
          id: Date.now() + Math.random(),
          normalHargaSatuan: pricing.normalHargaSatuan,
          hargaSatuan: pricing.hargaSatuan,
          hargaModal: pricing.hargaModal,
          isWholesale: pricing.isWholesale,
          total: pricing.total,
        },
      ];
    });
    setFormError('');
    // QOL 1.4: Audio & Haptic feedback
    if (settings?.soundEnabled !== false) feedbackItemAdded();
  }, [inventory, resolveItemPricing, updateInventoryItem, settings?.soundEnabled]);

  // QOL 1.2: Pending Order — save current cart
  const handleSavePendingOrder = useCallback(() => {
    if (cart.length === 0) return;
    const label = cart.map((i) => i.namaBarang).slice(0, 3).join(', ') + (cart.length > 3 ? '...' : '');
    setPendingOrders((prev) => [
      ...prev,
      { id: Date.now(), label, cart: [...cart], metode, catatan },
    ]);
    setCart([]);
    setUangDiterima('');
    setCatatan('');
    setFormError('');
  }, [cart, metode, catatan]);

  // QOL 1.2: Restore pending order
  const handleRestorePendingOrder = useCallback((orderId: number) => {
    setPendingOrders((prev) => {
      const order = prev.find((o) => o.id === orderId);
      if (order) {
        setCart(order.cart);
        setMetode(order.metode);
        setCatatan(order.catatan);
      }
      return prev.filter((o) => o.id !== orderId);
    });
    setShowPendingModal(false);
  }, []);

  // QOL 1.2: Delete pending order
  const handleDeletePendingOrder = useCallback((orderId: number) => {
    setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  // QOL 1.3: Cash change breakdown
  const cashBreakdown: CashDenomination[] = useMemo(
    () => (kembalian > 0 ? getCashBreakdown(kembalian) : []),
    [kembalian]
  );

  const removeFromCart = (id: any) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateCartQty = (id: any, newQty: number) => {
    if (newQty < 1) return;
    setCart((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const pricing = resolveItemPricing(i, newQty);
          return {
            ...i,
            qty: newQty,
            normalHargaSatuan: pricing.normalHargaSatuan,
            hargaSatuan: pricing.hargaSatuan,
            hargaModal: pricing.hargaModal,
            isWholesale: pricing.isWholesale,
            total: pricing.total,
          };
        }
        return i;
      })
    );
  };

  const handleManualChange = (field: string, value: string) => {
    setForm((prev) => {
      const nextForm = { ...prev, [field]: value };
      if (field === 'kategori') {
        nextForm.subKategori = '';
      }
      return nextForm;
    });
    let err = { ...errors };
    if (field === 'namaBarang' && !value.trim()) err.namaBarang = 'Nama barang wajib diisi';
    else delete err.namaBarang;

    if (field === 'qty' && parseNumeric(value) <= 0) err.qty = 'Qty harus > 0';
    else delete err.qty;

    if (field === 'hargaSatuan' && parseNumeric(value) <= 0) err.hargaSatuan = 'Harga harus > 0';
    else delete err.hargaSatuan;

    setErrors(err);
  };

  const handleManualSubmit = (e: any) => {
    e.preventDefault();
    const q = parseNumeric(form.qty);
    const h = parseNumeric(form.hargaSatuan);

    let err: Record<string, string> = {};
    if (!form.namaBarang.trim()) err.namaBarang = 'Nama barang wajib diisi';
    if (q <= 0) err.qty = 'Qty harus > 0';
    if (h <= 0) err.hargaSatuan = 'Harga harus > 0';

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    const matchedItem = inventory.find(
      (invItem) => invItem.namaBarang?.toLowerCase().trim() === form.namaBarang.trim().toLowerCase()
    );
    const resolvedHargaModal = matchedItem ? matchedItem.hargaModal || 0 : 0;

    addToCart({
      namaBarang: form.namaBarang.trim(),
      kategori: form.kategori,
      subKategori: form.subKategori,
      hargaSatuan: h,
      hargaModal: resolvedHargaModal,
      qty: q,
    });

    setForm({ ...form, namaBarang: '', qty: '1', hargaSatuan: '' });
    setErrors({});
    setFormError('');
  };

  const executeCheckout = async () => {
    // Inject plastik bag as a cart item if enabled
    const finalItems = plasticBagCharge > 0
      ? [...cart, {
          id: 'plastic-bag',
          namaBarang: 'Kantong Plastik',
          kategori: 'Lainnya',
          subKategori: '',
          hargaSatuan: plasticBagPrice,
          hargaModal: 0,
          qty: 1,
          total: plasticBagPrice,
          isWholesale: false,
        }]
      : cart;

    const orderData = {
      tanggal,
      items: finalItems,
      total: grandTotal,
      metode,
      uangDiterima: metode === 'Tunai' ? received : grandTotal,
      kembalian: metode === 'Tunai' ? kembalian : 0,
      catatan,
      kasir: kasirName,
      sessionId: activeSession?.id ?? null,
    };

    // Panggil onSubmit untuk menyimpan ke DB
    const savedTx = await onSubmit(orderData);

    // QOL 1.4: Checkout success sound
    if (settings?.soundEnabled !== false) feedbackCheckout();

    const finalOrder =
      savedTx && typeof savedTx === 'object' && Array.isArray(savedTx.items)
        ? savedTx
        : {
            ...orderData,
            transactionId:
              savedTx && typeof savedTx === 'object' ? savedTx.transactionId : undefined,
          };

    setLastOrder(finalOrder);
    setShowStruk(true);
    setShowMobileCart(false);
    setShowQrisModal(false);

    // Reset cart & clear draft
    setCart([]);
    setPlasticBagEnabled(false);
    try {
      localStorage.removeItem('cleartask_draft_cart');
    } catch {}
    broadcastTabMessage('CART_UPDATED', []);
    setUangDiterima('');
    setCatatan('');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      if (settings?.soundEnabled !== false) playErrorSound();
      return setFormError('Keranjang kosong');
    }
    if (metode === 'Tunai' && received < grandTotal) {
      if (settings?.soundEnabled !== false) playErrorSound();
      return setFormError('Uang diterima kurang dari total');
    }

    if (metode === 'QRIS') {
      setShowQrisModal(true);
      return;
    }

    await executeCheckout();
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
                {/* Search — full width */}
                <div className="relative">
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

                {/* Filter + Sort — row that always fits */}
                <div className="flex items-center gap-2">
                  <select
                    value={catalogCategory}
                    onChange={(e) => {
                      setCatalogCategory(e.target.value);
                      setCatalogSubCategory('all');
                    }}
                    className="flex-1 min-w-0 px-2 sm:px-3 py-2 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none cursor-pointer"
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
                      setCatalogSort(next as string);
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
                {filteredCatalog.map((item) => (
                  <CatalogItemCard
                    key={item.id}
                    id={item.id ?? ''}
                    namaBarang={item.namaBarang}
                    kategori={item.kategori}
                    subKategori={item.subKategori ?? ''}
                    harga={item.harga}
                    hargaModal={item.hargaModal}
                    quantity={item.quantity}
                    onAddToCart={addToCart}
                    onUpdateStock={updateInventoryItem}
                  />
                ))}
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
                <div className="relative">
                  <Input
                    type="text"
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
                    <div className="absolute left-0 right-0 mt-1 bg-bg-surface border border-border-default rounded-xl shadow-xl z-[60] max-h-40 overflow-y-auto divide-y divide-border-subtle">
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={() => handleSelectSuggestion(item)}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-white/[0.04] hover:text-primary transition-colors cursor-pointer"
                        >
                          {item.namaBarang}{' '}
                          <span className="text-text-muted text-[10px]">
                            ({item.kategori} - Rp {item.harga?.toLocaleString('id-ID')})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.namaBarang && (
                  <span className="text-xs text-red-400 mt-1 block">{errors.namaBarang}</span>
                )}
                {matchedInventoryItem ? (
                  <span className="text-xs text-green-400 mt-1 block font-medium">
                    ✓ Terdaftar (Stok: {matchedInventoryItem.quantity || 0}, Jual: Rp{' '}
                    {matchedInventoryItem.harga?.toLocaleString('id-ID')})
                  </span>
                ) : form.namaBarang.trim() ? (
                  <span className="text-xs text-primary mt-1 block font-medium animate-pulse">
                    ✨ Barang Baru Terdeteksi! (Stok: 0, Modal: 0)
                  </span>
                ) : null}
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
                  <FieldGroup label="">
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
            <span className="font-bold">Rp {grandTotal.toLocaleString('id-ID')}</span>
          </Button>
        </div>
      )}

      {/* KANAN: Keranjang & Pembayaran / Cek Stok */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-bg-surface flex flex-col h-full transform transition-all duration-300 ${showMobileCart ? 'translate-x-0 shadow-2xl opacity-100 visible' : 'translate-x-full opacity-0 invisible'} lg:relative lg:translate-x-0 lg:opacity-100 lg:visible lg:w-[420px] lg:h-auto lg:min-h-[500px] lg:glass-card`}
      >
        <div className="flex border-b border-border-default bg-bg-surface/30 shrink-0">
          <button
            type="button"
            className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${rightPaneTab === 'cart' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary'}`}
            onClick={() => setRightPaneTab('cart')}
          >
            Keranjang ({cart.length})
          </button>
          <button
            type="button"
            className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${rightPaneTab === 'stock' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary'}`}
            onClick={() => setRightPaneTab('stock')}
          >
            Cek Stok
          </button>
          <button
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-bg-elevated text-text-secondary cursor-pointer self-center mr-3"
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

        {rightPaneTab === 'stock' ? (
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
              {inventory
                .filter((item) =>
                  (item.namaBarang || '').toLowerCase().includes(stockSearchQuery.toLowerCase())
                )
                .map((item) => (
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
                          setForm({
                            kategori: item.kategori || allCategories[0] || 'Makanan',
                            subKategori: item.subKategori || '',
                            namaBarang: item.namaBarang || '',
                            qty: '1',
                            hargaSatuan: item.harga?.toString() || '',
                          });
                          setActiveTab('manual');
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
                          addToCart({
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
            </div>
          </div>
        ) : (
          <>
            {/* QOL 1.2: Pending Order Badge & Button */}
            <div className="flex items-center gap-2 px-5 pt-3 pb-1 shrink-0">
              <button
                type="button"
                onClick={handleSavePendingOrder}
                disabled={cart.length === 0}
                className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg border border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                ⏸ Tunda Order
              </button>
              {pendingOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPendingModal(true)}
                  className="relative py-2 px-3 text-xs font-semibold rounded-lg border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
                >
                  📋 Tertunda
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow">
                    {pendingOrders.length}
                  </span>
                </button>
              )}
            </div>

            {/* QOL 1.2: Pending Orders Modal */}
            {showPendingModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowPendingModal(false)}>
                <div className="bg-bg-surface border border-border-default rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5 space-y-3 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-sm font-bold text-text-primary">📋 Transaksi Tertunda ({pendingOrders.length})</h3>
                  {pendingOrders.map((order) => (
                    <div key={order.id} className="p-3 bg-bg-elevated rounded-xl border border-border-subtle flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary truncate">{order.label}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{order.cart.length} item • {order.metode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestorePendingOrder(order.id)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-all cursor-pointer"
                      >
                        Pulihkan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePendingOrder(order.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowPendingModal(false)}
                    className="w-full py-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center bg-bg-surface p-3 rounded-xl border border-border-default shadow-sm"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {item.namaBarang}
                      </p>
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
                  {/* QOL 1.6: Quick Quantity Multipliers (+1, -1, +5) */}
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 bg-bg-input px-1 py-1 rounded-lg border border-border-subtle">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, item.qty - 1)}
                        className="w-7 h-7 flex items-center justify-center bg-bg-elevated rounded hover:bg-white/10 cursor-pointer text-text-secondary transition-colors text-xs font-bold"
                      >
                        −1
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, item.qty + 1)}
                        className="w-7 h-7 flex items-center justify-center bg-bg-elevated rounded hover:bg-white/10 cursor-pointer text-text-secondary transition-colors text-xs font-bold"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, item.qty + 5)}
                        className="w-7 h-7 flex items-center justify-center bg-primary/10 rounded hover:bg-primary/20 cursor-pointer text-primary transition-colors text-[10px] font-bold"
                        title="Tambah 5"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-white hover:bg-red-500/80 transition-colors cursor-pointer"
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
              {/* Sub Total row */}
              <div className="flex justify-between items-end pb-2 border-b border-border-subtle">
                <span className="text-sm font-semibold text-text-muted">Sub Total</span>
                <span className="text-base font-bold text-text-primary">
                  Rp {subTotal.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Plastik bag toggle — hanya tampil kalau fitur diaktifkan di Settings */}
              {settings?.plasticBagEnabled !== false && (
                <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-bg-elevated/60 border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🛍️</span>
                    <span className="text-xs font-medium text-text-secondary">
                      Kantong Plastik
                    </span>
                    <span className="text-[10px] text-text-muted">
                      +Rp {plasticBagPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={plasticBagEnabled}
                    onClick={() => setPlasticBagEnabled((v) => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${plasticBagEnabled ? 'bg-primary' : 'bg-white/10'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform ${plasticBagEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between items-end mb-2 pb-3 border-b border-border-subtle">
                <span className="text-sm font-semibold text-text-muted">
                  {plasticBagCharge > 0 ? 'Total (+ Plastik)' : 'Total'}
                </span>
                <span className="text-xl font-black text-primary">
                  Rp {grandTotal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="space-y-3">
                <div className="mb-0">
                  <FieldGroup label="Metode Pembayaran">
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
                </div>

                {metode === 'Tunai' && (
                  <div className="space-y-3">
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

                    {/* Retail Spec: Hero Change Display (40px Bold Text) */}
                    {received > 0 && (
                      <div
                        className={`p-4 rounded-2xl border text-center transition-all ${
                          received >= grandTotal
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                          {received >= grandTotal ? 'Uang Kembalian' : 'Uang Kurang'}
                        </p>
                        <p className="text-3xl sm:text-[40px] font-black leading-tight mt-1">
                          Rp {Math.abs(kembalian).toLocaleString('id-ID')}
                        </p>
                      </div>
                    )}

                    {/* QOL 1.1: Quick Cash Nominal Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setUangDiterima(grandTotal.toString())}
                        className="flex-1 min-w-[60px] py-2 text-[11px] font-bold rounded-lg border border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-all cursor-pointer"
                      >
                        Uang Pas
                      </button>
                      {[10000, 20000, 50000, 100000].map((nominal) => (
                        <button
                          key={nominal}
                          type="button"
                          onClick={() => setUangDiterima(nominal.toString())}
                          className="flex-1 min-w-[50px] py-2 text-[11px] font-semibold rounded-lg border border-border-default text-text-secondary bg-bg-elevated hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition-all cursor-pointer"
                        >
                          {nominal >= 1000 ? `${nominal / 1000}k` : nominal}
                        </button>
                      ))}
                    </div>

                    {/* QOL 1.3: Cash Change Breakdown */}
                    {cashBreakdown.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2.5 bg-green-500/5 border border-green-500/15 rounded-xl">
                        <span className="w-full text-[10px] font-medium text-green-400/70 mb-0.5">💵 Rincian Kembalian:</span>
                        {cashBreakdown.map((d) => (
                          <span
                            key={d.value}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-[11px] font-semibold rounded-md border border-green-500/20"
                          >
                            {d.count}× {d.label}
                          </span>
                        ))}
                      </div>
                    )}
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
          </>
        )}
      </div>

      {showStruk && <StrukModal order={lastOrder} onClose={() => setShowStruk(false)} />}

      {/* Pop-Up Modal QRIS */}
      {showQrisModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-sm p-6 text-center space-y-4 animate-slide-up bg-bg-surface border border-primary/30 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <span className="text-sm font-bold text-text-primary">📱 Pembayaran QRIS</span>
              <button
                onClick={() => setShowQrisModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs text-text-muted mb-1">{settings?.tokoName || 'ClearTask Store'}</p>
              <p className="text-2xl font-extrabold text-primary">
                Rp {grandTotal.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-200 shadow-inner my-2">
              {settings?.qrisImageUrl ? (
                <img
                  src={settings.qrisImageUrl}
                  alt="QRIS Toko"
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <div className="w-44 h-44 bg-gray-100 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-2">
                  <svg className="w-16 h-16 text-gray-400 mb-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v3h-2v-3zm3 3h3v5h-3v-5zm-3 2h2v3h-2v-3zm-3-2h2v5h-2v-5z" />
                  </svg>
                  <span className="text-[10px] text-gray-500 font-bold text-center">
                    QRIS STATIS TOKO
                  </span>
                  <span className="text-[9px] text-gray-400 text-center">
                    Scan via BCA / GoPay / OVO / Dana / LinkAja
                  </span>
                </div>
              )}
              {settings?.qrisNsm && (
                <p className="text-[10px] font-mono text-gray-600 mt-2">NMID: {settings.qrisNsm}</p>
              )}
            </div>

            <p className="text-xs text-text-muted">
              Minta pelanggan melakukan scan QR di atas, lalu klik Konfirmasi setelah dana masuk.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setShowQrisModal(false)}
                variant="outline"
                className="flex-1 text-xs py-2.5"
              >
                Batal
              </Button>
              <Button
                onClick={executeCheckout}
                variant="primary"
                className="flex-1 text-xs py-2.5 shadow-glow"
              >
                ✓ Konfirmasi Lunas
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

interface CatalogItemProps {
  id: string;
  namaBarang: string;
  kategori: string;
  subKategori?: string;
  harga: number;
  hargaModal?: number | undefined;
  quantity: number;
  onAddToCart: (item: any) => void;
  onUpdateStock: (id: string, data: any) => void;
}

const CatalogItemCard = memo(function CatalogItemCard({
  id,
  namaBarang,
  kategori,
  subKategori,
  harga,
  hargaModal,
  quantity,
  onAddToCart,
  onUpdateStock,
}: CatalogItemProps) {
  const stock = quantity || 0;
  const isOutOfStock = stock <= 0;

  return (
    <div
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
          onAddToCart({
            namaBarang,
            kategori,
            subKategori: subKategori || '',
            hargaSatuan: harga,
            hargaModal: hargaModal || 0,
            qty: 1,
          })
        }
        className={`text-left flex flex-col gap-1 w-full focus:outline-none transition-transform ${
          isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.96]'
        }`}
      >
        <span className="text-sm font-medium text-text-primary line-clamp-2">{namaBarang}</span>
        <span className="text-xs text-text-muted">{kategori}</span>
        <span className="text-sm font-semibold text-primary mt-2">
          Rp {harga?.toLocaleString('id-ID') || 0}
        </span>
      </button>

      {/* Stock Adjuster */}
      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="text-[10px] sm:text-[11px] font-medium text-text-muted">Stok:</span>
        <div className="flex items-center gap-1 bg-bg-input rounded-md px-1 py-1 border border-border-subtle">
          <button
            type="button"
            onClick={() => onUpdateStock(id, { quantity: Math.max(0, stock - 1) })}
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
            onClick={() => onUpdateStock(id, { quantity: stock + 1 })}
            className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-text-secondary hover:bg-bg-elevated hover:text-primary rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
});
