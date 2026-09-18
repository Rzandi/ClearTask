/* ═══════════════════════════════════════════════════════════
   plasticBag.test.js — ClearTask
   Sprint 6 S6.4: Unit test logika plastik bag.
   - grandTotal kalkulasi (subTotal + plasticBagCharge)
   - inject item plastik ke finalItems saat checkout
   - tidak inject kalau toggle off atau fitur disabled di settings
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';

// ─── Pure logic helpers ───────────────────────────────────
// Ekstrak logika kalkulasi dari InputPenjualan agar bisa ditest tanpa render

/**
 * Kalkulasi grandTotal sesuai logika InputPenjualan.tsx
 */
function calcGrandTotal({ cart, plasticBagEnabled, plasticBagPrice, settingEnabled }) {
  const subTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const plasticBagCharge =
    settingEnabled !== false && plasticBagEnabled ? Math.round(Number(plasticBagPrice) || 500) : 0;
  return { subTotal, plasticBagCharge, grandTotal: subTotal + plasticBagCharge };
}

/**
 * Build finalItems sesuai logika executeCheckout di InputPenjualan.tsx
 */
function buildFinalItems({ cart, plasticBagCharge, plasticBagPrice }) {
  if (plasticBagCharge <= 0) return cart;
  return [
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
  ];
}

// ─── Sample cart ──────────────────────────────────────────

const sampleCart = [
  { id: 1, namaBarang: 'Nasi Goreng', qty: 2, hargaSatuan: 15000, total: 30000 },
  { id: 2, namaBarang: 'Es Teh', qty: 1, hargaSatuan: 5000, total: 5000 },
];
const CART_SUBTOTAL = 35000;

// ═══════════════════════════════════════════════════════════
// grandTotal kalkulasi
// ═══════════════════════════════════════════════════════════

describe('calcGrandTotal — kalkulasi plastik', () => {
  it('toggle OFF → grandTotal = subTotal tanpa tambahan', () => {
    const { grandTotal, plasticBagCharge } = calcGrandTotal({
      cart: sampleCart,
      plasticBagEnabled: false,
      plasticBagPrice: 500,
      settingEnabled: true,
    });
    expect(plasticBagCharge).toBe(0);
    expect(grandTotal).toBe(CART_SUBTOTAL);
  });

  it('toggle ON → grandTotal = subTotal + harga plastik', () => {
    const { grandTotal, plasticBagCharge } = calcGrandTotal({
      cart: sampleCart,
      plasticBagEnabled: true,
      plasticBagPrice: 500,
      settingEnabled: true,
    });
    expect(plasticBagCharge).toBe(500);
    expect(grandTotal).toBe(CART_SUBTOTAL + 500);
  });

  it('fitur dinonaktifkan di settings → tidak ada charge meski toggle ON', () => {
    const { grandTotal, plasticBagCharge } = calcGrandTotal({
      cart: sampleCart,
      plasticBagEnabled: true,
      plasticBagPrice: 500,
      settingEnabled: false,
    });
    expect(plasticBagCharge).toBe(0);
    expect(grandTotal).toBe(CART_SUBTOTAL);
  });

  it('harga plastik custom (Rp1000) diterapkan dengan benar', () => {
    const { grandTotal } = calcGrandTotal({
      cart: sampleCart,
      plasticBagEnabled: true,
      plasticBagPrice: 1000,
      settingEnabled: true,
    });
    expect(grandTotal).toBe(CART_SUBTOTAL + 1000);
  });

  it('cart kosong + plastik ON → grandTotal = harga plastik saja', () => {
    const { grandTotal } = calcGrandTotal({
      cart: [],
      plasticBagEnabled: true,
      plasticBagPrice: 500,
      settingEnabled: true,
    });
    expect(grandTotal).toBe(500);
  });

  it('cart kosong + plastik OFF → grandTotal = 0', () => {
    const { grandTotal } = calcGrandTotal({
      cart: [],
      plasticBagEnabled: false,
      plasticBagPrice: 500,
      settingEnabled: true,
    });
    expect(grandTotal).toBe(0);
  });

  it('harga plastik float di-round ke integer', () => {
    const { plasticBagCharge } = calcGrandTotal({
      cart: [],
      plasticBagEnabled: true,
      plasticBagPrice: 499.9,
      settingEnabled: true,
    });
    expect(Number.isInteger(plasticBagCharge)).toBe(true);
  });

  it('plasticBagPrice undefined → default 500', () => {
    const { plasticBagCharge } = calcGrandTotal({
      cart: [],
      plasticBagEnabled: true,
      plasticBagPrice: undefined,
      settingEnabled: true,
    });
    expect(plasticBagCharge).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════
// buildFinalItems — inject plastik ke cart
// ═══════════════════════════════════════════════════════════

describe('buildFinalItems — inject item plastik', () => {
  it('plasticBagCharge = 0 → finalItems identik dengan cart asli', () => {
    const finalItems = buildFinalItems({
      cart: sampleCart,
      plasticBagCharge: 0,
      plasticBagPrice: 500,
    });
    expect(finalItems).toEqual(sampleCart);
    expect(finalItems).toHaveLength(sampleCart.length);
  });

  it('plasticBagCharge > 0 → item plastik di-inject sebagai item terakhir', () => {
    const finalItems = buildFinalItems({
      cart: sampleCart,
      plasticBagCharge: 500,
      plasticBagPrice: 500,
    });
    expect(finalItems).toHaveLength(sampleCart.length + 1);
    const plasticItem = finalItems[finalItems.length - 1];
    expect(plasticItem.namaBarang).toBe('Kantong Plastik');
    expect(plasticItem.total).toBe(500);
    expect(plasticItem.qty).toBe(1);
    expect(plasticItem.hargaSatuan).toBe(500);
    expect(plasticItem.hargaModal).toBe(0);
    expect(plasticItem.kategori).toBe('Lainnya');
  });

  it('item plastik memiliki semua field yang dibutuhkan StrukModal', () => {
    const finalItems = buildFinalItems({
      cart: [],
      plasticBagCharge: 500,
      plasticBagPrice: 500,
    });
    const plasticItem = finalItems[0];
    // StrukModal iterates: namaBarang, qty, total, hargaSatuan
    expect(plasticItem).toHaveProperty('namaBarang');
    expect(plasticItem).toHaveProperty('qty');
    expect(plasticItem).toHaveProperty('total');
    expect(plasticItem).toHaveProperty('hargaSatuan');
  });

  it('cart asli tidak termutasi setelah buildFinalItems', () => {
    const originalCart = [...sampleCart];
    buildFinalItems({ cart: sampleCart, plasticBagCharge: 500, plasticBagPrice: 500 });
    expect(sampleCart).toEqual(originalCart);
  });

  it('harga plastik custom (Rp1000) tercermin di item plastik', () => {
    const finalItems = buildFinalItems({
      cart: sampleCart,
      plasticBagCharge: 1000,
      plasticBagPrice: 1000,
    });
    const plasticItem = finalItems[finalItems.length - 1];
    expect(plasticItem.total).toBe(1000);
    expect(plasticItem.hargaSatuan).toBe(1000);
  });
});

// ═══════════════════════════════════════════════════════════
// orderData.total konsistensi
// ═══════════════════════════════════════════════════════════

describe('orderData.total — konsistensi dengan grandTotal', () => {
  it('orderData.total sama dengan grandTotal (subTotal + plastik)', () => {
    const { grandTotal, plasticBagCharge } = calcGrandTotal({
      cart: sampleCart,
      plasticBagEnabled: true,
      plasticBagPrice: 500,
      settingEnabled: true,
    });
    const finalItems = buildFinalItems({
      cart: sampleCart,
      plasticBagCharge,
      plasticBagPrice: 500,
    });

    // Simulasi orderData.total
    const orderTotal = grandTotal;

    // Verifikasi: total semua item dalam finalItems === orderTotal
    const itemsTotal = finalItems.reduce((sum, item) => sum + item.total, 0);
    expect(itemsTotal).toBe(orderTotal);
  });

  it('tanpa plastik: sum(finalItems.total) === grandTotal', () => {
    const { grandTotal, plasticBagCharge } = calcGrandTotal({
      cart: sampleCart,
      plasticBagEnabled: false,
      plasticBagPrice: 500,
      settingEnabled: true,
    });
    const finalItems = buildFinalItems({
      cart: sampleCart,
      plasticBagCharge,
      plasticBagPrice: 500,
    });
    const itemsTotal = finalItems.reduce((sum, item) => sum + item.total, 0);
    expect(itemsTotal).toBe(grandTotal);
  });
});
