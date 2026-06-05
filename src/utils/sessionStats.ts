/* ═══════════════════════════════════════════════════════════
   sessionStats.js — ClearTask
   Calculate statistics for session closing reports
   Feature: session-management
   ═══════════════════════════════════════════════════════════ */

export interface Session {
  id?: string;
  kasirName?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  uangModal?: number;
  [key: string]: any;
}

export interface Transaction {
  id?: string | number;
  total?: number;
  kategori?: string;
  metode?: string;
  [key: string]: any;
}

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
  transactions: Transaction[]
): ClosingReportStats {
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
    if (tx.items && Array.isArray(tx.items) && tx.items.length > 0) {
      tx.items.forEach((item: any) => {
        const cat = item.kategori || 'Lainnya';
        const existing = kategoriMap.get(cat) || {
          kategori: cat,
          jumlahTransaksi: 0,
          totalPemasukan: 0,
        };
        existing.jumlahTransaksi += Number(item.qty) || 1;
        existing.totalPemasukan += Number(item.total) || 0;
        kategoriMap.set(cat, existing);
      });
    } else {
      const cat = tx.kategori || 'Lainnya';
      const existing = kategoriMap.get(cat) || {
        kategori: cat,
        jumlahTransaksi: 0,
        totalPemasukan: 0,
      };
      existing.jumlahTransaksi += 1;
      existing.totalPemasukan += Number(tx.total) || 0;
      kategoriMap.set(cat, existing);
    }
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
    existing.totalPemasukan += Number(tx.total) || 0;
    metodeMap.set(tx.metode, existing);
  });
  const breakdownMetode = Array.from(metodeMap.values());

  // Find highest and lowest transactions
  let transaksiTertinggi: Transaction | null = transactions[0] || null;
  let transaksiTerendah: Transaction | null = transactions[0] || null;

  transactions.forEach((tx) => {
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
    breakdownKategori,
    breakdownMetode,
    transaksiTertinggi,
    transaksiTerendah,
    allSameTotal,
  };
}
