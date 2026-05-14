/* ═══════════════════════════════════════════════════════════
   exportCSV — ClearTask
   Exports session transactions to a CSV file (RFC 4180).
   ═══════════════════════════════════════════════════════════ */

import { saveAs } from 'file-saver';
import { formatTime } from './formatters';

/**
 * Escape a CSV field value per RFC 4180:
 * - Wrap in double-quotes if the value contains a comma, double-quote, or newline.
 * - Escape any double-quotes inside the value by doubling them ("").
 * @param {*} value
 * @returns {string}
 */
export function escapeCSVValue(value) {
  const str = value === null || value === undefined ? '' : String(value);
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
export function exportSessionCSV(transactions, session) {
  const header = [
    'ID Transaksi',
    'Tanggal',
    'Waktu',
    'Kasir',
    'Kategori',
    'Nama Barang',
    'Qty',
    'Harga Satuan',
    'Total',
    'Metode',
    'Catatan',
    'Status',
  ];

  const rows = transactions.map((tx) => [
    tx.transactionId ?? '',
    tx.tanggal ?? '',
    tx.createdAt ? formatTime(tx.createdAt) : '',
    tx.kasir ?? '',
    tx.kategori ?? '',
    tx.namaBarang ?? '',
    tx.qty ?? '',
    tx.hargaSatuan ?? '',
    tx.total ?? '',
    tx.metode ?? '',
    tx.catatan ?? '',
    tx.status ?? '',
  ]);

  const csvLines = [
    header.map(escapeCSVValue).join(','),
    ...rows.map((row) => row.map(escapeCSVValue).join(',')),
  ];

  const csvString = csvLines.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  const namaSesi = session?.nama?.trim() || 'NoName';
  const tanggalTutup = session?.tanggalTutup ?? new Date().toISOString().split('T')[0];
  const filename = `ClearTask_Session_${namaSesi}_${tanggalTutup}.csv`;

  saveAs(blob, filename);
}
