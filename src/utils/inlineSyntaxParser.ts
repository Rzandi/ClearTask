/* ═══════════════════════════════════════════════════════════
   inlineSyntaxParser.ts — ClearTask Inline Command Parser
   Parses quick-entry strings like "Susu 2x @15000" into
   structured cart-item objects for rapid POS input.
   ═══════════════════════════════════════════════════════════ */

export interface ParsedCartItem {
  namaBarang: string;
  qty: number;
  hargaSatuan: number | null; // null = not specified (look up from inventory)
}

/**
 * Parse an inline POS command string into a structured cart item.
 *
 * Supported formats (case-insensitive, flexible spacing):
 *   "Susu 2x @15000"     → { namaBarang: "Susu", qty: 2, hargaSatuan: 15000 }
 *   "Kopi 3x"            → { namaBarang: "Kopi", qty: 3, hargaSatuan: null }
 *   "Roti @5000"         → { namaBarang: "Roti", qty: 1, hargaSatuan: 5000 }
 *   "Susu Coklat 2x"     → { namaBarang: "Susu Coklat", qty: 2, hargaSatuan: null }
 *   "Air Mineral"        → { namaBarang: "Air Mineral", qty: 1, hargaSatuan: null }
 *   "2x Susu @10000"     → { namaBarang: "Susu", qty: 2, hargaSatuan: 10000 }
 *
 * @returns ParsedCartItem | null if input is empty / unparsable
 */
export function parseInlineCommand(input: string): ParsedCartItem | null {
  if (!input || !input.trim()) return null;

  let text = input.trim();
  let qty = 1;
  let hargaSatuan: number | null = null;

  // 1. Extract price (@<number>) — greedy, supports @15000 / @15.000 / @ 15000
  const priceRegex = /@\s*([\d.,]+)/;
  const priceMatch = text.match(priceRegex);
  if (priceMatch) {
    const priceStr = priceMatch[1]!.replace(/\./g, '').replace(/,/g, '');
    const priceNum = parseInt(priceStr, 10);
    if (!isNaN(priceNum) && priceNum > 0) {
      hargaSatuan = priceNum;
    }
    text = text.replace(priceRegex, '').trim();
  }

  // 2. Extract quantity — supports "2x", "x2", "2X", "X2"
  //    Also supports leading qty: "2x Susu" or trailing: "Susu 2x"

  // Pattern A: trailing "2x" or "2X" (e.g. "Susu 2x")
  const trailingQtyRegex = /\s+(\d+)\s*[xX]\s*$/;
  const trailingMatch = text.match(trailingQtyRegex);
  if (trailingMatch) {
    const qNum = parseInt(trailingMatch[1]!, 10);
    if (!isNaN(qNum) && qNum > 0) qty = qNum;
    text = text.replace(trailingQtyRegex, '').trim();
  } else {
    // Pattern B: leading "2x " or "x2 " (e.g. "2x Susu" or "x2 Susu")
    const leadingQtyRegex = /^(\d+)\s*[xX]\s+/;
    const leadingMatch = text.match(leadingQtyRegex);
    if (leadingMatch) {
      const qNum = parseInt(leadingMatch[1]!, 10);
      if (!isNaN(qNum) && qNum > 0) qty = qNum;
      text = text.replace(leadingQtyRegex, '').trim();
    } else {
      // Pattern C: "x2" at end (e.g. "Susu x2")
      const xTrailingRegex = /\s+[xX](\d+)\s*$/;
      const xTrailingMatch = text.match(xTrailingRegex);
      if (xTrailingMatch) {
        const qNum = parseInt(xTrailingMatch[1]!, 10);
        if (!isNaN(qNum) && qNum > 0) qty = qNum;
        text = text.replace(xTrailingRegex, '').trim();
      }
    }
  }

  // 3. Whatever remains is the product name
  const namaBarang = text.trim();
  if (!namaBarang) return null;

  return { namaBarang, qty, hargaSatuan };
}

/**
 * Checks if a string looks like it contains inline POS commands.
 * Used to decide whether to show the "parsed preview" hint.
 */
export function hasInlineSyntax(input: string): boolean {
  if (!input || !input.trim()) return false;
  const s = input.trim();
  // Contains @price or quantity multiplier pattern
  return /@\s*[\d.,]+/.test(s) || /\d+\s*[xX]/.test(s) || /[xX]\s*\d+/.test(s);
}

/**
 * Compute cash change breakdown (pecahan uang kembalian).
 * Returns an array of { denomination, count } objects.
 *
 * @param amount — kembalian amount in Rupiah (integer)
 */
export interface CashDenomination {
  value: number;
  count: number;
  label: string;
}

const DENOMINATIONS: { value: number; label: string }[] = [
  { value: 100000, label: '100rb' },
  { value: 50000, label: '50rb' },
  { value: 20000, label: '20rb' },
  { value: 10000, label: '10rb' },
  { value: 5000, label: '5rb' },
  { value: 2000, label: '2rb' },
  { value: 1000, label: '1rb' },
  { value: 500, label: '500' },
  { value: 200, label: '200' },
  { value: 100, label: '100' },
];

export function getCashBreakdown(amount: number): CashDenomination[] {
  let remaining = Math.round(Math.abs(amount));
  const result: CashDenomination[] = [];

  for (const { value, label } of DENOMINATIONS) {
    if (remaining >= value) {
      const count = Math.floor(remaining / value);
      result.push({ value, count, label });
      remaining -= count * value;
    }
  }

  return result;
}
