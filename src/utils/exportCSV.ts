/* ═══════════════════════════════════════════════════════════
   exportCSV — ClearTask
   Exports session transactions to a CSV file (RFC 4180).
   ═══════════════════════════════════════════════════════════ */

import { formatTime, toLocalDateString } from './formatters';
import { triggerDownload } from './downloadHelper';
import { type Transaction, type Session } from './sessionStats';

/**
 * Escape a CSV field value per RFC 4180:
 * - Wrap in double-quotes if the value contains a comma, double-quote, or newline.
 * - Escape any double-quotes inside the value by doubling them ("").
 * @param {*} value
 * @returns {string}
 */
export function escapeCSVValue(value: any): string {
  let str = value === null || value === undefined ? '' : String(value);

  // Prevent CSV Injection (DDE) by prepending a single quote to dangerous characters
  if (/^[ \t]*[=\-+@]/.test(str)) {
    str = "'" + str;
  }

  // Must wrap if contains comma, double-quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Export session transactions to a CSV file and trigger download.
 * @param {Transaction[]} transactions - Transactions in the session
 * @param {Session} session - The closed session object
 * @returns {void}
 */
export async function exportSessionCSV(transactions: Transaction[], session: Session): Promise<void> {
  const header = [
    'ID Transaksi',
    'Tanggal',
    'Waktu',
    'Kasir',
    'Kategori',
    'Sub-Kategori',
    'Nama Barang',
    'Qty',
    'Harga Satuan',
    'Total',
    'Metode',
    'Catatan',
    'Status',
  ];

  const rows: string[][] = [];
  transactions.forEach((tx) => {
    if (tx.items && Array.isArray(tx.items)) {
      tx.items.forEach((item: any) => {
        rows.push([
          tx.transactionId ?? '',
          tx.tanggal ?? '',
          tx.createdAt ? formatTime(tx.createdAt) : '',
          tx.kasir ?? '',
          item.kategori ?? '',
          item.subKategori ?? '',
          item.namaBarang ?? '',
          item.qty ?? '',
          item.hargaSatuan ?? '',
          item.total ?? '',
          tx.metode ?? '',
          tx.catatan ?? '',
          tx.status ?? '',
        ]);
      });
    } else {
      rows.push([
        tx.transactionId ?? '',
        tx.tanggal ?? '',
        tx.createdAt ? formatTime(tx.createdAt) : '',
        tx.kasir ?? '',
        tx.kategori ?? '',
        tx.subKategori ?? '',
        tx.namaBarang ?? '',
        tx.qty ?? '',
        tx.hargaSatuan ?? '',
        tx.total ?? '',
        tx.metode ?? '',
        tx.catatan ?? '',
        tx.status ?? '',
      ]);
    }
  });

  const csvLines = [
    header.map(escapeCSVValue).join(','),
    ...rows.map((row) => row.map(escapeCSVValue).join(',')),
  ];

  const csvString = csvLines.join('\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8' });

  const namaSesi = session?.nama?.trim() || 'NoName';
  const tanggalTutup = session?.tanggalTutup ?? toLocalDateString(new Date());
  const filename = `ClearTask_Session_${namaSesi}_${tanggalTutup}.csv`;

  triggerDownload(blob, filename);
}
