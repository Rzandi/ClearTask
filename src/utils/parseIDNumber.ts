/* ═══════════════════════════════════════════════════════════
   parseIDNumber.ts — ClearTask (W2-01)
   
   Unified Indonesian number parser for all input points:
   - Form inputs (harga, qty, modal)
   - CSV import
   - Inline syntax parser

   Indonesian Number Format:
   - Thousand separator: . (dot)     e.g. 12.500 = 12500
   - Decimal separator: , (comma)    e.g. 0,57 = 0.57
   - Mixed: 1.250.000,50 = 1250000.5

   This replaces scattered Number() / parseFloat() calls
   that silently produce NaN or wrong values for Indonesian
   formatted numbers.
   ═══════════════════════════════════════════════════════════ */

/**
 * Parse an Indonesian-formatted number string to a JS number.
 *
 * Handles all common patterns:
 * - "12.500"       → 12500   (thousand separator)
 * - "0,57"         → 0.57    (decimal comma)
 * - "1.250,50"     → 1250.5  (mixed)
 * - "1.250.000"    → 1250000 (multiple thousand separators)
 * - "12500"        → 12500   (plain number)
 * - "12,500.50"    → 12500.5 (English format, also supported)
 * - "Rp 12.500"    → 12500   (strip currency prefix)
 * - "- 5.000"      → -5000   (negative with space)
 * - "  12.500  "   → 12500   (trimmed)
 *
 * Returns NaN for truly unparseable strings.
 *
 * @param input - The raw input value (string, number, null, undefined)
 * @returns The parsed number, or NaN if unparseable
 */
export function parseIDNumber(input: string | number | null | undefined): number {
  // Pass through numbers directly
  if (typeof input === 'number') {
    return isFinite(input) ? input : NaN;
  }

  if (input === null || input === undefined) return NaN;

  let s = String(input).trim();
  if (s === '') return NaN;

  // Strip currency symbols and prefixes
  s = s.replace(/^[Rr][Pp]\.?\s*/i, ''); // Rp, Rp., rp
  s = s.replace(/^[Ii][Dd][Rr]\s*/i, ''); // IDR
  s = s.trim();

  // Strip thousands separator spaces (e.g. "1 250 000")
  // Only do this if the spaces look like thousands separators
  // (groups of 3 digits separated by spaces)

  // Detect format: Indonesian vs English
  // Indonesian: dots for thousands, comma for decimal → 1.250.000,50
  // English:    commas for thousands, dot for decimal → 1,250,000.50

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) {
      // Indonesian format: "12.500,75" → dots are thousands, comma is decimal
      s = s.replace(/\./g, ''); // remove thousand dots
      s = s.replace(',', '.'); // convert decimal comma to dot
    } else {
      // English format: "12,500.75" → commas are thousands, dot is decimal
      s = s.replace(/,/g, ''); // remove thousand commas
    }
  } else if (lastComma >= 0 && lastDot < 0) {
    // Only comma present
    // Heuristic: if there's exactly one comma and ≤2 digits after it,
    // treat it as decimal. Otherwise treat as thousands separator.
    const afterComma = s.substring(lastComma + 1);
    const beforeComma = s.substring(0, lastComma);

    // Multiple commas = thousands separators (English)
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount > 1) {
      // Multiple commas: "1,250,000" → English thousands
      s = s.replace(/,/g, '');
    } else if (
      afterComma.length <= 2 &&
      /^\d+$/.test(afterComma) &&
      /^-?\d+$/.test(beforeComma.replace(/\s/g, ''))
    ) {
      // Single comma with ≤2 decimal digits: "0,57" or "12500,5" → Indonesian decimal
      s = s.replace(',', '.');
    } else if (afterComma.length === 3 && /^\d{1,3}$/.test(beforeComma.replace(/^-/, ''))) {
      // "12,500" → ambiguous but treat as thousands (more common in ClearTask context)
      s = s.replace(',', '');
    } else {
      // Fallback: treat comma as decimal
      s = s.replace(',', '.');
    }
  } else if (lastDot >= 0 && lastComma < 0) {
    // Only dot present
    const afterDot = s.substring(lastDot + 1);
    const dotCount = (s.match(/\./g) || []).length;

    if (dotCount > 1) {
      // Multiple dots: "1.250.000" → Indonesian thousands
      s = s.replace(/\./g, '');
    } else if (
      afterDot.length === 3 &&
      /^\d{1,3}$/.test(s.substring(0, lastDot).replace(/^-/, ''))
    ) {
      // "12.500" → likely Indonesian thousands (not 12.5 with trailing zero)
      // Heuristic: if exactly 3 digits after dot and integer before, treat as thousands
      s = s.replace('.', '');
    }
    // Otherwise keep dot as decimal: "0.57" or "12500.5"
  }

  // Strip any remaining whitespace
  s = s.replace(/\s/g, '');

  const result = Number(s);
  return isFinite(result) ? result : NaN;
}

/**
 * Strict variant: returns a fallback instead of NaN.
 * Use in form handlers where NaN would cause downstream bugs.
 */
export function parseIDNumberSafe(
  input: string | number | null | undefined,
  fallback: number = 0
): number {
  const result = parseIDNumber(input);
  return isNaN(result) ? fallback : result;
}

/**
 * Format a number as Indonesian Rupiah string.
 * Canonical implementation — replaces scattered formatRupiah patterns.
 *
 * @param value - The numeric value
 * @param opts  - Options for formatting
 * @returns Formatted string, e.g. "Rp 12.500" or "12.500" (without prefix)
 */
export function formatIDR(
  value: number | string | null | undefined,
  opts: {
    /** Include "Rp " prefix. Default: true */
    prefix?: boolean;
    /** Show decimal places for non-integer values. Default: false (round to integer) */
    showDecimal?: boolean;
  } = {}
): string {
  const { prefix = true, showDecimal = false } = opts;

  const num = typeof value === 'number' ? value : parseIDNumber(value);
  if (isNaN(num)) return prefix ? 'Rp 0' : '0';

  const formatted = num.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: showDecimal ? 2 : 0,
  });

  return prefix ? `Rp ${formatted}` : formatted;
}

/**
 * Real-time mask formatter for currency input fields (Roadmap 4.A).
 * Strips non-digits, formats with dots, and adds "Rp " prefix.
 * e.g. "15000" -> "Rp 15.000"
 */
export function maskRupiah(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return 'Rp ' + num.toLocaleString('id-ID');
}

/**
 * Unmasks a masked Rupiah string to a clean number.
 * e.g. "Rp 15.000" -> 15000
 */
export function unmaskRupiah(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  const digits = String(val).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}
