/* ═══════════════════════════════════════════════════════════
   sessionStats.js — ClearTask
   Calculate statistics for session closing reports
   Feature: session-management
   ═══════════════════════════════════════════════════════════ */

import { toTitleCase } from './formatters';
import type { Session, Transaction } from '../types/index';

// Re-export so existing imports from sessionStats.ts keep working
export type { Session, Transaction } from '../types/index';

export interface Breakdown {
  kategori?: string;
  metode?: string;
  jumlahTransaksi: number;
  totalPemasukan: number;
}

export interface ClosingReportStats {
  session: Session;
  totalTransaksi: number;
  totalPemasukan: number;
  totalPenjualanTunai: number;
  totalKembalian: number;
  totalPengeluaranTunai: number;
  kasTunaiBersih: number;
  breakdownKategori: Breakdown[];
  breakdownMetode: Breakdown[];
  transaksiTertinggi: Transaction | null;
  transaksiTerendah: Transaction | null;
  allSameTotal?: boolean;
}

/**
 * Calculate comprehensive statistics for a session's transactions
 * @param {Session} session - The session object
 * @param {Transaction[]} transactions - Array of transactions in the session
 * @returns {ClosingReportStats} ClosingReportStats object
 */
export function calculateSessionStats(
  session: Session,
  transactions: Transaction[],
  expenses: any[] = []
): ClosingReportStats {
  // Handle empty transactions case (7.2)
  if (!transactions || transactions.length === 0) {
    return {
      session,
      totalTransaksi: 0,
      totalPemasukan: 0,
      totalPenjualanTunai: 0,
      totalKembalian: 0,
      totalPengeluaranTunai: 0,
      kasTunaiBersih: 0,
      breakdownKategori: [],
      breakdownMetode: [],
      transaksiTertinggi: null,
      transaksiTerendah: null,
    };
  }

  // W0-02: Defensively filter out voided/soft-deleted transactions.
  // Even though getSessionTransactionsAsync now pre-filters, this ensures
  // correct stats if callers pass unfiltered arrays directly.
  const activeTransactions = transactions.filter((tx) => !tx.deletedAt);

  if (activeTransactions.length === 0) {
    return {
      session,
      totalTransaksi: 0,
      totalPemasukan: 0,
      totalPenjualanTunai: 0,
      totalKembalian: 0,
      totalPengeluaranTunai: 0,
      kasTunaiBersih: 0,
      breakdownKategori: [],
      breakdownMetode: [],
      transaksiTertinggi: null,
      transaksiTerendah: null,
    };
  }

  // Calculate totals
  const totalTransaksi = activeTransactions.length;
  const totalPemasukan = activeTransactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);

  // W2-02: Kas Tunai calculation
  let totalPenjualanTunai = 0;
  let totalKembalian = 0;

  activeTransactions.forEach((tx) => {
    if (tx.metode?.toLowerCase() === 'tunai') {
      totalPenjualanTunai += Number(tx.total) || 0;
      totalKembalian += Number(tx.kembalian) || 0;
    }
  });

  const activeExpenses = Array.isArray(expenses) ? expenses : [];
  const totalPengeluaranTunai = activeExpenses.reduce((sum, exp) => {
    const isCash = !exp.metode || exp.metode.toLowerCase() === 'tunai';
    if (!isCash) return sum;
    if (session) {
      if (exp.sessionId && exp.sessionId === session.id) return sum + (Number(exp.jumlah) || 0);
      if (session.tanggalMulai && exp.tanggal === session.tanggalMulai) {
        return sum + (Number(exp.jumlah) || 0);
      }
    }
    return sum;
  }, 0);

  const kasTunaiBersih = totalPenjualanTunai - totalKembalian - totalPengeluaranTunai;

  // Calculate breakdown by kategori
  const kategoriMap = new Map<string, Breakdown>();
  activeTransactions.forEach((tx) => {
    if (tx.items && Array.isArray(tx.items) && tx.items.length > 0) {
      tx.items.forEach((item: any) => {
        const rawCat = (item.kategori || 'Lainnya').trim();
        const key = rawCat.toLowerCase();
        // Convert to Title Case for proper UI display (e.g. "Kebutuhan Pokok")
        const displayCat = toTitleCase(rawCat);
        const existing = kategoriMap.get(key) || {
          kategori: displayCat,
          jumlahTransaksi: 0,
          totalPemasukan: 0,
        };
        existing.jumlahTransaksi += Number(item.qty) || 1;
        existing.totalPemasukan +=
          Number(item.total) || Number(item.hargaSatuan || 0) * (Number(item.qty) || 1);
        kategoriMap.set(key, existing);
      });
    } else {
      const rawCat = String(tx.kategori || 'Lainnya').trim();
      const key = rawCat.toLowerCase();
      const displayCat = toTitleCase(rawCat);
      const existing = kategoriMap.get(key) || {
        kategori: displayCat,
        jumlahTransaksi: 0,
        totalPemasukan: 0,
      };
      existing.jumlahTransaksi += 1;
      existing.totalPemasukan += Number(tx.total) || 0;
      kategoriMap.set(key, existing);
    }
  });
  const breakdownKategori = Array.from(kategoriMap.values());

  // Calculate breakdown by metode
  const metodeMap = new Map();
  activeTransactions.forEach((tx) => {
    const existing = metodeMap.get(tx.metode) || {
      metode: tx.metode,
      jumlahTransaksi: 0,
      totalPemasukan: 0,
    };
    existing.jumlahTransaksi += 1;
    existing.totalPemasukan += Number(tx.total) || 0;
    metodeMap.set(tx.metode, existing);
  });
  const breakdownMetode = Array.from(metodeMap.values());

  // Find highest and lowest transactions
  let transaksiTertinggi: Transaction | null = activeTransactions[0] || null;
  let transaksiTerendah: Transaction | null = activeTransactions[0] || null;

  activeTransactions.forEach((tx) => {
    const total = Number(tx.total) || 0;
    if (total > (Number(transaksiTertinggi?.total) || 0)) {
      transaksiTertinggi = tx;
    }
    if (total < (Number(transaksiTerendah?.total) || 0)) {
      transaksiTerendah = tx;
    }
  });

  // Detect if all transactions have the same total
  const allSameTotal =
    (Number(transaksiTertinggi?.total) || 0) === (Number(transaksiTerendah?.total) || 0);

  return {
    session,
    totalTransaksi,
    totalPemasukan,
    totalPenjualanTunai,
    totalKembalian,
    totalPengeluaranTunai,
    kasTunaiBersih,
    breakdownKategori,
    breakdownMetode,
    transaksiTertinggi,
    transaksiTerendah,
    allSameTotal,
  };
}
