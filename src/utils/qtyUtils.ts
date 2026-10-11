/* ═══════════════════════════════════════════════════════════
   qtyUtils.ts — ClearTask (W4-01)
   
   Utilities untuk qty desimal (timbangan, buah, sayur).
   Mendukung input desimal dengan koma Indonesia.
   ═══════════════════════════════════════════════════════════ */

import { parseIDNumber } from './parseIDNumber';

/**
 * Format qty untuk display dengan precision yang sesuai.
 * - Qty integer: "5"
 * - Qty desimal: "0,5" atau "1,25" (max 3 decimal places)
 * 
 * @param qty - Qty dalam bentuk number
 * @param maxDecimals - Maximum decimal places (default: 3)
 * @returns Formatted string dengan koma sebagai separator desimal
 */
export function formatQty(qty: number | string | null | undefined, maxDecimals: number = 3): string {
  const num = typeof qty === 'number' ? qty : parseIDNumber(qty);
  
  if (!Number.isFinite(num) || num === 0) return '0';
  
  // Jika integer, tampilkan tanpa desimal
  if (Number.isInteger(num)) {
    return num.toString();
  }
  
  // Round ke maxDecimals dan hapus trailing zeros
  const rounded = Number(num.toFixed(maxDecimals));
  const str = rounded.toString();
  
  // Replace dot dengan koma untuk format Indonesia
  return str.replace('.', ',');
}

/**
 * Validasi qty (support desimal).
 * 
 * @param qty - Qty yang akan divalidasi
 * @returns true jika valid (> 0 dan finite)
 */
export function isValidQty(qty: number | string | null | undefined): boolean {
  const num = typeof qty === 'number' ? qty : parseIDNumber(qty);
  return Number.isFinite(num) && num > 0;
}

/**
 * Parse qty dari input string dengan format Indonesia.
 * Support:
 * - "5" → 5
 * - "0,5" → 0.5
 * - "1,25" → 1.25
 * - "12.500" → 12500 (ribuan)
 * - "12.500,5" → 12500.5
 * 
 * @param input - String input dari user
 * @returns Parsed number atau NaN jika invalid
 */
export function parseQty(input: string | number | null | undefined): number {
  return parseIDNumber(input);
}

/**
 * Round qty ke precision tertentu untuk consistency.
 * Gunakan untuk normalisasi qty setelah parsing.
 * 
 * @param qty - Qty yang akan diround
 * @param precision - Jumlah digit desimal (default: 3)
 * @returns Rounded number
 */
export function roundQty(qty: number, precision: number = 3): number {
  if (!Number.isFinite(qty)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round(qty * factor) / factor;
}

/**
 * Cek apakah barang perlu input desimal (timbangan).
 * Bisa di-extend dengan logic detection dari kategori atau satuan.
 * 
 * @param satuan - Satuan barang (kg, gram, liter, dll)
 * @param kategori - Kategori barang (opsional)
 * @returns true jika barang butuh qty desimal
 */
export function needsDecimalQty(
  satuan?: string | null,
  kategori?: string | null
): boolean {
  if (!satuan) return false;
  
  const satuanLower = satuan.toLowerCase().trim();
  
  // Satuan yang umum pakai timbangan
  const timbangUnits = ['kg', 'gram', 'gr', 'liter', 'ml', 'meter', 'm'];
  
  return timbangUnits.some(unit => satuanLower.includes(unit));
}

/**
 * Get step value untuk input number berdasarkan tipe barang.
 * 
 * @param satuan - Satuan barang
 * @param kategori - Kategori barang (opsional)
 * @returns step value untuk input (0.001 untuk desimal, 1 untuk integer)
 */
export function getQtyStep(
  satuan?: string | null,
  kategori?: string | null
): number {
  return needsDecimalQty(satuan, kategori) ? 0.001 : 1;
}

/**
 * Format qty dengan satuan untuk display lengkap.
 * Examples:
 * - formatQtyWithUnit(5, "Pcs") → "5 Pcs"
 * - formatQtyWithUnit(0.5, "kg") → "0,5 kg"
 * - formatQtyWithUnit(1.25, "liter") → "1,25 liter"
 * 
 * @param qty - Quantity number
 * @param satuan - Unit string
 * @returns Formatted string dengan qty dan satuan
 */
export function formatQtyWithUnit(
  qty: number | string | null | undefined,
  satuan?: string | null
): string {
  const formatted = formatQty(qty);
  if (!satuan) return formatted;
  return `${formatted} ${satuan}`;
}
