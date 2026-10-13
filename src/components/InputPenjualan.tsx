/* ═══════════════════════════════════════════════════════════
   InputPenjualan — ClearTask (W3-12 Refactored)
   Koordinator tipis: semua rendering didelegasikan ke komponen
   di pos/. File ini hanya memegang state, business logic, dan
   event handlers — tidak ada JSX UI besar di sini.
   W4-04: Per-item & per-transaction discount support
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { getTodayISO } from '../utils/formatters';
import { useCategories } from '../hooks/useCategories';
import { useInventory } from '../hooks/useInventory';
import { useSettings } from '../contexts/SettingsContext';
import Button from './ui/Button';
import StrukModal from './StrukModal';
import { feedbackItemAdded, feedbackCheckout, playErrorSound } from '../utils/audioFeedback';
import { getCashBreakdown } from '../utils/inlineSyntaxParser';
import type { CashDenomination } from '../utils/inlineSyntaxParser';
import { initMultiTabSync, broadcastTabMessage } from '../utils/resiliencyGuards';
import { useBackHandler } from '../hooks/useBackHandler';
import { parseIDNumber } from '../utils/parseIDNumber';
import { transactionService } from '../services/transactionService';
import { createCreditLedger, getCustomerById } from '../services/customerService';
import { auditService } from '../services/auditService';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';

// pos/ sub-components (W3-12)
import CartItemList from './pos/CartItemList';
import CatalogBrowser from './pos/CatalogBrowser';
import CheckoutSection from './pos/CheckoutSection';
import ManualItemForm from './pos/ManualItemForm';
import StockCheckPanel from './pos/StockCheckPanel';

const parseNumeric = (val: any) => {
  if (val === undefined || val === null || val === '') return 0;
  return parseIDNumber(val);
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
  const { confirm, ConfirmDialogPortal } = useConfirm();
  const { showToast } = useToast();

  const { inventory, updateInventoryItem } = useInventory();
  const { allCategories, subCategoriesFor } = useCategories();

  // ── Cart State ───────────────────────────────────────────
  const [cart, setCart] = useState<any[]>([]);

  // ── Pending Orders (persist to localStorage) ─────────────
  const [pendingOrders, setPendingOrders] = useState<
    { id: number; label: string; cart: any[]; metode: string; catatan: string }[]
  >(() => {
    try {
      const saved = localStorage.getItem('cleartask_pending_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [showPendingModal, setShowPendingModal] = useState(false);

  // ── Payment State ─────────────────────────────────────────
  const [metode, setMetode] = useState('Tunai');
  const [uangDiterima, setUangDiterima] = useState('');
  const [catatan, setCatatan] = useState('');
  const [tanggal, setTanggal] = useState(getTodayISO());
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [undoDeadline, setUndoDeadline] = useState<number | null>(null);
  const [undoOrder, setUndoOrder] = useState<any>(null);

  // ── UI State ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('katalog'); // 'katalog' | 'manual'
  const [formError, setFormError] = useState('');
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [rightPaneTab, setRightPaneTab] = useState('cart'); // 'cart' | 'stock'

  // Bridge state: StockCheckPanel → ManualItemForm (onEditManual)
  const [initialManualForm, setInitialManualForm] = useState<
    | {
        namaBarang?: string;
        kategori?: string;
        subKategori?: string;
        qty?: string;
        hargaSatuan?: string;
      }
    | undefined
  >(undefined);

  // ── Plastik bag ───────────────────────────────────────────
  const [plasticBagEnabled, setPlasticBagEnabled] = useState(false);
  const plasticBagPrice = Math.round(Number(settings?.plasticBagPrice) || 500);
  const plasticBagCharge =
    settings?.plasticBagEnabled !== false && plasticBagEnabled ? plasticBagPrice : 0;

  // ── W4-04: Transaction discount state ─────────────────────
  const [diskonTransaksiEnabled, setDiskonTransaksiEnabled] = useState(false);
  const [diskonTransaksiTipe, setDiskonTransaksiTipe] = useState<'persen' | 'nominal'>('persen');
  const [diskonTransaksiNilai, setDiskonTransaksiNilai] = useState(0);

  // ── Derived totals ────────────────────────────────────────
  const subTotal = cart.reduce((sum, item) => sum + item.total, 0);

  // W4-04: Total item-level discounts
  const totalDiskonItem = cart.reduce((sum, item) => sum + (item.totalDiskon || 0), 0);

  // W4-04: Transaction-level discount computation
  const totalDiskonTransaksi = useMemo(() => {
    if (!diskonTransaksiEnabled || diskonTransaksiNilai <= 0) return 0;
    if (diskonTransaksiTipe === 'persen') {
      const clamped = Math.min(Math.max(diskonTransaksiNilai, 0), 100);
      return Math.round(subTotal * (clamped / 100));
    }
    return Math.round(Math.min(diskonTransaksiNilai, subTotal));
  }, [diskonTransaksiEnabled, diskonTransaksiTipe, diskonTransaksiNilai, subTotal]);

  const totalSemuaDiskon = totalDiskonItem + totalDiskonTransaksi;
  const subTotalSetelahDiskon = subTotal - totalDiskonTransaksi;
  const grandTotal = Math.max(0, subTotalSetelahDiskon + plasticBagCharge);
  const received = parseNumeric(uangDiterima);
  const kembalian = received > grandTotal ? received - grandTotal : 0;

  const cashBreakdown: CashDenomination[] = useMemo(
    () => (kembalian > 0 ? getCashBreakdown(kembalian) : []),
    [kembalian]
  );

  // ── Back handler for modals ───────────────────────────────
  useBackHandler(showPendingModal, () => setShowPendingModal(false));
  useBackHandler(showQrisModal, () => setShowQrisModal(false));

  // ── Draft Cart Persistence ────────────────────────────────
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('cleartask_draft_cart');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (Array.isArray(parsed) && parsed.length > 0) setCart(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem('cleartask_draft_cart', JSON.stringify(cart));
      } else {
        localStorage.removeItem('cleartask_draft_cart');
      }
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      if (pendingOrders.length > 0) {
        localStorage.setItem('cleartask_pending_orders', JSON.stringify(pendingOrders));
      } else {
        localStorage.removeItem('cleartask_pending_orders');
      }
    } catch {}
  }, [pendingOrders]);

  // ── W3-07: Command Palette Event Listener ─────────────────
  useEffect(() => {
    const handleAddProductFromPalette = (e: CustomEvent) => {
      const { product } = e.detail;
      if (!product) return;

      // Add product to cart (similar to catalog browser behavior)
      setCart((prev) => {
        const existing = prev.find((item) => item.inventoryId === product.id && !item.isManual);
        if (existing) {
          // Increment qty
          return prev.map((item) =>
            item.inventoryId === product.id && !item.isManual
              ? {
                  ...item,
                  qty: item.qty + 1,
                  total: (item.qty + 1) * item.harga,
                }
              : item
          );
        } else {
          // Add new item
          const newItem = {
            id: Date.now(),
            nama: product.nama,
            barcode: product.barcode || '',
            qty: 1,
            harga: product.hargaJual,
            total: product.hargaJual,
            inventoryId: product.id,
            isManual: false,
            hargaModalSnapshot: product.hargaModal,
            namaSnapshot: product.nama,
          };
          feedbackItemAdded();
          return [...prev, newItem];
        }
      });

      showToast('Produk ditambahkan ke keranjang', 'success');
    };

    window.addEventListener(
      'commandPalette:addProduct',
      handleAddProductFromPalette as EventListener
    );
    return () => {
      window.removeEventListener(
        'commandPalette:addProduct',
        handleAddProductFromPalette as EventListener
      );
    };
  }, [showToast]);

  // ── Multi-tab sync ────────────────────────────────────────
  useEffect(() => {
    const cleanup = initMultiTabSync((msg) => {
      if (msg.type === 'CART_UPDATED' && Array.isArray(msg.payload)) {
        const payload = msg.payload;
        setCart((currentCart) => {
          if (payload.length === 0 && currentCart.length > 0) return currentCart;
          return payload;
        });
      }
    });
    return cleanup;
  }, []);

  // ── Pricing helper ────────────────────────────────────────
  const resolveItemPricing = useCallback(
    (item: any, qty: number) => {
      const invItem =
        inventory.find(
          (inv) => inv.namaBarang?.toLowerCase().trim() === item.namaBarang?.toLowerCase().trim()
        ) || item;

      const userSpecifiedPrice =
        item.normalHargaSatuan || (item.isCustomPrice ? item.hargaSatuan : undefined);
      const basePrice = userSpecifiedPrice ?? invItem.harga ?? item.hargaSatuan ?? 0;
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
    },
    [inventory]
  );

  // ── Add to cart ───────────────────────────────────────────
  const addToCart = useCallback(
    async (item: any) => {
      const invItem = inventory.find(
        (inv) => inv.namaBarang?.toLowerCase().trim() === item.namaBarang?.toLowerCase().trim()
      );

      // W1-09: Dus unpack prompt
      if (invItem && (invItem.quantity || 0) < (item.qty || 1) && (invItem.packStock || 0) > 0) {
        const ratio = Number(invItem.packRatio) || 0;
        if (ratio > 0) {
          const confirmUnpack = await confirm({
            title: `Unpack ${invItem.packUnit || 'Dus'}`,
            message:
              `⚠️ Stok ${invItem.namaBarang} eceran tinggal ${invItem.quantity || 0} ${invItem.satuan || 'Pcs'}.\n` +
              `Tersedia ${invItem.packStock} ${invItem.packUnit || 'Dus'} di gudang.\n\n` +
              `Unpack 1 ${invItem.packUnit || 'Dus'} (+${ratio} ${invItem.satuan || 'Pcs'}) sekarang?`,
            confirmLabel: 'Unpack Sekarang',
          });
          if (confirmUnpack && invItem.id !== undefined) {
            try {
              await transactionService.unpackInventoryItem(String(invItem.id), kasirName);
              showToast(
                `Berhasil membongkar 1 ${invItem.packUnit || 'Dus'} ${invItem.namaBarang}`,
                'success'
              );
            } catch (err) {
              console.error('Failed to unpack:', err);
            }
          }
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
      if (settings?.soundEnabled !== false) feedbackItemAdded();
    },
    [inventory, resolveItemPricing, settings?.soundEnabled, confirm, showToast, kasirName]
  );

  // ── Update qty in cart ────────────────────────────────────
  const updateCartQty = useCallback(
    (id: any, newQty: number) => {
      if (newQty < 1) return;
      setCart((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          const pricing = resolveItemPricing(i, newQty);
          // W4-04: Recalculate discount with new qty
          const totalSebelumDiskon = newQty * pricing.hargaSatuan;
          const diskonPersen = i.diskonPersen || 0;
          const diskonNominal = i.diskonNominal || 0;
          let totalDiskon = 0;
          if (diskonPersen > 0)
            totalDiskon += Math.round(totalSebelumDiskon * (diskonPersen / 100));
          if (diskonNominal > 0) totalDiskon += Math.round(diskonNominal);
          totalDiskon = Math.min(totalDiskon, totalSebelumDiskon);
          return {
            ...i,
            qty: newQty,
            normalHargaSatuan: pricing.normalHargaSatuan,
            hargaSatuan: pricing.hargaSatuan,
            hargaModal: pricing.hargaModal,
            isWholesale: pricing.isWholesale,
            totalSebelumDiskon: totalDiskon > 0 ? totalSebelumDiskon : undefined,
            totalDiskon: totalDiskon > 0 ? totalDiskon : undefined,
            total: totalDiskon > 0 ? totalSebelumDiskon - totalDiskon : pricing.total,
          };
        })
      );
    },
    [resolveItemPricing]
  );

  // ── W4-04: Update discount for a cart item ────────────────
  const updateCartDiskon = useCallback((id: any, tipe: 'persen' | 'nominal', nilai: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const bruto = i.qty * i.hargaSatuan;
        const diskonPersen = tipe === 'persen' ? nilai : 0;
        const diskonNominal = tipe === 'nominal' ? nilai : 0;
        let totalDiskon = 0;
        if (diskonPersen > 0)
          totalDiskon += Math.round(bruto * (Math.min(diskonPersen, 100) / 100));
        if (diskonNominal > 0) totalDiskon += Math.round(diskonNominal);
        totalDiskon = Math.min(totalDiskon, bruto);
        return {
          ...i,
          diskonPersen: diskonPersen > 0 ? diskonPersen : undefined,
          diskonNominal: diskonNominal > 0 ? diskonNominal : undefined,
          totalSebelumDiskon: totalDiskon > 0 ? bruto : undefined,
          totalDiskon: totalDiskon > 0 ? totalDiskon : undefined,
          total: totalDiskon > 0 ? bruto - totalDiskon : bruto,
        };
      })
    );
  }, []);

  // ── Remove from cart ──────────────────────────────────────
  const removeFromCart = useCallback((id: any) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // ── Pending Orders ────────────────────────────────────────
  const handleSavePendingOrder = useCallback(() => {
    if (cart.length === 0) return;
    const label =
      cart
        .map((i) => i.namaBarang)
        .slice(0, 3)
        .join(', ') + (cart.length > 3 ? '...' : '');
    setPendingOrders((prev) => [
      ...prev,
      { id: Date.now(), label, cart: [...cart], metode, catatan },
    ]);
    setCart([]);
    setUangDiterima('');
    setCatatan('');
    setFormError('');
  }, [cart, metode, catatan]);

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

  const handleDeletePendingOrder = useCallback((orderId: number) => {
    setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  // ── StockCheckPanel → ManualItemForm bridge ───────────────
  const handleEditManual = useCallback(
    (item: any) => {
      setInitialManualForm({
        namaBarang: item.namaBarang || '',
        kategori: item.kategori || allCategories[0] || 'Makanan',
        subKategori: item.subKategori || '',
        qty: '1',
        hargaSatuan: item.harga?.toString() || '',
      });
      setActiveTab('manual');
    },
    [allCategories]
  );

  // ── Undo Checkout ─────────────────────────────────────────
  const handleUndoCheckout = useCallback(async () => {
    if (!undoOrder || (undoDeadline && Date.now() > undoDeadline)) {
      showToast('Batas waktu untuk membatalkan transaksi telah berakhir.', 'warning');
      return;
    }
    try {
      const txId = undoOrder.id || undoOrder.transactionId;
      await transactionService.voidTransaction(txId, 'Undo checkout kasir', kasirName);
      const originalItems = (undoOrder.items || []).filter((i: any) => i.id !== 'plastic-bag');
      setCart(originalItems);
      setUndoOrder(null);
      setUndoDeadline(null);
      setShowStruk(false);
      feedbackItemAdded();
      showToast(
        `Transaksi ${undoOrder.transactionId || ''} berhasil dibatalkan dan barang dikembalikan ke keranjang.`,
        'success'
      );
    } catch (err: any) {
      showToast('Gagal membatalkan transaksi: ' + err.message, 'error');
    }
  }, [undoOrder, undoDeadline, kasirName, showToast]);

  // ── Modal Struk state ─────────────────────────────────────
  const [showStruk, setShowStruk] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  // ── Execute Checkout ──────────────────────────────────────
  const executeCheckout = async () => {
    const finalItems =
      plasticBagCharge > 0
        ? [
            ...cart,
            {
              id: 'plastic-bag',
              namaBarang: 'Kantong Plastik',
              kategori: 'Lainnya',
              subKategori: '',
              hargaSatuan: plasticBagPrice,
              hargaModal: 0,
              qty: 1,
              total: plasticBagPrice,
              isWholesale: false,
            },
          ]
        : cart;

    // W4-02: Detect credit sale (any item with metode='kredit' and customerId)
    const creditItem = finalItems.find((item: any) => item.metode === 'kredit' && item.customerId);
    const isCreditSale = !!creditItem;
    const customerId = creditItem?.customerId;

    const orderData = {
      tanggal: activeSession?.tanggalMulai || tanggal,
      items: finalItems,
      total: grandTotal,
      metode: isCreditSale ? 'Kredit' : metode, // Override metode if credit
      uangDiterima: isCreditSale ? 0 : metode === 'Tunai' ? received : grandTotal,
      kembalian: isCreditSale ? 0 : metode === 'Tunai' ? kembalian : 0,
      catatan,
      kasir: kasirName,
      sessionId: activeSession?.id ?? null,
      customerId: isCreditSale ? customerId : undefined, // W4-02: Store customer ID
      // W4-04: Discount snapshot
      diskonTransaksi:
        diskonTransaksiEnabled && diskonTransaksiNilai > 0
          ? { tipe: diskonTransaksiTipe, nilai: diskonTransaksiNilai }
          : undefined,
      totalDiskon: totalSemuaDiskon > 0 ? totalSemuaDiskon : undefined,
    };

    const savedTx = await onSubmit(orderData);
    if (settings?.soundEnabled !== false) feedbackCheckout();

    const finalOrder =
      savedTx && typeof savedTx === 'object' && Array.isArray(savedTx.items)
        ? savedTx
        : {
            ...orderData,
            transactionId:
              savedTx && typeof savedTx === 'object' ? savedTx.transactionId : undefined,
            id: savedTx && typeof savedTx === 'object' ? savedTx.id : undefined,
          };

    // W4-02: Create credit ledger entry if this is a credit sale
    if (isCreditSale && customerId && finalOrder.id) {
      try {
        const ledger = await createCreditLedger({
          customerId,
          transactionId: finalOrder.id,
          jumlahKredit: grandTotal,
          catatan: `Penjualan ${finalOrder.transactionId || finalOrder.id}`,
        });

        // W4-02 Phase 3D: Audit log — look up customer name for rich context
        const customer = await getCustomerById(customerId).catch(() => undefined);
        const customerName = customer?.nama ?? `Customer ${customerId}`;

        await auditService.logCreditTransactionCreated({
          transactionId: finalOrder.transactionId ?? String(finalOrder.id),
          dbId: finalOrder.id,
          customerId,
          customerName,
          amount: grandTotal,
          sessionId: activeSession?.id ?? null,
          kasir: kasirName,
          itemCount: finalItems.length,
        });

        await auditService.logCreditLedgerCreated({
          ledgerId: ledger.id,
          customerId,
          customerName,
          transactionId: finalOrder.transactionId ?? String(finalOrder.id),
          amount: grandTotal,
          kasir: kasirName,
        });

        showToast(`Hutang berhasil dicatat untuk pelanggan`, 'success');
      } catch (err: any) {
        console.error('Failed to create credit ledger:', err);
        showToast(`⚠️ Transaksi tersimpan, tapi gagal catat hutang: ${err.message}`, 'warning');
      }
    }

    setLastOrder(finalOrder);
    setUndoOrder(finalOrder);
    setUndoDeadline(Date.now() + 15000);
    setShowStruk(true);
    if (settings?.soundEnabled !== false) feedbackCheckout();
    setShowMobileCart(false);
    setShowQrisModal(false);

    setCart([]);
    setPlasticBagEnabled(false);
    // W4-04: Reset discount state
    setDiskonTransaksiEnabled(false);
    setDiskonTransaksiTipe('persen');
    setDiskonTransaksiNilai(0);
    try {
      localStorage.removeItem('cleartask_draft_cart');
    } catch {}
    broadcastTabMessage('CART_UPDATED', []);
    broadcastTabMessage('TRANSACTION_ADDED', finalOrder);
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

  // ── W0-06: Ctrl/Cmd+Enter = Checkout ─────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const isDialogOpen = Boolean(
          showPendingModal ||
          showQrisModal ||
          showStruk ||
          document.querySelector('[role="dialog"], [aria-modal="true"]')
        );
        if (cart.length > 0 && !isDialogOpen) {
          e.preventDefault();
          handleCheckout();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPendingModal, showQrisModal, showStruk, handleCheckout]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="animate-slide-up flex flex-col lg:flex-row gap-6 h-auto">
      {/* ── KIRI: Katalog / Input Manual ── */}
      <div className="flex-1 glass-card flex flex-col min-h-[500px]">
        <div
          className="flex border-b border-border-default"
          role="tablist"
          aria-label="Mode input barang"
        >
          <button
            type="button"
            role="tab"
            id="tab-katalog"
            aria-selected={activeTab === 'katalog'}
            aria-controls="panel-katalog"
            className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'katalog' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary'}`}
            onClick={() => setActiveTab('katalog')}
          >
            Katalog Barang
          </button>
          <button
            type="button"
            role="tab"
            id="tab-manual"
            aria-selected={activeTab === 'manual'}
            aria-controls="panel-manual"
            className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'manual' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary'}`}
            onClick={() => setActiveTab('manual')}
          >
            Input Manual
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-5 pb-24 lg:pb-5"
          role="tabpanel"
          id={activeTab === 'katalog' ? 'panel-katalog' : 'panel-manual'}
          aria-labelledby={activeTab === 'katalog' ? 'tab-katalog' : 'tab-manual'}
        >
          {activeTab === 'katalog' ? (
            <CatalogBrowser
              inventory={inventory}
              allCategories={allCategories}
              subCategoriesFor={subCategoriesFor}
              onAddToCart={addToCart}
              onUpdateStock={updateInventoryItem}
            />
          ) : (
            <ManualItemForm
              key={JSON.stringify(initialManualForm)}
              inventory={inventory}
              allCategories={allCategories}
              subCategoriesFor={subCategoriesFor}
              tanggal={tanggal}
              setTanggal={setTanggal}
              onAddToCart={addToCart}
              confirm={confirm}
              initialForm={initialManualForm}
            />
          )}
        </div>
      </div>

      {/* ── Mobile Cart Backdrop ── */}
      {showMobileCart && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] animate-fade-in"
          onClick={() => setShowMobileCart(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Floating Mobile Cart Button ── */}
      {!showMobileCart && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-sm animate-slide-up">
          <Button
            variant="primary"
            className="w-full rounded-full px-6 py-4 shadow-lg flex items-center justify-between"
            onClick={() => setShowMobileCart(true)}
            aria-label={`Buka keranjang, ${cart.length} item, Rp ${grandTotal.toLocaleString('id-ID')}`}
          >
            <span className="flex items-center gap-2 font-semibold">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cart.length} Item
            </span>
            <span className="font-bold">Rp {grandTotal.toLocaleString('id-ID')}</span>
          </Button>
        </div>
      )}

      {/* ── KANAN: Keranjang & Pembayaran / Cek Stok (Mobile Bottom Sheet / Desktop Sticky) ── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[60] w-full max-h-[88vh] rounded-t-3xl border-t border-border-default bg-bg-surface flex flex-col shadow-2xl transition-transform duration-300 ease-out overflow-hidden ${
          showMobileCart
            ? 'translate-y-0 opacity-100 visible'
            : 'translate-y-full opacity-0 invisible pointer-events-none'
        } lg:relative lg:inset-auto lg:bottom-auto lg:z-auto lg:translate-y-0 lg:opacity-100 lg:visible lg:pointer-events-auto lg:w-[420px] lg:max-h-[calc(100vh-2.5rem)] lg:rounded-2xl lg:sticky lg:top-4 lg:self-start lg:glass-card`}
      >
        {/* Mobile Drag Handle Pill */}
        <div
          className="lg:hidden flex items-center justify-center pt-3 pb-1 cursor-pointer shrink-0"
          onClick={() => setShowMobileCart(false)}
          aria-label="Tutup keranjang"
        >
          <div className="w-12 h-1.5 rounded-full bg-border-strong hover:bg-text-muted transition-colors" />
        </div>

        {/* Tab header */}
        <div
          className="flex border-b border-border-default bg-bg-surface/30 shrink-0"
          role="tablist"
          aria-label="Panel kanan"
        >
          <button
            type="button"
            role="tab"
            id="tab-cart"
            aria-selected={rightPaneTab === 'cart'}
            aria-controls="panel-cart"
            className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${rightPaneTab === 'cart' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary'}`}
            onClick={() => setRightPaneTab('cart')}
          >
            Keranjang ({cart.length})
          </button>
          <button
            type="button"
            role="tab"
            id="tab-stock"
            aria-selected={rightPaneTab === 'stock'}
            aria-controls="panel-stock"
            className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${rightPaneTab === 'stock' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary'}`}
            onClick={() => setRightPaneTab('stock')}
          >
            Cek Stok
          </button>
          <button
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-bg-elevated text-text-secondary cursor-pointer self-center mr-3"
            onClick={() => setShowMobileCart(false)}
            aria-label="Tutup keranjang"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {rightPaneTab === 'stock' ? (
          <div role="tabpanel" id="panel-stock" aria-labelledby="tab-stock">
            <StockCheckPanel
              inventory={inventory}
              allCategories={allCategories}
              onAddToCart={addToCart}
              onEditManual={handleEditManual}
            />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="panel-cart"
            aria-labelledby="tab-cart"
            className="flex flex-col flex-1 overflow-y-auto"
          >
            {/* ── QOL 1.2: Pending Order buttons ── */}
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

            {/* ── QOL 1.2: Pending Orders Modal ── */}
            {showPendingModal && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={() => setShowPendingModal(false)}
              >
                <div
                  className="bg-bg-surface border border-border-default rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5 space-y-3 animate-slide-up"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-sm font-bold text-text-primary">
                    📋 Transaksi Tertunda ({pendingOrders.length})
                  </h3>
                  {pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 bg-bg-elevated rounded-xl border border-border-subtle flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary truncate">
                          {order.label}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {order.cart.length} item • {order.metode}
                        </p>
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

            {/* ── KOTAK A: Cart Item List ── */}
            <CartItemList
              cart={cart}
              subTotal={subTotal}
              onUpdateQty={updateCartQty}
              onRemoveItem={removeFromCart}
              onUpdateDiskon={updateCartDiskon}
            />

            {/* ── KOTAK B: Payment / Checkout ── */}
            <CheckoutSection
              subTotal={subTotal}
              grandTotal={grandTotal}
              plasticBagEnabled={plasticBagEnabled}
              setPlasticBagEnabled={setPlasticBagEnabled}
              plasticBagPrice={plasticBagPrice}
              plasticBagCharge={plasticBagCharge}
              metode={metode}
              setMetode={setMetode}
              uangDiterima={uangDiterima}
              setUangDiterima={setUangDiterima}
              kembalian={kembalian}
              received={received}
              cashBreakdown={cashBreakdown}
              catatan={catatan}
              setCatatan={setCatatan}
              formError={formError}
              cartLength={cart.length}
              onCheckout={handleCheckout}
              settings={settings}
              // W4-04: Transaction discount
              diskonTransaksiEnabled={diskonTransaksiEnabled}
              diskonTransaksiTipe={diskonTransaksiTipe}
              diskonTransaksiNilai={diskonTransaksiNilai}
              totalDiskonTransaksi={totalDiskonTransaksi}
              totalSemuaDiskon={totalSemuaDiskon}
              onToggleDiskonTransaksi={() => {
                setDiskonTransaksiEnabled((v) => !v);
                if (diskonTransaksiEnabled) {
                  setDiskonTransaksiNilai(0);
                }
              }}
              onSetDiskonTransaksi={(tipe, nilai) => {
                setDiskonTransaksiTipe(tipe);
                setDiskonTransaksiNilai(nilai);
              }}
            />
          </div>
        )}
      </div>

      {/* ── Floating Undo Checkout Notification (W2-04) ── */}
      {undoOrder && undoDeadline && Date.now() <= undoDeadline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 lg:right-6 z-[95] bg-bg-surface/95 border border-primary/40 shadow-glow rounded-xl p-3 flex items-center gap-3 backdrop-blur-md animate-slide-up
            bottom-24 lg:bottom-6"
        >
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-text-primary">
              Transaksi {undoOrder.transactionId || ''} berhasil!
            </span>
            <span className="text-[10px] text-text-muted">
              Salah input kasir? Anda bisa membatalkannya.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndoCheckout}
            className="text-xs text-accent-red border-accent-red/30 hover:bg-accent-red/10 py-1.5 px-2.5 font-bold"
          >
            ↩️ Undo
          </Button>
          <button
            onClick={() => {
              setUndoOrder(null);
              setUndoDeadline(null);
            }}
            className="text-text-muted hover:text-text-primary text-xs ml-1"
            title="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Struk Modal ── */}
      {showStruk && (
        <StrukModal
          order={lastOrder}
          onClose={() => setShowStruk(false)}
          onUndo={undoDeadline && Date.now() <= undoDeadline ? handleUndoCheckout : undefined}
        />
      )}

      {/* ── QRIS Modal ── */}
      {showQrisModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Pembayaran QRIS"
        >
          <div className="glass-card w-full max-w-sm p-6 text-center space-y-4 animate-slide-up bg-bg-surface border border-primary/30 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <span className="text-sm font-bold text-text-primary">📱 Pembayaran QRIS</span>
              <button
                onClick={() => setShowQrisModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
                aria-label="Tutup QRIS"
              >
                ✕
              </button>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">
                {settings?.tokoName || 'ClearTask Store'}
              </p>
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
                  <svg
                    className="w-16 h-16 text-gray-400 mb-2"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
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

      <ConfirmDialogPortal />
    </div>
  );
});
