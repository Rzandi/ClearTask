/* ═══════════════════════════════════════════════════════════
   Currency & Date Formatters — ClearTask
   ═══════════════════════════════════════════════════════════ */

/**
 * Format number to Indonesian Rupiah string
 * @param {number} value
 * @returns {string} e.g. "Rp 1.250.000"
 */
export function formatRupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return 'Rp 0';
  return 'Rp ' + Number(value).toLocaleString('id-ID');
}

/**
 * Format date to DD/MM/YYYY for **display** purposes.
 *
 * Use this when you need a human-readable date string in the UI
 * (e.g. table cells, printed receipts).
 *
 * ⚠️  Do NOT use this for `<input type="date">` values — those require
 * the `YYYY-MM-DD` format. Use {@link toLocalDateString} instead.
 *
 * @param {string|Date|number} date - Any value accepted by `new Date()`.
 * @returns {string} e.g. "27/10/2023", or "-" for invalid input.
 */
export function formatDate(date: string | Date | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format time to HH:mm
 * @param {string|Date|number} date
 * @returns {string} e.g. "14:32"
 */
export function formatTime(date: string | Date | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Convert a `Date` object to a `YYYY-MM-DD` string using the **local timezone**.
 *
 * Use this when you need a date string for:
 * - `<input type="date">` values
 * - Dexie / IndexedDB date-range queries
 * - Comparing dates as strings (ISO sort order is preserved)
 *
 * ⚠️  Do NOT use `date.toISOString().slice(0, 10)` — that converts to UTC
 * first, which causes a timezone-shift bug: e.g. `2024-01-15 00:30 WIB`
 * becomes `2024-01-14` in UTC.
 *
 * For display-only formatting use {@link formatDate} instead.
 *
 * @param {Date} date - Must be a valid `Date` instance.
 * @returns {string} e.g. "2024-01-15"
 * @throws {TypeError} if `date` is not a valid `Date` object.
 */
export function toLocalDateString(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new TypeError('toLocalDateString expects a valid Date object');
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get today's date in YYYY-MM-DD format for input[type=date]
 * @returns {string}
 */
export function getTodayISO(): string {
  return toLocalDateString(new Date());
}

/**
 * Generate sequential transaction ID
 * @param {number} seq
 * @returns {string} e.g. "TRX-09821"
 */
export function generateTransactionId(seq: number): string {
  return 'TRX-' + String(seq).padStart(5, '0');
}

/**
 * Format a quantity (integer or decimal) for display in transaction tables.
 *
 * Rules:
 * - Integers are shown without decimal places: `5` → `"5"`
 * - Decimals are shown with up to 2 significant decimal places: `1.5` → `"1,5"`
 * - Uses Indonesian locale (`id-ID`) so the decimal separator is a comma.
 * - Invalid / non-finite values fall back to `"0"`.
 *
 * @param {number|string|null|undefined} value
 * @returns {string} e.g. "5", "1,5", "10,25"
 */
export function formatQuantity(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value)) || !isFinite(Number(value))) return '0';
  return Number(value).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Format trend percentage with arrow
 * @param {number} percent
 * @returns {{ text: string, isPositive: boolean }}
 */
export function formatTrend(percent: number): { text: string; isPositive: boolean } {
  if (isNaN(percent) || !isFinite(percent)) {
    return { text: '- hari pertama', isPositive: true };
  }
  const arrow = percent >= 0 ? '↑' : '↓';
  return {
    text: `${arrow} ${Math.abs(percent).toFixed(1)}% vs kemarin`,
    isPositive: percent >= 0,
  };
}
