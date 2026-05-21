/* ═══════════════════════════════════════════════════════════
   sessionStats.js — ClearTask
   Calculate statistics for session closing reports
   Feature: session-management
   ═══════════════════════════════════════════════════════════ */

/**
 * Calculate comprehensive statistics for a session's transactions
 * @param {Object} session - The session object
 * @param {Array} transactions - Array of transactions in the session
 * @returns {Object} ClosingReportStats object
 */
export function calculateSessionStats(session, transactions) {
  // Handle empty transactions case (7.2)
  if (!transactions || transactions.length === 0) {
    return {
      session,
      totalTransaksi: 0,
      totalPemasukan: 0,
      breakdownKategori: [],
      breakdownMetode: [],
      transaksiTertinggi: null,
      transaksiTerendah: null,
    };
  }

  // Calculate totals
  const totalTransaksi = transactions.length;
  const totalPemasukan = transactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);

  // Calculate breakdown by kategori
  const kategoriMap = new Map();
  transactions.forEach((tx) => {
    const existing = kategoriMap.get(tx.kategori) || {
      kategori: tx.kategori,
      jumlahTransaksi: 0,
      totalPemasukan: 0,
    };
    existing.jumlahTransaksi += 1;
    existing.totalPemasukan += (Number(tx.total) || 0);
    kategoriMap.set(tx.kategori, existing);
  });
  const breakdownKategori = Array.from(kategoriMap.values());

  // Calculate breakdown by metode
  const metodeMap = new Map();
  transactions.forEach((tx) => {
    const existing = metodeMap.get(tx.metode) || {
      metode: tx.metode,
      jumlahTransaksi: 0,
      totalPemasukan: 0,
    };
    existing.jumlahTransaksi += 1;
    existing.totalPemasukan += (Number(tx.total) || 0);
    metodeMap.set(tx.metode, existing);
  });
  const breakdownMetode = Array.from(metodeMap.values());

  // Find highest and lowest transactions
  let transaksiTertinggi = transactions[0];
  let transaksiTerendah = transactions[0];

  transactions.forEach((tx) => {
    const total = Number(tx.total) || 0;
    if (total > (Number(transaksiTertinggi.total) || 0)) {
      transaksiTertinggi = tx;
    }
    if (total < (Number(transaksiTerendah.total) || 0)) {
      transaksiTerendah = tx;
    }
  });

  // Detect if all transactions have the same total
  const allSameTotal = (Number(transaksiTertinggi.total) || 0) === (Number(transaksiTerendah.total) || 0);

  return {
    session,
    totalTransaksi,
    totalPemasukan,
    breakdownKategori,
    breakdownMetode,
    transaksiTertinggi,
    transaksiTerendah,
    allSameTotal,
  };
}
