/* ═══════════════════════════════════════════════════════════
   creditReportHelper.ts — ClearTask W4-02 Phase 5
   Analytics, credit aging buckets calculation, and CSV reporting.
   ═══════════════════════════════════════════════════════════ */

import db from '../services/db';
import type { CreditLedger, Customer } from '../types';
import { isLedgerOverdue, getDaysOverdue, getCreditStatus } from './creditHelper';
import { triggerDownload } from './downloadHelper';
import { formatRupiah, toLocalDateString } from './formatters';

export interface AgingBucket {
  key: 'current' | 'days1_30' | 'days31_60' | 'over60';
  label: string;
  count: number;
  amount: number;
  percentage: number;
  color: string;
  badgeClass: string;
}

export interface CreditAgingReportData {
  buckets: Record<'current' | 'days1_30' | 'days31_60' | 'over60', AgingBucket>;
  bucketList: AgingBucket[];
  totalAmount: number;
  totalUnpaidCount: number;
  overdueAmount: number;
  overdueCount: number;
}

/**
 * Calculate 4-tier credit aging buckets for all unpaid credit ledgers.
 */
export async function calculateAgingBuckets(
  referenceDate?: string
): Promise<CreditAgingReportData> {
  const todayStr = referenceDate || toLocalDateString(new Date());
  const todayTime = new Date(todayStr).getTime();

  const unpaidLedgers: CreditLedger[] = await db.credit_ledger
    .filter((l: CreditLedger) => !l.deletedAt && l.status === 'belum_lunas' && l.sisaHutang > 0)
    .toArray();

  const buckets: Record<'current' | 'days1_30' | 'days31_60' | 'over60', AgingBucket> = {
    current: {
      key: 'current',
      label: 'Lancar (Belum Jatuh Tempo)',
      count: 0,
      amount: 0,
      percentage: 0,
      color: 'bg-green-500',
      badgeClass: 'bg-green-100 text-green-800 border-green-200',
    },
    days1_30: {
      key: 'days1_30',
      label: '1 - 30 Hari Terlambat',
      count: 0,
      amount: 0,
      percentage: 0,
      color: 'bg-amber-500',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    days31_60: {
      key: 'days31_60',
      label: '31 - 60 Hari Terlambat',
      count: 0,
      amount: 0,
      percentage: 0,
      color: 'bg-orange-500',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    over60: {
      key: 'over60',
      label: '> 60 Hari Terlambat (Beresiko)',
      count: 0,
      amount: 0,
      percentage: 0,
      color: 'bg-red-500',
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
    },
  };

  let totalAmount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;

  for (const ledger of unpaidLedgers) {
    const debt = ledger.sisaHutang;
    totalAmount += debt;

    if (!ledger.tanggalJatuhTempo) {
      buckets.current.count += 1;
      buckets.current.amount += debt;
      continue;
    }

    const dueTime = new Date(ledger.tanggalJatuhTempo).getTime();
    const daysOverdue = Math.floor((todayTime - dueTime) / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      buckets.current.count += 1;
      buckets.current.amount += debt;
    } else if (daysOverdue <= 30) {
      buckets.days1_30.count += 1;
      buckets.days1_30.amount += debt;
      overdueAmount += debt;
      overdueCount += 1;
    } else if (daysOverdue <= 60) {
      buckets.days31_60.count += 1;
      buckets.days31_60.amount += debt;
      overdueAmount += debt;
      overdueCount += 1;
    } else {
      buckets.over60.count += 1;
      buckets.over60.amount += debt;
      overdueAmount += debt;
      overdueCount += 1;
    }
  }

  // Calculate percentages
  const bucketList = [buckets.current, buckets.days1_30, buckets.days31_60, buckets.over60];

  for (const bucket of bucketList) {
    bucket.percentage =
      totalAmount > 0 ? Number(((bucket.amount / totalAmount) * 100).toFixed(1)) : 0;
  }

  return {
    buckets,
    bucketList,
    totalAmount,
    totalUnpaidCount: unpaidLedgers.length,
    overdueAmount,
    overdueCount,
  };
}

/**
 * Get top debtors sorted by total debt descending.
 */
export async function getTopDebtors(limit: number = 5): Promise<Customer[]> {
  const customers: Customer[] = await db.customers
    .filter((c: Customer) => !c.deletedAt && c.totalHutang > 0)
    .toArray();

  return customers.sort((a, b) => b.totalHutang - a.totalHutang).slice(0, limit);
}

/**
 * Escape CSV field to prevent formula injection and broken commas.
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  // Prevent formula injection
  if (/^[=\-+@]/.test(str)) {
    return `"'${str}"`;
  }
  return `"${str}"`;
}

/**
 * Export customer credit status & summary report as CSV.
 */
export async function exportCustomerCreditReportCSV(referenceDate?: string): Promise<void> {
  const todayStr = referenceDate || toLocalDateString(new Date());
  const customers: Customer[] = await db.customers.filter((c: Customer) => !c.deletedAt).toArray();

  const ledgers: CreditLedger[] = await db.credit_ledger
    .filter((l: CreditLedger) => !l.deletedAt && l.status === 'belum_lunas' && l.sisaHutang > 0)
    .toArray();

  const ledgersByCustomer = new Map<string, CreditLedger[]>();
  for (const l of ledgers) {
    const list = ledgersByCustomer.get(l.customerId) || [];
    list.push(l);
    ledgersByCustomer.set(l.customerId, list);
  }

  const rows: string[] = [
    [
      'Customer ID',
      'Nama',
      'Telepon',
      'Alamat',
      'Total Hutang',
      'Status Kredit',
      'Jatuh Tempo Terdekat',
      'Hari Terlambat Max',
    ]
      .map(escapeCsv)
      .join(','),
  ];

  for (const customer of customers) {
    const custLedgers = ledgersByCustomer.get(customer.id) || [];
    const status = getCreditStatus(customer.totalHutang, 0);

    // Find nearest or oldest due date
    const dueDates = custLedgers
      .map((l) => l.tanggalJatuhTempo)
      .filter((d): d is string => !!d)
      .sort();

    const nearestDue = dueDates[0] || '-';

    const maxDaysOverdue = custLedgers.reduce((max, l) => {
      const days = getDaysOverdue(l, todayStr);
      return days > max ? days : max;
    }, 0);

    rows.push(
      [
        customer.id,
        customer.nama,
        customer.telepon || '-',
        customer.alamat || '-',
        customer.totalHutang,
        status.toUpperCase(),
        nearestDue,
        maxDaysOverdue,
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  // Prepend UTF-8 BOM for Excel compatibility
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `laporan-piutang-pelanggan-${todayStr}.csv`);
}

/**
 * Export aging buckets summary as CSV.
 */
export async function exportAgingReportCSV(referenceDate?: string): Promise<void> {
  const todayStr = referenceDate || toLocalDateString(new Date());
  const data = await calculateAgingBuckets(todayStr);

  const rows: string[] = [
    ['Kategori Umur Piutang', 'Jumlah Transaksi', 'Total Nominal (Rp)', 'Persentase (%)']
      .map(escapeCsv)
      .join(','),
  ];

  for (const bucket of data.bucketList) {
    rows.push(
      [bucket.label, bucket.count, bucket.amount, `${bucket.percentage}%`].map(escapeCsv).join(',')
    );
  }

  // Total summary row
  rows.push(['TOTAL', data.totalUnpaidCount, data.totalAmount, '100%'].map(escapeCsv).join(','));

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `laporan-aging-piutang-${todayStr}.csv`);
}
