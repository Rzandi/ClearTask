/* ═══════════════════════════════════════════════════════════
   Currency & Date Formatters — ClearTask
   ═══════════════════════════════════════════════════════════ */

/**
 * Format number to Indonesian Rupiah string
 * @param {number} value
 * @returns {string} e.g. "Rp 1.250.000"
 */
export function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return 'Rp 0';
  return 'Rp ' + Number(value).toLocaleString('id-ID');
}

/**
 * Format date to DD/MM/YYYY
 * @param {string|Date} date
 * @returns {string} e.g. "27/10/2023"
 */
export function formatDate(date) {
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
 * @param {string|Date} date
 * @returns {string} e.g. "14:32"
 */
export function formatTime(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Convert Date to YYYY-MM-DD string using LOCAL timezone (not UTC).
 * Prevents timezone shift bugs where e.g. 2024-01-15 00:30 WIB becomes 2024-01-14 in UTC.
 * @param {Date} date
 * @returns {string} e.g. "2024-01-15"
 */
export function toLocalDateString(date) {
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
export function getTodayISO() {
  return toLocalDateString(new Date());
}

/**
 * Generate sequential transaction ID
 * @param {number} seq
 * @returns {string} e.g. "TRX-09821"
 */
export function generateTransactionId(seq) {
  return 'TRX-' + String(seq).padStart(5, '0');
}

/**
 * Format trend percentage with arrow
 * @param {number} percent
 * @returns {{ text: string, isPositive: boolean }}
 */
export function formatTrend(percent) {
  if (isNaN(percent) || !isFinite(percent)) {
    return { text: '- hari pertama', isPositive: true };
  }
  const arrow = percent >= 0 ? '↑' : '↓';
  return {
    text: `${arrow} ${Math.abs(percent).toFixed(1)}% vs kemarin`,
    isPositive: percent >= 0,
  };
}
