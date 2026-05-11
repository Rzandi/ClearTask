/* ═══════════════════════════════════════════════════════════
   Excel Export — ClearTask
   Uses ExcelJS (actively maintained, MIT license)
   ═══════════════════════════════════════════════════════════ */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { formatRupiah, formatDate, formatTime } from './formatters';

/**
 * Export transactions array to a styled Excel file
 * @param {Array} transactions
 * @param {string} filename
 */
export async function exportToExcel(transactions, filename = 'ClearTask_Laporan') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ClearTask';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laporan Penjualan', {
    properties: { defaultColWidth: 18 },
  });

  // ── Header Row ──
  const headerRow = sheet.addRow([
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
  ]);

  // Style headers
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF0D1117' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00FFA3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF3D4450' } },
    };
  });

  // ── Data Rows ──
  transactions.forEach((tx) => {
    const row = sheet.addRow([
      tx.transactionId,
      formatDate(tx.tanggal),
      formatTime(tx.createdAt),
      tx.kasir || 'Admin',
      tx.kategori,
      tx.namaBarang,
      tx.qty,
      tx.hargaSatuan,
      tx.total,
      tx.metode,
      tx.catatan || '-',
      tx.status,
    ]);

    row.eachCell((cell, colNumber) => {
      cell.font = { size: 10, color: { argb: 'FFE6EDF3' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF161B22' },
      };
      // Format currency columns
      if (colNumber === 8 || colNumber === 9) {
        cell.numFmt = '#,##0';
      }
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FF30363D' } },
      };
    });
  });

  // Auto-fit columns
  sheet.columns.forEach((col) => {
    col.width = Math.max(col.width || 12, 14);
  });

  // ── Download ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(blob, `${filename}_${dateStr}.xlsx`);
}
