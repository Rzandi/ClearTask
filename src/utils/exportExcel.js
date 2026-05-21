/* ═══════════════════════════════════════════════════════════
   Excel Export — ClearTask
   Uses ExcelJS (actively maintained, MIT license)
   ═══════════════════════════════════════════════════════════ */

import { formatDate, formatTime, toLocalDateString } from './formatters';

/**
 * Helper to setup the base worksheet (header, data rows, formatting)
 */
function setupBaseWorksheet(sheet, transactions, settings = {}) {
  // ── Optional Header Rows (Toko & Kasir) ──
  if (settings.tokoName) {
    const tokoRow = sheet.addRow([settings.tokoName]);
    tokoRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF0D1117' } };
    tokoRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00FFA3' },
    };
  }

  if (settings.kasirName) {
    const kasirRow = sheet.addRow([`Kasir: ${settings.kasirName}`]);
    kasirRow.getCell(1).font = { size: 11, color: { argb: 'FF0D1117' } };
    kasirRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4F5E9' },
    };
  }

  // ── Header Row ──
  const headerRow = sheet.addRow([
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
      tx.subKategori || '',
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
      if (colNumber === 9 || colNumber === 10) {
        cell.numFmt = '#,##0';
      }
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FF30363D' } },
      };
    });
  });

  return sheet;
}

/**
 * Export transactions array to a styled Excel file
 * @param {Array} transactions
 * @param {Object} settings - { tokoName, kasirName, ... }
 * @param {string} filename
 */
export async function exportToExcel(transactions, settings = {}, filename = 'ClearTask_Laporan') {
  const { default: ExcelJS } = await import('exceljs');
  const { saveAs } = await import('file-saver');
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ClearTask';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laporan Penjualan', {
    properties: { defaultColWidth: 18 },
  });

  setupBaseWorksheet(sheet, transactions, settings);

  // Auto-fit columns
  sheet.columns.forEach((col) => {
    col.width = Math.max(col.width || 12, 14);
  });

  // ── Download ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = toLocalDateString(new Date());
  saveAs(blob, `${filename}_${dateStr}.xlsx`);
}

/**
 * Export session transactions to a styled Excel file with summary
 * @param {Array} transactions - Array of transactions in the session
 * @param {Object} session - Session object with nama and tanggalTutup fields
 * @param {Object} settings - { tokoName, kasirName, ... }
 */
export async function exportSessionExcel(transactions, session, settings = {}) {
  const { default: ExcelJS } = await import('exceljs');
  const { saveAs } = await import('file-saver');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ClearTask';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laporan Sesi', {
    properties: { defaultColWidth: 18 },
  });

  setupBaseWorksheet(sheet, transactions, settings);

  // ── Summary Row ──
  const totalPemasukan = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
  
  // Add empty row for spacing
  sheet.addRow([]);
  
  // Add summary row
  const summaryRow = sheet.addRow([
    '', '', '', '', '', '', '', '', 'Total Pemasukan', totalPemasukan, '', '', ''
  ]);

  summaryRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FF0D1117' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00FFA3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    // Format currency column
    if (colNumber === 10) {
      cell.numFmt = '#,##0';
    }
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
  
  // Format filename: ClearTask_Session_{namaSesi || "NoName"}_{tanggalTutup}.xlsx
  const sessionName = session?.nama || 'NoName';
  const tanggalTutup = session?.tanggalTutup ? session.tanggalTutup.replace(/:/g, '-') : toLocalDateString(new Date());
  saveAs(blob, `ClearTask_Session_${sessionName}_${tanggalTutup}.xlsx`);
}
