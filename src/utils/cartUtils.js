/* ═══════════════════════════════════════════════════════════
   cartUtils.js — ClearTask
   Kalkulasi keranjang: total, diskon, pajak, dan validasi item.
   Semua fungsi murni (pure) — tidak ada side effects.
   ═══════════════════════════════════════════════════════════ */

/**
 * Hitung total harga satu item (qty × hargaSatuan).
 * @param {number} qty
 * @param {number} hargaSatuan
 * @returns {number}
 */
export function hitungTotalItem(qty, hargaSatuan) {
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  if (!Number.isFinite(hargaSatuan) || hargaSatuan < 0) return 0;
  return Math.round(qty * hargaSatuan);
}

/**
 * Terapkan diskon persentase ke harga.
 * @param {number} harga - Harga sebelum diskon
 * @param {number} diskonPersen - Persentase diskon (0–100)
 * @returns {number} Harga setelah diskon (dibulatkan ke bawah)
 */
export function terapkanDiskon(harga, diskonPersen) {
  if (!Number.isFinite(harga) || harga < 0) return 0;
  if (!Number.isFinite(diskonPersen) || diskonPersen < 0 || diskonPersen > 100) return harga;
  return Math.round((harga * (100 - diskonPersen)) / 100);
}

/**
 * Hitung pajak dari harga.
 * @param {number} harga - Harga dasar
 * @param {number} pajakPersen - Persentase pajak (0–100), default 11 (PPN Indonesia)
 * @returns {number} Nilai pajak (dibulatkan ke atas)
 */
export function hitungPajak(harga, pajakPersen = 11) {
  if (!Number.isFinite(harga) || harga < 0) return 0;
  if (!Number.isFinite(pajakPersen) || pajakPersen < 0 || pajakPersen > 100) return 0;
  return Math.ceil(harga * (pajakPersen / 100));
}

/**
 * Hitung grand total: harga setelah diskon + pajak.
 * @param {number} harga
 * @param {number} diskonPersen
 * @param {number} pajakPersen
 * @returns {{ hargaSetelahDiskon: number, pajak: number, grandTotal: number }}
 */
export function hitungGrandTotal(harga, diskonPersen = 0, pajakPersen = 0) {
  const hargaSetelahDiskon = terapkanDiskon(harga, diskonPersen);
  const pajak = hitungPajak(hargaSetelahDiskon, pajakPersen);
  return {
    hargaSetelahDiskon,
    pajak,
    grandTotal: hargaSetelahDiskon + pajak,
  };
}

/**
 * Validasi data item transaksi sebelum disimpan.
 * @param {{ namaBarang: string, qty: number, hargaSatuan: number }} item
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validasiItem(item) {
  const errors = [];

  // Safe string conversion — handles Symbol, objects with throwing toString, etc.
  let namaStr;
  try {
    namaStr = item?.namaBarang != null ? String(item.namaBarang).trim() : '';
  } catch {
    namaStr = '';
  }

  if (!namaStr) {
    errors.push('Nama barang tidak boleh kosong.');
  }
  if (!Number.isFinite(item?.qty) || item.qty <= 0) {
    errors.push('Qty harus lebih dari 0.');
  }
  if (!Number.isFinite(item?.hargaSatuan) || item.hargaSatuan <= 0) {
    errors.push('Harga satuan harus lebih dari 0.');
  }
  return { valid: errors.length === 0, errors };
}
